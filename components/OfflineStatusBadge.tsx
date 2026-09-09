import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { OfflineSyncService, OfflineSyncStatus } from '../services/offlineSyncService';

export const OfflineStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<OfflineSyncStatus>(() => OfflineSyncService.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = OfflineSyncService.subscribe(setStatus);
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (!status.isOnline) return;
    setIsSyncing(true);
    await OfflineSyncService.processPendingSyncQueue();
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      {status.isOnline ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase hidden sm:inline">ONLINE // IDB SYNCED</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase">OFFLINE MODE ({status.pendingCount} QUEUED)</span>
        </div>
      )}

      {status.pendingCount > 0 && status.isOnline && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold hover:bg-cyan-500 hover:text-black transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>SYNC ({status.pendingCount})</span>
        </button>
      )}
    </div>
  );
};
