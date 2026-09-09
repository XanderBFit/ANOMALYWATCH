
const DB_NAME = "AnomalyCache";
const STORE_NAME = "IntelCache";
const STORE_NAME_AUDIO = "AudioCache";
const TTL = 30 * 60 * 1000; // 30 minutes for tactical intel
const AUDIO_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for audio cache to be extremely cost-effective

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(STORE_NAME_AUDIO)) {
        db.createObjectStore(STORE_NAME_AUDIO);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const TacticalCache = {
  get: async (key: string): Promise<any | null> => {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          const val = request.result;
          if (val && (Date.now() - val.timestamp < TTL)) {
            resolve(val.data);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },

  set: async (key: string, data: any): Promise<void> => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ data, timestamp: Date.now() }, key);
    } catch (e) {
      console.warn("Tactical cache write failed", e);
    }
  }
};

export const AudioCache = {
  get: async (key: string): Promise<string | null> => {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME_AUDIO, "readonly");
        const store = tx.objectStore(STORE_NAME_AUDIO);
        const request = store.get(key);
        request.onsuccess = () => {
          const val = request.result;
          if (val && (Date.now() - val.timestamp < AUDIO_TTL)) {
            resolve(val.base64);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },

  set: async (key: string, base64: string): Promise<void> => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME_AUDIO, "readwrite");
      const store = tx.objectStore(STORE_NAME_AUDIO);
      store.put({ base64, timestamp: Date.now() }, key);
    } catch (e) {
      console.warn("Audio cache write failed", e);
    }
  }
};
