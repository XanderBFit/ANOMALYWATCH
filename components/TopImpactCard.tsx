import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UFOSighting } from '../types';
import { generateAccessibleExplanation, fetchAccessibleExplanationGemini } from '../services/anomalyService';
import { AwButton } from './AwButton';
import { 
  MapPin, 
  Clock, 
  Sparkles, 
  Info, 
  HelpCircle, 
  Globe, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Tag,
  AlertTriangle
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
  const [isMinimized, setIsMinimized] = useState(() => localStorage.getItem('aw_top_impact_minimized') === 'true');

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

  const toggleMinimized = () => {
    const next = !isMinimized;
    setIsMinimized(next);
    localStorage.setItem('aw_top_impact_minimized', String(next));
  };

  const ts = typeof anomaly.timestamp === 'number' 
    ? anomaly.timestamp 
    : (anomaly.timestamp?.seconds ? anomaly.timestamp.seconds * 1000 : Date.now());
  const diffHours = Math.max(0.1, (Date.now() - ts) / (1000 * 60 * 60));
  const timeAgo = diffHours < 1 ? `${Math.round(diffHours * 60)}m ago` : `${Math.round(diffHours)}h ago`;

  const fullSpeechText = `Featured Anomaly: ${anomaly.title}. Location: ${anomaly.location}. Significance: ${explanation.significance}. Potential causes: ${explanation.potentialCauses.join(', ')}. Implications: ${explanation.possibleImplications}`;

  return (
    <div className="relative rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-amber-500/20 transition-all p-4 md:p-6 overflow-hidden backdrop-blur-md">
      {/* Top Banner Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Key Incident Focus
          </span>
          <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-slate-300 rounded-md text-[11px] font-mono">
            Surge +340%
          </span>
          <div className="flex items-center gap-1 text-xs font-mono text-slate-400 ml-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{timeAgo}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SpeechButton text={fullSpeechText} title="Listen to Incident Briefing" />
          <button
            onClick={toggleMinimized}
            className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title={isMinimized ? "Expand Featured Incident" : "Minimize Card"}
          >
            <span>{isMinimized ? 'Expand' : 'Collapse'}</span>
            {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Minimized Quick Bar */}
      {isMinimized ? (
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 truncate max-w-2xl">
            <span className="text-amber-400 font-bold">•</span>
            <span className="text-white font-semibold truncate">{anomaly.title}</span>
            <span className="text-slate-500">({anomaly.location})</span>
          </div>
          <button
            onClick={() => onSelectAnomaly(anomaly)}
            className="text-xs text-ufo-green hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Inspect Dossier</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        /* Full Content Body */
        <div className="pt-4 space-y-4">
          {/* Title & Metadata */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Tag className="w-3 h-3 text-cyan-400" />
              <span className="text-slate-300 font-semibold">{anomaly.category || 'UFO / UAP'}</span>
              <span>•</span>
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>{anomaly.location || 'Global Airspace'}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
              {anomaly.title}
            </h2>
            <p className="text-xs sm:text-sm font-sans text-slate-300 leading-relaxed font-normal">
              {anomaly.description}
            </p>
          </div>

          {/* Accessible 3-Part Intelligence Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* Section 1: Significance */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>💡 Significance</span>
              </div>
              <p className="text-xs font-sans text-slate-300 leading-relaxed">
                {explanation.significance}
              </p>
            </div>

            {/* Section 2: Potential Causes */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>⚙️ Potential Causes</span>
              </div>
              <ul className="space-y-1 text-xs font-sans text-slate-300">
                {explanation.potentialCauses.map((cause, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-400/80 text-[10px] mt-0.5">•</span>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 3: Possible Implications */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-400">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>🌐 Possible Implications</span>
              </div>
              <p className="text-xs font-sans text-slate-300 leading-relaxed">
                {explanation.possibleImplications}
              </p>
            </div>
          </div>

          {/* Actions Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-2.5">
              <AwButton
                variant="primary"
                size="sm"
                onClick={onOpenMap}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>View on Map</span>
              </AwButton>

              <AwButton
                variant="secondary"
                size="sm"
                onClick={() => onSelectAnomaly(anomaly)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>Open Dossier</span>
              </AwButton>
            </div>

            <button
              onClick={handleEnhanceWithAI}
              disabled={isEnhancing}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isEnhancing ? 'animate-spin' : ''}`} />
              <span>{isEnhancing ? 'Re-analyzing...' : 'AI Enhance'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

