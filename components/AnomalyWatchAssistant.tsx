import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  X, 
  Search, 
  Sparkles, 
  History, 
  Zap, 
  Building2, 
  ShieldAlert, 
  Volume2, 
  FolderPlus, 
  ExternalLink, 
  Loader2, 
  ChevronRight, 
  HelpCircle,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { AnomalyDeepDiveExplanation } from '../types';
import { getAnomalyWatchDeepDive, triggerTacticalVibration } from '../services/geminiService';
import { CaseOps } from '../services/caseOps';
import { SpeechButton } from './SpeechButton';

interface AnomalyWatchAssistantProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialQuery?: string | null;
  onNavigateToInvestigate?: (topic: string) => void;
}

const PRESET_ANOMALIES = [
  "2004 USS Nimitz Tic-Tac UAP",
  "Hessdalen Lights Transient Plasma",
  "1977 Wow! Signal Extraterrestrial Intercept",
  "Rendlesham Forest Electromagnetic Incident",
  "Baltic Sea Anomaly Sonar Structure",
  "Phoenix Lights Massive Triangular Craft"
];

export const AnomalyWatchAssistant: React.FC<AnomalyWatchAssistantProps> = ({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  initialQuery,
  onNavigateToInvestigate
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [deepDive, setDeepDive] = useState<AnomalyDeepDiveExplanation | null>(null);
  const [activeTab, setActiveTab] = useState<'historical' | 'factors' | 'experts'>('historical');
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handlePerformDeepDive(initialQuery);
      if (externalIsOpen === undefined) {
        setInternalIsOpen(true);
      }
    }
  }, [initialQuery]);

  const handleOpen = () => {
    triggerTacticalVibration(15);
    if (externalIsOpen === undefined) {
      setInternalIsOpen(true);
    }
  };

  const handleClose = () => {
    triggerTacticalVibration(10);
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handlePerformDeepDive = async (targetQuery: string) => {
    if (!targetQuery.trim()) return;
    setLoading(true);
    setDeepDive(null);
    setSavedCaseId(null);
    triggerTacticalVibration([20, 30, 20]);

    try {
      const result = await getAnomalyWatchDeepDive(targetQuery);
      setDeepDive(result);
    } catch (err) {
      console.error("Assistant Deep Dive query failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePerformDeepDive(query);
  };

  const handleSaveToOpsLog = async () => {
    if (!deepDive) return;
    triggerTacticalVibration(25);

    const fullContent = `# DEEP DIVE DOSSIER: ${deepDive.title}
    
## SUMMARY
${deepDive.summary}

## 📜 HISTORICAL CONTEXT
**Timeline & Origins:**
${deepDive.historicalContext.originAndTimeline}

**Historical Significance:**
${deepDive.historicalContext.significance}

### Precursor Cases:
${deepDive.historicalContext.precursorCases.map(c => `- **${c.title}** (${c.date}): ${c.description}`).join('\n')}

## ⚡ CONTRIBUTING FACTORS & POTENTIAL CAUSES
### Primary Hypotheses:
${deepDive.contributingFactorsAndCauses.primaryHypotheses.map(h => `- **${h.hypothesis}** [Probability: ${h.probability}]: ${h.details}`).join('\n')}

**Environmental / Technical Factors:**
${deepDive.contributingFactorsAndCauses.environmentalOrTechnicalFactors.map(f => `- ${f}`).join('\n')}

**Unresolved Anomalous Elements:**
${deepDive.contributingFactorsAndCauses.fringeOrUnexplainedElements}

## 🏛️ EXPERT & ORGANIZATIONAL VIEWS
**Official Agency Stance:**
${deepDive.expertAndOrganizationalViews.officialStance}

**Expert Scientific Consensus:**
${deepDive.expertAndOrganizationalViews.expertConsensus}

### Investigating Organizations:
${deepDive.expertAndOrganizationalViews.keyOrganizations.map(o => `- **${o.name}** [Concern Level: ${o.levelOfConcern}]: ${o.position}`).join('\n')}
`;

    try {
      const createdId = await CaseOps.createCase(
        `Deep Dive: ${deepDive.title}`,
        fullContent,
        'Deep Dive',
        {
          id: Date.now().toString(),
          type: 'Assistant Deep Dive',
          content: JSON.stringify(deepDive),
          timestamp: Date.now(),
          urls: deepDive.groundingUrls
        }
      );
      setSavedCaseId(createdId);
    } catch (err) {
      console.error("Failed to save case record:", err);
    }
  };

  const formattedTtsText = deepDive 
    ? `Deep Dive Report on ${deepDive.title}. ${deepDive.summary}. Historical Context: ${deepDive.historicalContext.originAndTimeline}. Expert consensus: ${deepDive.expertAndOrganizationalViews.expertConsensus}` 
    : "";

  return (
    <>
      {/* Floating Tactical Orb Trigger Button if managed internally */}
      {externalIsOpen === undefined && !internalIsOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-20 right-4 sm:right-6 md:bottom-6 md:right-6 z-[80] group w-14 h-14 rounded-full bg-slate-950/90 border border-ufo-green/60 text-ufo-green flex items-center justify-center shadow-[0_0_25px_rgba(0,255,157,0.4)] hover:shadow-[0_0_40px_rgba(0,255,157,0.8)] hover:scale-110 active:scale-95 transition-all cursor-pointer backdrop-blur-xl"
          title="Tactical AI Orb - Click for Deep Dive Analysis"
        >
          {/* Pulsing Outer Core Ring */}
          <div className="absolute inset-0 rounded-full border border-ufo-green/30 group-hover:border-ufo-green animate-ping pointer-events-none" />
          
          <div className="relative flex items-center justify-center">
            <Bot className="w-6 h-6 text-ufo-green group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-ufo-green rounded-full border-2 border-black shadow-[0_0_8px_#00ff9d] animate-pulse" />
          </div>
        </button>
      )}

      {/* Main Slide-Over / Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[2500] flex justify-end bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`bg-[#08090d] border-l border-ufo-green/40 text-slate-200 h-full flex flex-col shadow-2xl relative transition-all duration-300 ${
                isExpanded ? 'w-full md:w-[90vw] lg:w-[80vw]' : 'w-full md:w-[650px] lg:w-[750px]'
              }`}
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 bg-black/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-ufo-green/10 border border-ufo-green/40 rounded-xl text-ufo-green">
                    <Bot className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-display font-black text-white uppercase tracking-wider">
                        ANOMALY WATCH ASSISTANT
                      </h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ufo-green/20 text-ufo-green border border-ufo-green/30 uppercase">
                        DEEP DIVE ENGINE
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-400">
                      Query anomaly dossiers, historical context, contributing factors & expert stances
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors hidden sm:block"
                    title={isExpanded ? "Collapse View" : "Expand View"}
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Search Bar & Query Input */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ask details about any anomaly (e.g. 'Nimitz Tic-Tac', 'Hessdalen Lights', 'Wow! Signal')..."
                      className="w-full pl-11 pr-28 py-3.5 bg-slate-950 border border-white/15 focus:border-ufo-green rounded-xl text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-ufo-green shadow-inner"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <button
                      type="submit"
                      disabled={loading || !query.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-ufo-green text-black font-mono font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Deep Dive
                    </button>
                  </div>

                  {/* Preset Query Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase self-center mr-1">
                      Quick Topics:
                    </span>
                    {PRESET_ANOMALIES.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setQuery(item);
                          handlePerformDeepDive(item);
                        }}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-ufo-green/20 border border-white/10 hover:border-ufo-green/40 text-slate-300 hover:text-ufo-green transition-all"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </form>

                {/* Loading State */}
                {loading && (
                  <div className="py-16 text-center space-y-4 bg-slate-950/40 border border-white/5 rounded-2xl">
                    <div className="relative w-12 h-12 mx-auto">
                      <div className="absolute inset-0 border-4 border-ufo-green/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-ufo-green border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-bold text-ufo-green uppercase tracking-widest animate-pulse">
                        SYNTHESIZING DEEP DIVE EXPLANATION...
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        Querying FOIA archives, scientific studies & expert agency consensus
                      </p>
                    </div>
                  </div>
                )}

                {/* Empty Initial State */}
                {!loading && !deepDive && (
                  <div className="py-12 px-6 border border-dashed border-white/10 rounded-2xl text-center space-y-4 bg-slate-950/20">
                    <HelpCircle className="w-12 h-12 mx-auto text-slate-600" />
                    <div className="max-w-md mx-auto space-y-2">
                      <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                        ANOMALY WATCH KNOWLEDGE DEEP DIVE ENGINE
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Ask about any specific event, sighting, or phenomenon. The assistant will synthesize a structured Deep Dive covering <strong>Historical Context</strong>, <strong>Contributing Factors & Causes</strong>, and <strong>Expert/Organizational Stances</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Result Display */}
                {!loading && deepDive && (
                  <div className="space-y-6">
                    {/* Header Card */}
                    <div className="p-5 bg-slate-950 border border-ufo-green/30 rounded-2xl space-y-4 shadow-xl">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="text-[10px] font-mono text-ufo-green uppercase tracking-widest mb-1">
                            ANOMALY WATCH DEEP DIVE DOSSIER
                          </div>
                          <h3 className="text-xl font-display font-black text-white uppercase tracking-wide">
                            {deepDive.title}
                          </h3>
                        </div>

                        {deepDive.confidenceScore && (
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono text-slate-400 block uppercase">Confidence</span>
                            <span className="text-lg font-mono font-black text-ufo-green">{deepDive.confidenceScore}%</span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-slate-300 leading-relaxed bg-black/40 p-3.5 rounded-xl border border-white/5 italic">
                        {deepDive.summary}
                      </p>

                      {/* Control Bar: Audio + OpsLog */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                        <SpeechButton text={formattedTtsText} />

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveToOpsLog}
                            disabled={!!savedCaseId}
                            className="px-3.5 py-2 bg-white/5 hover:bg-ufo-green/20 border border-white/10 hover:border-ufo-green/50 text-slate-200 hover:text-ufo-green font-mono text-xs uppercase rounded-lg transition-all flex items-center gap-1.5"
                          >
                            {savedCaseId ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-ufo-green" />
                                <span className="text-ufo-green">Saved to OpsLog</span>
                              </>
                            ) : (
                              <>
                                <FolderPlus className="w-3.5 h-3.5" />
                                <span>Save Case</span>
                              </>
                            )}
                          </button>

                          {onNavigateToInvestigate && (
                            <button
                              onClick={() => {
                                onNavigateToInvestigate(deepDive.title);
                                handleClose();
                              }}
                              className="px-3 py-2 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/40 font-mono text-xs uppercase rounded-lg transition-all flex items-center gap-1.5"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                              <span>Graph View</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 border border-white/10 rounded-xl font-mono text-xs">
                      <button
                        onClick={() => { setActiveTab('historical'); triggerTacticalVibration(10); }}
                        className={`py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                          activeTab === 'historical'
                            ? 'bg-ufo-green text-black shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <History className="w-4 h-4" />
                        <span>1. Historical Context</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('factors'); triggerTacticalVibration(10); }}
                        className={`py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                          activeTab === 'factors'
                            ? 'bg-ufo-green text-black shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        <span>2. Contributing Factors</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('experts'); triggerTacticalVibration(10); }}
                        className={`py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                          activeTab === 'experts'
                            ? 'bg-ufo-green text-black shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        <span>3. Expert Views</span>
                      </button>
                    </div>

                    {/* Tab 1: Historical Context */}
                    {activeTab === 'historical' && (
                      <div className="space-y-5 bg-slate-950/60 p-5 rounded-2xl border border-white/10">
                        <div>
                          <h4 className="text-xs font-mono font-bold text-ufo-green uppercase tracking-wider mb-2 flex items-center gap-2">
                            <History className="w-4 h-4 text-ufo-green" />
                            Origin & Historical Timeline
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed font-sans">
                            {deepDive.historicalContext.originAndTimeline}
                          </p>
                        </div>

                        {deepDive.historicalContext.precursorCases.length > 0 && (
                          <div>
                            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
                              Historical Precursor Cases & Parallels
                            </h4>
                            <div className="space-y-3">
                              {deepDive.historicalContext.precursorCases.map((item, idx) => (
                                <div key={idx} className="p-3.5 bg-black/60 border border-white/10 rounded-xl space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-sm text-white">{item.title}</span>
                                    <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                                      {item.date}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Historical Significance
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed italic">
                            {deepDive.historicalContext.significance}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Contributing Factors & Potential Causes */}
                    {activeTab === 'factors' && (
                      <div className="space-y-5 bg-slate-950/60 p-5 rounded-2xl border border-white/10">
                        <div>
                          <h4 className="text-xs font-mono font-bold text-ufo-green uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-ufo-green" />
                            Evaluated Hypotheses & Probabilities
                          </h4>
                          <div className="space-y-3">
                            {deepDive.contributingFactorsAndCauses.primaryHypotheses.map((h, idx) => (
                              <div key={idx} className="p-4 bg-black/60 border border-white/10 rounded-xl space-y-2">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="font-bold text-sm text-amber-300">{h.hypothesis}</span>
                                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                                    Prob: {h.probability}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">{h.details}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {deepDive.contributingFactorsAndCauses.environmentalOrTechnicalFactors.length > 0 && (
                          <div>
                            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Contributing Environmental & Technical Factors
                            </h4>
                            <ul className="space-y-1.5">
                              {deepDive.contributingFactorsAndCauses.environmentalOrTechnicalFactors.map((f, idx) => (
                                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                  <span className="text-ufo-green font-mono">•</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <h4 className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-400" />
                            Unresolved High-Strangeness Elements
                          </h4>
                          <p className="text-xs text-slate-300 bg-red-950/20 border border-red-500/20 p-3 rounded-xl leading-relaxed">
                            {deepDive.contributingFactorsAndCauses.fringeOrUnexplainedElements}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Expert & Organizational Views */}
                    {activeTab === 'experts' && (
                      <div className="space-y-5 bg-slate-950/60 p-5 rounded-2xl border border-white/10">
                        <div>
                          <h4 className="text-xs font-mono font-bold text-ufo-green uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-ufo-green" />
                            Official Agency Stance
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {deepDive.expertAndOrganizationalViews.officialStance}
                          </p>
                        </div>

                        {deepDive.expertAndOrganizationalViews.keyOrganizations.length > 0 && (
                          <div>
                            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
                              Investigating Organizations & Position
                            </h4>
                            <div className="space-y-3">
                              {deepDive.expertAndOrganizationalViews.keyOrganizations.map((org, idx) => (
                                <div key={idx} className="p-3.5 bg-black/60 border border-white/10 rounded-xl space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-sm text-white">{org.name}</span>
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                                      org.levelOfConcern === 'HIGH' || org.levelOfConcern === 'CRITICAL'
                                        ? 'border-red-500/50 bg-red-500/10 text-red-400'
                                        : 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                                    }`}>
                                      Concern: {org.levelOfConcern}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 leading-relaxed">{org.position}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Expert Scientific & Analytical Consensus
                          </h4>
                          <p className="text-xs text-slate-300 bg-cyan-950/20 border border-cyan-500/20 p-3 rounded-xl leading-relaxed">
                            {deepDive.expertAndOrganizationalViews.expertConsensus}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Citations & Grounding */}
                    {deepDive.groundingUrls && deepDive.groundingUrls.length > 0 && (
                      <div className="pt-4 border-t border-white/10 space-y-2">
                        <h4 className="text-xs font-mono font-bold text-slate-500 uppercase">
                          Cited Intelligence Sources ({deepDive.groundingUrls.length})
                        </h4>
                        <div className="space-y-1.5">
                          {deepDive.groundingUrls.map((url, idx) => (
                            <a
                              key={idx}
                              href={url.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{url.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AnomalyWatchAssistant;
