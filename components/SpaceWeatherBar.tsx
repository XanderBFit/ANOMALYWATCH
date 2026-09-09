import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, ShieldAlert, Zap, Radio, Activity, ChevronRight, Compass, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { SpaceWeatherService, SpaceWeatherTelemetry } from '../services/spaceWeatherStreamService';

export const SpaceWeatherBar: React.FC = () => {
  const [telemetry, setTelemetry] = useState<SpaceWeatherTelemetry>(() => SpaceWeatherService.getTelemetry());
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastTick, setLastTick] = useState<number>(Date.now());

  useEffect(() => {
    const unsubscribe = SpaceWeatherService.subscribe((data) => {
      setTelemetry(data);
      setLastTick(Date.now());
    });
    return () => unsubscribe();
  }, []);

  const getStatusBadge = (status: SpaceWeatherTelemetry['geomagneticStatus']) => {
    switch (status) {
      case 'QUIET':
        return { label: 'QUIET (Kp < 2)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'UNSETTLED':
        return { label: 'UNSETTLED (Kp 2-3)', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
      case 'ACTIVE':
        return { label: 'ACTIVE (Kp 4)', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      default:
        return { label: `SOLAR STORM (${status.replace(/_/g, ' ')})`, color: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' };
    }
  };

  const getWsBadge = (conn: SpaceWeatherTelemetry['connectionStatus']) => {
    switch (conn) {
      case 'CONNECTED':
        return {
          icon: <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />,
          label: 'WS LIVE',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        };
      case 'CONNECTING':
      case 'RECONNECTING':
        return {
          icon: <RefreshCw className="w-3 h-3 text-amber-400 animate-spin shrink-0" />,
          label: 'WS CONNECTING',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        };
      case 'DISCONNECTED':
      default:
        return {
          icon: <WifiOff className="w-3 h-3 text-rose-400 shrink-0" />,
          label: 'WS OFFLINE',
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        };
    }
  };

  const statusBadge = getStatusBadge(telemetry.geomagneticStatus);
  const wsBadge = getWsBadge(telemetry.connectionStatus);

  return (
    <div className="w-full bg-slate-950/90 border-b border-white/[0.08] backdrop-blur-md px-4 py-2 text-xs font-mono">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Side: Magnetometer & Space Weather Title + WebSocket Status */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 relative">
            <Sun className="w-4 h-4 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white tracking-widest uppercase text-[11px]">NOAA SWPC WEBSOCKET STREAM</span>
              
              {/* WebSocket Connection Status Badge */}
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold ${wsBadge.color}`}>
                {wsBadge.icon}
                <span>{wsBadge.label}</span>
              </div>

              {/* Geomagnetic Status Badge */}
              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Streaming Kp-Index, Solar Flux & Magnetometer Telemetry</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500 text-[9px]">Tick: {new Date(lastTick).toLocaleTimeString()}</span>
            </p>
          </div>
        </div>

        {/* Center/Right Metrics Indicators */}
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          
          {/* Kp-Index Gauge */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-xl border border-white/5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Kp Index:</span>
            <span className={`font-black ${telemetry.kpIndex >= 5.0 ? 'text-rose-400 font-extrabold' : telemetry.kpIndex >= 4.0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {telemetry.kpIndex.toFixed(1)} / 9.0
            </span>
          </div>

          {/* Magnetometer Deflection (nT) */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-xl border border-white/5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Mag Deflection:</span>
            <span className="font-bold text-white">{telemetry.magnetometerDeflection.toFixed(1)} nT</span>
          </div>

          {/* Solar Wind Velocity */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-xl border border-white/5 hidden sm:flex">
            <Activity className="w-3.5 h-3.5 text-ufo-green" />
            <span className="text-slate-400">Solar Wind:</span>
            <span className="font-bold text-white">{telemetry.solarWindSpeed} km/s</span>
          </div>

          {/* Force WS Reconnect */}
          <button
            onClick={() => SpaceWeatherService.forceReconnect()}
            title="Force WebSocket Reconnection"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Expand Details Trigger */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10"
          >
            <span>Telemetry Log</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded Telemetry Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 pt-3 border-t border-white/[0.08]"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto p-3 bg-slate-900/60 rounded-2xl border border-white/5">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">WebSocket Socket Pipeline</span>
                <p className="text-[11px] font-bold text-emerald-400 truncate">{telemetry.streamSource}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Status: <span className="text-white font-bold">{telemetry.connectionStatus}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Solar Radiation Flux</span>
                <p className="text-sm font-bold text-white">{telemetry.solarFlux} sfu</p>
                <p className="text-[10px] text-slate-400 mt-1">10.7cm Solar Radio Flux emission levels</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">X-Ray Flare Class</span>
                <p className="text-sm font-bold text-amber-400">{telemetry.xrayFlareClass}</p>
                <p className="text-[10px] text-slate-400 mt-1">Primary solar disk ionization background</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Active Space Weather Alerts</span>
                {telemetry.alerts.length > 0 ? (
                  <div className="space-y-1 max-h-[70px] overflow-y-auto">
                    {telemetry.alerts.slice(0, 3).map(alert => (
                      <div key={alert.id} className="text-[10px] text-rose-300 bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20 flex items-start gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{alert.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-emerald-400">No active severe SWPC storm alerts.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
