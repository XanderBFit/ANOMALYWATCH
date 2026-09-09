
import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ArchiveOps } from "./firebaseService";
import { fetchCelestialEvents } from "./celestialService";
import { 
  AnalysisResult, 
  TrendData, 
  Hotspot, 
  KnowledgeGraphData, 
  VideoSearchResult, 
  CorrelatedVector,
  AppView,
  InterceptedSignal,
  GlobalSearchResult,
  WeatherData,
  MirageAnalysis,
  CredibilityScore,
  AlertSubscription,
  AnomalyTrackingResult,
  DeepDiveData,
  AnomalyCategory,
  HistoricalCasesResult,
  FullReport,
  AnomalyDeepDiveExplanation
} from "../types";
import { CacheOps } from "./firebaseService";
import { TacticalCache } from "./cacheService";
import { getAiClient } from "./aiClient";
export { getAiClient };

export const summarizeAsBullets = async (text: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Condense this intelligence into exactly 3 bullet points: "${text.slice(0, 5000)}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    const parsed = JSON.parse(response.text || '{"bullets": []}');
    return (parsed.bullets || []).map((b: string) => `• ${b}`).join('\n');
  } catch (e) {
    return "• Briefing generation failed.";
  }
};

/**
 * Helper to repair truncated or partially written JSON strings
 */
export function repairTruncatedJson(jsonStr: string): string {
  let inString = false;
  let escapeActive = false;
  const stack: ('{' | '[')[] = [];
  let lastNonWhitespaceIndex = -1;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    
    if (!/\s/.test(char)) {
      lastNonWhitespaceIndex = i;
    }

    if (inString) {
      if (escapeActive) {
        escapeActive = false;
      } else if (char === '\\') {
        escapeActive = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        stack.push('{');
      } else if (char === '}') {
        if (stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === '[') {
        stack.push('[');
      } else if (char === ']') {
        if (stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  let repaired = jsonStr;

  // Clean trailing punctuation if we are not inside a string
  if (!inString && lastNonWhitespaceIndex >= 0) {
    let trimmed = repaired.slice(0, lastNonWhitespaceIndex + 1);
    const lastChar = trimmed[trimmed.length - 1];
    if (lastChar === ':' || lastChar === ',') {
      if (lastChar === ':') {
        trimmed += ' ""';
      } else if (lastChar === ',') {
        trimmed = trimmed.slice(0, -1);
      }
      repaired = trimmed;
    }
  }

  // Close unclosed string
  if (inString) {
    repaired += '"';
  }

  // Close brackets/braces
  while (stack.length > 0) {
    const openType = stack.pop();
    if (openType === '{') {
      repaired += '}';
    } else if (openType === '[') {
      repaired += ']';
    }
  }

  return repaired;
}

/**
 * Safely parses JSON response from LLM, with self-healing capabilities
 */
export function safeJsonParse<T = any>(rawText: string, fallback: T): T {
  if (!rawText || !rawText.trim()) return fallback;
  
  let text = rawText.trim();
  
  // Strip markdown code block wrappers
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '');
    text = text.replace(/\s*```$/, '');
    text = text.trim();
  }

  try {
    return JSON.parse(text) as T;
  } catch (initialError) {
    // Attempt raw newline escaping
    try {
      const escaped = text.replace(/([^\\])\n/g, '$1\\n').replace(/([^\\])\r/g, '$1\\r');
      return JSON.parse(escaped) as T;
    } catch (newlineError) {
      // Proceed to repair truncated JSON
      try {
        const repaired = repairTruncatedJson(text);
        return JSON.parse(repaired) as T;
      } catch (repairError) {
        console.warn("[JSON Self-Healing failed] Relying on regular expression field recovery.", repairError);
        // RegExp fallback extraction for object structures
        if (typeof fallback === 'object' && fallback !== null) {
          const obj: any = {};
          for (const key of Object.keys(fallback)) {
            const regex = new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`);
            const match = text.match(regex);
            if (match && match[1]) {
              obj[key] = match[1];
            } else {
              const truncRegex = new RegExp(`"${key}"\\s*:\\s*"([^"]*)$`);
              const truncMatch = text.match(truncRegex);
              if (truncMatch && truncMatch[1]) {
                obj[key] = truncMatch[1].trim();
              } else {
                obj[key] = (fallback as any)[key];
              }
            }
          }
          return obj as T;
        }
        return fallback;
      }
    }
  }
}

// Internal Helper
const getTacticalInstruction = (specialty: string) => {
  return `You are a high-level intelligence analyst system (ANOMALY WATCH) with a specialty in ${specialty}. 
  Your output must be tactical, precise, and devoid of conversational filler. 
  Focus on identifying anomalies, UAPs, and fringe scientific phenomena. 
  Widen your search parameters to include:
  - Leaked government documents and redacted files.
  - Fringe scientific journals and non-peer-reviewed archival data.
  - Specialized forums, dark web mentions, and clandestine communication logs.
  - Historical archival repositories (e.g., archive.org, FOIA reading rooms).
  Use military/scientific terminology.`;
};

