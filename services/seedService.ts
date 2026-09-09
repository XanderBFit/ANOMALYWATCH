import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db, isCloudEnabled } from "./firebaseService";
import { CaseRecord, SignalLogEntry, UFOSighting, AnomalyCategory } from "../types";
import { VaultPersistence } from "./vaultPersistence";
import rawHistoricalData from "../src/data/historicalArchiveSeed.json";

export interface HistoricalRawItem {
  id: string;
  collection: "CaseRecords" | "SignalArchive";
  timestamp: string;
  eventDate: string;
  title: string;
  category: string;
  domain: string;
  coordinates: {
    lat: number;
    lng: number;
    alt_ft: number;
  };
  locationName: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidenceScore: number;
  sensorSignatures: string[];
  primarySources: string[];
  summary: string;
  caseDossier: {
    evidenceTier: string;
    telemetryLog: string;
    falsePositivesEliminated: string[];
  };
}

export const historicalArchiveData: HistoricalRawItem[] = rawHistoricalData as HistoricalRawItem[];

/**
 * Executes a batch write to Firestore for both CaseRecords and SignalArchive collections
 * and synchronizes with local IndexedDB (VaultPersistence).
 */
export async function executeBatchSeed(): Promise<{ success: boolean; seededCount: number; error?: string }> {
  try {
    const casesToBatch: CaseRecord[] = [];
    const signalsToBatch: any[] = [];

    let batch = writeBatch(db);
    let operationCount = 0;

    for (const item of historicalArchiveData) {
      const itemTimestampMs = new Date(item.timestamp).getTime();

      if (item.collection === "CaseRecords") {
        const caseRecord: CaseRecord = {
          id: item.id,
          createdTimestamp: itemTimestampMs,
          updatedTimestamp: itemTimestampMs,
          title: item.title,
          category: item.category,
          status: "Corroborated",
          evidenceTier: (item.caseDossier.evidenceTier.includes("Tier-1") ? "Sensor-validated" : "Official-doc-supported") as any,
          confidenceScore: Math.round(item.confidenceScore * 100),
          location: item.locationName,
          summary: item.summary,
          anomalyReasoning: item.caseDossier.telemetryLog,
          briefing: `Sensors: ${item.sensorSignatures.join(", ")}. Eliminated: ${item.caseDossier.falsePositivesEliminated.join(", ")}`,
          artifacts: [
            {
              id: `art-${item.id}`,
              type: "Sensor Telemetry & Official Records",
              content: item.caseDossier.telemetryLog,
              timestamp: itemTimestampMs,
              urls: item.primarySources.map(s => ({ uri: "https://www.archives.gov", title: s })),
              location: item.locationName,
              severity: item.severity
            }
          ],
          notes: [
            {
              id: `note-${item.id}`,
              timestamp: itemTimestampMs,
              author: "HISTORICAL_ARCHIVE_NODE",
              text: `Verified via ${item.primarySources.join(" & ")}. ${item.caseDossier.telemetryLog}`
            }
          ],
          tags: [item.domain, item.category, item.severity, ...item.sensorSignatures.slice(0, 2)],
          relatedCaseIds: [],
          isPublicFeed: true
        };

        casesToBatch.push(caseRecord);

        if (isCloudEnabled()) {
          const docRef = doc(db, "CaseRecords", item.id);
          batch.set(docRef, {
            ...caseRecord,
            timestamp: serverTimestamp(),
            coordinates: item.coordinates,
            sensorSignatures: item.sensorSignatures,
            caseDossier: item.caseDossier
          });
          operationCount++;
        }
      } else if (item.collection === "SignalArchive") {
        const signalEntry = {
          id: item.id,
          timestamp: item.timestamp,
          operative: "HISTORICAL_SENSOR_ARRAY",
          specialty: item.domain,
          query: item.title,
          response: `${item.summary}\n\nTELEMETRY LOG:\n${item.caseDossier.telemetryLog}\n\nPRIMARY SOURCES:\n${item.primarySources.join(", ")}`,
          groundingUrls: item.primarySources.map(s => ({ uri: "https://www.noaa.gov", title: s })),
          type: "SIGNAL_INTERCEPT",
          category: item.category,
          severity: item.severity,
          confidenceScore: item.confidenceScore,
          coordinates: item.coordinates,
          sensorSignatures: item.sensorSignatures,
          caseDossier: item.caseDossier
        };

        signalsToBatch.push(signalEntry);

        if (isCloudEnabled()) {
          const docRef = doc(db, "SignalArchive", item.id);
          batch.set(docRef, {
            ...signalEntry,
            timestamp: serverTimestamp()
          });
          operationCount++;
        }
      }
    }

    // Write to local IndexedDB vault persistence for offline / immediate client responsiveness
    if (casesToBatch.length > 0) {
      await VaultPersistence.Cases.saveAll(casesToBatch);
    }
    if (signalsToBatch.length > 0) {
      await VaultPersistence.Signals.saveAll(signalsToBatch as any);
    }

    // Commit batch to Firestore if cloud sync is enabled
    if (isCloudEnabled() && operationCount > 0) {
      await batch.commit();
      console.log(`[HISTORICAL_SEED]: Successfully committed ${operationCount} records in Firestore batch!`);
    }

    localStorage.setItem("anomalyWatch_historical_seed_v1", "COMPLETED");
    return { success: true, seededCount: historicalArchiveData.length };
  } catch (error) {
    console.error("[HISTORICAL_SEED_ERROR]: Batch write failed", error);
    return {
      success: false,
      seededCount: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Maps all 26 historical seed items into UFOSighting records for radar map & timeline rendering.
 */
export function getHistoricalSeedSightings(): UFOSighting[] {
  return historicalArchiveData.map((item) => {
    let mappedCategory: AnomalyCategory = "UFO / UAP";
    const catLower = item.category.toLowerCase();
    const domainLower = item.domain.toLowerCase();

    if (catLower.includes("solar") || domainLower.includes("space weather")) {
      mappedCategory = "Phenomena";
    } else if (catLower.includes("seismic") || domainLower.includes("seismic")) {
      mappedCategory = "Environmental events";
    } else if (catLower.includes("bolide") || domainLower.includes("celestial")) {
      mappedCategory = "Scientific breakthroughs";
    } else if (catLower.includes("intercept") || domainLower.includes("defense")) {
      mappedCategory = "Gov / Black Ops";
    } else if (catLower.includes("em") || catLower.includes("radio")) {
      mappedCategory = "Technological oddities";
    }

    const itemTimestampMs = new Date(item.timestamp).getTime();

    return {
      id: item.id,
      title: item.title,
      date: item.eventDate,
      location: item.locationName,
      description: `${item.summary} [Sensors: ${item.sensorSignatures.join(", ")}]`,
      category: mappedCategory,
      severity: item.severity,
      timestamp: itemTimestampMs,
      operative: "HISTORICAL_ARCHIVE",
      photoUrl: undefined,
      coordinates: item.coordinates,
      latitude: item.coordinates?.lat,
      longitude: item.coordinates?.lng
    };
  });
}

/**
 * Auto-runs batch seed on application startup if not already seeded locally.
 */
export async function autoRunBatchSeedIfNeeded(): Promise<void> {
  try {
    const seedStatus = typeof window !== 'undefined' ? localStorage.getItem("anomalyWatch_historical_seed_v1") : null;
    if (!seedStatus) {
      console.log("[HISTORICAL_SEED]: Initializing automatic batch write for historical archives...");
      await executeBatchSeed();
    }
  } catch (err) {
    console.warn("[HISTORICAL_SEED]: Auto-seed skipped gracefully:", err);
  }
}
