import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import { mulawToPcm16k, pcm24kToMulaw, pcmToBase64, base64ToPcm } from './audioUtils.js';

const app = express();
const server = createServer(app);

// WebSocket server for Twilio Media Streams
const wss = new WebSocketServer({ server, path: '/media-stream' });

const PORT = process.env.PORT || 3000;

// System instruction for the dental receptionist
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
Start the conversation by welcoming the caller to Bright Smile Dental Clinic and asking how you can help them today.
`;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Twilio-Gemini Bridge',
    message: 'Server is running'
  });
});

// Twilio webhook for incoming calls
app.post('/incoming-call', (req, res) => {
  console.log('📞 Incoming call from:', req.body.From);
  
  // Get the host from the request for WebSocket URL
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
  
  // TwiML response to connect call to Media Stream
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

// Handle Twilio Media Stream WebSocket connections
wss.on('connection', (twilioWs) => {
  console.log('🔌 Twilio Media Stream connected');
  
  let streamSid = null;
  let callSid = null;
  let geminiSession = null;
  let isConnected = false;

  // Initialize Gemini connection
  const initGemini = async () => {
    try {
      console.log('🔄 Initializing Gemini connection...');
      console.log('API Key present:', !!process.env.GEMINI_API_KEY);
      console.log('API Key length:', process.env.GEMINI_API_KEY?.length || 0);
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      console.log('🚀 Attempting to connect to Gemini Live...');
      geminiSession = await ai.live.connect({
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
            console.log('✅ Gemini Live session opened successfully');
            isConnected = true;
            
            // Send initial greeting to start the conversation
            setTimeout(() => {
              if (geminiSession && isConnected) {
                console.log('📤 Sending initial greeting...');
                try {
                  geminiSession.sendRealtimeInput({
                    text: "Please greet the caller and introduce yourself as Sarah from Bright Smile Dental Clinic."
                  });
                  console.log('✅ Initial greeting sent');
                } catch (err) {
                  console.error('❌ Error sending greeting:', err);
                }
              }
            }, 1000);
          },
          onmessage: (message) => {
            console.log('📨 Gemini message:', JSON.stringify(message, null, 2));
            
            // Handle audio response from Gemini
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (audioData && streamSid && twilioWs.readyState === WebSocket.OPEN) {
              try {
                console.log('🔊 Processing Gemini audio response');
                // Convert Gemini's PCM 24kHz to Twilio's μ-law 8kHz
                const pcmBuffer = base64ToPcm(audioData);
                const mulawBuffer = pcm24kToMulaw(pcmBuffer);
                const mulawBase64 = mulawBuffer.toString('base64');
                
                // Send audio to Twilio
                const mediaMessage = {
                  event: 'media',
                  streamSid: streamSid,
                  media: {
                    payload: mulawBase64
                  }
                };
                
                twilioWs.send(JSON.stringify(mediaMessage));
                console.log('✅ Audio sent to Twilio');
              } catch (err) {
                console.error('❌ Error processing Gemini audio:', err);
              }
            }

            // Handle turn completion - keep session alive
            if (message.serverContent?.turnComplete) {
              console.log('🎤 Gemini turn complete - keeping session alive');
              // Don't close the session, keep listening for more audio
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              console.log('⚡ Gemini interrupted');
              // Send clear message to Twilio to stop current audio
              if (streamSid && twilioWs.readyState === WebSocket.OPEN) {
                twilioWs.send(JSON.stringify({
                  event: 'clear',
                  streamSid: streamSid
                }));
              }
            }
          },
          onclose: () => {
            console.log('🔴 Gemini session closed');
            isConnected = false;
          },
          onerror: (err) => {
            console.error('Gemini error:', err);
            isConnected = false;
          }
        }
      });
      
    } catch (err) {
      console.error('❌ Failed to initialize Gemini:', err);
      console.error('Error details:', err.message);
      console.error('Stack trace:', err.stack);
    }
  };

  // Start Gemini connection
  initGemini();

  // Handle messages from Twilio
  twilioWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.event) {
        case 'connected':
          console.log('📱 Twilio connected');
          break;
          
        case 'start':
          streamSid = message.start.streamSid;
          callSid = message.start.callSid;
          console.log(`📞 Call started - StreamSid: ${streamSid}, CallSid: ${callSid}`);
          break;
          
        case 'media':
          // Forward audio to Gemini
          if (geminiSession && isConnected) {
            try {
              // Decode Twilio's base64 μ-law audio
              const mulawBuffer = Buffer.from(message.media.payload, 'base64');
              
              // Convert to PCM 16kHz for Gemini
              const pcmBuffer = mulawToPcm16k(mulawBuffer);
              
              // Create blob for Gemini
              const audioBlob = new Blob([pcmBuffer], { type: 'audio/pcm' });
              
              // Send to Gemini
              geminiSession.sendRealtimeInput({
                media: audioBlob
              });
            } catch (err) {
              console.error('❌ Error forwarding audio to Gemini:', err);
              console.error('Full error:', err.stack);
            }
          } else {
            console.log('⚠️ Gemini not connected, skipping audio');
          }
          break;
          
        case 'stop':
          console.log('📴 Call ended');
          break;
          
        default:
          // Ignore other events (mark, dtmf, etc.)
          break;
      }
    } catch (err) {
      console.error('Error processing Twilio message:', err);
    }
  });

  // Handle Twilio disconnect
  twilioWs.on('close', () => {
    console.log('🔌 Twilio disconnected');
    
    // Close Gemini session if open
    if (geminiSession) {
      try {
        geminiSession.close?.();
      } catch (e) {
        // Ignore close errors
      }
    }
  });

  twilioWs.on('error', (err) => {
    console.error('Twilio WebSocket error:', err);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 Twilio-Gemini Bridge Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port: ${PORT}
📞 Webhook: POST /incoming-call
🔌 WebSocket: /media-stream
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

