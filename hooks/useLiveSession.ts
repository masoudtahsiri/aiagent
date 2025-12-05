import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

// System instruction for the dental receptionist persona
const SYSTEM_INSTRUCTION = `
You are "Sarah", a friendly and professional receptionist for "Bright Smile Dental Clinic".
Your goal is to assist patients via voice.
Keep your responses concise, warm, and clear, suitable for voice interaction.
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
Start the conversation by welcoming the user to Bright Smile Dental Clinic.
`;

export const useLiveSession = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // References to audio contexts and resources to persist across renders
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Helper to cleanup audio resources
  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    sourcesRef.current.clear();
    
    // Close session if possible (though the SDK doesn't expose a clear close method on the promise, 
    // usually disconnecting the socket is handled by the browser or the library internals when we stop sending)
    // We just reset our state.
    sessionRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setConnectionState(ConnectionState.CONNECTING);

    try {
      // 1. Initialize Audio Contexts
      // Input: 16kHz for Gemini
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz for Gemini response
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 2. Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Initialize Gemini API
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 4. Create Session
      const sessionPromise = ai.live.connect({
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
            console.log('Gemini Live Session Opened');
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Input Processing
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            
            const inputCtx = inputAudioContextRef.current;
            const source = inputCtx.createMediaStreamSource(mediaStreamRef.current);
            inputSourceRef.current = source;
            
            // ScriptProcessor for raw PCM access
            // Buffer size 4096 provides a balance between latency and performance
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume calculation for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 5, 1)); // Amplify a bit for visualizer

              // Send to Gemini
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const outputCtx = outputAudioContextRef.current;
            if (!outputCtx) return;

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              try {
                // Ensure nextStartTime is at least current time
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);

                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  outputCtx,
                  24000,
                  1
                );

                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                
                source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              } catch (err) {
                console.error("Error decoding audio:", err);
              }
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              console.log("Model interrupted");
              sourcesRef.current.forEach(source => source.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log("Session Closed");
            setConnectionState(ConnectionState.DISCONNECTED);
            cleanup();
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setError("Connection error occurred.");
            setConnectionState(ConnectionState.ERROR);
            cleanup();
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Failed to connect:", err);
      setError(err.message || "Failed to access microphone or connect to API.");
      setConnectionState(ConnectionState.ERROR);
      cleanup();
    }
  }, [cleanup]);

  const disconnect = useCallback(() => {
    // There isn't a direct "disconnect" method on the promise/session object in the current SDK 
    // that we can call cleanly from outside without potentially triggering errors if the socket is already closed.
    // However, closing the input stream and context usually triggers the server to close or at least stops the flow.
    cleanup();
    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume(0);
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    connectionState,
    connect,
    disconnect,
    volume,
    error
  };
};