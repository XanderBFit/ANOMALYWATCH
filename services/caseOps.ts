
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { db, isCloudEnabled, offsiteSync } from "./firebaseService";
import { CaseRecord, CaseStatus, EvidenceTier, CaseArtifact, CaseNote } from "../types";
import { extractIntelligenceMetadata, discoverCorrelations, explainAnomaly, categorizeAnomaly, summarizeAsBullets } from "./geminiService";
import { ProgressionService, XP_VALUES } from "./progressionService";
import { VaultPersistence } from "./vaultPersistence";

const COLLECTION_NAME = "CaseRecords";

const generateId = () => `CASE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

// Robust sanitizer to handle circular references and complex objects before stringification
// This manual traversal avoids issues where JSON.stringify fails before invoking a replacer
const sanitizeForJson = (data: any, visited = new WeakSet()): any => {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  
  if (visited.has(data)) {
    return '[Circular Reference]';
  }
  
  visited.add(data);
  
  // Handle Date/Timestamp-like objects specifically if needed, 
  // but usually deep traverse handles properties fine unless they have strict toJSON that fails.
  if (data instanceof Date) {
      return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForJson(item, visited));
  }
  
  const result: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // Skip internal React properties or DOM nodes if they sneak in
      if (key.startsWith('_') || key === 'src' || data[key] instanceof Element || (typeof Event !== 'undefined' && data[key] instanceof Event)) {
          continue;
      }
      result[key] = sanitizeForJson(data[key], visited);
    }
  }
  
  return result;
};

export const CaseOps = {
  
  subscribeToCases: (callback: (cases: CaseRecord[]) => void): Unsubscribe => {
    if (!isCloudEnabled()) {
      // If cloud is disabled, just pull from local once and return empty unsub
      CaseOps.getAllCases().then(callback);
      return () => {};
    }

    const q = query(collection(db, COLLECTION_NAME), orderBy("updatedTimestamp", "desc"));
    
    return onSnapshot(q, async (snapshot) => {
      const cases = snapshot.docs.map(doc => ({ ...doc.data() } as CaseRecord));
      
      await VaultPersistence.Cases.saveAll(cases);
      
      callback(cases);
    }, (error) => {
      console.warn("Case sync interrupted:", error.message);
      // Fallback to local on any sync error
      CaseOps.getAllCases().then(callback);
    });
  },

  getAllCases: async (): Promise<CaseRecord[]> => {
    return VaultPersistence.Cases.getAll();
  },

  getCaseById: async (id: string): Promise<CaseRecord | undefined> => {
    if (isCloudEnabled()) {
      try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return docSnap.data() as CaseRecord;
      } catch (e) {
        console.warn("Cloud fetch failed for case:", id);
      }
    }
    const local = await VaultPersistence.Cases.getAll();
    return local.find(c => c.id === id);
  },

  saveCase: async (record: CaseRecord): Promise<void> => {
    if (isCloudEnabled()) {
      try {
        const data = {
          ...record,
          updatedTimestamp: Date.now()
        };
        await setDoc(doc(db, COLLECTION_NAME, record.id), data);
        offsiteSync(COLLECTION_NAME, "update", data);
      } catch (e) {
        console.warn("Cloud save failed for case:", record.id);
      }
    }
    await VaultPersistence.Cases.save(record);
  },

  createCase: async (
    title: string, 
    summary: string, 
    category: string, 
    initialArtifact?: CaseArtifact,
    location?: string
  ): Promise<string> => {
    const timestamp = Date.now();
    const id = generateId();
    const username = localStorage.getItem('anomalyWatch_username') || 'RECON_GUEST';
    
    let initialTier: EvidenceTier = 'Unvetted';
    let initialConf = 20;

    if (initialArtifact) {
      if (initialArtifact.urls && initialArtifact.urls.length > 1) {
        initialTier = 'Multi-source';
        initialConf = 60;
      } else if (initialArtifact.type === 'Forensic Report') {
        initialTier = 'Sensor-validated';
        initialConf = 75;
      } else {
        initialTier = 'Single-source';
        initialConf = 40;
      }
    }

    const newCase: CaseRecord = {
      id,
      createdTimestamp: timestamp,
      updatedTimestamp: timestamp,
      title: title.slice(0, 80),
      category: category,
      status: 'Pending Inclusion',
      evidenceTier: initialTier,
      confidenceScore: initialConf,
      location: location || 'Unknown Sector',
      summary: summary,
      artifacts: initialArtifact ? [initialArtifact] : [],
      isPublicFeed: false,
      notes: [{
          id: Math.random().toString(36).substring(7),
          timestamp: timestamp,
          author: username,
          text: `Dossier initialized. AI indexing backgrounded...`
      }],
      tags: [],
      relatedCaseIds: []
    };

    await CaseOps.saveCase(newCase);
    
    // [XP_REWARD]
    ProgressionService.addXP(XP_VALUES.CREATE_CASE, "New Case File Initialized");
    
    (async () => {
      try {
        const [metadata, allExisting, anomalyReasoning, autoCategory, briefing] = await Promise.all([
          extractIntelligenceMetadata(summary),
          CaseOps.getAllCases(),
          explainAnomaly(title, summary),
          categorizeAnomaly(summary),
          summarizeAsBullets(summary)
        ]);
        
        const relatedIds = await discoverCorrelations(summary, allExisting.filter(c => c.id !== id));
        
        const updated = await CaseOps.getCaseById(id);
        if (updated) {
          updated.tags = metadata.tags;
          updated.category = autoCategory;
          updated.relatedCaseIds = relatedIds;
          updated.anomalyReasoning = anomalyReasoning;
          updated.briefing = briefing;
          updated.notes.push({
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
            author: "AI_CORE",
            text: `Semantic enrichment complete. ${metadata.tags.length} tags extracted. Linked to ${relatedIds.length} related cases. Anomaly reasoning generated.`
          });
          await CaseOps.saveCase(updated);

          for (const rid of relatedIds) {
            const target = allExisting.find(c => c.id === rid);
            if (target && !target.relatedCaseIds.includes(id)) {
              target.relatedCaseIds.push(id);
              await CaseOps.saveCase(target);
            }
          }
        }
      } catch (e) {
        console.warn("Background indexing failed:", e);
      }
    })();

    return id;
  },

  updateStatus: async (id: string, status: CaseStatus, reason: string): Promise<CaseRecord | null> => {
    const record = await CaseOps.getCaseById(id);
    if (!record) return null;

    const username = localStorage.getItem('anomalyWatch_username') || 'ANALYST';
    record.status = status;
    record.updatedTimestamp = Date.now();
    record.notes.push({
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        author: username,
        text: `STATUS CHANGE -> [${status.toUpperCase()}]. REASON: ${reason}`
    });

    await CaseOps.saveCase(record);
    return record;
  },

  addNote: async (id: string, text: string): Promise<CaseRecord | null> => {
    const record = await CaseOps.getCaseById(id);
    if (!record) return null;

    const username = localStorage.getItem('anomalyWatch_username') || 'ANALYST';
    record.notes.push({
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        author: username,
        text: text
    });
    record.updatedTimestamp = Date.now();
    await CaseOps.saveCase(record);
    return record;
  },

  linkCases: async (primaryId: string, relatedId: string): Promise<void> => {
    const primary = await CaseOps.getCaseById(primaryId);
    const related = await CaseOps.getCaseById(relatedId);
    
    if (primary && related) {
      if (!primary.relatedCaseIds.includes(relatedId)) {
        primary.relatedCaseIds.push(relatedId);
        await CaseOps.saveCase(primary);
      }
      if (!related.relatedCaseIds.includes(primaryId)) {
        related.relatedCaseIds.push(primaryId);
        await CaseOps.saveCase(related);
      }
    }
  },

  deleteCase: async (id: string): Promise<void> => {
    if (isCloudEnabled()) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        offsiteSync(COLLECTION_NAME, "delete", { id });
      } catch (e) {
        console.warn("Cloud deletion failed for case:", id);
      }
    }
    await VaultPersistence.Cases.delete(id);
  },

  exportVault: async (): Promise<string> => {
    const cases = await CaseOps.getAllCases();
    // Use manual deep sanitization to ensure no circles before stringify
    const sanitized = sanitizeForJson(cases);
    return JSON.stringify(sanitized, null, 2);
  },

  addCollaborator: async (caseId: string, username: string): Promise<void> => {
    if (!isCloudEnabled()) return;
    try {
      const caseRef = doc(db, COLLECTION_NAME, caseId);
      const caseSnap = await getDoc(caseRef);
      if (caseSnap.exists()) {
        const data = caseSnap.data() as CaseRecord;
        const collaborators = data.collaborators || [];
        if (!collaborators.includes(username)) {
          const updateData = {
            collaborators: [...collaborators, username],
            updatedTimestamp: Date.now(),
            lastModifiedBy: username
          };
          await updateDoc(caseRef, updateData);
          offsiteSync(COLLECTION_NAME, "update", { id: caseId, ...updateData });
        }
      }
    } catch (e) {
      console.error("Failed to add collaborator", e);
    }
  },

  removeCollaborator: async (caseId: string, username: string): Promise<void> => {
    if (!isCloudEnabled()) return;
    try {
      const caseRef = doc(db, COLLECTION_NAME, caseId);
      const caseSnap = await getDoc(caseRef);
      if (caseSnap.exists()) {
        const data = caseSnap.data() as CaseRecord;
        const collaborators = data.collaborators || [];
        if (collaborators.includes(username)) {
          const updateData = {
            collaborators: collaborators.filter(c => c !== username),
            updatedTimestamp: Date.now(),
            lastModifiedBy: username
          };
          await updateDoc(caseRef, updateData);
          offsiteSync(COLLECTION_NAME, "update", { id: caseId, ...updateData });
        }
      }
    } catch (e) {
      console.error("Failed to remove collaborator", e);
    }
  }
};
