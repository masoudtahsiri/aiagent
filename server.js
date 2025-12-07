import "dotenv/config";
import { createServer } from "net";
import { GoogleGenAI, Modality } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TCP_PORT = 9090;

// AudioSocket Protocol Constants
const MSG_TYPE_HANGUP = 0x00;
const MSG_TYPE_UUID = 0x01;
const MSG_TYPE_AUDIO = 0x10;
const MSG_TYPE_ERROR = 0xff;

const SYSTEM_INSTRUCTION = `
You are Sarah, a friendly receptionist for Bright Smile Dental Clinic.
Keep responses short and natural for phone conversation.
Start by greeting the caller warmly.
`;

const server = createServer(async (socket) => {
  console.log("=== New call connected ===");

  let session = null;
  let isConnected = false;
  let greetingSent = false;
  let audioBuffer = Buffer.alloc(0);

  // Connect to Gemini
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

          // Trigger greeting
          setTimeout(() => {
            if (session && !greetingSent) {
              greetingSent = true;
              console.log("Triggering greeting...");
              session.sendClientContent({
                turns: [{ role: "user", parts: [{ text: "Hello" }] }],
                turnComplete: true
              });
            }
          }, 500);
        },

        onmessage: (msg) => {
          const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData && socket.writable) {
            // Gemini outputs 24kHz PCM (little-endian)
            const pcm24k = Buffer.from(audioData, "base64");
            
            // Downsample 24kHz to 16kHz for Asterisk SLIN16
            const pcm16k = downsample24kTo16k(pcm24k);
            
            // Convert to big-endian for AudioSocket
            const pcm16kBE = swapEndian(pcm16k);
            
            console.log(">> Sending", pcm16kBE.length, "bytes to phone");
            
            // Send with AudioSocket header
            sendAudioSocket(socket, pcm16kBE);
          }

          if (msg.serverContent?.interrupted) {
            console.log(">> Caller interrupted");
          }
        },

        onclose: () => {
          console.log("Gemini closed");
          isConnected = false;
        },

        onerror: (e) => console.error("Gemini error:", e)
      }
    });

  } catch (err) {
    console.error("Gemini init failed:", err);
    socket.end();
    return;
  }

  // Handle incoming data from Asterisk
  socket.on("data", (data) => {
    audioBuffer = Buffer.concat([audioBuffer, data]);

    // Parse AudioSocket protocol
    while (audioBuffer.length >= 3) {
      const msgType = audioBuffer[0];
      const msgLen = audioBuffer.readUInt16BE(1);

      if (audioBuffer.length < 3 + msgLen) break;

      const payload = audioBuffer.slice(3, 3 + msgLen);
      audioBuffer = audioBuffer.slice(3 + msgLen);

      switch (msgType) {
        case MSG_TYPE_UUID:
          console.log("Call UUID:", payload.toString("utf8"));
          break;

        case MSG_TYPE_AUDIO:
          if (isConnected && session && payload.length > 0) {
            // Asterisk sends 16kHz PCM big-endian (SLIN16)
            // Convert to little-endian for Gemini
            const pcm16kLE = swapEndian(payload);
            
            // Send directly to Gemini - no resampling needed!
            session.sendRealtimeInput({
              media: {
                mimeType: "audio/pcm;rate=16000",
                data: pcm16kLE.toString("base64")
              }
            });
          }
          break;

        case MSG_TYPE_HANGUP:
          console.log("Call hangup received");
          socket.end();
          break;

        case MSG_TYPE_ERROR:
          console.error("AudioSocket error:", payload.toString());
          break;
      }
    }
  });

  socket.on("close", () => {
    console.log("=== Call ended ===");
    if (session) {
      try { session.close(); } catch (e) {}
    }
  });

  socket.on("error", (err) => console.error("Socket error:", err));
});

// Send audio with AudioSocket header
function sendAudioSocket(socket, audioData) {
  const header = Buffer.alloc(3);
  header[0] = MSG_TYPE_AUDIO;
  header.writeUInt16BE(audioData.length, 1);
  socket.write(Buffer.concat([header, audioData]));
}

// Swap byte order (little-endian <-> big-endian)
function swapEndian(buffer) {
  const output = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i += 2) {
    if (i + 1 < buffer.length) {
      output[i] = buffer[i + 1];
      output[i + 1] = buffer[i];
    }
  }
  return output;
}

// Downsample 24kHz to 16kHz
function downsample24kTo16k(buffer) {
  const inputSamples = buffer.length / 2;
  const ratio = 24000 / 16000; // 1.5
  const outputSamples = Math.floor(inputSamples / ratio);
  const output = Buffer.alloc(outputSamples * 2);

  for (let i = 0; i < outputSamples; i++) {
    const srcIndex = Math.floor(i * ratio);
    if (srcIndex < inputSamples) {
      const sample = buffer.readInt16LE(srcIndex * 2);
      output.writeInt16LE(sample, i * 2);
    }
  }

  return output;
}

server.listen(TCP_PORT, "127.0.0.1", () => {
  console.log(`Gemini-Asterisk Bridge ready on port ${TCP_PORT}`);
});