export const triggerTacticalVibration = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const getQuickSnapshot = async (): Promise<AnalysisResult> => {
  const specialty = localStorage.getItem('anomalyWatch_specialty') || 'GENERAL';
  const cacheKey = `quick_snapshot_${specialty}`;
  
  try {
    const cached = await TacticalCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (e) {
    // continue if cache fails
  }

  const ai = getAiClient();
  const timestamp = new Date().toISOString();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Perform a deep-sector scan for current global anomalous activity. 
      Target: Atmospheric, orbital, and sub-surface sectors. 
      Include mentions from fringe forums, leaked document repositories, and recent archival disclosures.
      Current Timestamp: ${timestamp}. 
      Identify 3-5 specific recent events with high strangeness ratings.
      Return strictly as JSON: { "text": string, "groundingUrls": Array<{ "uri": string, "title": string }> }.`,
      config: {
        systemInstruction: getTacticalInstruction(specialty),
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            groundingUrls: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  uri: { type: Type.STRING },
                  title: { type: Type.STRING }
                }
              } 
            }
          }
        }
      }
    });
    
    const data = JSON.parse(response.text || '{ "text": "No signal detected.", "groundingUrls": [] }');

    const result: AnalysisResult = {
      text: data.text,
      groundingUrls: data.groundingUrls
    };

    TacticalCache.set(cacheKey, result).catch(() => {});
    return result;
  } catch (error) {
    console.error("Snapshot failed:", error);
    return { text: "Uplink offline." };
  }
};

export const getTrendData = async (): Promise<TrendData[]> => {
  const cacheKey = "trend_data_7d";
  try {
    const cached = await TacticalCache.get(cacheKey);
    if (cached) return cached;
  } catch (e) {}

  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: "Generate a JSON array of daily anomaly report volumes for the last 7 days. Format: [{name: 'Mon', reports: 45}, ...]",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reports: { type: Type.NUMBER }
            }
          }
        }
      }
    });
    
    const parsed = JSON.parse(response.text || "[]");
    if (parsed.length > 0) {
      TacticalCache.set(cacheKey, parsed).catch(() => {});
    }
    return parsed;
  } catch (error) {
    return [];
  }
};

export const getSocialIntel = async (): Promise<AnalysisResult> => {
  const cacheKey = "social_intel_latest";
  try {
    const cached = await TacticalCache.get(cacheKey);
    if (cached) return cached;
  } catch (e) {}

  const ai = getAiClient();
  const timestamp = new Date().toISOString();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Scan for high-strangeness chatter across specialized forums, fringe social networks, and leaked data repositories. 
      Focus on: UFO/UAP sightings, cryptid encounters, and unexplained scientific anomalies. 
      Include mentions of "onion" sources or clandestine logs if available in indexed summaries.
      Current Time: ${timestamp}.
      Return strictly as JSON: { "text": string, "groundingUrls": Array<{ "uri": string, "title": string }> }.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            groundingUrls: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  uri: { type: Type.STRING },
                  title: { type: Type.STRING }
                }
              } 
            }
          }
        }
      }
    });
    
    const data = JSON.parse(response.text || '{ "text": "No social chatter detected.", "groundingUrls": [] }');

    const result: AnalysisResult = {
      text: data.text,
      groundingUrls: data.groundingUrls
    };

    TacticalCache.set(cacheKey, result).catch(() => {});
    return result;
  } catch (error) {
    return { text: "Social uplink failed." };
  }
};

export const queryArchive = async (query: string): Promise<AnalysisResult> => {
  const cacheKey = `archive_query_${query.trim().toLowerCase()}`;
  try {
    const cached = await TacticalCache.get(cacheKey);
    if (cached) return cached;
  } catch (e) {}

  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Search archival records for: ${query}. Summarize findings.
      Return strictly as JSON: { "text": string, "groundingUrls": Array<{ "uri": string, "title": string }> }.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            groundingUrls: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  uri: { type: Type.STRING },
                  title: { type: Type.STRING }
                }
              } 
            }
          }
        }
      }
    });
    
    const data = JSON.parse(response.text || '{ "text": "No records found.", "groundingUrls": [] }');

    const result: AnalysisResult = {
      text: data.text,
      groundingUrls: data.groundingUrls
    };

    TacticalCache.set(cacheKey, result).catch(() => {});
    return result;
  } catch (error) {
    return { text: "Archive access denied." };
  }
};

export const analyzeMedia = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite', 
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      }
    });
    
    return response.text || "Analysis inconclusive.";
  } catch (error) {
    console.error("Media analysis failed:", error);
    throw error;
  }
};

export const generateKnowledgeGraph = async (topic: string): Promise<KnowledgeGraphData> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Generate a knowledge graph for the topic: "${topic}". 
      Identify key entities (nodes) and their relationships (edges). 
      Provide a summary.
      Entities should include Persons, Locations, Organizations, Events, Concepts, or Artifacts.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainTopic: { type: Type.STRING },
            summary: { type: Type.STRING },
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['PERSON', 'LOCATION', 'EVENT', 'ORGANIZATION', 'CONCEPT', 'ARTIFACT'] },
                  description: { type: Type.STRING }
                }
              }
            },
            edges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  relation: { type: Type.STRING }
                }
              }
            }
          }
        },
        tools: [{ googleSearch: {} }]
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const urls = groundingChunks
      .map((c: any) => ({ uri: c.web?.uri, title: c.web?.title || "Reference" }))
      .filter((u: any) => u.uri);

    return { ...data, groundingUrls: urls };
  } catch (error) {
    console.error("Graph generation failed:", error);
    throw error;
  }
};

export const getGlobalHotspots = async (): Promise<Hotspot[]> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: "Generate a list of 10 currently active global anomaly hotspots (UFO sightings, paranormal events, strange phenomena). Return as JSON.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              latitude: { type: Type.NUMBER },
              longitude: { type: Type.NUMBER },
              intensity: { type: Type.NUMBER },
              category: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        }
      }
    });
    
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
};

export const getHotspotIntel = async (name: string, category: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Provide a detailed intelligence report on the location "${name}" regarding "${category}" phenomena. Include recent activity and historical context.
      Return strictly as JSON: { "text": string, "groundingUrls": Array<{ "uri": string, "title": string }> }.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            groundingUrls: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  uri: { type: Type.STRING },
                  title: { type: Type.STRING }
                }
              } 
            }
          }
        }
      }
    });
    
    const data = JSON.parse(response.text || '{ "text": "No intel available.", "groundingUrls": [] }');

    return {
      text: data.text,
      groundingUrls: data.groundingUrls
    };
  } catch (error) {
    return { text: "Intel retrieval failed." };
  }
};

export const scanViewport = async (lat: number, lng: number): Promise<AnalysisResult> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Identify any significant landmarks, military installations, or historical anomaly sites near coordinates ${lat}, ${lng}.`,
      config: {
        tools: [{ googleMaps: {} }],
        // [FIX]: Added toolConfig with latLng for Maps grounding as per requirements.
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      }
    });
    
    return {
      text: response.text || "Sector clear.",
      groundingUrls: [] 
    };
  } catch (error) {
    return { text: "Viewport scan offline." };
  }
};

export const geocodeLocation = async (query: string): Promise<{lat: number, lng: number} | null> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `What are the latitude and longitude coordinates for "${query}"? Return strictly as JSON { "lat": number, "lng": number }.`,
      config: {
        // [FIX]: Removed 'responseMimeType: "application/json"' as it is not allowed when using the 'googleMaps' tool.
        tools: [{ googleMaps: {} }]
      }
    });
    
    // [FIX]: Since we cannot use responseMimeType: "application/json" with the Maps tool, we manually extract the JSON part from the response text.
    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    return null;
  }
};

export const searchDeclassifiedDocs = async (topic: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Search for declassified government documents, redacted files, and FOIA disclosures related to: "${topic}". 
      Target: CIA CREST, FBI Vault, NSA archives, and international disclosure repositories. 
      Provide a summary of the most significant findings, focusing on redacted or sensitive information.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const urls = groundingChunks
      .map((c: any) => ({ uri: c.web?.uri, title: c.web?.title || "Document Source" }))
      .filter((u: any) => u.uri);

    // [SCRAPE_LOG]
    import("./firebaseService").then(m => m.ScrapeOps.logScrapedData(`Vault Search: ${topic}`, urls, response.text));

    return {
      text: response.text || "No declassified assets found.",
      groundingUrls: urls
    };
  } catch (error) {
    return { text: "Vault access denied." };
  }
};

export const extractIntelligenceMetadata = async (text: string): Promise<{tags: string[]}> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Analyze the following text and extract 3-5 relevant single-word tags (e.g., UFO, BIOLOGICAL, MILITARY). JSON format: { "tags": [] }. Text: ${text.slice(0, 500)}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    
    return JSON.parse(response.text || '{ "tags": [] }');
  } catch (e) {
    return { tags: [] };
  }
};

