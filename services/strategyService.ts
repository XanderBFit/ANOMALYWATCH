
import { CaseOps } from "./caseOps";
import { ArchiveOps, ScrapeOps } from "./firebaseService";
import { MissionDirective } from "../types";
import { getAiClient } from "./aiClient";

const MISSION_CACHE_KEY = 'anomaly_watch_global_directive';

const DEFAULT_DIRECTIVE: MissionDirective = {
  title: "SYSTEM VIGILANCE AND ANOMALY REVIEW",
  description: "",
  priorityLevel: 'ALPHA',
  focusTags: ['MONITORING STABILITY', 'HISTORICAL ANALYSIS', 'PREEMPTION'],
  timestamp: Date.now()
};

export const StrategyService = {
  /**
   * [STRATEGIC_SYNTHESIS]: Uses gemini-3-flash-lite-latest for near-instant strategic updates.
   */
  generateGlobalDirective: async (forceRefresh = false): Promise<MissionDirective> => {
    try {
      const cached = localStorage.getItem(MISSION_CACHE_KEY);
      if (cached && !forceRefresh) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 300000) return { ...DEFAULT_DIRECTIVE, ...parsed };
        } catch (e) {
          console.warn("Cached directive corrupted, regenerating...");
        }
      }

      const ai = getAiClient();
      const cases = await CaseOps.getAllCases();
      const scraped = await ScrapeOps.getScrapedData(5);
      
      // If no cases and no scraped data, use the highly specific default
      if (cases.length === 0 && scraped.length === 0) {
        localStorage.setItem(MISSION_CACHE_KEY, JSON.stringify(DEFAULT_DIRECTIVE));
        return DEFAULT_DIRECTIVE;
      }

      const caseSummary = cases.slice(0, 3).map(c => c.title).join(", ");
      const scrapeSummary = scraped.map(s => s.query).join(", ");
      const combinedSummary = `Cases: ${caseSummary}. Scraped: ${scrapeSummary}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Based on these recent anomaly sightings: "${combinedSummary}", define a 1-sentence "Global Strategic Directive" for the next 24 hours. Output in JSON: { "title": "...", "description": "...", "priorityLevel": "ALPHA|BETA|GAMMA", "focusTags": ["tag1", "tag2"] }`,
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
