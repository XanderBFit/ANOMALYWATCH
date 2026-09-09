import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Zap, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  Info, 
  ExternalLink, 
  Share2, 
  Check, 
  Loader2, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Tag
} from 'lucide-react';
import { UFOSighting, TrendingAnomaly, AccessibleAnomalyExplanation, AnomalyCategory } from '../types';
import { calculateTrendingAnomalies, fetchAccessibleExplanationGemini, generateAccessibleExplanation } from '../services/anomalyService';
import { SpeechButton } from './SpeechButton';
import { triggerTacticalVibration } from '../services/geminiService';

interface TrendingAnomalyItemCardProps {
  item: TrendingAnomaly;
  index: number;
  isLoadingAI: boolean;
  copiedId: string | null;
  onSelectAnomaly?: (anomaly: UFOSighting) => void;
  onEnhanceAI: (item: TrendingAnomaly) => void;
  onCopySummary: (item: TrendingAnomaly) => void;
}

const TrendingAnomalyItemCard = React.memo<TrendingAnomalyItemCardProps>(({
  item,
  index,
  isLoadingAI,
  copiedId,
  onSelectAnomaly,
  onEnhanceAI,
  onCopySummary
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
      className="bg-slate-950/80 border border-white/10 hover:border-ufo-green/40 rounded-3xl p-5 md:p-6 shadow-2xl transition-all relative overflow-hidden group content-contain"
    >
      {/* Background glow accent and pulsing signal dot */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-ufo-green/5 rounded-full blur-3xl pointer-events-none group-hover:bg-ufo-green/10 transition-all"></div>
      <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${
        item.severity === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping' :
        item.severity === 'HIGH' ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b]' :
        'bg-ufo-green shadow-[0_0_10px_#00ff9d] animate-pulse'
      }`} />

      {/* Top Badge Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pr-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 bg-ufo-green/10 border border-ufo-green/30 text-ufo-green rounded-xl text-[10px] font-mono font-black tracking-widest flex items-center gap-1">
            <Flame className="w-3 h-3 text-ufo-green animate-pulse" />
            +{item.surgePercentage}% SURGE
          </span>

          <span className="px-2.5 py-1 bg-slate-900/80 border border-white/10 text-slate-300 rounded-xl text-[10px] font-mono uppercase flex items-center gap-1">
            <Tag className="w-3 h-3 text-cyan-400" />
            {item.category}
          </span>

          <span className={`px-2 py-1 rounded-xl text-[10px] font-mono font-bold border ${
            item.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' :
            item.severity === 'HIGH' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
            'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
          }`}>
            {item.severity} SEVERITY
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5 text-ufo-green" />
          <span>{item.timeAgo}</span>
        </div>
      </div>

      {/* Title & Location */}
      <div className="space-y-1 mb-4">
        <h3 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-wider group-hover:text-ufo-green transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-ufo-green" />
          <span>{item.location}</span>
        </div>
      </div>

      {/* Brief Telemetry Summary */}
      <p className="text-xs text-slate-300 leading-relaxed font-sans mb-5 bg-black/50 p-4 rounded-2xl border border-white/5 shadow-inner">
        {item.description}
      </p>

      {/* ACCESSIBLE EXPLANATION CARD */}
      <div className="bg-slate-900/90 border border-white/10 hover:border-ufo-green/20 rounded-2xl p-4 md:p-5 space-y-4 relative shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-ufo-green/10 text-ufo-green rounded-xl border border-ufo-green/20">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-ufo-green uppercase tracking-wider">
                General Audience Explanation
              </h4>
              <span className="text-[9px] font-mono text-slate-400 block">
                Concise analysis of significance, potential causes & implications
              </span>
            </div>
          </div>

          <SpeechButton 
            text={`${item.title}. Significance: ${item.explanation.significance}. Potential Causes: ${item.explanation.potentialCauses.join(', ')}. Implications: ${item.explanation.possibleImplications}`}
            trackId={`trending-speech-${item.id}`}
          />
        </div>

        {/* 1. SIGNIFICANCE */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 uppercase">
            <span>💡 Significance</span>
          </div>
          <p className="text-xs md:text-sm text-slate-200 font-sans leading-relaxed pl-3 border-l-2 border-cyan-500/50">
            {item.explanation.significance}
          </p>
        </div>

        {/* 2. POTENTIAL CAUSES */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 uppercase">
            <span>⚙️ Potential Causes</span>
          </div>
          <ul className="space-y-1 pl-3 border-l-2 border-cyan-500/50">
            {item.explanation.potentialCauses.map((cause, cIdx) => (
              <li key={cIdx} className="text-xs text-slate-300 font-sans flex items-start gap-2">
                <span className="text-cyan-400 font-mono text-[10px] mt-0.5">◆</span>
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. POSSIBLE IMPLICATIONS */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-ufo-green uppercase">
            <span>🌐 Possible Implications</span>
          </div>
          <p className="text-xs md:text-sm text-slate-200 font-sans leading-relaxed pl-3 border-l-2 border-ufo-green/50">
            {item.explanation.possibleImplications}
          </p>
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="mt-5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {onSelectAnomaly && (
            <button
              onClick={() => {
                triggerTacticalVibration([15, 20]);
                onSelectAnomaly({
                  id: item.id,
                  title: item.title,
                  date: new Date(item.timestamp).toLocaleDateString(),
                  location: item.location,
                  description: item.description,
                  category: item.category,
                  severity: item.severity,
                  timestamp: item.timestamp,
                  operative: 'TRENDING_FEED'
                });
              }}
              className="px-3.5 py-1.5 bg-ufo-green/15 hover:bg-ufo-green border border-ufo-green/40 text-ufo-green hover:text-black rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>OPEN FULL DOSSIER</span>
            </button>
          )}

          <button
            onClick={() => onEnhanceAI(item)}
            disabled={isLoadingAI}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-400 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isLoadingAI ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>REFINER (GEMINI AI)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onCopySummary(item)}
            className="p-2 bg-slate-900 border border-white/10 hover:border-white/30 text-slate-400 hover:text-white rounded-xl text-xs font-mono transition-all flex items-center gap-1"
            title="Copy accessible summary"
          >
            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-ufo-green" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden sm:inline">{copiedId === item.id ? 'COPIED!' : 'SHARE'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
});

TrendingAnomalyItemCard.displayName = 'TrendingAnomalyItemCard';

interface TrendingAnomaliesFeedProps {
  sightings?: UFOSighting[];
  onSelectAnomaly?: (anomaly: UFOSighting) => void;
  className?: string;
}

export const TrendingAnomaliesFeed: React.FC<TrendingAnomaliesFeedProps> = ({
  sightings = [],
  onSelectAnomaly,
  className = ''
}) => {
  const [trendingList, setTrendingList] = useState<TrendingAnomaly[]>([]);
  const [filterMode, setFilterMode] = useState<'ALL' | 'HIGH_SURGE' | 'NEW' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingExplMap, setLoadingExplMap] = useState<Record<string, boolean>>({});
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute trending anomalies on load and when sightings update
  useEffect(() => {
    const calculated = calculateTrendingAnomalies(sightings);
    setTrendingList(calculated);
  }, [sightings]);

  const handleRefreshFeed = () => {
    setIsRefreshing(true);
    triggerTacticalVibration([15, 25]);
    setTimeout(() => {
      const updated = calculateTrendingAnomalies(sightings);
      setTrendingList(updated);
      setIsRefreshing(false);
    }, 600);
  };

  const handleEnhanceExplanationWithAI = useCallback(async (item: TrendingAnomaly) => {
    setLoadingExplMap(prev => ({ ...prev, [item.id]: true }));
    triggerTacticalVibration([20, 40]);
    try {
      const aiExplanation = await fetchAccessibleExplanationGemini({
        title: item.title,
        description: item.description,
        location: item.location,
        category: item.category
      });

      setTrendingList(prev => prev.map(t => {
        if (t.id === item.id) {
          return { ...t, explanation: aiExplanation };
        }
        return t;
      }));
    } catch (err) {
      console.error("Failed to enhance explanation:", err);
    } finally {
      setLoadingExplMap(prev => ({ ...prev, [item.id]: false }));
    }
  }, []);

  const handleCopySummary = useCallback((item: TrendingAnomaly) => {
    const text = `🚨 TRENDING ANOMALY: ${item.title}
📍 Location: ${item.location}
⚡ Surge: +${item.surgePercentage}% (${item.timeAgo})

💡 SIGNIFICANCE:
${item.explanation.significance}

⚙️ POTENTIAL CAUSES:
${item.explanation.potentialCauses.map(c => `• ${c}`).join('\n')}

🌐 IMPLICATIONS:
${item.explanation.possibleImplications}

Tracked via ANOMALY WATCH`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Filter list
  const filteredList = trendingList.filter(item => {
    if (filterMode === 'HIGH_SURGE' && item.surgePercentage < 200) return false;
    if (filterMode === 'NEW' && item.trendingReason !== 'NEWLY_DETECTED') return false;
    if (filterMode === 'CRITICAL' && item.severity !== 'CRITICAL') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchLoc = item.location.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      return matchTitle || matchLoc || matchCat || matchDesc;
    }
    return true;
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Controls Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-black p-6 rounded-3xl border border-white/10 hover:border-ufo-green/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-ufo-green/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-ufo-green/10 border border-ufo-green/30 text-ufo-green rounded-2xl animate-pulse shadow-[0_0_20px_rgba(0,255,157,0.2)]">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-ufo-green font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-ufo-green shadow-[0_0_8px_#00ff9d] animate-ping"></span>
                  LIVE INTEL FEED
                </span>
                <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-ufo-green/15 text-ufo-green font-mono border border-ufo-green/30 font-bold">
                  {trendingList.length} Active Surges
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-wider mt-0.5">
                Trending Anomalies
              </h2>
              <p className="text-xs font-sans text-slate-400">
                Highlights breaking events, sudden activity spikes, and overlooked anomalous signals with clear general-audience explanations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshFeed}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-white/10 hover:border-ufo-green/40 hover:bg-ufo-green/10 text-ufo-green rounded-xl text-xs font-mono font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>REFRESH FEED</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 relative z-10">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'ALL'
                  ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> All Trending ({trendingList.length})
            </button>

            <button
              onClick={() => setFilterMode('HIGH_SURGE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'HIGH_SURGE'
                  ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> High Surge (&gt;200%)
            </button>

            <button
              onClick={() => setFilterMode('NEW')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'NEW'
                  ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Just Detected
            </button>

            <button
              onClick={() => setFilterMode('CRITICAL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'CRITICAL'
                  ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Critical Threat
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword or location..."
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans"
            />
          </div>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4 log-container-optimized">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center bg-slate-950/60 border border-slate-800 rounded-3xl space-y-3">
            <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-mono font-bold text-slate-300 uppercase">No Anomalies Match Current Filters</h3>
            <p className="text-xs text-slate-500">Try adjusting your search query or selecting "All Trending".</p>
          </div>
        ) : (
          filteredList.map((item, index) => (
            <TrendingAnomalyItemCard
              key={item.id}
              item={item}
              index={index}
              isLoadingAI={!!loadingExplMap[item.id]}
              copiedId={copiedId}
              onSelectAnomaly={onSelectAnomaly}
              onEnhanceAI={handleEnhanceExplanationWithAI}
              onCopySummary={handleCopySummary}
            />
          ))
        )}
      </div>
    </div>
  );
};
