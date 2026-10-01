import React, { useState, useEffect } from 'react';
import { ProgressionService } from '../services/progressionService';
import { 
  Award, 
  Search, 
  Command, 
  Bell, 
  Keyboard,
  Sun,
  Camera
} from 'lucide-react';
import { SpaceWeatherService } from '../services/spaceWeatherStreamService';

interface TopHeaderProps {
  onOpenProfile: () => void;
  cloudStatus: boolean;
  username: string;
  specialty: string;
  onOpenGeofence?: () => void;
  onOpenShortcuts?: () => void;
  onOpenReconStudio?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenProfile,
  cloudStatus,
  username,
  specialty,
  onOpenGeofence,
  onOpenShortcuts,
  onOpenReconStudio
}) => {
  const [identity, setIdentity] = useState(ProgressionService.getIdentity());
  const [isSpaceWeatherHidden, setIsSpaceWeatherHidden] = useState(() => localStorage.getItem('aw_hide_space_weather') === 'true');
  const [kpIndex, setKpIndex] = useState(() => SpaceWeatherService.getTelemetry().kpIndex);

  useEffect(() => {
    const syncIdentity = () => {
      setIdentity(ProgressionService.getIdentity());
    };
    window.addEventListener('storage', syncIdentity);
    window.addEventListener('anomaly-xp-gain', syncIdentity);

    const onSpaceWeatherVisibility = (e: any) => {
      if (e.detail?.hidden !== undefined) {
        setIsSpaceWeatherHidden(e.detail.hidden);
      } else {
        setIsSpaceWeatherHidden(localStorage.getItem('aw_hide_space_weather') === 'true');
      }
    };
    window.addEventListener('space-weather-visibility-changed', onSpaceWeatherVisibility);

    const unsubscribeSw = SpaceWeatherService.subscribe((data) => {
      setKpIndex(data.kpIndex);
    });

    return () => {
      window.removeEventListener('storage', syncIdentity);
      window.removeEventListener('anomaly-xp-gain', syncIdentity);
      window.removeEventListener('space-weather-visibility-changed', onSpaceWeatherVisibility);
      unsubscribeSw();
    };
  }, []);

  const toggleSpaceWeather = () => {
    const nextHidden = !isSpaceWeatherHidden;
    setIsSpaceWeatherHidden(nextHidden);
    if (nextHidden) {
      localStorage.setItem('aw_hide_space_weather', 'true');
    } else {
      localStorage.removeItem('aw_hide_space_weather');
    }
    window.dispatchEvent(new CustomEvent('toggle-space-weather-bar', { detail: { hidden: nextHidden } }));
  };

  return (
    <header className="mb-4 p-2.5 md:p-3.5 rounded-2xl bg-slate-950/70 border border-white/[0.08] hover:border-white/[0.15] transition-all shadow-lg relative overflow-hidden flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl">
      {/* Brand Title & Status */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Brand Logo Text */}
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-ufo-green shadow-[0_0_8px_#00ff9d]" />
          <span className="text-base sm:text-lg font-display font-black tracking-widest text-white uppercase leading-none">
            ANOMALY <span className="text-ufo-green font-normal">WATCH</span>
          </span>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>8 Live Feeds</span>
        </div>

        {/* Optional Space Weather Quick Pill (visible when top bar is hidden) */}
        {isSpaceWeatherHidden && (
          <button
            onClick={toggleSpaceWeather}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:text-amber-200 font-mono text-[11px] transition-colors cursor-pointer"
            title="Solar Telemetry: Kp Index. Click to show space weather details."
          >
            <Sun className="w-3 h-3 text-amber-400" />
            <span>Kp {kpIndex.toFixed(1)}</span>
          </button>
        )}
      </div>

      {/* Right Controls: Search, Alerts, Shortcuts & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Zero-Cost Recon Studio Trigger */}
        <button
          onClick={() => {
            if (onOpenReconStudio) {
              onOpenReconStudio();
            } else {
              window.dispatchEvent(new CustomEvent('toggle-recon-studio'));
            }
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-ufo-green/10 border border-ufo-green/30 hover:border-ufo-green hover:bg-ufo-green/20 text-ufo-green font-mono text-xs transition-all shadow-[0_0_12px_rgba(0,255,157,0.15)] cursor-pointer"
          title="Launch Zero-Cost Visual Recon Studio ($0 FLIR / SAR / Flux Diffusion)"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-bold">RECON ($0)</span>
        </button>

        {/* Universal Search Trigger */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 hover:border-ufo-green/40 text-slate-300 hover:text-white font-mono text-xs transition-all cursor-pointer"
          title="Open Command Palette (Cmd + K)"
        >
          <Search className="w-3.5 h-3.5 text-ufo-green" />
          <span className="hidden sm:inline text-[11px]">Search</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-slate-400 font-sans flex items-center gap-0.5">
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
          className="p-2 rounded-xl bg-slate-900/60 border border-white/10 hover:border-amber-500/40 text-slate-400 hover:text-amber-300 transition-all cursor-pointer"
          title="Geofenced Alerts (Press G)"
        >
          <Bell className="w-3.5 h-3.5" />
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
          className="p-2 rounded-xl bg-slate-900/60 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all cursor-pointer hidden sm:flex"
          title="Keyboard Shortcuts (Press ?)"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        {/* Operative Profile Pill */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-ufo-green/40 hover:bg-white/[0.08] transition-all cursor-pointer text-left"
          title="View Operative Dossier and Clearance Level"
        >
          <div className="p-1 rounded-md bg-ufo-green/10 text-ufo-green">
            <Award className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-white font-medium truncate max-w-[110px] sm:max-w-[140px]">{username}</span>
            <span className="px-1.5 py-0.2 rounded bg-white/10 text-slate-300 text-[10px] font-bold">
              {identity.clearance}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};

