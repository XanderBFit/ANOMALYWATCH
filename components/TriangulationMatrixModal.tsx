import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  MapPin, 
  Navigation, 
  Radio, 
  Satellite, 
  Sun, 
  Plane, 
  ShieldAlert, 
  X, 
  Target,
  Zap,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { UFOSighting } from '../types';

interface TriangulationMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  sighting: UFOSighting | null;
}

export const TriangulationMatrixModal: React.FC<TriangulationMatrixModalProps> = ({
  isOpen,
  onClose,
  sighting
}) => {
  if (!isOpen || !sighting) return null;

  const lat = sighting.latitude || sighting.coordinates?.lat || 37.7749;
  const lng = sighting.longitude || sighting.coordinates?.lng || -122.4194;
  const incidentTitle = sighting.title || 'Nevada Test Range Anomaly';

  // Compute nearest airbases
  const strategicAirbases = [
    { name: 'Nellis AFB / Area 51 Range', distKm: 42, azimuth: '315° NW', type: 'USAF Restricted Airspace' },
    { name: 'McCarran Civil Airport (KLAS)', distKm: 78, azimuth: '180° S', type: 'Civil Commercial' },
    { name: 'Vandenberg Space Force Base', distKm: 340, azimuth: '240° W', type: 'USSF Launch Facility' }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[260] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto font-mono">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-slate-950 border border-ufo-green/40 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,255,157,0.15)] space-y-6 overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 text-ufo-green text-xs font-bold uppercase tracking-widest mb-1">
                <Compass className="w-4 h-4 animate-spin" />
                <span>ONE-CLICK TRIANGULATION MATRIX</span>
              </div>
              <h2 className="text-xl md:text-2xl font-display font-extrabold text-white uppercase tracking-tight">
                PROXIMITY & BEARING SENSOR RADAR
              </h2>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Target Metadata Header */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[9px] text-ufo-green uppercase font-bold tracking-widest block">TARGET COORDINATES</span>
              <h3 className="text-sm font-bold text-white mt-0.5">{incidentTitle}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                LAT: {lat.toFixed(4)}° • LNG: {lng.toFixed(4)}°
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-ufo-green/20 text-ufo-green px-3 py-1 rounded-full border border-ufo-green/40 flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                <span>CONCENTRIC RINGS ACTIVE</span>
              </span>
            </div>
          </div>

          {/* Visual Radar Rings Mock Canvas */}
          <div className="relative w-full h-48 rounded-2xl bg-slate-900/90 border border-ufo-green/30 flex items-center justify-center overflow-hidden">
            {/* Concentric Bearing Rings */}
            <div className="absolute w-40 h-40 rounded-full border border-ufo-green/20 animate-ping pointer-events-none" />
            <div className="absolute w-32 h-32 rounded-full border border-ufo-green/40" />
            <div className="absolute w-20 h-20 rounded-full border border-ufo-green/60" />
            <div className="absolute w-8 h-8 rounded-full border border-ufo-green/80 bg-ufo-green/20" />
            
            {/* Center Reticle Pin */}
            <div className="relative z-10 p-2 rounded-full bg-ufo-green text-black font-black text-[10px] shadow-[0_0_20px_#00ff9d]">
              <Target className="w-5 h-5 animate-pulse" />
            </div>

            {/* Distance Labels */}
            <span className="absolute top-2 left-3 text-[9px] text-ufo-green/80 font-bold">25 NM RING</span>
            <span className="absolute top-2 right-3 text-[9px] text-ufo-green/80 font-bold">50 NM RING</span>
            <span className="absolute bottom-2 left-3 text-[9px] text-ufo-green/80 font-bold">100 NM RING</span>
          </div>

          {/* Nearest Airbases & Proximity Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {strategicAirbases.map((base, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase">{base.type}</span>
                <h4 className="text-xs font-bold text-white uppercase">{base.name}</h4>
                <div className="flex items-center justify-between text-xs pt-2 text-ufo-green font-bold border-t border-white/5">
                  <span>Dist: {base.distKm} km</span>
                  <span>Azimuth: {base.azimuth}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Live Sensor Overlap Summary */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block border-b border-white/10 pb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> SENSOR CORRELATION TRIANGULATION SUMMARY
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2.5 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Airspace ADS-B Scan: Cleared</span>
                  <span className="text-[10px] text-slate-400">0 civil aircraft within 50 km radius</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">NOAA Kp Index: Normal (Kp 3.2)</span>
                  <span className="text-[10px] text-slate-400">Ionospheric noise levels within normal variance</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-ufo-green hover:bg-emerald-400 text-black text-xs font-black uppercase transition-colors"
            >
              CLOSE TRIANGULATION MATRIX
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
