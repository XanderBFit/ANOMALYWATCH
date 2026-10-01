import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, ShieldAlert, Zap, Activity, ChevronDown, ChevronUp, Compass, RefreshCw, X } from 'lucide-react';
import { SpaceWeatherService, SpaceWeatherTelemetry } from '../services/spaceWeatherStreamService';

export const SpaceWeatherBar: React.FC = () => {
  const [telemetry, setTelemetry] = useState<SpaceWeatherTelemetry>(() => SpaceWeatherService.getTelemetry());
  const [isDismissed, setIsDismissed] = useState(() => localStorage.getItem('aw_hide_space_weather') === 'true');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = SpaceWeatherService.subscribe((data) => {
      setTelemetry(data);
    });
    return () => unsubscribe();
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('aw_hide_space_weather', 'true');
    window.dispatchEvent(new CustomEvent('space-weather-visibility-changed', { detail: { hidden: true } }));
  };

  const handleRestore = () => {
    setIsDismissed(false);
    localStorage.removeItem('aw_hide_space_weather');
    window.dispatchEvent(new CustomEvent('space-weather-visibility-changed', { detail: { hidden: false } }));
  };

  // Listen for restore events from header or preferences
  useEffect(() => {
    const onToggle = (e: any) => {
      if (e.detail?.hidden !== undefined) {
        setIsDismissed(e.detail.hidden);
      } else {
        setIsDismissed(prev => !prev);
      }
    };
    window.addEventListener('toggle-space-weather-bar', onToggle);
    return () => window.removeEventListener('toggle-space-weather-bar', onToggle);
  }, []);

  if (isDismissed) {
    return null;
  }

  const getStatusText = (status: SpaceWeatherTelemetry['geomagneticStatus']) => {
    switch (status) {
      case 'QUIET':
        return { label: 'Quiet (Normal)', color: 'text-emerald-400' };
      case 'UNSETTLED':
        return { label: 'Unsettled (Mild)', color: 'text-cyan-400' };
      case 'ACTIVE':
        return { label: 'Elevated Activity', color: 'text-yellow-400' };
      default:
        return { label: 'Solar Storm Alert', color: 'text-rose-400' };
    }
  };

  const statusInfo = getStatusText(telemetry.geomagneticStatus);

  return (
    <div className="w-full bg-slate-900/40 border border-white/[0.06] rounded-xl px-3.5 py-1.5 text-xs font-mono backdrop-blur-md transition-all">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        
        {/* Left: Clean summary */}
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
            <Sun className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-300">Space Weather:</span>
            <span className={`text-[11px] font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>
          <span className="text-white/10 hidden sm:inline">•</span>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
            <Zap className="w-3 h-3 text-amber-400/80" />
            <span>Kp Index: <strong className="text-white font-bold">{telemetry.kpIndex.toFixed(1)}</strong>/9</span>
          </div>
          <span className="text-white/10 hidden md:inline">•</span>
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400">
            <Activity className="w-3 h-3 text-emerald-400/80" />
            <span>Solar Wind: <strong className="text-white font-bold">{telemetry.solarWindSpeed}</strong> km/s</span>
          </div>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2 text-[11px]">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer text-[10px]"
            title={isExpanded ? "Collapse Details" : "View Full Space Weather Telemetry"}
          >
            <span>{isExpanded ? 'Less' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={handleDismiss}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            title="Hide Space Weather strip (can be re-enabled from header)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Collapsible Details Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2 pt-2 border-t border-white/5"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-[10px]">
              <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-slate-500 block mb-0.5">Geomagnetic Kp</span>
                <span className="text-xs font-bold text-white">{telemetry.kpIndex.toFixed(1)} / 9.0</span>
                <p className="text-[9px] text-slate-400 mt-0.5">Planetary magnetic disturbance index</p>
              </div>

              <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-slate-500 block mb-0.5">Mag Deflection</span>
                <span className="text-xs font-bold text-white">{telemetry.magnetometerDeflection.toFixed(1)} nT</span>
                <p className="text-[9px] text-slate-400 mt-0.5">Sensor deflection variation</p>
              </div>

              <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-slate-500 block mb-0.5">Solar Wind Speed</span>
                <span className="text-xs font-bold text-white">{telemetry.solarWindSpeed} km/s</span>
                <p className="text-[9px] text-slate-400 mt-0.5">Interplanetary plasma stream</p>
              </div>

              <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-slate-500 block mb-0.5">X-Ray Flare Class</span>
                <span className="text-xs font-bold text-amber-400">{telemetry.xrayFlareClass || 'B-Class'}</span>
                <p className="text-[9px] text-slate-400 mt-0.5">GOES solar background radiation</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

