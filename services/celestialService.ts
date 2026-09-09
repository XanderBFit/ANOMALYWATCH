import { Type } from "@google/genai";
import { CelestialEvent } from "../types";
import { getAiClient } from "./aiClient";

const FALLBACK_EVENTS: CelestialEvent[] = [
  {
    id: "lyrids-2026",
    title: "Lyrids Meteor Shower",
    type: "Meteor Shower",
    date: "2026-04-22",
    visibility: "Global",
    description: "One of the oldest known meteor showers, produced by debris from Comet C/1861 G1 Thatcher.",
    peakTime: "Late night April 21 to dawn April 22"
  },
  {
    id: "eta-aquariids-2026",
    title: "Eta Aquariids Meteor Shower",
    type: "Meteor Shower",
    date: "2026-05-06",
    visibility: "Southern Hemisphere / Tropics",
    description: "Meteor shower associated with Halley's Comet.",
    peakTime: "Pre-dawn May 6"
  },
  {
    id: "total-solar-eclipse-2026",
    title: "Total Solar Eclipse",
    type: "Eclipse",
    date: "2026-08-12",
    visibility: "Arctic, Greenland, Iceland, Spain",
    description: "The first total solar eclipse visible from Iceland in over 50 years.",
    peakTime: "Varies by location"
  },
  {
    id: "perseids-2026",
    title: "Perseids Meteor Shower",
    type: "Meteor Shower",
    date: "2026-08-12",
    visibility: "Northern Hemisphere",
    description: "One of the most popular meteor showers of the year, often producing bright fireballs.",
    peakTime: "Night of August 12"
  }
];

const CACHE_KEY = 'anomaly_celestial_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const fetchCelestialEvents = async (retryCount = 0): Promise<CelestialEvent[]> => {
  // Check Cache First
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  }

  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: "List upcoming major celestial events for 2026, including meteor showers, eclipses, and planetary alignments. Provide details on dates, visibility, and a brief description for each.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              type: { 
                type: Type.STRING,
                enum: ['Meteor Shower', 'Eclipse', 'Planetary Alignment', 'Other']
              },
              date: { type: Type.STRING },
              visibility: { type: Type.STRING },
              description: { type: Type.STRING },
              peakTime: { type: Type.STRING }
            },
            required: ["id", "title", "type", "date", "visibility", "description"]
          }
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    const events = JSON.parse(response.text);
    
    // Update Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: events,
      timestamp: Date.now()
    }));

    return events;
  } catch (error: any) {
    console.warn(`Attempt ${retryCount + 1} failed:`, error.message);

    // Retry logic for 503/Spikes
    if (retryCount < 2 && (error.message?.includes('503') || error.message?.includes('demand'))) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return fetchCelestialEvents(retryCount + 1);
    }

    console.error("Error fetching celestial events, using fallback:", error);
    
    // Return cached data even if expired if API fails
    if (cached) {
      return JSON.parse(cached).data;
    }

    return FALLBACK_EVENTS;
  }
};

export const checkCorrelation = async (uapDate: string, uapLocation: string, retryCount = 0): Promise<{ correlated: boolean; event?: CelestialEvent; reasoning?: string }> => {
  const events = await fetchCelestialEvents();
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Analyze if a UAP incident on ${uapDate} at ${uapLocation} correlates with any of these celestial events: ${JSON.stringify(events)}. 
      Return JSON: { "correlated": boolean, "eventId": string, "reasoning": string }.`,
      config: { responseMimeType: "application/json" }
    });
    
    const result = JSON.parse(response.text || '{}');
    if (result.correlated) {
      const event = events.find(e => e.id === result.eventId);
      return { correlated: true, event, reasoning: result.reasoning };
    }
    return { correlated: false };
  } catch (error: any) {
    console.warn(`Correlation check attempt ${retryCount + 1} failed:`, error.message);

    if (retryCount < 2 && (error.message?.includes('503') || error.message?.includes('demand'))) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return checkCorrelation(uapDate, uapLocation, retryCount + 1);
    }
    
    return { correlated: false };
  }
};
