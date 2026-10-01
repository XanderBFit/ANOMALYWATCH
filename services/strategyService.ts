
import { CaseOps } from "./caseOps";
import { ArchiveOps, ScrapeOps } from "./firebaseService";
import { MissionDirective } from "../types";
import { getAiClient } from "./aiClient";

const MISSION_CACHE_KEY = 'anomaly_watch_global_directive';

const DEFAULT_DIRECTIVE: MissionDirective = {
  title: "ELEVATED MULTI-SPECTRUM VIGILANCE // ACTIVE SECTOR SWEEP",
  description: "Global sensor arrays have detected clustered electromagnetic and high-altitude transponder deviations across Pacific and Continental air corridors. Field operatives are instructed to prioritize multi-spectral sensor verification and cross-reference USGS seismic telemetry.",
  priorityLevel: 'ALPHA',
  focusTags: ['IONOSPHERIC SHEAR', 'UAP TELEMETRY', 'AEROSPACE SWEEP'],
  timestamp: Date.now()
};

export const StrategyService = {
  /**
   * [STRATEGIC_SYNTHESIS]: Uses gemini-2.5-flash for real-time strategic updates.
   */
  generateGlobalDirective: async (forceRefresh = false): Promise<MissionDirective> => {
    try {
      const cached = localStorage.getItem(MISSION_CACHE_KEY);
      if (cached && !forceRefresh) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.description && parsed.description.length > 20 && Date.now() - parsed.timestamp < 15 * 60 * 1000) {
            return { ...DEFAULT_DIRECTIVE, ...parsed };
          }
        } catch (e) {
          console.warn("Cached directive corrupted, regenerating...");
        }
      }

      const ai = getAiClient();
      const cases = await CaseOps.getAllCases();
      const scraped = await ScrapeOps.getScrapedData(5);
      
      const caseSummary = cases.slice(0, 3).map(c => c.title).join(", ") || "Pacific corridor transponder disruption, high-altitude UAP intercept";
      const scrapeSummary = scraped.map(s => s.query).join(", ") || "Active atmospheric ionization anomalies";
      const combinedSummary = `Cases: ${caseSummary}. Scraped: ${scrapeSummary}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Today is ${new Date().toISOString().slice(0, 10)}. Based on these real-time anomaly intercepts: "${combinedSummary}", formulate a crisp, highly authoritative 1-to-2 sentence "Global Strategic Directive" for field operatives and observers over the next 12-24 hours. Output strictly in JSON: { "title": "...", "description": "...", "priorityLevel": "ALPHA|BETA|GAMMA", "focusTags": ["TAG1", "TAG2", "TAG3"] }`,
        config: { responseMimeType: "application/json" }
      });

      const rawText = response.text || '{}';
      const parsedData = JSON.parse(rawText);
      
      const directive: MissionDirective = {
        title: parsedData.title || DEFAULT_DIRECTIVE.title,
        description: parsedData.description || DEFAULT_DIRECTIVE.description,
        priorityLevel: parsedData.priorityLevel || DEFAULT_DIRECTIVE.priorityLevel,
        focusTags: Array.isArray(parsedData.focusTags) ? parsedData.focusTags : DEFAULT_DIRECTIVE.focusTags,
        timestamp: Date.now()
      };
      
      ArchiveOps.logSignal({
        query: `Strategic Update Request: [Ref: ${caseSummary.slice(0, 30)}...]`,
        response: `Mission: ${directive.title}\nDescription: ${directive.description}\nPriority: ${directive.priorityLevel}\nTags: ${directive.focusTags.join(', ')}`,
        groundingUrls: [],
        type: 'STRATEGIC_DIRECTIVE'
      });

      localStorage.setItem(MISSION_CACHE_KEY, JSON.stringify(directive));
      return directive;
    } catch (e) {
      console.error("Strategy generation failed", e);
      return DEFAULT_DIRECTIVE;
    }
  },

  getCurrentDirective: (): MissionDirective => {
    try {
      const cached = localStorage.getItem(MISSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...DEFAULT_DIRECTIVE, ...parsed };
      }
    } catch (e) {
      console.warn("Current directive retrieval failed", e);
    }
    return DEFAULT_DIRECTIVE;
  }
};
