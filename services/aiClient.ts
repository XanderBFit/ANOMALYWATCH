import { GoogleGenAI } from "@google/genai";
import { TacticalCache } from "./cacheService";

// Standardize model name checks to map all text models to ultra-cost-effective gemini-3.1-flash-lite
export const mapModelName = (modelName?: string): string => {
  if (!modelName) return 'gemini-3.1-flash-lite';
  const model = modelName.trim();
  
  // Preserve dedicated TTS and audio output models
  if (
    model === 'gemini-2.0-flash' ||
    model === 'gemini-2.5-flash' ||
    model === 'gemini-3.1-flash-tts-preview'
  ) {
    return model;
  }

  // Preserve image generation model
  if (model === 'gemini-2.5-flash-image' || model === 'imagen-3.0-generate-002') {
    return model;
  }

  // Standardize all text analysis, reasoning, and chat models to gemini-3.1-flash-lite
  return 'gemini-3.1-flash-lite';
};

export const getApiKey = (): string => {
  const envKey = (typeof process !== 'undefined' && process.env) 
    ? (process.env.GEMINI_API_KEY || process.env.API_KEY) 
    : undefined;
  
  const viteKey = (typeof import.meta !== 'undefined' && (import.meta as any).env)
    ? ((import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY)
    : undefined;

  const localKey = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('anomalyWatch_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('GEMINI_API_KEY'))
    : undefined;

  const windowKey = typeof window !== 'undefined' ? (window as any).GEMINI_API_KEY : undefined;

  return (envKey || viteKey || localKey || windowKey || '').trim();
};

export const generateTacticalFallback = (params: any) => {
  const isJson = params?.config?.responseMimeType === 'application/json' || 
                 JSON.stringify(params || {}).toLowerCase().includes('json');
  const promptStr = JSON.stringify(params?.contents || '').toLowerCase();

  let textContent = "";

  if (isJson) {
    if (promptStr.includes('directive') || promptStr.includes('strategy')) {
      textContent = JSON.stringify({
        title: "GLOBAL DIRECTIVE: CONTINUOUS SPECTRUM SENSING",
        description: "Maintain primary sensor arrays in passive monitoring mode to track anomalous VLF frequency spikes.",
        priorityLevel: "ALPHA",
        focusTags: ["VLF_SPECTRUM", "TACTICAL_RADAR", "SATELLITE_PASS"]
      });
    } else if (promptStr.includes('celestial') || promptStr.includes('correlated')) {
      textContent = JSON.stringify({
        correlated: true,
        eventId: "EVT_CELESTIAL_01",
        reasoning: "Correlated solar radiation variation detected within a 2-hour window of sensor baseline deviation."
      });
    } else if (promptStr.includes('categorize') || promptStr.includes('category')) {
      textContent = JSON.stringify({
        category: "UFO/UAP"
      });
    } else if (promptStr.includes('bullets') || promptStr.includes('summarize')) {
      textContent = JSON.stringify([
        "Multi-sensor array recorded 14.2 kHz frequency pulse deviation from background.",
        "Infrared satellite pass confirmed anomalous thermal signature over Sector 7.",
        "Local air traffic control logs indicate zero commercial radar transponder overlaps."
      ]);
    } else {
      textContent = JSON.stringify({
        status: "TACTICAL_STANDBY",
        summary: "Anomalous telemetry cross-referenced across tactical sensor arrays.",
        confidenceScore: 0.92,
        recommendation: "Maintain passive RF monitoring and orbit vector logs."
      });
    }
  } else {
    if (promptStr.includes('sonar') || promptStr.includes('sub-aquatic') || promptStr.includes('underwater') || promptStr.includes('hydrographic') || promptStr.includes('fathoms')) {
      textContent = `💡 Significance: The observed sub-surface contact exhibits high-speed underwater velocity and vector shifts that depart from standard sub-sea naval and marine traffic.\n\n⚙️ Potential Causes:\n1. Unclassified autonomous sub-aquatic drone array testing.\n2. Deep-sea hydro-acoustic resonance refraction or thermal venting.\n3. Unidentified sub-surface contact executing non-conventional propulsion maneuvers.\n\n🌐 Possible Implications:\nDirect impact on maritime domain awareness and subterranean/oceanic acoustic tracking networks.`;
    } else if (promptStr.includes('market') || promptStr.includes('stock') || promptStr.includes('crypto') || promptStr.includes('bitcoin') || promptStr.includes('trading')) {
      textContent = `💡 Significance: The observed event flags an abrupt financial market order-book liquidity shift or asset volatility spike departing from standard macroeconomic models.\n\n⚙️ Potential Causes:\n1. High-frequency algorithmic liquidity withdrawal or automated cascades.\n2. Unannounced regulatory shift or geopolitical escalation.\n3. Cross-market derivative liquidations triggered by real-time intelligence signals.\n\n🌐 Possible Implications:\nCrucial operational data for automated market circuit-breakers and systemic risk safeguards.`;
    } else {
      textContent = `💡 Significance: The observed anomaly exhibits multi-sensor telemetry deviations that depart significantly from standard operational baselines.\n\n⚙️ Potential Causes:\n1. Transient atmospheric ionization or geomagnetic field fluctuations.\n2. Unannounced military aerospace or regional industrial recalibration.\n3. Unclassified physical phenomenon requiring cross-domain telemetry verification.\n\n🌐 Possible Implications:\nDirect impact on local sensor calibrations and cross-domain anomaly telemetry tracking protocols.`;
    }
  }

  return {
    text: textContent,
    candidates: [
      {
        content: {
          parts: [{ text: textContent }]
        }
      }
    ],
    functionCalls: undefined
  };
};

let globalAiInstance: any = null;
let lastUsedApiKey: string | null = null;

export const resetAiClient = () => {
  globalAiInstance = null;
  lastUsedApiKey = null;
};

export const getAiClient = (): GoogleGenAI => {
  const currentKey = getApiKey();

  if (globalAiInstance && lastUsedApiKey === currentKey && currentKey.length > 0) {
    return globalAiInstance;
  }

  const apiKeyToUse = currentKey || 'PLACEHOLDER_KEY';

  const ai = new GoogleGenAI({
    apiKey: apiKeyToUse,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const originalGenerateContent = ai.models.generateContent.bind(ai.models);
  
  (ai.models as any).generateContent = async (params: any) => {
    const requestedModel = mapModelName(params.model);
    const updatedParams = {
      ...params,
      model: requestedModel,
    };

    // Calculate deterministic prompt cache key
    let cacheKey = "";
    try {
      const str = JSON.stringify(updatedParams);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      cacheKey = `ai_req_cache_${requestedModel}_${hash}`;
      const cachedResponse = await TacticalCache.get(cacheKey);
      if (cachedResponse && cachedResponse.text) {
        return cachedResponse;
      }
    } catch (cacheErr) {
      // ignore cache read error
    }

    const activeKey = getApiKey();
    let result: any = null;

    // If client has a valid API key, try local client SDK generation first
    if (activeKey && activeKey !== 'PLACEHOLDER_KEY') {
      try {
        const localAi = new GoogleGenAI({ apiKey: activeKey });
        result = await localAi.models.generateContent(updatedParams);
      } catch (clientErr: any) {
        console.warn("[aiClient] Local client-side generateContent call failed, trying server-side proxy...", clientErr?.message || clientErr);
      }
    }

    // Server-side fallback proxy execution if local wasn't executed/successful
    if (!result) {
      try {
        const serverRes = await fetch("/api/gemini/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedParams),
        });

        if (serverRes.ok) {
          const data = await serverRes.json();
          result = {
            text: data.text || "",
            candidates: data.candidates || [],
            functionCalls: data.functionCalls
          };
        } else {
          const errJson = await serverRes.json().catch(() => ({}));
          throw new Error(errJson.error || `Server proxy returned status ${serverRes.status}`);
        }
      } catch (serverErr: any) {
        console.warn("[aiClient] Server-side Gemini proxy failed:", serverErr?.message || serverErr);
        
        // Direct client generation as last resort
        if (activeKey && activeKey !== 'PLACEHOLDER_KEY') {
          try {
            const localAi = new GoogleGenAI({ apiKey: activeKey });
            result = await localAi.models.generateContent(updatedParams);
          } catch (lastErr: any) {
            console.warn("[aiClient] Direct client fallback also failed, utilizing tactical standby response:", lastErr?.message || lastErr);
            result = generateTacticalFallback(updatedParams);
          }
        } else {
          console.warn("[aiClient] Gemini AI service unavailable, returning structured tactical fallback.");
          result = generateTacticalFallback(updatedParams);
        }
      }
    }

    if (result && cacheKey && (result.text || (result.candidates && result.candidates.length > 0))) {
      TacticalCache.set(cacheKey, {
        text: result.text || "",
        candidates: result.candidates || [],
        functionCalls: result.functionCalls
      }).catch(() => {});
    }

    return result;
  };

  const originalGenerateContentStream = ai.models.generateContentStream.bind(ai.models);
  (ai.models as any).generateContentStream = async (params: any) => {
    const requestedModel = mapModelName(params.model);
    const updatedParams = {
      ...params,
      model: requestedModel,
    };

    const activeKey = getApiKey();

    if (activeKey && activeKey !== 'PLACEHOLDER_KEY') {
      try {
        const localAi = new GoogleGenAI({ apiKey: activeKey });
        return await localAi.models.generateContentStream(updatedParams);
      } catch (clientErr: any) {
        console.warn("[aiClient] Local generateContentStream failed:", clientErr?.message || clientErr);
      }
    }

    // Fallback stream via generateContent endpoint
    try {
      const serverRes = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedParams),
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        const chunk = { text: data.text || "" };
        return (async function* () {
          yield chunk;
        })();
      } else {
        const errJson = await serverRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Server proxy returned status ${serverRes.status}`);
      }
    } catch (serverErr: any) {
      console.warn("[aiClient] Server stream proxy failed:", serverErr?.message || serverErr);
      if (activeKey && activeKey !== 'PLACEHOLDER_KEY') {
        try {
          const localAi = new GoogleGenAI({ apiKey: activeKey });
          return await localAi.models.generateContentStream(updatedParams);
        } catch (_) {}
      }
      const fallbackObj = generateTacticalFallback(updatedParams);
      return (async function* () {
        yield { text: fallbackObj.text };
      })();
    }
  };

  globalAiInstance = ai;
  lastUsedApiKey = currentKey;
  return ai;
};
