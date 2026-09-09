export { db, auth, storage } from "../firebase";
import { db, auth, storage } from "../firebase";
import { 
  doc, 
  setDoc, 
  collection, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  deleteDoc, 
  orderBy, 
  limit, 
  addDoc,
  terminate,
  setLogLevel,
  getDocs,
  getDocFromServer,
  updateDoc,
  where,
  getDoc
} from "firebase/firestore";
import { ref, uploadString } from "firebase/storage";
import { SignalLogEntry, UFOSighting, AlertSubscription, FullReport, AnomalySubmission } from "../types";
import { VaultPersistence } from "./vaultPersistence";

// [TACTICAL_ERROR_HANDLER]: Detects project-level configuration issues 
// (specifically "API disabled") and shuts down cloud sync to prevent background noise.
setLogLevel('silent');

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

// Operational state flag - The circuit breaker for cloud operations
let cloudSyncActive = true;

export const isCloudEnabled = () => cloudSyncActive;

/**
 * [OFFSITE_SYNC_HELPER]: Sends a structured POST to the offsite vault.
 * Fire-and-forget with silent error handling.
 */
export const offsiteSync = (collection: string, eventType: 'create' | 'update' | 'delete', payload: any) => {
  const envelope = {
    collection,
    eventType,
    timestamp: new Date().toISOString(),
    userId: auth.currentUser?.uid || 'anonymous',
    source: "anomaly-watch",
    payload
  };

  // [SLUG_GENERATION]: Extract meaningful slug based on collection type
  let rawSlug = "";
  switch (collection) {
    case 'UFOSightings':
      rawSlug = payload.title || payload.location || payload.reportId;
      break;
    case 'SignalLog':
      rawSlug = payload.signalType || payload.sector || payload.frequency;
      break;
    case 'ScrapedData':
      rawSlug = payload.headline || payload.source || payload.topic;
      break;
    case 'CelestialEvents':
      rawSlug = payload.eventName || payload.body || payload.type;
      break;
    case 'OpsLog':
      rawSlug = payload.operation || payload.target || payload.action;
      break;
    case 'CaseOps':
      rawSlug = payload.caseName || payload.caseId || payload.subject;
      break;
    case 'TacticalComms':
      rawSlug = payload.channel || payload.callsign || payload.subject;
      break;
    case 'Alerts':
      rawSlug = payload.alertType || payload.trigger || payload.zone;
      break;
    default:
      rawSlug = payload.name || payload.title || payload.id;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  let docId = "";

  if (rawSlug) {
    // Sanitize slug: lowercase, replace spaces with hyphens, strip special characters, max 40 chars
    const sanitizedSlug = String(rawSlug)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 40)
      .replace(/-+$/, ''); // Remove trailing hyphens
    
    docId = `${collection}_${sanitizedSlug}_${dateStr}`;
  } else {
    // Fallback to timestamp
    docId = `${collection}_${dateStr}_${Date.now()}`;
  }

  // [OFFSITE_SYNC]: Mirror data to the SignalArchive collection with a human-readable ID
  // This acts as the primary offsite vault within the Firestore environment.
  setDoc(doc(db, 'SignalArchive', docId), envelope).catch(() => {
    // Silent error handling for fire-and-forget
  });

  const offsiteEndpoint = import.meta.env.VITE_OFFSITE_DB_ENDPOINT || "/api/offsite";
  if (!offsiteEndpoint) return;

  fetch(offsiteEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...envelope, docId })
  }).catch(() => {
    // Silent error handling
  });
};

/**
 * [TACTICAL_ERROR_HANDLER]: Detects project-level configuration issues 
 * (specifically "API disabled") and shuts down cloud sync to prevent background noise.
 */
