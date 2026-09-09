
import { CaseRecord, SignalLogEntry, AnomalySubmission } from "../types";

const DB_NAME = "AnomalyVault";
const VERSION = 4; // Bumped version to include Submissions store

export interface ScrapedIntelEntry {
  id: string;
  query: string;
  urls: Array<{uri: string, title: string}>;
  rawText: string;
  operative: string;
  timestamp: any;
}

const STORES = {
  CASES: "CaseRecords",
  SIGNALS: "SignalArchive",
  INTEL: "ScrapedData",
  SUBMISSIONS: "AnomalySubmissions"
};

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORES.CASES)) {
        db.createObjectStore(STORES.CASES, { keyPath: "id" });
      }
      
      if (!db.objectStoreNames.contains(STORES.SIGNALS)) {
        db.createObjectStore(STORES.SIGNALS, { keyPath: "id" });
      }
      
      if (!db.objectStoreNames.contains(STORES.INTEL)) {
        db.createObjectStore(STORES.INTEL, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORES.SUBMISSIONS)) {
        db.createObjectStore(STORES.SUBMISSIONS, { keyPath: "id" });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const VaultPersistence = {
  // Generic save
  save: async (storeName: string, item: any): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        
        // Ensure ID exists for signals/intel if not provided
        if (!item.id) {
            item.id = `LOCAL-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
        }
        
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`Vault save failed for ${storeName}`, e);
    }
  },

  // Generic bulk save
  saveAll: async (storeName: string, items: any[]): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        items.forEach(item => {
            if (!item.id) item.id = `LOCAL-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
            store.put(item);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn(`Vault bulk save failed for ${storeName}`, e);
    }
  },

  // Generic get all
  getAll: async <T>(storeName: string): Promise<T[]> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          const results = request.result;
          // Sort by timestamp desc
          results.sort((a: any, b: any) => {
            const timeA = a.updatedTimestamp || (a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime()) || 0;
            const timeB = b.updatedTimestamp || (b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime()) || 0;
            return timeB - timeA;
          });
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`Vault fetch failed for ${storeName}`, e);
      return [];
    }
  },

  // Generic delete
  delete: async (storeName: string, id: string): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`Vault delete failed for ${storeName}`, e);
    }
  },

  // Specialized helpers
  Cases: {
    save: (record: CaseRecord) => VaultPersistence.save(STORES.CASES, record),
    saveAll: (records: CaseRecord[]) => VaultPersistence.saveAll(STORES.CASES, records),
    getAll: () => VaultPersistence.getAll<CaseRecord>(STORES.CASES),
    delete: (id: string) => VaultPersistence.delete(STORES.CASES, id)
  },

  Signals: {
    save: (entry: SignalLogEntry) => VaultPersistence.save(STORES.SIGNALS, entry),
    saveAll: (entries: SignalLogEntry[]) => VaultPersistence.saveAll(STORES.SIGNALS, entries),
    getAll: () => VaultPersistence.getAll<SignalLogEntry>(STORES.SIGNALS),
    delete: (id: string) => VaultPersistence.delete(STORES.SIGNALS, id)
  },

  Intel: {
    save: (entry: ScrapedIntelEntry) => VaultPersistence.save(STORES.INTEL, entry),
    saveAll: (entries: ScrapedIntelEntry[]) => VaultPersistence.saveAll(STORES.INTEL, entries),
    getAll: () => VaultPersistence.getAll<ScrapedIntelEntry>(STORES.INTEL),
    delete: (id: string) => VaultPersistence.delete(STORES.INTEL, id)
  },

  Submissions: {
    save: (entry: AnomalySubmission) => VaultPersistence.save(STORES.SUBMISSIONS, entry),
    saveAll: (entries: AnomalySubmission[]) => VaultPersistence.saveAll(STORES.SUBMISSIONS, entries),
    getAll: () => VaultPersistence.getAll<AnomalySubmission>(STORES.SUBMISSIONS),
    delete: (id: string) => VaultPersistence.delete(STORES.SUBMISSIONS, id)
  }
};
