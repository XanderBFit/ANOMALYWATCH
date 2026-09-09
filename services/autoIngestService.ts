import { db, isCloudEnabled, UserOps } from "./firebaseService";
import { CaseOps } from "./caseOps";
import { SightingOps } from "./firebaseService";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { UFOSighting, AnomalyCategory } from "../types";
import { RedditService } from "./redditService";
import { gatherIntelligenceFromRealTelemetry } from "./geminiService";

export const AutoIngestService = {
  /**
   * Checks if the active sightings list is currently empty, and if so,
   * fetches fresh real-world telemetry from Reddit and NOAASWPC to seed the global tactical layers.
   */
  seedDatabaseIfEmpty: async (addLog?: (msg: string) => void): Promise<number> => {
    if (!isCloudEnabled()) {
      addLog?.("⚠️ Local sandboxed storage active. Remote indexing bypassed.");
      return 0;
    }

    try {
      addLog?.("📡 Connection initialized. Verifying global AnomalyVault registers...");
      const snapshot = await getDocs(collection(db, "UFOSightings"));
      
      if (!snapshot.empty) {
        addLog?.(`✅ AnomalyVault is healthy. ${snapshot.size} active telemetry sightings verified in index.`);
        return 0;
      }

      addLog?.("⚠️ Empty AnomalyVault detected! Commencing auto-harvest of live OSINT...");
      
      // 1. Fetch Reddit posts to seed real intelligence
      addLog?.("🌐 Contacting Reddit OSINT Uplink for anomalies...");
      const redditRes = await RedditService.fetchLatestSubredditPosts(undefined, 8);
      const posts = redditRes.items || [];
      
      if (posts.length === 0) {
        addLog?.("⚠️ No active conversations returned. Commencing live search grounded harvest...");
        await AutoIngestService.loadBaselineAnomalies(addLog);
        return 1;
      }

      addLog?.(`📡 Retrieved ${posts.length} live broadcast transcripts from anomalous forums.`);
      let ingestsCount = 0;

      for (const post of posts.slice(0, 5)) {
        addLog?.(`⚡ Analyzing transcribing telemetry: r/${post.subreddit} - "${post.title.substring(0, 45)}..."`);
        
        // Simple heuristic rules to categorize anomalies
        let category: AnomalyCategory = "UFO / UAP";
        if (post.subreddit?.toLowerCase().includes("paranormal")) {
          category = "Paranormal";
        } else if (post.subreddit?.toLowerCase().includes("highstrangeness")) {
          category = "Phenomena";
        } else if (post.selftext?.toLowerCase().includes("cryptid") || post.selftext?.toLowerCase().includes("sasquatch") || post.selftext?.toLowerCase().includes("creature")) {
          category = "Cryptid";
        } else if (post.title?.toLowerCase().includes("military") || post.title?.toLowerCase().includes("space force") || post.selftext?.toLowerCase().includes("classified")) {
          category = "Gov / Black Ops";
        }

        const severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = post.score > 250 ? "CRITICAL" : post.score > 100 ? "HIGH" : post.score > 30 ? "MEDIUM" : "LOW";

        // Generate location by analyzing the post or utilizing known locations
        let location = "Pacific Ocean";
        const locationMatches = post.selftext.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s[A-Z]{2,})\b/g) || 
                              post.title.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s[A-Z]{2,})\b/g);
        if (locationMatches && locationMatches.length > 0) {
          location = locationMatches[0];
        } else {
          // Fallback to high-frequency anomalous locations
          const fallbacks = [
            "Pine Gap, Australia", "Dulce, New Mexico", "Mount Shasta, California", 
            "Point Pleasant, West Virginia", "Sedona, Arizona", "Groom Lake, Nevada",
            "Perm Anomaly Zone, Russia", "Skinwalker Ranch, Utah", "Rendlesham Forest, UK"
          ];
          const hashVal = post.title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          location = fallbacks[hashVal % fallbacks.length];
        }

        // Add to Sightings Store
        const sightingData = {
          title: post.title,
          date: new Date(post.created_utc * 1000).toLocaleDateString(),
          location: location,
          description: post.selftext.substring(0, 600) || `No body text. Original Link: ${post.permalink}`,
          category: category,
          severity: severity
        };
        
        await SightingOps.reportSighting(sightingData);

        // Add case dossier for deeper intelligence
        const contentSummary = `Reddit Broadcast intercepted via Authorized OSINT Uplink.
        
Subreddit: r/${post.subreddit}
Author: u/${post.author}
Upvote Index: ${post.score}
Replies: ${post.num_comments}
Reference Link: ${post.permalink}

=== FIELD TELEMETRY TRANSCRIPT ===
${post.selftext || "(Visual Observation Only)"}

=== OPERATIVE ACTION PROTOCOLS ===
1. Verify localized USGS crustal friction coordinates.
2. Cross-reference open OpenSky transponder flight clusters.
3. Keep threat levels classified. Ensure data encryption parameters remain optimal.`;

        await CaseOps.createCase(`r/${post.subreddit}: ${post.title}`, contentSummary, "Reddit Extraction");
        ingestsCount++;
      }

      addLog?.(`✅ Extraction completed successfully. Ingested ${ingestsCount} real anomalies!`);
      return ingestsCount;
    } catch (e: any) {
      console.error("Autoseeding failure:", e);
      addLog?.(`❌ Uplink synchronizer failure: ${e.message || "Anomalous timeout"}`);
      return 0;
    }
  },

  /**
   * Triggers a direct live real-time web & news ingestion pass using Gemini Search Grounding.
   */
  runAutoIngestionPass: async (addLog?: (msg: string) => void): Promise<number> => {
    addLog?.("📡 Gathering real-time intelligence using Gemini Search Grounded Live Harvester...");
    try {
      const { USGSService } = await import("./usgsService");
      const { RealWorldDataService } = await import("./realWorldDataService");

      let seismicTxt = "Recent global seismic baseline monitoring active.";
      let flightTxt = "Passive ADS-B high-altitude flight trajectories monitoring active.";
      let spaceWeatherTxt = "Solar flux levels within normal range.";

      try {
        const earthquakes = await USGSService.fetchLiveEarthquakes('all_day');
        if (earthquakes && earthquakes.length > 0) {
          seismicTxt = earthquakes.slice(0, 5).map(e => `${e.place}: M${e.mag}, depth ${e.depth}km`).join('; ');
        }
      } catch (_) {}

      try {
        const flights = await RealWorldDataService.fetchLiveFlights();
        if (flights && flights.length > 0) {
          flightTxt = flights.slice(0, 5).map(f => `${f.callsign} (${f.origin_country}): lat ${f.latitude}, lng ${f.longitude}`).join('; ');
        }
      } catch (_) {}

      const liveItem = await gatherIntelligenceFromRealTelemetry(
        seismicTxt,
        flightTxt,
        spaceWeatherTxt
      );
      if (!liveItem) {
        addLog?.("⚠️ Live search grounded query returned 0 new signals.");
        return 0;
      }
      addLog?.(`📡 Discovered live real-world anomaly signal: ${liveItem.title}`);
      await SightingOps.reportSighting({
        title: liveItem.title,
        date: new Date().toLocaleDateString(),
        location: liveItem.location || "Global Airspace",
        description: liveItem.description,
        category: (liveItem.category as AnomalyCategory) || "UFO / UAP",
        severity: liveItem.severity || "HIGH"
      });
      return 1;
    } catch (err: any) {
      console.error("Live ingestion pass error:", err);
      return 0;
    }
  },

  loadBaselineAnomalies: async (addLog?: (msg: string) => void) => {
    addLog?.("📡 Initiating emergency live stream acquisition from global news & forum uplinks...");
    try {
      const liveCount = await AutoIngestService.runAutoIngestionPass(addLog);
      addLog?.(`✅ Live acquisition completed. Ingested ${liveCount} real-time records.`);
    } catch (e: any) {
      addLog?.(`⚠️ Live stream acquisition interrupted: ${e.message || "Uplink reset"}`);
    }
  }
};
