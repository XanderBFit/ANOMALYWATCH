import React, { useState, useEffect } from 'react';
import { ProgressionService, CLEARANCE_THRESHOLDS } from '../services/progressionService';
import { 
  Award, 
  Search, 
  Command, 
  Bell, 
  Keyboard 
} from 'lucide-react';
import { OfflineStatusBadge } from './OfflineStatusBadge';

interface TopHeaderProps {
  onOpenProfile: () => void;
  cloudStatus: boolean;
  username: string;
  specialty: string;
  onOpenGeofence?: () => void;
  onOpenShortcuts?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenProfile,
  cloudStatus,
  username,
  specialty,
  onOpenGeofence,
  onOpenShortcuts
}) => {
  const [identity, setIdentity] = useState(ProgressionService.getIdentity());

  useEffect(() => {
    const syncIdentity = () => {
      setIdentity(ProgressionService.getIdentity());
    };
    window.addEventListener('storage', syncIdentity);
    window.addEventListener('anomaly-xp-gain', syncIdentity);

    return () => {
      window.removeEventListener('storage', syncIdentity);
      window.removeEventListener('anomaly-xp-gain', syncIdentity);
    };
  }, []);

  // Progression math
  const nextThreshold = ProgressionService.getNextThreshold(identity.clearance);
  const prevThreshold = identity.clearance === 'ALPHA' ? 0 : 
                        identity.clearance === 'BETA' ? CLEARANCE_THRESHOLDS.BETA :
                        identity.clearance === 'GAMMA' ? CLEARANCE_THRESHOLDS.GAMMA : 0;
  
  const currentLevelProgress = identity.xp - prevThreshold;
  const levelSpan = Math.max(1, nextThreshold - prevThreshold);
  const progressPercent = identity.clearance === 'OMEGA' 
    ? 100 
    : Math.min(100, Math.max(0, (currentLevelProgress / levelSpan) * 100));

  return (
    <div className="mb-4 p-3 md:p-4 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-ufo-green/20 transition-all shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-3 backdrop-blur-xl">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-0 left-0 w-64 h-16 bg-ufo-green/5 blur-2xl rounded-full pointer-events-none" />

      {/* Brand Title & Telemetry Status */}
      <div className="relative z-10 flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
        {/* Brand Logo Text */}
        <div className="flex items-center gap-2.5 pr-2 border-r border-white/10">
          <div className="w-2.5 h-2.5 rounded-full bg-ufo-green shadow-[0_0_10px_#00ff9d] animate-pulse" />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-display font-black tracking-[0.15em] text-white uppercase leading-none">
              ANOMALY <span className="text-ufo-green">WATCH</span>
            </span>
            <span className="text-[8px] font-mono text-slate-400 tracking-[0.2em] uppercase mt-0.5">
              TACTICAL INTEL HUD
            </span>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
          <span>8 LIVE FEEDS</span>
        </div>

        {/* Universal Search Trigger */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-ufo-green/50 text-slate-300 hover:text-ufo-green font-mono text-xs font-bold tracking-wider uppercase transition-all group cursor-pointer"
          title="Open Universal Command Palette (Cmd + K)"
        >
          <Search className="w-3.5 h-3.5 text-ufo-green group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">SEARCH</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-slate-400 font-sans font-bold flex items-center gap-0.5">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>

        {/* Geofence Dispatch Trigger */}
        <button
          onClick={() => {
            if (onOpenGeofence) {
              onOpenGeofence();
            } else {
              window.dispatchEvent(new CustomEvent('toggle-geofence-modal'));
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-amber-500/20 hover:border-amber-500/50 text-amber-300 font-mono text-xs font-bold tracking-wider uppercase transition-all group cursor-pointer"
          title="Configure Geofenced Alerts (Press G)"
        >
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">GEOFENCE</span>
          <kbd className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-300 font-sans font-bold">
            G
          </kbd>
        </button>

        {/* Keyboard Shortcuts Trigger */}
        <button
          onClick={() => {
            if (onOpenShortcuts) {
              onOpenShortcuts();
            } else {
              window.dispatchEvent(new CustomEvent('toggle-shortcuts-modal'));
            }
          }}
          className="p-1.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Keyboard Shortcuts (Press ?)"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        <OfflineStatusBadge />
      </div>

      {/* Operative Clearance Profile Badge */}
      <div className="relative z-10 flex items-center gap-3 w-full md:w-auto justify-end">
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-3 p-1.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-ufo-green/40 hover:bg-white/[0.06] transition-all cursor-pointer group text-left"
          title="View Operative Dossier and Clearance Level"
        >
          <div className="p-1.5 rounded-lg bg-ufo-green/10 border border-ufo-green/30 text-ufo-green group-hover:bg-ufo-green group-hover:text-black transition-all">
            <Award className="w-3.5 h-3.5" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className="text-white font-bold tracking-wider truncate max-w-[120px] sm:max-w-[160px]">{username.toUpperCase()}</span>
              <span className="px-1.5 py-0.2 rounded bg-ufo-green/15 border border-ufo-green/30 text-ufo-green text-[9px] font-black">
                {identity.clearance}
              </span>
            </div>

            <div className="flex items-center gap-2 w-28 md:w-32">
              <div className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-ufo-green to-emerald-400 transition-all duration-500 shadow-[0_0_6px_#00ff9d]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-slate-400 font-bold">{identity.xp} XP</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