export const handleSyncError = async (error: any) => {
  if (!cloudSyncActive) return;

  const errorMsg = error?.message || "";
  const errorCode = error?.code || "";
  
  // Specific check for the 'API not used or disabled' state found in project logs
  const isApiDisabled = 
    (errorCode === 'permission-denied' && (
      errorMsg.includes("Cloud Firestore API") || 
      errorMsg.includes("has not been used") || 
      errorMsg.includes("disabled")
    )) || 
    errorMsg.includes("API_DISABLED") ||
    errorCode === 'failed-precondition';

  if (isApiDisabled) {
    cloudSyncActive = false;
    
    // Hard-kill the Firestore instance to stop background heartbeats and retry logic
    try {
      await terminate(db);
    } catch (e) {
      // Instance already terminated
    }
    
    // Dispatch event so the HUD can notify the operative of the sector blackout
    window.dispatchEvent(new CustomEvent('anomaly-cloud-desync', { 
      detail: { 
        reason: 'API_DISABLED',
        repairUrl: `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${db.app.options.projectId}`
      } 
    }));
  } else {
    // Standard transient network warning
    console.debug("SIGNAL_INTERFERENCE_DETECTED:", errorCode);
  }
};

// [STORAGE_OPS]: Archiving raw model outputs and intelligence data
export const StorageOps = {
  archiveOutput: async (content: string) => {
    if (!storage) return; 
    
    try {
      const timestamp = new Date().toISOString();
      const filename = `anomaly_watch/outputs/${timestamp}.json`;
      const storageRef = ref(storage, filename);
      const payload = JSON.stringify({ output: content, timestamp });
      await uploadString(storageRef, payload, 'raw', { contentType: 'application/json' });
    } catch (e) {
      console.warn("Storage archive failed", e);
    }
  },

  archiveScrapedData: async (payload: any) => {
    if (!storage) return;
    try {
      const timestamp = new Date().toISOString();
      const filename = `anomaly_watch/scraped_data/${timestamp}_${payload.query.replace(/\s+/g, '_')}.json`;
      const storageRef = ref(storage, filename);
      await uploadString(storageRef, JSON.stringify(payload), 'raw', { contentType: 'application/json' });
    } catch (e) {
      console.warn("Storage scraped data archive failed", e);
    }
  }
};

