import { UFOSighting } from '../types';
import { SightingOps } from './firebaseService';

export interface OfflineSyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedTimestamp: number;
}

class OfflineSyncManager {
  private dbName = 'AnomalyWatchOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private pendingCountState = 0;
  private lastSynced = Date.now();
  private subscribers: Set<(status: OfflineSyncStatus) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB().then(() => {
        this.updatePendingCount();
        if (this.isOnlineState) {
          this.processPendingSyncQueue();
        }
      });

      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private initDB(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains('sightings')) {
          db.createObjectStore('sightings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pendingReports')) {
          db.createObjectStore('pendingReports', { keyPath: 'offlineId', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('telemetryCache')) {
          db.createObjectStore('telemetryCache', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = () => {
        console.warn('[OfflineSync] IndexedDB initialization failed.');
        resolve();
      };
    });
  }

  private notifySubscribers() {
    const status = this.getStatus();
    this.subscribers.forEach(cb => cb(status));
  }

  /**
   * Alias helper to save a single sighting to cache
   */
  public async saveSighting(sighting: UFOSighting): Promise<void> {
    await this.cacheSightings([sighting]);
  }

  /**
   * Alias helper to queue pending report
   */
  public async queuePendingReport(reportData: any): Promise<boolean> {
    return this.queueReportForSync(reportData);
  }

  private handleNetworkChange(online: boolean) {
    this.isOnlineState = online;
    if (online) {
      this.processPendingSyncQueue();
    }
    this.notifySubscribers();
  }

  /**
   * Cache sightings to IndexedDB for offline access
   */
  public async cacheSightings(sightings: UFOSighting[]): Promise<void> {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('sightings', 'readwrite');
      const store = tx.objectStore('sightings');
      sightings.forEach(s => store.put(s));
    } catch (e) {
      console.warn('[OfflineSync] Caching sightings failed:', e);
    }
  }

  /**
   * Get cached sightings from IndexedDB when offline
   */
  public async getCachedSightings(): Promise<UFOSighting[]> {
    if (!this.db) return [];
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('sightings', 'readonly');
        const store = tx.objectStore('sightings');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  /**
   * Queue a sighting report locally if offline or save to queue
   */
  public async queueReportForSync(reportData: Omit<UFOSighting, 'id' | 'timestamp' | 'operative'>): Promise<boolean> {
    if (this.isOnlineState) {
      try {
        await SightingOps.reportSighting(reportData);
        this.lastSynced = Date.now();
        this.notifySubscribers();
        return true;
      } catch (e) {
        // Fall back to queuing offline if online submit failed
      }
    }

    if (!this.db) return false;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('pendingReports', 'readwrite');
        const store = tx.objectStore('pendingReports');
        const req = store.add({
          reportData,
          queuedAt: Date.now()
        });

        req.onsuccess = () => {
          this.updatePendingCount();
          resolve(true);
        };
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * Process and auto-submit pending queued reports when back online
   */
  public async processPendingSyncQueue(): Promise<number> {
    if (!this.db || !this.isOnlineState) return 0;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('pendingReports', 'readwrite');
        const store = tx.objectStore('pendingReports');
        const req = store.getAll();

        req.onsuccess = async () => {
          const items = req.result || [];
          if (items.length === 0) {
            resolve(0);
            return;
          }

          let syncedCount = 0;
          for (const item of items) {
            try {
              await SightingOps.reportSighting(item.reportData);
              syncedCount++;
              // Delete from queue
              const delTx = this.db!.transaction('pendingReports', 'readwrite');
              delTx.objectStore('pendingReports').delete(item.offlineId);
            } catch (err) {
              console.warn('[OfflineSync] Failed to sync item:', err);
            }
          }

          this.lastSynced = Date.now();
          this.updatePendingCount();
          resolve(syncedCount);
        };

        req.onerror = () => resolve(0);
      } catch (e) {
        resolve(0);
      }
    });
  }

  private updatePendingCount() {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('pendingReports', 'readonly');
      const store = tx.objectStore('pendingReports');
      const req = store.count();
      req.onsuccess = () => {
        this.pendingCountState = req.result || 0;
        this.notifySubscribers();
      };
    } catch (e) {}
  }

  public getStatus(): OfflineSyncStatus {
    return {
      isOnline: this.isOnlineState,
      pendingCount: this.pendingCountState,
      lastSyncedTimestamp: this.lastSynced
    };
  }

  public subscribe(callback: (status: OfflineSyncStatus) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getStatus());
    return () => {
      this.subscribers.delete(callback);
    };
  }
}

export const OfflineSyncService = new OfflineSyncManager();