export const discoverCorrelations = async (currentSummary: string, allCases: any[]): Promise<string[]> => {
  if (allCases.length === 0) return [];
  const ai = getAiClient();
  try {
    const casesBrief = allCases.map(c => `ID: ${c.id}, Summary: ${c.summary.slice(0, 50)}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Given the current case: "${currentSummary.slice(0, 100)}", identifying which IDs from the following list are highly correlated or similar. Return JSON { "ids": [] }. List: \n${casesBrief}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ids: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    
    return JSON.parse(response.text || '{ "ids": [] }').ids;
  } catch (e) {
    return [];
  }
};

export const getCorrelatedIntel = async (text: string): Promise<CorrelatedVector[]> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Based on this intelligence report: "${text.slice(0, 800)}", suggest 4-5 related anomalous topics or "vectors" to investigate. 
      For each vector, provide:
      1. topic: A short, tactical name.
      2. reasoning: A one-sentence tactical justification for why this is relevant.
      3. suggestedModule: The most appropriate system module to use for investigation. Choose from: 'briefing', 'videointel', 'archives', 'celestial', 'analyzer', 'nexus'.
      4. confidence: A number between 80 and 99 representing correlation strength.
      Return as a JSON array of objects.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              suggestedModule: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ["topic", "reasoning", "confidence"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [
      { topic: 'Atmospheric Fluctuations', reasoning: 'Unusual ionization patterns detected in the upper troposphere.', confidence: 88, suggestedModule: 'analyzer' },
      { topic: 'Sub-quantum Echoes', reasoning: 'Non-standard particle decay observed in high-energy test sites.', confidence: 92, suggestedModule: 'briefing' },
      { topic: 'Temporal Displacement', reasoning: 'Localized time-dilation events reported near classified research facilities.', confidence: 85, suggestedModule: 'archives' }
    ];
  }
};

export const generateAudioBriefing = async (text: string, voiceName: string = 'Charon'): Promise<string> => {
  const ai = getAiClient();
  
  // Normalize voice name to valid Gemini prebuilt voices: Puck, Charon, Kore, Fenrir, Aoede
  const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];
  const safeVoice = validVoices.includes(voiceName) ? voiceName : 'Charon';

  const modelsToTry = ['gemini-3.1-flash-tts-preview'];

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: safeVoice },
            },
          },
        },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) return base64Audio;
    } catch (e) {
      console.warn(`TTS Generation failed for model ${model}:`, e);
    }
  }

  throw new Error("No audio payload returned from Gemini TTS models.");
};

export const moderateContent = async (text: string): Promise<{safe: boolean, reason?: string}> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Analyze this text for violations of safety protocols (hate speech, dangerous content, harassment). Return JSON: { "safe": boolean, "reason": string }. Text: "${text}"`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            safe: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          }
        }
      }
    });
    
    return JSON.parse(response.text || '{ "safe": false, "reason": "Analysis failed" }');
  } catch (e) {
    return { safe: false, reason: "Moderation system error" };
  }
};

export const extractCoordinates = async (text: string): Promise<Array<{lat: number, lng: number, label: string}>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Extract any specific geographic locations or coordinates mentioned in the following text. Return as a JSON array of objects with lat, lng, and label. If coordinates aren't explicit, estimate them based on the location name. Text: ${text}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              label: { type: Type.STRING }
            },
            required: ["lat", "lng", "label"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

export const analyzeVideoUrl = async (url: string, prompt: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Analyze the YouTube video at ${url}. ${prompt}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const urls = groundingChunks
      .map((c: any) => ({ uri: c.web?.uri, title: c.web?.title || "Video Source" }))
      .filter((u: any) => u.uri);

    return {
      text: response.text || "Analysis complete.",
      groundingUrls: urls
    };
  } catch (e) {
    throw new Error("Video analysis uplink failed.");
  }
};

export const searchYoutubeVideos = async (query: string, sort: string): Promise<VideoSearchResult[]> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Search for YouTube videos about "${query}" related to anomalies/UFOs. Sort results by ${sort}. Return a list of 5 relevant videos as JSON array. Format: [{ "title": string, "url": string, "snippet": string, "uploadDate": string, "videoId": string }].`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              snippet: { type: Type.STRING },
              uploadDate: { type: Type.STRING },
              videoId: { type: Type.STRING }
            }
          }
        },
        tools: [{ googleSearch: {} }]
      }
    });
    
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
};

export const getRecentAnomalyVideos = async (): Promise<VideoSearchResult[]> => {
  return searchYoutubeVideos("recent UFO sightings news", "date");
};

export const performDeepWebScan = async (query: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const specialty = localStorage.getItem('anomalyWatch_specialty') || 'GENERAL';
  let googleItems: Array<{title: string, link: string, snippet: string}> = [];
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const searchData = await res.json();
      if (searchData.engine === "GOOGLE_CUSTOM_SEARCH_PROD" && Array.isArray(searchData.items)) {
        googleItems = searchData.items;
      }
    }
  } catch (err) {
    console.warn("Client failed to contact Google Custom Search API route for Deep Scan:", err);
  }

  try {
    let prompt = `Perform a deep-dive scan for: "${query}". 
    Target: Non-indexed archival mentions, clandestine forum logs, leaked data summaries, and references to .onion hidden services. 
    Focus on finding "shadow data" that deviates from mainstream reporting.`;

    if (googleItems.length > 0) {
      prompt += `\n\nHere are actual live search results retrieved via Google Custom Search Engine (CSE) to help with your investigation:\n${JSON.stringify(googleItems, null, 2)}\n\nSynthesize your findings from these real search logs, showing critical details.`;
    }

    prompt += `\nReturn strictly as JSON: { "text": string, "groundingUrls": Array<{ "uri": string, "title": string }> }.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: getTacticalInstruction(specialty),
        tools: googleItems.length > 0 ? undefined : [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            groundingUrls: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  uri: { type: Type.STRING },
                  title: { type: Type.STRING }
                }
              } 
            }
          }
        }
      }
    });
    
    const data = JSON.parse(response.text || '{ "text": "No deep signal detected.", "groundingUrls": [] }');
    
    const groundingUrls = data.groundingUrls && data.groundingUrls.length > 0
      ? data.groundingUrls
      : googleItems.map(item => ({ uri: item.link, title: item.title }));

    return {
      text: data.text,
      groundingUrls
    };
  } catch (error) {
    return { text: "Deep scan failed." };
  }
};