// [PRESENCE_SERVICE]: Tracking active operatives globally
export const PresenceService = {
  trackPresence: (uid: string, username: string, specialty: string = 'ANALYST') => {
    if (!cloudSyncActive || !uid || !auth.currentUser) return () => {};
    PresenceService.updatePresence(uid, username, specialty, 'ONLINE');
    const interval = setInterval(() => {
      PresenceService.updatePresence(uid, username, specialty, 'ONLINE');
    }, 60000);
    return () => {
      clearInterval(interval);
      PresenceService.signOut(uid);
    };
  },

  updatePresence: async (uid: string, username: string, specialty: string = 'ANALYST', status: string = 'ONLINE') => {
    if (!cloudSyncActive || !uid || !auth.currentUser) return;
    const path = `ActiveAgents/${uid}`;
    try {
      const agentRef = doc(db, "ActiveAgents", uid);
      const data = {
        uid,
        username: username || 'AGENT',
        specialty,
        lastSeen: serverTimestamp(),
        status: status || "ONLINE"
      };
      await setDoc(agentRef, data);
      offsiteSync("ActiveAgents", "update", data);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  subscribeToAgents: (callback: (agents: any[]) => void) => {
    if (!cloudSyncActive) {
      callback([]);
      return () => {};
    }
    const path = "ActiveAgents";
    try {
      const q = query(collection(db, "ActiveAgents"));
      return onSnapshot(q, (snapshot) => {
        const agents = snapshot.docs.map(doc => doc.data());
        const now = Date.now();
        const active = agents.filter(a => {
          const lastSeen = a.lastSeen?.toMillis() || 0;
          return (now - lastSeen) < 300000; // 5 minutes
        });
        callback(active);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return () => {};
    }
  },

  signOut: async (uid: string) => {
    if (!cloudSyncActive || !uid) return;
    const path = `ActiveAgents/${uid}`;
    try {
      await deleteDoc(doc(db, "ActiveAgents", uid));
      offsiteSync("ActiveAgents", "delete", { uid });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }
};

// [ARCHIVE_OPS]: Permanent storage of all intelligence probes
export const ArchiveOps = {
  logSignal: async (entry: Omit<SignalLogEntry, 'id' | 'timestamp' | 'operative' | 'specialty'>) => {
    const username = auth.currentUser?.displayName || localStorage.getItem('anomalyWatch_username') || 'OPERATIVE';
    const specialty = localStorage.getItem('anomalyWatch_specialty') || 'ANALYST';
    const id = `SIG-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    const data = {
      id,
      ...entry,
      operative: username,
      specialty: specialty,
      timestamp: new Date().toISOString()
    } as any;

    // Always save to local IDB for offline review
    await VaultPersistence.Signals.save(data);

    if (!cloudSyncActive) return;
    const path = "SignalArchive";
    try {
      // Use setDoc with fixed ID to maintain consistency with local cache
      await setDoc(doc(db, "SignalArchive", id), {
        ...data,
        timestamp: serverTimestamp()
      });
      offsiteSync("SignalArchive", "create", data);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  getSignalLogs: async (limitCount: number = 50): Promise<SignalLogEntry[]> => {
    if (!cloudSyncActive) {
      return VaultPersistence.Signals.getAll();
    }
    const path = "SignalArchive";
    try {
      const q = query(collection(db, "SignalArchive"), orderBy("timestamp", "desc"), limit(limitCount));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SignalLogEntry));
      // Backfill local cache
      await VaultPersistence.Signals.saveAll(items);
      return items;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return VaultPersistence.Signals.getAll();
    }
  },

  subscribeToArchive: (callback: (items: SignalLogEntry[]) => void, limitCount: number = 50) => {
    if (!cloudSyncActive) {
      VaultPersistence.Signals.getAll().then(callback);
      return () => {};
    }
    const path = "SignalArchive";
    try {
      const q = query(collection(db, "SignalArchive"), orderBy("timestamp", "desc"), limit(limitCount));
      return onSnapshot(q, async (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SignalLogEntry));
        await VaultPersistence.Signals.saveAll(items);
        callback(items);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
        VaultPersistence.Signals.getAll().then(callback);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      VaultPersistence.Signals.getAll().then(callback);
      return () => {};
    }
  },

  getLatestBrief: async (): Promise<string | null> => {
    if (!cloudSyncActive) return null;
    try {
      const q = query(
        collection(db, "SignalArchive"), 
        where("type", "==", "DAILY_BRIEF"),
        orderBy("timestamp", "desc"), 
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].data().response;
    } catch (e) {
      console.error("Failed to fetch latest brief", e);
      return null;
    }
  },

  getLatestSignalByType: async (type: string): Promise<any | null> => {
    if (!cloudSyncActive) return null;
    try {
      const q = query(
        collection(db, "SignalArchive"), 
        where("type", "==", type),
        orderBy("timestamp", "desc"), 
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].data();
    } catch (e) {
      console.error(`Failed to fetch latest signal of type ${type}`, e);
      return null;
    }
  }
};

// [SCRAPE_OPS]: Database storage implementation for everything scraped from the Internet
export const ScrapeOps = {
  logScrapedData: async (queryText: string, urls: Array<{uri: string, title: string}>, rawText?: string) => {
    if (urls.length === 0) return;
    
    const username = auth.currentUser?.displayName || localStorage.getItem('anomalyWatch_username') || 'OPERATIVE';
    const id = `INTEL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    const payload = {
      id,
      query: queryText,
      urls: urls,
      rawText: rawText || "",
      operative: username,
      timestamp: new Date().toISOString()
    };

    // Always save to local IDB
    await VaultPersistence.Intel.save(payload as any);

    if (!cloudSyncActive) return;

    // [OFFSITE_SYNC]: Replaced with global offsiteSync helper
    offsiteSync("ScrapedData", "create", payload);

    const path = "ScrapedData";
    try {
      await setDoc(doc(db, "ScrapedData", id), {
        ...payload,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  subscribeToScrapedData: (callback: (items: any[]) => void, limitCount: number = 50) => {
    if (!cloudSyncActive) {
      VaultPersistence.Intel.getAll().then(callback);
      return () => {};
    }
    const path = "ScrapedData";
    try {
      const q = query(collection(db, "ScrapedData"), orderBy("timestamp", "desc"), limit(limitCount));
      return onSnapshot(q, async (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        await VaultPersistence.Intel.saveAll(items as any);
        callback(items);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
        VaultPersistence.Intel.getAll().then(callback);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      VaultPersistence.Intel.getAll().then(callback);
      return () => {};
    }
  },

  getScrapedData: async (limitCount: number = 10): Promise<any[]> => {
    if (!cloudSyncActive) {
      return VaultPersistence.Intel.getAll();
    }
    const path = "ScrapedData";
    try {
      const q = query(collection(db, "ScrapedData"), orderBy("timestamp", "desc"), limit(limitCount));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      await VaultPersistence.Intel.saveAll(items as any);
      return items;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return VaultPersistence.Intel.getAll();
    }
  },

  exportAllData: async () => {
    if (!cloudSyncActive) return null;
    try {
      const collections = ["ScrapedData", "SignalArchive", "UFOSightings", "IntelBroadcasts"];
      const allData: Record<string, any[]> = {};

      for (const colName of collections) {
        const q = query(collection(db, colName), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        allData[colName] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
        }));
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ANOMALY_WATCH_EXPORT_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return allData;
    } catch (e) {
      console.error("Export failed", e);
      return null;
    }
  }
};

import { OfflineSyncService } from "./offlineSyncService";

// [SIGHTING_OPS]: Tracking UFO sightings with user-submitted data
export const SightingOps = {
  reportSighting: async (sighting: Omit<UFOSighting, 'id' | 'timestamp' | 'operative'>) => {
    const username = localStorage.getItem('anomalyWatch_username') || 'RECON_GUEST';
    
    const payload = {
      id: `SIGHTING-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...sighting,
      operative: username,
      timestamp: new Date().toISOString()
    };

    // Always cache in local IndexedDB offline storage first
    await OfflineSyncService.saveSighting(payload as any);

    if (!cloudSyncActive) return;
    const path = "UFOSightings";
    try {
      const data = {
        ...sighting,
        operative: username,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, "UFOSightings"), data);
      offsiteSync("UFOSightings", "create", data);
    } catch (e) {
      console.warn("Firestore save failed, queued in offline DB:", e);
      await OfflineSyncService.queuePendingReport(payload);
    }
  },

  subscribeToSightings: (callback: (items: UFOSighting[]) => void) => {
    if (!cloudSyncActive) {
      callback([]);
      return () => {};
    }
    const path = "UFOSightings";
    try {
      const q = query(collection(db, "UFOSightings"), orderBy("timestamp", "desc"), limit(50));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UFOSighting)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return () => {};
    }
  },

  getUFOSightings: async (limitCount: number = 100): Promise<UFOSighting[]> => {
    if (!cloudSyncActive) return [];
    const path = "UFOSightings";
    try {
      const q = query(collection(db, "UFOSightings"), orderBy("timestamp", "desc"), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UFOSighting));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  }
};

// [SUBMISSION_OPS]: User Anomaly Submissions, Moderation & Main Feed Integration
export const SubmissionOps = {
  submitAnomaly: async (submission: Omit<AnomalySubmission, 'id' | 'status' | 'submittedAt' | 'submittedBy'> & { submittedBy?: string }): Promise<string> => {
    const username = submission.submittedBy || localStorage.getItem('anomalyWatch_username') || 'ANALYST';
    const id = `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    const payload: AnomalySubmission = {
      id,
      title: submission.title,
      description: submission.description,
      dateObserved: submission.dateObserved || new Date().toISOString().split('T')[0],
      location: submission.location || 'Undisclosed Sector',
      coordinates: submission.coordinates,
      category: submission.category || 'Scientific',
      severity: submission.severity || 'MEDIUM',
      evidenceLinks: submission.evidenceLinks || [],
      evidenceImages: submission.evidenceImages || [],
      status: 'PENDING_REVIEW',
      submittedBy: username,
      submittedAt: Date.now(),
      credibilityScore: submission.credibilityScore ?? 75,
      aiAnalysis: submission.aiAnalysis,
      isIntegratedIntoMainFeed: false
    };

    // Save to local IndexedDB
    await VaultPersistence.Submissions.save(payload);

    if (cloudSyncActive) {
      const path = `AnomalySubmissions/${id}`;
      try {
        await setDoc(doc(db, "AnomalySubmissions", id), {
          ...payload,
          submittedAt: serverTimestamp()
        });
        offsiteSync("AnomalySubmissions", "create", payload);
      } catch (e) {
        console.warn("Cloud save failed for submission, preserved in local vault:", e);
      }
    }

    // Dispatch global event for instant notification
    window.dispatchEvent(new CustomEvent('anomaly-submission-created', { detail: payload }));
    return id;
  },

  subscribeToSubmissions: (callback: (submissions: AnomalySubmission[]) => void) => {
    if (!cloudSyncActive) {
      VaultPersistence.Submissions.getAll().then(callback);
      return () => {};
    }
    const path = "AnomalySubmissions";
    try {
      const q = query(collection(db, "AnomalySubmissions"), orderBy("submittedAt", "desc"), limit(100));
      return onSnapshot(q, async (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt?.toMillis ? data.submittedAt.toMillis() : data.submittedAt || Date.now()
          } as AnomalySubmission;
        });
        await VaultPersistence.Submissions.saveAll(items);
        callback(items);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
        VaultPersistence.Submissions.getAll().then(callback);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      VaultPersistence.Submissions.getAll().then(callback);
      return () => {};
    }
  },

  getAllSubmissions: async (): Promise<AnomalySubmission[]> => {
    if (!cloudSyncActive) {
      return VaultPersistence.Submissions.getAll();
    }
    const path = "AnomalySubmissions";
    try {
      const q = query(collection(db, "AnomalySubmissions"), orderBy("submittedAt", "desc"), limit(100));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          submittedAt: data.submittedAt?.toMillis ? data.submittedAt.toMillis() : data.submittedAt || Date.now()
        } as AnomalySubmission;
      });
      await VaultPersistence.Submissions.saveAll(items);
      return items;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return VaultPersistence.Submissions.getAll();
    }
  },

  reviewSubmission: async (
    id: string, 
    status: 'APPROVED' | 'REJECTED', 
    reviewNotes?: string, 
    shouldIntegrateIntoFeed: boolean = true
  ): Promise<AnomalySubmission | null> => {
    const reviewer = localStorage.getItem('anomalyWatch_username') || 'MODERATOR_OPERATIVE';
    const all = await VaultPersistence.Submissions.getAll();
    const existing = all.find(s => s.id === id);
    
    let submission: AnomalySubmission | null = existing || null;

    if (cloudSyncActive) {
      try {
        const docRef = doc(db, "AnomalySubmissions", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          submission = { id: snap.id, ...snap.data() } as AnomalySubmission;
        }
      } catch (e) {
        console.warn("Could not fetch remote submission for review:", e);
      }
    }

    if (!submission) return null;

    submission.status = status;
    submission.reviewedBy = reviewer;
    submission.reviewedAt = Date.now();
    if (reviewNotes) submission.reviewNotes = reviewNotes;

    if (status === 'APPROVED' && shouldIntegrateIntoFeed) {
      submission.isIntegratedIntoMainFeed = true;
      await SubmissionOps.integrateSubmissionIntoMainFeed(submission);
    }

    await VaultPersistence.Submissions.save(submission);

    if (cloudSyncActive) {
      try {
        const docRef = doc(db, "AnomalySubmissions", id);
        await updateDoc(docRef, {
          status,
          reviewedBy: reviewer,
          reviewedAt: serverTimestamp(),
          reviewNotes: reviewNotes || "",
          isIntegratedIntoMainFeed: submission.isIntegratedIntoMainFeed || false
        });
        offsiteSync("AnomalySubmissions", "update", submission);
      } catch (e) {
        console.warn("Could not update remote submission status:", e);
      }
    }

    window.dispatchEvent(new CustomEvent('anomaly-submission-reviewed', { detail: submission }));
    return submission;
  },

  integrateSubmissionIntoMainFeed: async (submission: AnomalySubmission): Promise<void> => {
    const sightingPayload: Omit<UFOSighting, 'id' | 'timestamp'> = {
      title: submission.title,
      description: submission.description,
      date: submission.dateObserved,
      location: submission.location || 'Undisclosed Sector',
      locationName: submission.location || 'Undisclosed Sector',
      category: submission.category as any,
      severity: submission.severity,
      operative: submission.submittedBy,
      photoUrl: submission.evidenceImages && submission.evidenceImages.length > 0 ? submission.evidenceImages[0].url : undefined,
      coordinates: submission.coordinates || { lat: 37.7749, lng: -122.4194 },
      confidenceScore: submission.credibilityScore ?? 85
    };

    // Promote to UFOSightings collection & feed
    await SightingOps.reportSighting(sightingPayload);

    // Also create corroborating Intel Broadcast
    await IntelNexus.broadcastIntel(
      `[INTEGRATED SUBMISSION] ${submission.title}`,
      `Verified anomaly in sector: ${submission.location}. Category: ${submission.category}. Evidence: ${submission.evidenceLinks?.length || 0} links, ${submission.evidenceImages?.length || 0} media assets.`,
      `User Submission (${submission.submittedBy})`
    );

    window.dispatchEvent(new CustomEvent('anomaly-feed-integrated', { detail: submission }));
  }
};

// [SUBSCRIPTION_OPS]: Real-time alerts for anomalies
export const SubscriptionOps = {
  createSubscription: async (payload: any) => {
    return SubscriptionOps.subscribeToAlerts(payload);
  },
  subscribeToAlerts: async (sub: Omit<AlertSubscription, 'id' | 'timestamp'>) => {
    if (!cloudSyncActive) return;
    const path = "Subscriptions";
    try {
      const username = localStorage.getItem('anomalyWatch_username') || 'RECON_GUEST';
      const userSubsRef = collection(db, "Subscriptions");
      const data = {
        ...sub,
        operative: username,
        timestamp: serverTimestamp()
      };
      await addDoc(userSubsRef, data);
      offsiteSync("Subscriptions", "create", data);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  getUserSubscriptions: (callback: (subs: AlertSubscription[]) => void) => {
    if (!cloudSyncActive) {
      callback([]);
      return () => {};
    }
    const path = "Subscriptions";
    const username = localStorage.getItem('anomalyWatch_username') || 'RECON_GUEST';
    const q = query(collection(db, "Subscriptions"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => {
      const allSubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlertSubscription & { operative: string }));
      callback(allSubs.filter(s => s.operative === username));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });
  },

  deleteSubscription: async (id: string) => {
    if (!cloudSyncActive) return;
    const path = `Subscriptions/${id}`;
    try {
      await deleteDoc(doc(db, "Subscriptions", id));
      offsiteSync("Subscriptions", "delete", { id });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }
};

// [CACHE_OPS]: Caching intelligence reports
export const CacheOps = {
  getReport: async (id: string): Promise<FullReport | null> => {
    if (!cloudSyncActive) return null;
    const path = `IntelReports/${id}`;
    try {
      const docRef = doc(db, "IntelReports", id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return snapshot.data() as FullReport;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return null;
    }
  },
  saveReport: async (id: string, report: FullReport) => {
    if (!cloudSyncActive) return;
    const path = `IntelReports/${id}`;
    try {
      await setDoc(doc(db, "IntelReports", id), report);
      offsiteSync("IntelReports", "create", report);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  }
};

// [INTEL_NEXUS]: Global intelligence sharing
export const IntelNexus = {
  broadcastIntel: async (title: string, summary: string, source: string) => {
    if (!cloudSyncActive) return;
    const path = "IntelBroadcasts";
    try {
      const username = localStorage.getItem('anomalyWatch_username') || 'RECON_GUEST';
      const specialty = localStorage.getItem('anomalyWatch_specialty') || 'ANALYST';
      
      const data = {
        title,
        summary,
        author: username,
        specialty: specialty,
        timestamp: serverTimestamp(),
        source
      };
      const docRef = await addDoc(collection(db, "IntelBroadcasts"), data);
      offsiteSync("IntelBroadcasts", "create", data);

      // Trigger local event for alert matching
      window.dispatchEvent(new CustomEvent('anomaly-new-intel', { 
        detail: { id: docRef.id, title, summary, source, author: username } 
      }));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  subscribeToIntel: (callback: (items: any[]) => void) => {
    if (!cloudSyncActive) {
      callback([]);
      return () => {};
    }
    const path = "IntelBroadcasts";
    try {
      const q = query(collection(db, "IntelBroadcasts"), orderBy("timestamp", "desc"), limit(20));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return () => {};
    }
  }
};

// [COMMS_OPS]: Real-time tactical communication between operatives
export const CommsOps = {
  sendMessage: async (
    text: string, 
    type: 'MESSAGE' | 'INTEL' | 'ALERT' | 'ACTION' | 'SYSTEM' | 'AI' = 'MESSAGE',
    channel: string = 'general',
    customSender?: string
  ) => {
    if (!cloudSyncActive) return;
    const path = "TacticalComms";
    try {
      const username = customSender || localStorage.getItem('anomalyWatch_username') || 'RECON_GUEST';
      const specialty = localStorage.getItem('anomalyWatch_specialty') || 'ANALYST';
      
      const data = {
        sender: username,
        specialty,
        text,
        type,
        channel,
        timestamp: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "TacticalComms"), data);
      offsiteSync("TacticalComms", "create", { id: docRef.id, ...data });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  subscribeToComms: (callback: (messages: any[]) => void) => {
    if (!cloudSyncActive) {
      callback([]);
      return () => {};
    }
    const path = "TacticalComms";
    try {
      const q = query(collection(db, "TacticalComms"), orderBy("timestamp", "desc"), limit(100));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return () => {};
    }
  }
};

// [NEXUS_OPS]: Global signal relay
export const NexusOps = {
  broadcastSignal: async (text: string) => {
    if (!cloudSyncActive) return;
    const path = "GlobalSignals";
    try {
      const username = localStorage.getItem('anomalyWatch_username') || 'RECON_GUEST';
      const specialty = localStorage.getItem('anomalyWatch_specialty') || 'ANALYST';
      
      const data = {
        sender: username,
        role: specialty,
        text,
        timestamp: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "GlobalSignals"), data);
      offsiteSync("GlobalSignals", "create", { id: docRef.id, ...data });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  }
};

// [USER_OPS]: Managing agent profiles
export const UserOps = {
  updateUser: async (uid: string, data: any) => {
    if (!cloudSyncActive || !uid || uid.startsWith('local_') || !auth.currentUser) return;
    const path = `users/${uid}`;
    try {
      await setDoc(doc(db, "users", uid), data, { merge: true });
      offsiteSync("users", "update", { uid, ...data });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
};
