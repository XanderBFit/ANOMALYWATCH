export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url: string;
  permalink: string;
  selftext: string;
}

export interface RedditResponse {
  items: RedditPost[];
  error?: string;
  engine?: string;
}

export const RedditService = {
  /**
   * Searches Reddit for a query, with optional subreddit limit
   */
  searchReddit: async (query: string, subreddit?: string, limit: number = 10): Promise<RedditResponse> => {
    try {
      let url = `/api/reddit?q=${encodeURIComponent(query)}&limit=${limit}`;
      if (subreddit) {
        url += `&subreddit=${encodeURIComponent(subreddit)}`;
      }
      const response = await fetch(url);
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const resData = await response.json();
        return {
          items: resData.items || [],
          engine: resData.engine || "PROXIED_FEED"
        };
      }
      return {
        items: [],
        engine: "OFFLINE_STANDBY"
      };
    } catch (e: any) {
      console.warn("Reddit search warning:", e?.message || e);
      return {
        items: [],
        engine: "CACHE_STANDBY"
      };
    }
  },

  /**
   * Fetches latest posts from target anomalous subreddits (e.g. UFOs, HighStrangeness)
   */
  fetchLatestSubredditPosts: async (subreddit?: string, limit: number = 12): Promise<RedditResponse> => {
    try {
      let url = `/api/reddit?limit=${limit}`;
      if (subreddit) {
        url += `&subreddit=${encodeURIComponent(subreddit)}`;
      }
      const response = await fetch(url);
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const resData = await response.json();
        return {
          items: resData.items || [],
          engine: resData.engine || "PROXIED_FEED"
        };
      }
      return {
        items: [],
        engine: "OFFLINE_STANDBY"
      };
    } catch (e: any) {
      console.warn("Subreddit fetch warning:", e?.message || e);
      return {
        items: [],
        engine: "CACHE_STANDBY"
      };
    }
  },

  /**
   * Analyzes a Reddit post to isolate potential anomaly indicators, tactical threat profiles, and credibility.
   */
  analyzeRedditPostWithAi: async (title: string, selftext: string, subreddit: string): Promise<any> => {
    try {
      const { getAiClient } = await import("./aiClient");
      const { Type } = await import("@google/genai");
      const ai = getAiClient();
      
      const contents = `Perform deep signal forensics on the following Reddit forum thread. Identify physical or cognitive anomalies, credibility vectors, and technical risk indices.
      
      SUBREDDIT: r/${subreddit}
      TITLE: ${title}
      POST TEXT: ${selftext || "[No details provided by author]"}
      
      Output strictly in JSON schema format.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { 
                type: Type.STRING, 
                description: "Primary anomaly category: 'UFO / UAP', 'Paranormal', 'Cryptid', 'Gov / Black Ops', 'Phenomena', or 'Site Intel'" 
              },
              severity: { 
                type: Type.STRING, 
                description: "Risk threat severity limit: 'CRITICAL', 'HIGH', 'MEDIUM', or 'LOW'" 
              },
              credibilityScore: { 
                type: Type.INTEGER, 
                description: "Integrity score from 0 to 100 based on internal consistency, details, and cross-references" 
              },
              tacticalAnalysis: { 
                type: Type.STRING, 
                description: "A highly sophisticated scientific-style military intelligence analysis of the reported phenomenon" 
              },
              suspiciousKeywords: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Extracted high-surprise or high-entropy signal keywords" 
              },
              isActionable: { 
                type: Type.BOOLEAN, 
                description: "Whether field operations should deploy tracking equipment to investigate" 
              }
            },
            required: ["category", "severity", "credibilityScore", "tacticalAnalysis", "suspiciousKeywords", "isActionable"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Reddit AI analysis failed:", e);
      return {
        category: "Phenomena",
        severity: "MEDIUM",
        credibilityScore: 50,
        tacticalAnalysis: "Forensic parser uplink disrupted. Atmospheric / RF interference preventing live AI telemetry extract on this thread.",
        suspiciousKeywords: ["ERROR", "INTERRUPT"],
        isActionable: false
      };
    }
  }
};