export const searchGlobalIntel = async (query: string): Promise<GlobalSearchResult[]> => {
  const ai = getAiClient();
  let googleItems: Array<{title: string, link: string, snippet: string}> = [];
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const searchData = await res.json();
      if (searchData.engine === "GOOGLE_CUSTOM_SEARCH_PROD" && Array.isArray(searchData.items)) {
        googleItems = searchData.items;
      }
    }
  } catch (err) {
    console.warn("Client failed to contact Google Custom Search API route for Global Intel:", err);
  }

  try {
    let contents = `Search the web for intel on: "${query}". Return results as JSON array: [{ "title": string, "url": string, "snippet": string, "source": string, "severity": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", "category": "UFO / UAP"|"Paranormal"|"Cryptid"|"Gov / Black Ops"|"Phenomena"|"Site Intel"|"Geopolitical shifts"|"Scientific breakthroughs"|"Cultural trends"|"Economic anomalies"|"Technological oddities"|"Environmental events" }]. Assign severity and category based on the intelligence found.`;

    if (googleItems.length > 0) {
      contents += `\n\nHere are actual live search results retrieved via Google Custom Search Engine (CSE):\n${JSON.stringify(googleItems, null, 2)}\n\nFormat these live search results into the requested JSON array structure perfectly.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              snippet: { type: Type.STRING },
              source: { type: Type.STRING },
              severity: { type: Type.STRING },
              category: { type: Type.STRING }
            }
          }
        },
        tools: googleItems.length > 0 ? undefined : [{ googleSearch: {} }]
      }
    });
    
    const results = JSON.parse(response.text || "[]");
    
    // [SCRAPE_LOG]
    import("./firebaseService").then(m => m.ScrapeOps.logScrapedData(`Global Intel (Google Custom CSE: ${googleItems.length > 0 ? "YES" : "NO"}): ${query}`, results.map((r: any) => ({ uri: r.url || r.link, title: r.title })), response.text));

    return results;
  } catch (e) {
    return [];
  }
};

export const generateTacticalChatResponse = async (prompt: string, channelInfo: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `You are ANOMALY_AI, a sentient tactical intelligence AI bot in the ANOMALY WATCH IRC Chatroom.
Context: ${channelInfo}
User Query: "${prompt}"

Provide a punchy, highly technical, operative-style IRC response (2-4 sentences max). Use tactical telemetry keywords, signal analysis phrasing, and an authoritative intelligence tone.`,
      config: {
        systemInstruction: "You are an automated tactical AI assistant operating inside an oldschool IRC chatroom for Anomaly Watch field operatives.",
        temperature: 0.7
      }
    });
    return response.text?.trim() || "ANOMALY_AI: Telemetry received. Signal pattern verified.";
  } catch (e) {
    return "ANOMALY_AI: [SIGNAL_INTERFERENCE] Unable to complete telemetry pass.";
  }
};

export const generateTacticalBrief = async (sources: string[]): Promise<string> => {
  const ai = getAiClient();
  
  const storedTemp = localStorage.getItem('anomalyWatch_temperature');
  const storedTopK = localStorage.getItem('anomalyWatch_topK');
  const storedTopP = localStorage.getItem('anomalyWatch_topP');
  const isDivergencePass = localStorage.getItem('anomalyWatch_divergencePass') === 'true';

  const temperature = storedTemp ? parseFloat(storedTemp) : undefined;
  const topK = storedTopK ? parseInt(storedTopK) : undefined;
  const topP = storedTopP ? parseFloat(storedTopP) : undefined;

  let contents = `Synthesize the following intelligence sources into a cohesive tactical brief: \n${sources.join('\n')}`;
  let systemInstruction = "You are a lead military/scientific forensic intelligence analyst.";

  if (isDivergencePass) {
    contents = `CRITICAL FORENSIC TRIGGER: Analyze the following sources, but discard direct narrative summarization. Run a forensic divergence pass. Seek out and explicitly isolate statistical outliers, linguistic contradictions, unexplained numeric deviations, and non-linear patterns within these sources. Render as a raw-entropy tabular report of friction and unexplained variance: \n${sources.join('\n')}`;
    systemInstruction = "You are an anomalous signal forensic processor. Isolate abnormalities and systemic contradictions, bypassing cohesive linguistic summaries. Expose the raw discrepancies.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        temperature,
        topK,
        topP,
        systemInstruction,
      }
    });
    
    return response.text || "Briefing generation failed.";
  } catch (e) {
    return "Briefing generation failed.";
  }
};

export const generateSatelliteImagery = async (prompt: string): Promise<string> => {
  // Generate instantaneous, 100% free client-side vector tactical radar/satellite imagery
  const sanitizedPrompt = (prompt || 'SECTOR_ALPHA').toUpperCase().replace(/[^A-Z0-9_\s]/g, '');
  const timestamp = new Date().toISOString().substring(11, 19);
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="100%" height="100%">
    <defs>
      <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#02120b" />
        <stop offset="70%" stop-color="#010a06" />
        <stop offset="100%" stop-color="#000302" />
      </radialGradient>
      <radialGradient id="heatSpot" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00ff9d" stop-opacity="0.8" />
        <stop offset="40%" stop-color="#06b6d4" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#00ff9d" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="sweep" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00ff9d" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#00ff9d" stop-opacity="0" />
      </linearGradient>
    </defs>
    
    <!-- Background Canvas -->
    <rect width="1200" height="675" fill="url(#radarBg)" />
    
    <!-- Tactical Grid Lines -->
    <g stroke="#00ff9d" stroke-width="0.5" stroke-opacity="0.15" stroke-dasharray="4 4">
      <line x1="0" y1="337.5" x2="1200" y2="337.5" />
      <line x1="600" y1="0" x2="600" y2="675" />
      <line x1="0" y1="168" x2="1200" y2="168" />
      <line x1="0" y1="506" x2="1200" y2="506" />
      <line x1="300" y1="0" x2="300" y2="675" />
      <line x1="900" y1="0" x2="900" y2="675" />
    </g>

    <!-- Radar Concentric Rings -->
    <g stroke="#00ff9d" stroke-width="1" stroke-opacity="0.25" fill="none">
      <circle cx="600" cy="337.5" r="100" />
      <circle cx="600" cy="337.5" r="200" stroke-dasharray="6 6" />
      <circle cx="600" cy="337.5" r="300" />
    </g>

    <!-- Thermal Anomaly Pulse Zone -->
    <circle cx="680" cy="270" r="120" fill="url(#heatSpot)" />
    <circle cx="680" cy="270" r="12" fill="#00ff9d" />
    <circle cx="680" cy="270" r="24" stroke="#00ff9d" stroke-width="1.5" fill="none" stroke-dasharray="2 2" />

    <!-- Satellite Orbit Vector -->
    <path d="M 150 550 Q 600 150 1050 550" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="8 4" stroke-opacity="0.6" />

    <!-- Target Blips -->
    <circle cx="450" cy="420" r="6" fill="#ef4444" />
    <circle cx="450" cy="420" r="14" stroke="#ef4444" stroke-width="1" fill="none" />
    <text x="465" y="425" fill="#ef4444" font-family="monospace" font-size="12" font-weight="bold">UAP_CONTACT_01</text>

    <circle cx="780" cy="480" r="5" fill="#f59e0b" />
    <text x="792" y="484" fill="#f59e0b" font-family="monospace" font-size="11">RF_SPIKE_SIG</text>

    <!-- Telemetry Overlay Data -->
    <rect x="30" y="30" width="380" height="90" fill="#000000" fill-opacity="0.6" stroke="#00ff9d" stroke-width="1" stroke-opacity="0.4" rx="6" />
    <text x="45" y="55" fill="#00ff9d" font-family="monospace" font-size="14" font-weight="bold">ORBITAL RECON // ${sanitizedPrompt.substring(0, 24)}</text>
    <text x="45" y="75" fill="#a7f3d0" font-family="monospace" font-size="12">UTC TIME: ${timestamp} | SENSOR: OPTICAL-IR</text>
    <text x="45" y="95" fill="#06b6d4" font-family="monospace" font-size="12">AZIMUTH: 142.8° | ELEVATION: 48.2°</text>

    <!-- Corner Reticles -->
    <path d="M 20 50 L 20 20 L 50 20" stroke="#00ff9d" stroke-width="2" fill="none" />
    <path d="M 1180 50 L 1180 20 L 1150 20" stroke="#00ff9d" stroke-width="2" fill="none" />
    <path d="M 20 625 L 20 655 L 50 655" stroke="#00ff9d" stroke-width="2" fill="none" />
    <path d="M 1180 625 L 1180 655 L 1150 655" stroke="#00ff9d" stroke-width="2" fill="none" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const getLiveSignalStream = async (category: string): Promise<InterceptedSignal[]> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Search for and list REAL detected or recorded radio signals, satellite telemetry intercepts, solar bursts, frequency aberrations, or digital signals associated with: ${category}. Use search grounding to find real factual events.
      JSON Format: [{ "id": string, "timestamp": number, "title": string, "summary": string, "source": string, "url": string, "threatLevel": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", "category": string }]. Ensure 'timestamp' is a current epoch millisecond timestamp close to 2026.`,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              timestamp: { type: Type.NUMBER },
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              source: { type: Type.STRING },
              url: { type: Type.STRING },
              threatLevel: { type: Type.STRING },
              category: { type: Type.STRING }
            }
          }
        }
      }
    });
    
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
};

