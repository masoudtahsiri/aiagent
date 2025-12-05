/**
 * Audio conversion utilities for Twilio <-> Gemini bridge
 * 
 * Twilio Media Streams: μ-law encoded, 8kHz, mono
 * Gemini Live API: PCM 16-bit, 16kHz input / 24kHz output, mono
 */

// μ-law to Linear PCM conversion table
const MULAW_TO_LINEAR = new Int16Array(256);

// Initialize μ-law decode table
(function initMulawTable() {
  for (let i = 0; i < 256; i++) {
    let mulaw = ~i;
    let sign = mulaw & 0x80;
    let exponent = (mulaw >> 4) & 0x07;
    let mantissa = mulaw & 0x0f;
    let sample = ((mantissa << 3) + 0x84) << (exponent + 1);
    sample -= 0x84;
    MULAW_TO_LINEAR[i] = sign ? -sample : sample;
  }
})();

// Linear PCM to μ-law encoding
const MULAW_MAX = 0x1FFF;
const MULAW_BIAS = 33;

function linearToMulaw(sample) {
  let sign = 0;
  
  if (sample < 0) {
    sign = 0x80;
    sample = -sample;
  }
  
  sample = Math.min(sample + MULAW_BIAS, MULAW_MAX);
  
  let exponent = 7;
  for (let expMask = 0x1000; exponent > 0; exponent--, expMask >>= 1) {
    if (sample >= expMask) break;
  }
  
  const mantissa = (sample >> (exponent + 3)) & 0x0F;
  const mulawByte = ~(sign | (exponent << 4) | mantissa) & 0xFF;
  
  return mulawByte;
}

/**
 * Convert μ-law 8kHz audio to PCM 16kHz for Gemini
 * - Decodes μ-law to linear PCM
 * - Upsamples from 8kHz to 16kHz (linear interpolation)
 * @param {Buffer} mulawBuffer - μ-law encoded audio from Twilio
 * @returns {Buffer} - PCM 16-bit LE buffer at 16kHz
 */
export function mulawToPcm16k(mulawBuffer) {
  const inputLength = mulawBuffer.length;
  // Output is 2x samples (upsampling) × 2 bytes per sample
  const outputBuffer = Buffer.alloc(inputLength * 4);
  
  let prevSample = 0;
  let outputIndex = 0;
  
  for (let i = 0; i < inputLength; i++) {
    const currentSample = MULAW_TO_LINEAR[mulawBuffer[i]];
    
    // Write interpolated sample (between previous and current)
    const interpolated = Math.round((prevSample + currentSample) / 2);
    outputBuffer.writeInt16LE(interpolated, outputIndex);
    outputIndex += 2;
    
    // Write current sample
    outputBuffer.writeInt16LE(currentSample, outputIndex);
    outputIndex += 2;
    
    prevSample = currentSample;
  }
  
  return outputBuffer;
}

/**
 * Convert PCM 24kHz audio from Gemini to μ-law 8kHz for Twilio
 * - Downsamples from 24kHz to 8kHz (take every 3rd sample)
 * - Encodes to μ-law
 * @param {Buffer} pcmBuffer - PCM 16-bit LE buffer at 24kHz from Gemini
 * @returns {Buffer} - μ-law encoded buffer at 8kHz
 */
export function pcm24kToMulaw(pcmBuffer) {
  const inputSamples = pcmBuffer.length / 2;
  // Output is 1/3 of input samples (downsampling to 8kHz)
  const outputLength = Math.floor(inputSamples / 3);
  const outputBuffer = Buffer.alloc(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    // Take every 3rd sample for 24kHz -> 8kHz
    const sampleIndex = i * 3 * 2;
    if (sampleIndex + 1 < pcmBuffer.length) {
      const sample = pcmBuffer.readInt16LE(sampleIndex);
      outputBuffer[i] = linearToMulaw(sample);
    }
  }
  
  return outputBuffer;
}

/**
 * Convert PCM buffer to base64 for Gemini API
 * @param {Buffer} pcmBuffer - PCM audio buffer
 * @returns {string} - Base64 encoded string
 */
export function pcmToBase64(pcmBuffer) {
  return pcmBuffer.toString('base64');
}

/**
 * Convert base64 to PCM buffer from Gemini API
 * @param {string} base64 - Base64 encoded audio
 * @returns {Buffer} - PCM buffer
 */
export function base64ToPcm(base64) {
  return Buffer.from(base64, 'base64');
}

