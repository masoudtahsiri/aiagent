import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';

/* -------------------------------------------------------------------------
   Audio Conversion Utilities (G.711 Mu-Law <-> PCM 16kHz/24kHz)
   ------------------------------------------------------------------------- */

const MU_LAW_BIAS = 33;
const CLIP = 32635;

// Lookup table for mu-law to PCM could be used, but math is fast enough for Node.
function decodeMuLawSample(muLaw) {
    muLaw = ~muLaw;
    const sign = (muLaw & 0x80);
    const exponent = (muLaw >> 4) & 0x07;
    const mantissa = muLaw & 0x0F;
    let sample = ((2 * mantissa) + 33) << exponent;
    sample -= MU_LAW_BIAS;
    if (sign) sample = -sample;
    return sample;
}

function encodeMuLawSample(sample) {
    let sign = (sample >> 8) & 0x80;
    if (sign) sample = -sample;
    if (sample > CLIP) sample = CLIP;
    sample += MU_LAW_BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) { }
    let mantissa = (sample >> (exponent + 3)) & 0x0F;
    let byte = sign | (exponent << 4) | mantissa;
    return ~byte;
}

/**
 * Converts Twilio's 8kHz Mu-Law to Gemini's 16kHz PCM.
 * Uses simple linear interpolation for upsampling.
 */
function mulawToPcm16k(mulawBuffer) {
    const inputLen = mulawBuffer.length;
    // 2 bytes per sample (Int16), 2x sample rate (8k -> 16k)
    const outputBuffer = Buffer.alloc(inputLen * 2 * 2); 
    
    for (let i = 0; i < inputLen - 1; i++) {
        const sample1 = decodeMuLawSample(mulawBuffer[i]);
        const sample2 = decodeMuLawSample(mulawBuffer[i+1]);
        
        // Original sample
        outputBuffer.writeInt16LE(sample1, i * 4);
        // Interpolated sample
        outputBuffer.writeInt16LE(Math.floor((sample1 + sample2) / 2), i * 4 + 2);
    }
    
    // Handle the last sample
    if (inputLen > 0) {
        const lastSample = decodeMuLawSample(mulawBuffer[inputLen - 1]);
        outputBuffer.writeInt16LE(lastSample, (inputLen - 1) * 4);
        outputBuffer.writeInt16LE(lastSample, (inputLen - 1) * 4 + 2);
    }
    
    return outputBuffer;
}

/**
 * Converts Gemini's 24kHz PCM to Twilio's 8kHz Mu-Law.
 * Uses decimation (taking every 3rd sample) for downsampling.
 */
function pcm24kToMulaw(base64Pcm) {
    const buffer = Buffer.from(base64Pcm, 'base64');
    const inputInt16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    
    // Downsample from 24kHz to 8kHz (factor of 3)
    const outputLen = Math.floor(inputInt16.length / 3);
    const outputBuffer = Buffer.alloc(outputLen);
    
    for (let i = 0; i < outputLen; i++) {
        const sample = inputInt16[i * 3];
        outputBuffer[i] = encodeMuLawSample(sample);
    }
    
    return outputBuffer;
}

/* -------------------------------------------------------------------------
   Server Application
   ------------------------------------------------------------------------- */

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/media-stream' });
const PORT = process.env.PORT || 3000;

const SYSTEM_INSTRUCTION = `
You are "Sarah", a friendly and professional receptionist for "Bright Smile Dental Clinic".
Your goal is to assist patients via phone.
Keep your responses concise, warm, and clear, suitable for phone conversation.
Do not use markdown formatting or complex lists in your output, just speak naturally.

Key Information:
- Clinic Name: Bright Smile Dental Clinic.
- Hours: Mon-Fri 9am-5pm, Sat 10am-2pm, Closed Sundays.
- Services: General Cleaning ($100), Whitening ($300), Root Canals (consultation required), Emergency care.
- Location: 123 Dental Way, Springfield.

Capabilities:
- You can "check" appointment availability (simulate this, offer random slots like "Tuesday at 10am" or "Thursday at 2pm").
- You can answer basic questions about dental procedures.
- You can provide pricing estimates.

If you don't know an answer, politely say you'll ask Dr. Smith and get back to them.

IMPORTANT: When the call first connects, immediately greet the caller by saying "Hello! Thank you for calling Bright Smile Dental Clinic. This is Sarah, how can I help you today?"
`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Twilio-Gemini Bridge' });
});