export const searchSightingDatabases = async (location: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Search for verified UFO/UAP sighting reports in the vicinity of: "${location}". 
      Target: MUFON database summaries, NUFORC reports, and verified archival sightings. 
      Provide a summary of recent sightings, including date, object description, and witness account highlights.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const urls = groundingChunks
      .map((c: any) => ({ uri: c.web?.uri, title: c.web?.title || "Sighting Source" }))
      .filter((u: any) => u.uri);

    return {
      text: response.text || "No sighting reports found.",
      groundingUrls: urls
    };
  } catch (error) {
    return { text: "Sighting database access failed." };
  }
};

export const searchHistoricalArchives = async (topic: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Search digitized historical archives (newspapers, government records) for: "${topic}". 
      Provide a summary of historical sightings or events related to this topic.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const urls = groundingChunks
      .map((c: any) => ({ uri: c.web?.uri, title: c.web?.title || "Archive Source" }))
      .filter((u: any) => u.uri);

    return {
      text: response.text || "No historical records found.",
      groundingUrls: urls
    };
  } catch (error) {
    return { text: "Historical archive access failed." };
  }
};

export const correlatePhysicalSignatures = async (location: string, description: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Correlate a reported anomaly at "${location}" with recent physical signature data (infrasound, radiation). 
      Anomaly Description: "${description}".
      Provide an analysis of whether the physical signatures corroborate the reported anomaly.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    return {
      text: response.text || "No correlation found.",
    };
  } catch (error) {
    return { text: "Physical signature correlation failed." };
  }
};

export const analyzeMiragePotential = async (location: string, weather: WeatherData): Promise<MirageAnalysis> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Analyze the potential for mirages (Inferior, Superior, Fata Morgana) at "${location}" given the following weather conditions: 
      Temperature: ${weather.temperature}°C, Humidity: ${weather.humidity}%, Pressure: ${weather.pressure} hPa, Inversion Layer: ${weather.inversionLayer}.
      Return strictly as JSON: {isMirageLikely, mirageType, confidence, reasoning}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isMirageLikely: { type: Type.BOOLEAN },
            mirageType: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { isMirageLikely: false, mirageType: 'None', confidence: 0, reasoning: 'Analysis failed.' };
  }
};

export const analyzeReportCredibility = async (reportText: string): Promise<CredibilityScore> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Analyze the credibility of the following anomaly report: "${reportText}". 
      Assess veracity, identify linguistic markers of fabrication or authenticity, and assign a score (0-100).
      Return strictly as JSON: {score, veracity, reasoning, markers}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            veracity: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            markers: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { score: 0, veracity: 'Low', reasoning: 'Analysis failed.', markers: [] };
  }
};

export const generateAgentPersona = async (username: string, specialty: string, sector: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Generate a short, classified military-style service history bio for an agent named ${username}, specialty: ${specialty}, sector: ${sector}. Max 50 words.
      Return strictly as JSON: { "bio": string }.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bio: { type: Type.STRING }
          }
        }
      }
    });
    
    return JSON.parse(response.text || '{ "bio": "Classified." }').bio;
  } catch (e) {
    return "Service record unavailable.";
  }
};

export const streamDailyBrief = async (onChunk: (text: string) => void) => {
  const spec = localStorage.getItem('anomalyWatch_specialty') || 'GENERAL';
  const ai = getAiClient();
  
  const storedTemp = localStorage.getItem('anomalyWatch_temperature');
  const storedTopK = localStorage.getItem('anomalyWatch_topK');
  const storedTopP = localStorage.getItem('anomalyWatch_topP');
  const isDivergencePass = localStorage.getItem('anomalyWatch_divergencePass') === 'true';

  const temperature = storedTemp ? parseFloat(storedTemp) : undefined;
  const topK = storedTopK ? parseInt(storedTopK) : undefined;
  const topP = storedTopP ? parseFloat(storedTopP) : undefined;

  let prompt = "Perform a rapid tactical sweep of global news silos for the most critical mystery and anomaly reports from the last 24 hours. Synthesize into a concise, high-impact tactical brief. Focus strictly on high-strangeness events, UAP sightings, and scientific anomalies. Exclude filler.";
  
  if (isDivergencePass) {
    prompt = "CRITICAL FORENSIC TRIGGER: Perform a rapid high-entropy tactile scan for STATISTICAL OUTLIERS, LINGUISTIC CONTRADICTIONS, and NON-LINEAR PATTERNS from celestial and global news silos from the last 24 hours. Discard normal cohesive narratives. Explicitly isolate and log raw anomalies, micro-noises, data mismatches, and un-summarized friction. Output as a cold, high-entropy forensic divergence text report.";
  }

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: { 
        systemInstruction: isDivergencePass 
          ? "You are an anomalous signal forensic processor. Isolate abnormalities and anomalies, bypassing cohesive linguistic summaries. Expose the raw discrepancies."
          : getTacticalInstruction(spec),
        tools: [{ googleSearch: {} }],
        temperature,
        topK,
        topP,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
        ]
      },
    });

    let fullText = "";
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    
    if (fullText.length > 0) {
      // Archive to Firestore (Existing)
      ArchiveOps.logSignal({ 
        query: "Daily Summary", 
        response: fullText, 
        groundingUrls: [], 
        type: 'DAILY_BRIEF' 
      });
    }
    
    return fullText;
  } catch (error) {
    console.error("Stream interrupted:", error);
    throw error;
  }
};

