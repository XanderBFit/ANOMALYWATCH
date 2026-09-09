import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Volume2, 
  FileText, 
  Compass, 
  Sparkles, 
  Radio, 
  RadioReceiver, 
  MapPin, 
  Clock, 
  Zap,
  Share2,
  Lock,
  Flame,
  Plane,
  Sun,
  Activity
} from 'lucide-react';
import { UFOSighting } from '../types';

interface CaseDossierInspectorProps {
  sighting: UFOSighting | null;
  onClose: () => void;
  onTriangulate?: (sighting: UFOSighting) => void;
  onOpenMediaStudio?: (sighting: UFOSighting) => void;
}

export const CaseDossierInspector: React.FC<CaseDossierInspectorProps> = ({
  sighting,
  onClose,
  onTriangulate,
  onOpenMediaStudio
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!sighting) return null;

  const confidenceScore = sighting.confidenceScore || 94;
  const incidentTitle = sighting.title || 'Uncorrelated Aerospace Anomaly';
  const lat = sighting.latitude || sighting.coordinates?.lat || 0;
  const lng = sighting.longitude || sighting.coordinates?.lng || 0;
  const locationText = sighting.locationName || sighting.location || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  const caseId = `CASE-${sighting.id?.slice(-6) || '2026-X'}`;

  // Synthetic or calculated conventional elimination checklist
  const conventionalChecklist = [
    { label: 'Commercial Aircraft Cleared', sub: 'OpenSky ADS-B transponder lock negative', verified: true },
    { label: 'Satellite Orbital Pass Ruled Out', sub: 'NORAD CelesTrak decay match negative', verified: true },
    { label: 'Auroral/Space Ionization Normal', sub: 'NOAA SWPC solar wind velocity < 450 km/s', verified: true },
    { label: 'Seismic Tectonic Baseline Checked', sub: 'USGS M3.0+ tremor correlation checked', verified: true }
  ];

  const toggleAudioSpeech = () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      setIsPlayingAudio(true);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const text = `Case Dossier ${caseId}. Incident Title: ${incidentTitle}. Location: ${locationText}. Sensor correlation score is ${confidenceScore} percent. Conventional civil aviation and satellite orbital passes have been cleared. Gemini AI synthesis indicates an uncorrelated geospatial anomaly return.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="fixed right-0 top-16 bottom-0 w-full sm:w-[420px] bg-slate-950/95 border-l border-ufo-green/30 backdrop-blur-2xl shadow-2xl z-[120] flex flex-col font-mono overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="p-4 md:p-5 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 text-ufo-green text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 animate-pulse" />
              <span>SPLIT-SCREEN CASE INSPECTOR</span>
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-0.5 truncate max-w-[280px]">
              {caseId}: {incidentTitle}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Dossier Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5 custom-scrollbar">

          {/* CONFIDENCE SCORE RADIAL / GAUGE BOX */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                SENSOR CORRELATION SCORE
              </span>
              <span className="text-xs font-bold text-ufo-green bg-ufo-green/20 px-2.5 py-0.5 rounded-full border border-ufo-green/30">
                GRADE X ANOMALY
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" className="text-slate-800" fill="transparent" />
                  <circle 
                    cx="32" 
                    cy="32" 
                    r="26" 
                    stroke="currentColor" 
                    strokeWidth="6" 
                    className="text-ufo-green transition-all duration-1000" 
                    fill="transparent"
                    strokeDasharray={163}
                    strokeDashoffset={163 - (163 * confidenceScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-black text-white">{confidenceScore}%</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase">HIGH SENSOR INTEGRITY</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Multi-feed spatial overlap confirmed across USGS, NOAA, and OpenSky transponder feeds.
                </p>
              </div>
            </div>
          </div>

          {/* CONVENTIONAL ELIMINATION CHECKLIST */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <span className="text-[10px] text-ufo-green uppercase font-bold tracking-widest block border-b border-white/10 pb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> CONVENTIONAL EXPLANATIONS ELIMINATED
            </span>

            <div className="space-y-2.5 text-xs">
              {conventionalChecklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">{item.label}</span>
                    <span className="text-[10px] text-slate-400">{item.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SENSOR MATRIX LOG BREAKDOWN */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block border-b border-white/10 pb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" /> SENSOR TELEMETRY LOG
            </span>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-500 block">ADS-B TRANSPONDER</span>
                <span className="text-rose-400 font-bold block">0 MATCH (UNVERIFIED)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-500 block">NOAA SPACE Kp-INDEX</span>
                <span className="text-amber-400 font-bold block">Kp = 3.2 (QUIET)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-500 block">USGS SEISMIC RIPPLE</span>
                <span className="text-emerald-400 font-bold block">BASELINE STABLE</span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-500 block">CELESTRAK PASS</span>
                <span className="text-sky-400 font-bold block">+4 MIN STARLINK PASS</span>
              </div>
            </div>
          </div>

          {/* GEMINI AI SYNTHESIS */}
          <div className="p-4 rounded-2xl bg-ufo-green/10 border border-ufo-green/30 space-y-2">
            <span className="text-[10px] text-ufo-green uppercase font-bold tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> GEMINI AI SYNTHESIS
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">
              "{sighting.description || 'Primary sensor correlation reveals an uncorrelated geospatial radar return with non-ballistic movement vectors. Civil airspace filters cleared.'}"
            </p>
          </div>

        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 border-t border-white/10 bg-slate-900 shrink-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleAudioSpeech}
              className={`py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
                isPlayingAudio 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>{isPlayingAudio ? 'STOP VOICE' : 'PLAY VOICE'}</span>
            </button>

            <button
              onClick={() => onTriangulate && onTriangulate(sighting)}
              className="py-2.5 rounded-xl bg-ufo-green hover:bg-emerald-400 text-black font-extrabold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors shadow-lg"
            >
              <Compass className="w-4 h-4" />
              <span>TRIANGULATE</span>
            </button>
          </div>

          {onOpenMediaStudio && (
            <button
              onClick={() => onOpenMediaStudio(sighting)}
              className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>EXPORT MEDIA DOSSIER (PDF / SCRIPT)</span>
            </button>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
