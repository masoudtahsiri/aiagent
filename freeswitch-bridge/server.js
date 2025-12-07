import "dotenv/config";
import { createServer } from "net";
import { GoogleGenAI, Modality } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SOCKET_PORT = 9090;

const SYSTEM_INSTRUCTION = `
You are Sarah, a friendly receptionist for Bright Smile Dental Clinic.
Keep responses short and natural for phone conversation.

Clinic hours: Mon-Fri 9am-5pm, Sat 10am-2pm.

Location: 123 Dental Way, Springfield.

`;

const server = createServer(async (socket) => {
  console.log("=== New call connected ===");
  
  let session = null;
  let isConnected = false;
  let greetingSent = false;

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    session = await ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini CONNECTED");
          isConnected = true;
          
          // Trigger greeting with text prompt
          setTimeout(() => {
            if (session && !greetingSent) {
              greetingSent = true;
              console.log("Sending greeting trigger...");
              
              // This tells Gemini to start speaking
              session.sendClientContent({
                turns: [
                  {
                    role: "user",
                    parts: [{ text: "Hello" }]
                  }
                ],
                turnComplete: true
              });
            }
          }, 500);
        },
        
        onmessage: (msg) => {
          // Handle audio response from Gemini
          const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && socket.writable) {
            console.log(">> Sending audio to phone:", audio.length, "bytes");
            
            // Gemini outputs 24kHz, FreeSWITCH expects 8kHz
            const pcm24k = Buffer.from(audio, "base64");
            const pcm8k = downsample24kTo8k(pcm24k);
            socket.write(pcm8k);
          }
          
          // Handle interruption
          if (msg.serverContent?.interrupted) {
            console.log(">> Interrupted by caller");
          }
        },
        
        onclose: () => {
          console.log("Gemini session closed");
          isConnected = false;
        },
        
        onerror: (e) => {
          console.error("Gemini error:", e);
          isConnected = false;
        }
      }
    });
    
  } catch (err) {
    console.error("Failed to initialize Gemini:", err);
    socket.end();
    return;
  }

  // Handle audio from phone (FreeSWITCH sends 8kHz PCM)
  socket.on("data", (data) => {
    if (isConnected && session && data.length > 100) {
      try {
        // Upsample 8kHz to 16kHz for Gemini
        const pcm16k = upsample8kTo16k(data);
        session.sendRealtimeInput({
          media: { 
            mimeType: "audio/pcm;rate=16000", 
            data: pcm16k.toString("base64") 
          }
        });
      } catch (e) {
        console.error("Error sending audio:", e);
      }
    }
  });

  socket.on("close", () => {
    console.log("=== Call ended ===");
    if (session) {
      try {
        session.close();
      } catch (e) {}
    }
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

// Upsample 8kHz to 16kHz (linear interpolation)
function upsample8kTo16k(buffer) {
  if (buffer.length < 4) return buffer;
  
  const samples = Math.floor(buffer.length / 2);
  const output = Buffer.alloc(samples * 4);
  
  for (let i = 0; i < samples - 1; i++) {
    const s1 = buffer.readInt16LE(i * 2);
    const s2 = buffer.readInt16LE((i + 1) * 2);
    output.writeInt16LE(s1, i * 4);
    output.writeInt16LE(Math.floor((s1 + s2) / 2), i * 4 + 2);
  }
  
  if (samples > 0) {
    const last = buffer.readInt16LE((samples - 1) * 2);
    output.writeInt16LE(last, (samples - 1) * 4);
    output.writeInt16LE(last, (samples - 1) * 4 + 2);
  }
  
  return output;
}

// Downsample 24kHz to 8kHz (take every 3rd sample)
function downsample24kTo8k(buffer) {
  const inputSamples = Math.floor(buffer.length / 2);
  const outputSamples = Math.floor(inputSamples / 3);
  const output = Buffer.alloc(outputSamples * 2);
  
  for (let i = 0; i < outputSamples; i++) {
    const sample = buffer.readInt16LE(i * 3 * 2);
    output.writeInt16LE(sample, i * 2);
  }
  
  return output;
}

server.listen(SOCKET_PORT, "127.0.0.1", () => {
  console.log(`Gemini Bridge ready on port ${SOCKET_PORT}`);
});