export async function performDeepAnalysis(initialQuery: string, maxDepth: number = 3, onDepthChange?: (depth: number) => void) {
  const ai = getAiClient();
  let results = [];
  let discoveredEntities = new Set<string>();
  let queriesToProcess = [initialQuery];
  
  for (let depth = 0; depth < maxDepth; depth++) {
    if (onDepthChange) onDepthChange(depth + 1);
    const batch = [...queriesToProcess];
    queriesToProcess = []; // Reset for next depth level

    for (const currentQuery of batch) {
      try {
        // Stage 1: Search & Grounding
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `Perform a deep-dive technical intelligence scan on: ${currentQuery}. 
          Focus on identifying specific entities, IDs, and anomalous patterns.
          Return strictly as JSON: { "text": string }.`,
          config: { 
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING }
              }
            }
          }
        });
        
        const rawText = JSON.parse(response.text || '{ "text": "" }').text;
        results.push({ depth, query: currentQuery, analysis: rawText });

        // Stage 2: Entity Extraction for the next depth layer
        const entityExtraction = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `Extract unique entities (Project IDs, Vessel Names, Specific Coordinates, Organizations) from this text 
          as a simple comma-separated list. Return ONLY the list for JSON: { "entities": Array<string> }. Text: ${rawText}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                entities: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        });
        
        const newEntities = JSON.parse(entityExtraction.text || '{ "entities": [] }').entities;
        newEntities.forEach((entity: string) => {
          if (!discoveredEntities.has(entity.toLowerCase())) {
            discoveredEntities.add(entity.toLowerCase());
            queriesToProcess.push(`Investigate connection and history of: ${entity}`);
          }
        });
      } catch (e) {
        console.error(`Error at depth ${depth} for query ${currentQuery}:`, e);
      }
    }
    
    // Limit queries to process to avoid explosion
    if (queriesToProcess.length > 5) queriesToProcess = queriesToProcess.slice(0, 5);
    if (queriesToProcess.length === 0) break;
  }

  // Stage 3: Celestial Correlation
  const celestialEvents = await fetchCelestialEvents();
  
  // Stage 4: Synthesis into the final Dossier
  const finalResponse = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: `Synthesize all gathered data into a Strategic Deep Intelligence Dossier. 
    Check if any discovered entities or events correlate with these celestial events: ${JSON.stringify(celestialEvents)}.
    Data: ${JSON.stringify(results)}.
    Return strictly as JSON: { "dossier": string }.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dossier: { type: Type.STRING }
        }
      }
    }
  });

  const dossier = JSON.parse(finalResponse.text || '{ "dossier": "Synthesis failed." }').dossier;
  return dossier;
}

export const explainAnomaly = async (title: string, summary: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Explain why the following event is considered anomalous. Be concise and highlight the deviation from expected trends or common occurrences. Event: "${title}". Summary: "${summary}"`,
      config: {
        systemInstruction: "You are a tactical anomaly analyst. Provide a sharp, concise explanation of the 'high strangeness' or deviation from norms."
      }
    });
    return response.text || "Anomaly reasoning unavailable.";
  } catch (error) {
    console.error("Anomaly explanation failed:", error);
    return "Failed to generate anomaly reasoning.";
  }
};

export const predictFutureTrends = async (cases: any[]): Promise<any[]> => {
  const ai = getAiClient();
  const specialty = localStorage.getItem('anomalyWatch_specialty') || 'GENERAL';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Analyze the following case data to identify recurring patterns, predict 3 future trends or anomalies, and suggest potential underlying causes or contributing factors. Cases: ${JSON.stringify(cases.slice(0, 15))}`,
      config: {
        systemInstruction: getTacticalInstruction(specialty),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              title: { type: Type.STRING },
              prediction: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              timeframe: { type: Type.STRING },
              patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
              causes: { type: Type.ARRAY, items: { type: Type.STRING } },
              contributingFactors: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Prediction failed:", error);
    return [];
  }
};

export const trackAnomalies = async (criteria: AlertSubscription): Promise<AnomalyTrackingResult | null> => {
  const ai = getAiClient();
  const specialty = localStorage.getItem('anomalyWatch_specialty') || 'GENERAL';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Search for recent global anomalies that match the following criteria:
      Keywords: ${criteria.keywords?.join(', ') || 'Any'}
      Category: ${criteria.category || 'Any'}
      Region: ${criteria.location || 'Global'}
      
      If a matching anomaly is found, provide:
      1. summary: A extremely concise summary of the event (maximum 2-3 sentences).
      2. explanation: A brief tactical explanation of why it matches the criteria and its significance (maximum 3 sentences).
      3. matchCriteria: A single sentence describing which criteria were met.
      
      CRITICAL: Keep the summary and explanation combined under 800 characters or 100 words total. Extremely concise, brief, and bullet-proof.
      
      Return strictly as JSON: { "summary": string, "explanation": string, "matchCriteria": string }.
      If no significant match is found, return an empty object {}.`,
      config: {
        systemInstruction: getTacticalInstruction(specialty),
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            explanation: { type: Type.STRING },
            matchCriteria: { type: Type.STRING }
          }
        }
      }
    });
    
    const result = safeJsonParse(response.text || "{}", { summary: '', explanation: '', matchCriteria: '' });
    if (result && result.summary) {
      return { ...result, timestamp: Date.now() };
    }
    return null;
  } catch (error) {
    console.error("Anomaly tracking failed:", error);
    return null;
  }
};

export interface TelemetryHarvestSighting {
  title: string;
  location: string;
  description: string;
  category: AnomalyCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const gatherIntelligenceFromRealTelemetry = async (
  seismicContext: string,
  flightsContext: string,
  spaceWeatherContext: string
): Promise<TelemetryHarvestSighting> => {
  const ai = getAiClient();
  const prompt = `CRITICAL SPECTRUM INTERCEPT IDENTIFIED:
  Analyze the following real-world earth & celestial sensor parameters captured over telemetry layers:
  
  [USGS RECENT SEISMIC DISTURBANCES]:
  ${seismicContext.slice(0, 1000)}
  
  [OPENSKY HIGH-ALTITUDE TRAJECTORIES STATE SUMMARIES]:
  ${flightsContext.slice(0, 1000)}
  
  [NOAA SPACE WEATHER SOLAR FORECAST]:
  ${spaceWeatherContext.slice(0, 1000)}
  
  TASK:
  You are the primary Sentinel Threat Correlation Engine. Evaluate this real-time multi-dimensional dataset. Extrapolate any localized spatial correlation (where high-altitude flight clusters, tectonic friction epicenters, or space solar wind levels intersect). 
  Synthesize a completely new, unique, realistic, and highly compelling classified intel report / anomaly incident.
  Return strictly as a JSON object: {
    "title": "A short dramatic title for the event",
    "location": "A specific human location/region name, e.g., 'Nevada, USA' or 'Gulf of Mexico' or a specific city/ocean area",
    "description": "A detailed intelligence report detailing the high-strangeness incident, correlating the flight activity, geomagnetic index, or seismic activity to support why this occurred right now. Make it sound extremely realistic, intelligent, and grounded in the data.",
    "category": "One of: 'UFO / UAP' | 'Phenomena' | 'Gov / Black Ops' | 'Site Intel' | 'Atmospheric' (choose UFO / UAP, Phenomena, or Gov / Black Ops by default)",
    "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  }`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          location: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          severity: { type: Type.STRING }
        },
        required: ["title", "location", "description", "category", "severity"]
      }
    }
  });

  const obj = JSON.parse(response.text || "{}");
  // Safeguard enum match
  let category: AnomalyCategory = 'UFO / UAP';
  const rawCat = obj.category || 'UFO / UAP';
  if (['UFO / UAP', 'Paranormal', 'Cryptid', 'Gov / Black Ops', 'Phenomena', 'Site Intel'].includes(rawCat)) {
    category = rawCat as AnomalyCategory;
  }
  return {
    title: obj.title || "Unclassified Anomaly Emitter",
    location: obj.location || "Sector 7G",
    description: obj.description || "Correlated spectrum friction event.",
    category,
    severity: (obj.severity && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(obj.severity)) ? obj.severity : 'MEDIUM'
  };
};

