import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UFOSighting } from '../types';
import { generateAccessibleExplanation, fetchAccessibleExplanationGemini } from '../services/anomalyService';
import { AwButton, AwEmblem } from './AwButton';
import { 
  Flame, 
  MapPin, 
  Clock, 
  Sparkles, 
  Info, 
  HelpCircle, 
  Globe, 
  ChevronRight, 
  ShieldAlert, 
  RefreshCw,
  Tag
} from 'lucide-react';
import { SpeechButton } from './SpeechButton';

interface TopImpactCardProps {
  anomaly: UFOSighting;
  onSelectAnomaly: (anomaly: UFOSighting) => void;
  onOpenMap: () => void;
}

export const TopImpactCard: React.FC<TopImpactCardProps> = ({
  anomaly,
  onSelectAnomaly,
  onOpenMap
}) => {
  const [explanation, setExplanation] = useState(() => generateAccessibleExplanation(anomaly));
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    setExplanation(generateAccessibleExplanation(anomaly));
  }, [anomaly.id, anomaly.title, anomaly.description, anomaly.category]);

  const handleEnhanceWithAI = async () => {
    setIsEnhancing(true);
    try {
      const geminiExp = await fetchAccessibleExplanationGemini(anomaly);
      setExplanation(geminiExp);
    } catch (err) {
      console.warn("AI enhancement failed, using standard heuristic:", err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const ts = typeof anomaly.timestamp === 'number' 
    ? anomaly.timestamp 
    : (anomaly.timestamp?.seconds ? anomaly.timestamp.seconds * 1000 : Date.now());
  const diffHours = Math.max(0.1, (Date.now() - ts) / (1000 * 60 * 60));
  const timeAgo = diffHours < 1 ? `${Math.round(diffHours * 60)}m ago` : `${Math.round(diffHours)}h ago`;

  const fullSpeechText = `Top Impact Anomaly: ${anomaly.title}. Location: ${anomaly.location}. Significance: ${explanation.significance}. Potential causes: ${explanation.potentialCauses.join(', ')}. Implications: ${explanation.possibleImplications}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-3xl bg-slate-950/90 border-2 border-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.25)] p-6 md:p-8 overflow-hidden group"
    >
      {/* Background Animated Atmosphere */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none"></div>

      {/* Top Banner Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-red-500/20 border border-red-500/60 text-red-400 rounded-xl text-[11px] font-mono font-black tracking-widest flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            CRITICAL THREAT // TOP IMPACT ANOMALY
          </span>
          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] font-mono font-bold uppercase flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400 animate-bounce" />
            +340% SURGE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-ufo-green" />
            <span>{timeAgo}</span>
          </div>
          <SpeechButton text={fullSpeechText} title="Listen to Audio Briefing" />
        </div>
      </div>

      {/* Title & Metadata */}
      <div className="relative z-10 space-y-2 mb-6">
        <div className="flex items-center gap-2 text-xs font-mono text-ufo-green uppercase tracking-widest font-black">
          <Tag className="w-3.5 h-3.5 text-cyan-400" />
          <span>{anomaly.category || 'UFO / UAP'}</span>
          <span>•</span>
          <MapPin className="w-3.5 h-3.5 text-ufo-green" />
          <span>{anomaly.location || 'Global Airspace'}</span>
        </div>
        <h2 className="text-2xl md:text-4xl font-display font-black text-white uppercase tracking-tight group-hover:text-ufo-green transition-colors leading-tight">
          {anomaly.title}
        </h2>
        <p className="text-sm font-sans text-slate-300 font-light leading-relaxed max-w-4xl">
          {anomaly.description}
        </p>
      </div>

      {/* Accessible 3-Part Intelligence Breakdown */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Section 1: Significance */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-ufo-green uppercase tracking-wider">
            <Info className="w-4 h-4 text-ufo-green" />
            <span>💡 Significance</span>
          </div>
          <p className="text-xs font-sans text-slate-300 leading-relaxed font-light">
            {explanation.significance}
          </p>
        </div>

        {/* Section 2: Potential Causes */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>⚙️ Potential Causes</span>
          </div>
          <ul className="space-y-1 text-xs font-sans text-slate-300 font-light">
            {explanation.potentialCauses.map((cause, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-400 text-[10px] mt-0.5">◆</span>
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 3: Possible Implications */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>🌐 Possible Implications</span>
          </div>
          <p className="text-xs font-sans text-slate-300 leading-relaxed font-light">
            {explanation.possibleImplications}
          </p>
        </div>
      </div>

      {/* Actions Strip */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          <AwButton
            variant="primary"
            size="md"
            onClick={onOpenMap}
          >
            <Globe className="w-4 h-4" />
            <span>LOCATE ON GEOSPATIAL MAP</span>
          </AwButton>

          <AwButton
            variant="secondary"
            size="md"
            onClick={() => onSelectAnomaly(anomaly)}
          >
            <ChevronRight className="w-4 h-4" />
            <span>INSPECT FULL DOSSIER</span>
          </AwButton>
        </div>

        <button
          onClick={handleEnhanceWithAI}
          disabled={isEnhancing}
          className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-ufo-green transition-colors disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 text-ufo-green ${isEnhancing ? 'animate-spin' : ''}`} />
          <span>{isEnhancing ? 'RE-ANALYZING WITH GEMINI...' : 'RE-ENHANCE WITH AI'}</span>
        </button>
      </div>
    </motion.div>
  );
};
