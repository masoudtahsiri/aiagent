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

// Audio Configuration
const INPUT_SAMPLE_RATE = 8000;   // From Asterisk (ulaw/alaw)
const OUTPUT_SAMPLE_RATE = 8000;  // To Asterisk
const GEMINI_INPUT_RATE = 16000;  // Gemini expects 16kHz input
const GEMINI_OUTPUT_RATE = 24000; // Gemini outputs 24kHz
const CHUNK_DURATION_MS = 20;     // 20ms chunks for VoIP
const CHUNK_SIZE = (OUTPUT_SAMPLE_RATE * CHUNK_DURATION_MS / 1000) * 2; // 320 bytes

const SYSTEM_INSTRUCTION = `
You are Sarah, a friendly receptionist for Bright Smile Dental Clinic.
Keep responses short and natural for phone conversation.
Start by greeting the caller warmly with "Hello, thank you for calling Bright Smile Dental Clinic, this is Sarah speaking. How may I help you today?"
`;

const server = createServer(async (socket) => {
  console.log("=== New call connected ===");

  let session = null;
  let isConnected = false;
  let greetingSent = false;
  let audioBuffer = Buffer.alloc(0);
  
  // Output audio queue and streaming
  let outputQueue = Buffer.alloc(0);
  let streamingInterval = null;
  let isStreaming = false;

  // Start streaming audio to phone in 20ms chunks
  const startStreaming = () => {
    if (streamingInterval) return;
    
    isStreaming = true;
    streamingInterval = setInterval(() => {
      if (outputQueue.length >= CHUNK_SIZE && socket.writable) {
        const chunk = outputQueue.slice(0, CHUNK_SIZE);
        outputQueue = outputQueue.slice(CHUNK_SIZE);
        sendAudioSocket(socket, chunk);
      } else if (outputQueue.length > 0 && outputQueue.length < CHUNK_SIZE) {
        // Send remaining audio (pad with silence if needed)
        // Or just wait for more data
      }
    }, CHUNK_DURATION_MS);
  };

  const stopStreaming = () => {
    if (streamingInterval) {
      clearInterval(streamingInterval);
      streamingInterval = null;
    }
    isStreaming = false;
  };

  // Queue audio for streaming
  const queueAudio = (audioData) => {
    outputQueue = Buffer.concat([outputQueue, audioData]);
    if (!isStreaming) {
      startStreaming();
    }
  };

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
          console.log("✓ Gemini CONNECTED");
          isConnected = true;

          // Trigger greeting
          setTimeout(() => {
            if (session && !greetingSent) {
              greetingSent = true;
              console.log("→ Triggering greeting...");
              session.sendClientContent({
                turns: [{ role: "user", parts: [{ text: "Hello" }] }],
                turnComplete: true
              });
            }
          }, 300);
        },

        onmessage: (msg) => {
          // Check for audio data
          const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          
          if (audioData && socket.writable) {
            // Decode base64 - Gemini outputs 24kHz PCM little-endian
            const pcm24k = Buffer.from(audioData, "base64");
            
            // Downsample 24kHz → 8kHz
            const pcm8k = downsample(pcm24k, GEMINI_OUTPUT_RATE, OUTPUT_SAMPLE_RATE);
            
            // Convert to big-endian for AudioSocket
            const pcm8kBE = swapEndian(pcm8k);
            
            console.log(`← Audio: ${pcm24k.length}B @24kHz → ${pcm8kBE.length}B @8kHz`);
            
            // Queue for streaming in small chunks
            queueAudio(pcm8kBE);
          }

          if (msg.serverContent?.turnComplete) {
            console.log("← Turn complete");
          }

          if (msg.serverContent?.interrupted) {
            console.log("⚠ Interrupted - clearing queue");
            outputQueue = Buffer.alloc(0);
          }
        },

        onclose: () => {
          console.log("Gemini closed");
          isConnected = false;
        },

        onerror: (e) => {
          console.error("✗ Gemini error:", e);
          isConnected = false;
        }
      }
    });

  } catch (err) {
    console.error("✗ Gemini init failed:", err);
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
            // Asterisk sends 8kHz PCM big-endian
            // Convert to little-endian
            const pcm8kLE = swapEndian(payload);
            
            // Upsample 8kHz → 16kHz for Gemini
            const pcm16k = upsample(pcm8kLE, INPUT_SAMPLE_RATE, GEMINI_INPUT_RATE);
            
            // Send to Gemini
            session.sendRealtimeInput({
              media: {
                mimeType: "audio/pcm;rate=16000",
                data: pcm16k.toString("base64")
              }
            });
          }
          break;

        case MSG_TYPE_HANGUP:
          console.log("Hangup received");
          stopStreaming();
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
    stopStreaming();
    if (session) {
      try { session.close(); } catch (e) {}
    }
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
    stopStreaming();
  });
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
  for (let i = 0; i < buffer.length - 1; i += 2) {
    output[i] = buffer[i + 1];
    output[i + 1] = buffer[i];
  }
  return output;
}

// Downsample audio (e.g., 24kHz → 8kHz)
function downsample(buffer, fromRate, toRate) {
  const ratio = fromRate / toRate;
  const inputSamples = buffer.length / 2;
  const outputSamples = Math.floor(inputSamples / ratio);
  const output = Buffer.alloc(outputSamples * 2);

  for (let i = 0; i < outputSamples; i++) {
    // Simple averaging for better quality
    const srcStart = Math.floor(i * ratio);
    const srcEnd = Math.min(Math.floor((i + 1) * ratio), inputSamples);
    
    let sum = 0;
    let count = 0;
    for (let j = srcStart; j < srcEnd; j++) {
      sum += buffer.readInt16LE(j * 2);
      count++;
    }
    
    const sample = count > 0 ? Math.round(sum / count) : 0;
    output.writeInt16LE(sample, i * 2);
  }

  return output;
}

// Upsample audio (e.g., 8kHz → 16kHz)
function upsample(buffer, fromRate, toRate) {
  const ratio = toRate / fromRate;
  const inputSamples = buffer.length / 2;
  const outputSamples = Math.floor(inputSamples * ratio);
  const output = Buffer.alloc(outputSamples * 2);

  for (let i = 0; i < outputSamples; i++) {
    const srcPos = i / ratio;
    const srcIndex = Math.floor(srcPos);
    const frac = srcPos - srcIndex;

    if (srcIndex + 1 < inputSamples) {
      // Linear interpolation
      const s1 = buffer.readInt16LE(srcIndex * 2);
      const s2 = buffer.readInt16LE((srcIndex + 1) * 2);
      const sample = Math.round(s1 + (s2 - s1) * frac);
      output.writeInt16LE(sample, i * 2);
    } else if (srcIndex < inputSamples) {
      output.writeInt16LE(buffer.readInt16LE(srcIndex * 2), i * 2);
    }
  }

  return output;
}

server.listen(TCP_PORT, "127.0.0.1", () => {
  console.log(`\n🎙️  Gemini-Asterisk Bridge ready on port ${TCP_PORT}`);
  console.log(`   Input:  ${INPUT_SAMPLE_RATE}Hz → ${GEMINI_INPUT_RATE}Hz (to Gemini)`);
  console.log(`   Output: ${GEMINI_OUTPUT_RATE}Hz → ${OUTPUT_SAMPLE_RATE}Hz (to phone)`);
  console.log(`   Chunk:  ${CHUNK_SIZE} bytes (${CHUNK_DURATION_MS}ms)\n`);
});
