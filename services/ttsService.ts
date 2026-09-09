import { getAiClient } from './geminiService';
import { Modality } from "@google/genai";
import { AudioCache } from './cacheService';

const hashText = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
};

export const generateSpeech = async (text: string, voiceName: string = 'Charon', retryCount = 0): Promise<Blob> => {
  const ai = getAiClient();
  const MAX_RETRIES = 3;
  
  // Sanitization: Remove non-speakable artifacts and extremely long strings
  const sanitizedText = text
    .substring(0, 4000) // Truncate to reasonable limit
    .replace(/[\[\]\(\)\{\}]/g, ' ') // Remove brackets
    .replace(/[*_#~`]/g, '') // Remove symbols
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim();

  if (!sanitizedText) {
    throw new Error("Text content empty after sanitization");
  }

  const cacheKey = `${voiceName}_${hashText(sanitizedText)}`;
  
  try {
    // Check IndexedDB audio cache first for extreme cost efficiency
    const cachedBase64 = await AudioCache.get(cacheKey);
    if (cachedBase64) {
      const binaryString = atob(cachedBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'audio/mp3' });
    }
  } catch (e) {
    console.debug("Cache read failed, generating fresh speech", e);
  }

  const ttsModels = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-3.1-flash-tts-preview"];
  let base64Audio: string | undefined = undefined;
  let lastError: any = null;

  for (const modelName of ttsModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: sanitizedText }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });
      
      base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) break;
    } catch (err: any) {
      lastError = err;
      console.warn(`TTS attempt with ${modelName} failed, trying next model...`, err?.message || err);
    }
  }

  if (!base64Audio) {
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
      console.warn(`TTS execution attempt ${retryCount + 1} failed. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateSpeech(text, voiceName, retryCount + 1);
    }
    throw lastError || new Error("No audio returned from generative TTS models");
  }

  // Write generated output to AudioCache asynchronously so we never charge for this text again!
  try {
    await AudioCache.set(cacheKey, base64Audio);
  } catch (e) {
    console.warn("Failed to write speech cache", e);
  }

  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'audio/mp3' });
};
