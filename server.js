import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import { mulawToPcm16k, pcm24kToMulaw, base64ToPcm } from './audioUtils.js';

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

IMPORTANT: When the call first connects, immediately greet the caller by saying "Hello! Thank you for calling Bright Smile Dental Clinic. This is Sarah, how can I help you today?"
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
  
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
  
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
wss.on('connection', async (twilioWs) => {
  console.log('🔌 Twilio Media Stream connected');
  
  let streamSid = null;
  let geminiSession = null;
  let isConnected = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECTS = 3;

  // Initialize Gemini connection
  const initGemini = async () => {
    if (reconnectAttempts >= MAX_RECONNECTS) {
      console.log('❌ Max reconnection attempts reached');
      return;
    }
    
    try {
      console.log('🔄 Connecting to Gemini...');
      reconnectAttempts++;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
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
            console.log('✅ Gemini connected!');
            isConnected = true;
            reconnectAttempts = 0; // Reset on successful connection
            
            // Trigger greeting by sending a start signal
            setTimeout(() => {
              if (geminiSession && isConnected) {
                console.log('📤 Triggering greeting...');
                geminiSession.sendRealtimeInput({
                  text: "The caller just connected. Please greet them."
                });
              }
            }, 500);
          },
          onmessage: (message) => {
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (audioData && streamSid && twilioWs.readyState === WebSocket.OPEN) {
              try {
                const pcmBuffer = base64ToPcm(audioData);
                const mulawBuffer = pcm24kToMulaw(pcmBuffer);
                
                twilioWs.send(JSON.stringify({
                  event: 'media',
                  streamSid: streamSid,
                  media: { payload: mulawBuffer.toString('base64') }
                }));
              } catch (err) {
                console.error('❌ Audio error:', err.message);
              }
            }

            if (message.serverContent?.turnComplete) {
              console.log('🎤 AI finished speaking');
            }

            if (message.serverContent?.interrupted) {
              console.log('⚡ Interrupted');
              if (streamSid && twilioWs.readyState === WebSocket.OPEN) {
                twilioWs.send(JSON.stringify({ event: 'clear', streamSid }));
              }
            }
          },
          onclose: () => {
            console.log('🔴 Gemini disconnected');
            isConnected = false;
            geminiSession = null;
            
            // Only reconnect if call is still active
            if (streamSid && twilioWs.readyState === WebSocket.OPEN) {
              setTimeout(initGemini, 1000);
            }
          },
          onerror: (err) => {
            console.error('❌ Gemini error:', err.message || err);
            isConnected = false;
          }
        }
      });
      
      geminiSession = session;
      
    } catch (err) {
      console.error('❌ Connection failed:', err.message);
      
      if (twilioWs.readyState === WebSocket.OPEN) {
        setTimeout(initGemini, 2000);
      }
    }
  };

  // Start Gemini connection
  initGemini();

  // Handle Twilio messages
  twilioWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.event) {
        case 'connected':
          console.log('📱 Twilio ready');
          break;
          
        case 'start':
          streamSid = message.start.streamSid;
          console.log(`📞 Call started: ${streamSid}`);
          break;
          
        case 'media':
          if (isConnected && geminiSession) {
            try {
              const mulawBuffer = Buffer.from(message.media.payload, 'base64');
              const pcmBuffer = mulawToPcm16k(mulawBuffer);
              const audioBlob = new Blob([pcmBuffer], { type: 'audio/pcm' });
              
              geminiSession.sendRealtimeInput({ media: audioBlob });
            } catch (err) {
              // Silent fail for audio - don't spam logs
            }
          }
          break;
          
        case 'stop':
          console.log('📴 Call ended');
          break;
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  });

  twilioWs.on('close', () => {
    console.log('🔌 Twilio disconnected');
    isConnected = false;
    streamSid = null;
    if (geminiSession) {
      try { geminiSession.close?.(); } catch (e) {}
    }
  });

  twilioWs.on('error', (err) => {
    console.error('Twilio error:', err.message);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 Twilio-Gemini Bridge Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port: ${PORT}
📞 Webhook: /incoming-call
🔌 WebSocket: /media-stream
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