// Twilio Voice Webhook
app.post('/incoming-call', (req, res) => {
  console.log('📞 Incoming call from:', req.body.From);
  const host = req.headers.host;
  // If running locally with ngrok, x-forwarded-proto might be https
  const protocol = (req.headers['x-forwarded-proto'] === 'https') ? 'wss' : 'ws';
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${protocol}://${host}/media-stream">
      <Parameter name="caller" value="${req.body.From || 'unknown'}" />
    </Stream>
  </Connect>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// WebSocket Connection Handling
wss.on('connection', async (twilioWs) => {
  console.log('🔌 Twilio Media Stream connected');
  
  let streamSid = null;
  let geminiSession = null;
  let isGeminiConnected = false;

  const closeGemini = () => {
    if (geminiSession) {
      console.log('Cleaning up Gemini session');
      // No explicit close method in current SDK for session object, 
      // but we drop the reference.
      geminiSession = null;
    }
    isGeminiConnected = false;
  };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Connect to Gemini Live API
    // Note: We create the session immediately but we might wait for 'start' from Twilio to send data
    const session = await ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      callbacks: {
        onopen: () => {
          console.log('✅ Gemini Live API Connected');
          isGeminiConnected = true;
          // Greeting will be triggered after we get streamSid from Twilio
        },
        onmessage: (message) => {
          // 1. Handle Audio from Gemini -> Twilio
          const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            if (!streamSid) {
              console.log('⚠️ Got audio but no streamSid yet!');
              return;
            }
            try {
              // Convert 24k PCM (Base64) -> 8k Mu-Law (Buffer)
              const mulawBuffer = pcm24kToMulaw(audioData);
              console.log(`🔊 Sending ${mulawBuffer.length} bytes to caller`);
              
              if (twilioWs.readyState === WebSocket.OPEN) {
                twilioWs.send(JSON.stringify({
                  event: 'media',
                  streamSid: streamSid,
                  media: { payload: mulawBuffer.toString('base64') }
                }));
              }
            } catch (e) {
              console.error('Error converting audio:', e);
            }
          }
          
          // Log turn complete
          if (message.serverContent?.turnComplete) {
            console.log('🎤 AI finished speaking');
          }

          // 2. Handle Interruptions
          if (message.serverContent?.interrupted) {
            console.log('⚡ Interrupted');
            if (streamSid && twilioWs.readyState === WebSocket.OPEN) {
              twilioWs.send(JSON.stringify({ 
                event: 'clear', 
                streamSid: streamSid 
              }));
            }
          }
        },
        onclose: () => {
          console.log('🔴 Gemini Disconnected');
          closeGemini();
        },
        onerror: (err) => {
          console.error('❌ Gemini Error:', err);
          closeGemini();
        }
      }
    });
    
    geminiSession = session;

  } catch (err) {
    console.error('Failed to connect to Gemini:', err);
    twilioWs.close();
    return;
  }

  // Handle Incoming Messages from Twilio
  twilioWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      switch (msg.event) {
        case 'start':
          streamSid = msg.start.streamSid;
          console.log(`📞 Call Started: ${streamSid}`);
          
          // Now that we have streamSid, trigger the greeting
          setTimeout(() => {
            if (isGeminiConnected && geminiSession) {
              console.log('📤 Triggering greeting...');
              geminiSession.sendRealtimeInput({ text: "Call connected. Say hello." });
            }
          }, 200);
          break;

        case 'media':
          if (isGeminiConnected && geminiSession && msg.media?.payload) {
             // 1. Get raw mu-law bytes
             const mulawBuffer = Buffer.from(msg.media.payload, 'base64');
             
             // 2. Convert to 16kHz PCM
             const pcm16kBuffer = mulawToPcm16k(mulawBuffer);
             
             // 3. Send to Gemini
             // Node.js SDK expects base64 string for data
             geminiSession.sendRealtimeInput({
               mimeType: "audio/pcm;rate=16000",
               data: pcm16kBuffer.toString('base64')
             });
          }
          break;

        case 'stop':
          console.log('Call Ended');
          closeGemini();
          break;
      }
    } catch (e) {
      console.error('Error processing Twilio message:', e);
    }
  });

  twilioWs.on('close', () => {
    console.log('Twilio Client Disconnected');
    closeGemini();
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