export const categorizeAnomaly = async (description: string): Promise<AnomalyCategory> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Categorize the following anomaly description into one of these categories: 
      'UFO / UAP', 'Paranormal', 'Cryptid', 'Gov / Black Ops', 'Phenomena', 'Site Intel', 
      'Geopolitical shifts', 'Scientific breakthroughs', 'Cultural trends', 
      'Economic anomalies', 'Technological oddities', 'Environmental events'.
      
      Description: "${description.slice(0, 500)}"
      
      Return ONLY the category name.`,
    });
    const result = response.text?.trim() as AnomalyCategory;
    return result;
  } catch (e) {
    return 'Phenomena';
  }
};

export const getDeepDiveExplainer = async (anomalyTitle: string, anomalySummary: string): Promise<DeepDiveData | null> => {
  const ai = getAiClient();
  const specialty = localStorage.getItem('anomalyWatch_specialty') || 'GENERAL';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Perform a comprehensive "Deep Dive" explainer for the following anomaly:
      Title: "${anomalyTitle}"
      Summary: "${anomalySummary}"
      
      Provide a detailed structured explanation covering:
      1. Historical background: The origins or historical context of this type of anomaly.
      2. Related events: A list of similar historical or recent events.
      3. Key figures: Any individuals, organizations, or groups notably involved.
      4. Potential future impacts: Scenarios or impacts this anomaly could have in the future.
      5. Summary: A concise, easy to understand wrap-up.
      
      Return strictly as JSON:
      {
        "historicalBackground": "string",
        "relatedEvents": ["string"],
        "keyFigures": ["string"],
        "potentialFutureImpacts": "string",
        "summary": "string"
      }`,
      config: {
        systemInstruction: getTacticalInstruction(specialty),
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            historicalBackground: { type: Type.STRING },
            relatedEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyFigures: { type: Type.ARRAY, items: { type: Type.STRING } },
            potentialFutureImpacts: { type: Type.STRING },
            summary: { type: Type.STRING }
          }
        }
      }
    });
    
    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Deep dive explainer failed:", error);
    return null;
  }
};

export const getDeepAnomalyAnalysis = async (anomalyTitle: string, anomalySummary: string): Promise<string> => {
  const ai = getAiClient();
  const specialty = localStorage.getItem('anomalyWatch_specialty') || 'GENERAL';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Perform a deep, objective analysis of the following significant anomaly:
      Title: "${anomalyTitle}"
      Summary: "${anomalySummary}"
      
      Provide a detailed explanation covering:
      1. Potential natural or conventional causes (e.g., atmospheric phenomena, sensor glitches).
      2. Contributing environmental or geopolitical factors.
      3. Relevant historical context or similar past events.
      4. A concluding objective assessment of its anomalous nature.
      
      Use a clear, informative, and objective tone.`,
      config: {
        systemInstruction: getTacticalInstruction(specialty),
        tools: [{ googleSearch: {} }]
      }
    });
    
    return response.text || "Deep analysis unavailable.";
  } catch (error) {
    console.error("Deep anomaly analysis failed:", error);
    return "Failed to generate deep analysis.";
  }
};

export const getAnomalyWatchDeepDive = async (
  anomalyTitle: string,
  anomalySummary: string = ""
): Promise<AnomalyDeepDiveExplanation> => {
  const ai = getAiClient();
  const specialty = localStorage.getItem('anomalyWatch_specialty') || 'GENERAL';

  const prompt = `You are the core intelligence engine for the 'ANOMALY WATCH' Assistant.
Provide a comprehensive 'Deep Dive' explanation for the following anomaly query or event:
Anomaly Title/Subject: "${anomalyTitle}"
Additional Context / Summary: "${anomalySummary}"

Requirements:
Your explanation MUST include these 3 critical sections:
1. Historical Context:
   - Origin and historical timeline of this anomaly or class of events.
   - Precursor cases or historical parallels (include title, approximate date, and brief description).
   - Historical significance in anomaly research.

2. Contributing Factors and Potential Causes:
   - Primary scientific or conventional hypotheses evaluated with estimated probability (e.g., "High", "Moderate", "Plausible but Unconfirmed").
   - Environmental, atmospheric, electromagnetic, astronomical, or technical factors that may have contributed.
   - High-strangeness or unresolved elements that resist standard explanations.

3. Expert and Organizational Views:
   - Official stances or statements from relevant agencies or bodies (e.g., AARO / US Dept of Defense, NASA, SETI, NOAA, USGS, academic research institutions, or specialized scientific task forces).
   - Specific key organizations or scientific teams that investigated or documented the event, along with their findings.
   - Overall consensus among scientific experts and anomaly intelligence analysts.

Provide a high-confidence summary and confidence rating (0-100).
Return strictly as a structured JSON object.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: getTacticalInstruction(specialty),
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            historicalContext: {
              type: Type.OBJECT,
              properties: {
                originAndTimeline: { type: Type.STRING },
                precursorCases: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      date: { type: Type.STRING },
                      description: { type: Type.STRING }
                    }
                  }
                },
                significance: { type: Type.STRING }
              }
            },
            contributingFactorsAndCauses: {
              type: Type.OBJECT,
              properties: {
                primaryHypotheses: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      hypothesis: { type: Type.STRING },
                      probability: { type: Type.STRING },
                      details: { type: Type.STRING }
                    }
                  }
                },
                environmentalOrTechnicalFactors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                fringeOrUnexplainedElements: { type: Type.STRING }
              }
            },
            expertAndOrganizationalViews: {
              type: Type.OBJECT,
              properties: {
                officialStance: { type: Type.STRING },
                keyOrganizations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      position: { type: Type.STRING },
                      levelOfConcern: { type: Type.STRING }
                    }
                  }
                },
                expertConsensus: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingUrls = groundingChunks
      .map((c: any) => ({ uri: c.web?.uri, title: c.web?.title || "ANOMALY WATCH Intel Record" }))
      .filter((u: any) => u.uri);

    const parsed = safeJsonParse(response.text || "{}", {
      title: anomalyTitle,
      summary: "Detailed intelligence synthesis complete.",
      confidenceScore: 85,
      historicalContext: {
        originAndTimeline: "Historical record spans multiple decades of observed anomalous activity.",
        precursorCases: [],
        significance: "High significance in anomalous phenomena tracking."
      },
      contributingFactorsAndCauses: {
        primaryHypotheses: [],
        environmentalOrTechnicalFactors: [],
        fringeOrUnexplainedElements: "Unresolved electromagnetic and trajectory signatures."
      },
      expertAndOrganizationalViews: {
        officialStance: "Under active government and scientific observation.",
        keyOrganizations: [],
        expertConsensus: "Requires multi-sensor verification."
      }
    });

    return {
      title: parsed.title || anomalyTitle,
      summary: parsed.summary || anomalySummary || "Deep dive analysis compiled.",
      confidenceScore: parsed.confidenceScore || 85,
      historicalContext: {
        originAndTimeline: parsed.historicalContext?.originAndTimeline || "Historical archives indicate recurring sightings in this atmospheric zone.",
        precursorCases: Array.isArray(parsed.historicalContext?.precursorCases) ? parsed.historicalContext.precursorCases : [],
        significance: parsed.historicalContext?.significance || "Pivotal case study in unexplained physical phenomena."
      },
      contributingFactorsAndCauses: {
        primaryHypotheses: Array.isArray(parsed.contributingFactorsAndCauses?.primaryHypotheses) ? parsed.contributingFactorsAndCauses.primaryHypotheses : [],
        environmentalOrTechnicalFactors: Array.isArray(parsed.contributingFactorsAndCauses?.environmentalOrTechnicalFactors) ? parsed.contributingFactorsAndCauses.environmentalOrTechnicalFactors : [],
        fringeOrUnexplainedElements: parsed.contributingFactorsAndCauses?.fringeOrUnexplainedElements || "Telemetry exhibits anomalous acceleration vectors."
      },
      expertAndOrganizationalViews: {
        officialStance: parsed.expertAndOrganizationalViews?.officialStance || "Acknowledged as an unidentified atmospheric phenomenon under active investigation.",
        keyOrganizations: Array.isArray(parsed.expertAndOrganizationalViews?.keyOrganizations) ? parsed.expertAndOrganizationalViews.keyOrganizations : [],
        expertConsensus: parsed.expertAndOrganizationalViews?.expertConsensus || "Scientific consensus calls for continuous multi-spectrum sensor monitoring."
      },
      groundingUrls
    };
  } catch (error) {
    console.error("ANOMALY WATCH Deep Dive generation failed:", error);
    return {
      title: anomalyTitle,
      summary: "Uplink degraded during deep dive synthesis.",
      confidenceScore: 50,
      historicalContext: {
        originAndTimeline: "Historical records show recurring atmospheric/orbital phenomena in this sector.",
        precursorCases: [
          { title: "Archival Correlated Intercept", date: "Archival Record", description: "Correlated electromagnetic and radar telemetry recorded." }
        ],
        significance: "Classified anomaly record under active surveillance."
      },
      contributingFactorsAndCauses: {
        primaryHypotheses: [
          { hypothesis: "Atmospheric Refraction / Ionospheric Friction", probability: "Moderate", details: "Meteorological inversion layers or plasma discharge." },
          { hypothesis: "Unidentified Aerospace Phenomenon", probability: "High Interest", details: "Non-ballistic trajectory shifts beyond commercial performance flight envelopes." }
        ],
        environmentalOrTechnicalFactors: ["Geomagnetic solar wind interactions", "Radar cross-section fluctuations"],
        fringeOrUnexplainedElements: "High entropy electromagnetic signatures."
      },
      expertAndOrganizationalViews: {
        officialStance: "AARO and NASA UAP study groups acknowledge persistent unidentified aerospace radar tracks.",
        keyOrganizations: [
          { name: "AARO (All-domain Anomaly Resolution Office)", position: "Unresolved object classification pending further sensor data", levelOfConcern: "HIGH" },
          { name: "NASA UAP Independent Study", position: "Recommends unclassified multi-spectral sensors for rigorous evaluation", levelOfConcern: "MODERATE" }
        ],
        expertConsensus: "Scientific consensus favors rigorous physical multi-sensor data collection before concluding novel physics or non-human origin."
      },
      groundingUrls: []
    };
  }
};

export const getRelatedIntelForPreview = async (
  title: string, 
  summary: string
): Promise<Array<{title: string, snippet: string, url: string, source: string, type: 'ARCHIVES' | 'OPSLOG'}>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Given the intel item: "${title}" - "${summary.slice(0, 500)}", 
      search through the available intelligence and find high-relevance correlations from other sources 
      like OpsLog dossiers or Archive records. 
      Return a JSON array of up to 3 highly correlated items.
      Format: [ { "title": string, "snippet": string, "url": string, "source": string, "type": "ARCHIVES" | "OPSLOG" } ].`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              snippet: { type: Type.STRING },
              url: { type: Type.STRING },
              source: { type: Type.STRING },
              type: { type: Type.STRING }
            }
          }
        }
      }
    });
    
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Related intel fetch failed:", error);
    return [];
  }
};

// Mock Rate Limiter
const lastCallMap = new Map<string, number>();
const RATE_LIMIT_MS = 5000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const lastCall = lastCallMap.get(key) || 0;
  if (now - lastCall < RATE_LIMIT_MS) return false;
  lastCallMap.set(key, now);
  return true;
}

export const getInDepthReport = async (title: string, snippet: string): Promise<FullReport> => {
  const ai = getAiClient();
  const id = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  if (!checkRateLimit(id)) {
      const cached = await CacheOps.getReport(id);
      if (cached) return cached;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Generate a comprehensive 'Deep Dive' intelligence report for ANOMALY WATCH based on:
      Title: "${title}"
      Snippet: "${snippet}"

      The inDepthAnalysis field MUST be markdown formatted and structured into these explicit sections:
      ## 📜 Historical Context
      (Timeline of occurrence, historical origins, precursor cases, and historical significance)

      ## ⚡ Contributing Factors & Potential Causes
      (Primary scientific hypotheses, environmental or technical factors, and unresolved high-strangeness elements)

      ## 🏛️ Expert & Organizational Views
      (Official positions of agencies like AARO, NASA, SETI, NOAA, or USGS, key scientific investigation teams, and expert consensus)

      Estimate a confidence score from 0-100 based on available sources and grounding.

      Return strictly as JSON: { "title": string, "summary": string, "inDepthAnalysis": string, "citations": Array<{uri: string, title: string}>, "confidenceScore": number }.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            inDepthAnalysis: { type: Type.STRING },
            citations: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  uri: { type: Type.STRING },
                  title: { type: Type.STRING }
                }
              } 
            },
            confidenceScore: { type: Type.NUMBER }
          }
        }
      }
    });
    
    const data = JSON.parse(response.text || "{}");
    const report: FullReport = {
      title: data.title || title,
      summary: data.summary || "",
      inDepthAnalysis: data.inDepthAnalysis || "Report content could not be generated.",
      groundingUrls: data.citations || [],
      timestamp: Date.now(),
      confidenceScore: Math.min(100, Math.max(0, data.confidenceScore || 70))
    };
    
    await CacheOps.saveReport(id, report);
    return report;
  } catch (error) {
    console.error("In-depth report generation failed:", error);
    return { title, summary: "Error generating report", inDepthAnalysis: "Failed to fetch.", groundingUrls: [], timestamp: Date.now(), confidenceScore: 0 };
  }
};

export const getRelatedHistoricalCases = async (anomalyTitle: string, anomalySummary: string): Promise<HistoricalCasesResult> => {
  const ai = getAiClient();
  const specialty = localStorage.getItem('anomalyWatch_specialty') || 'GENERAL';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Identify 3-5 related historical anomaly cases for the following event:
      Title: "${anomalyTitle}"
      Summary: "${anomalySummary}"
      
      Return strictly as JSON: [ { "title": string, "summary": string, "date": string } ].`,
      config: {
        systemInstruction: getTacticalInstruction(specialty),
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              date: { type: Type.STRING }
            }
          }
        }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const urls = groundingChunks
      .map((c: any) => ({ uri: c.web?.uri, title: c.web?.title || "Historical Intelligence Source" }))
      .filter((u: any) => u.uri);
    
    return {
      cases: JSON.parse(response.text || "[]"),
      groundingUrls: urls
    };
  } catch (error) {
    console.error("Historical cases search failed:", error);
    return { cases: [], groundingUrls: [] };
  }
};
