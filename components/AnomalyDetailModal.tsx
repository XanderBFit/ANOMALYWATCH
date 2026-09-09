import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, AlertTriangle, Loader2, Bot, Zap, Building2, Sparkles, ExternalLink, Info, Download, FileText } from 'lucide-react';
import { UFOSighting, AnomalyDeepDiveExplanation } from '../types';
import { getRelatedHistoricalCases, getAnomalyWatchDeepDive, triggerTacticalVibration } from '../services/geminiService';
import { generateAccessibleExplanation } from '../services/anomalyService';
import { ExportService } from '../services/exportService';
import { SpeechButton } from './SpeechButton';

interface AnomalyDetailModalProps {
  anomaly: UFOSighting;
  onClose: () => void;
  onOpenAssistantWithQuery?: (query: string) => void;
}

export const AnomalyDetailModal: React.FC<AnomalyDetailModalProps> = ({ anomaly, onClose, onOpenAssistantWithQuery }) => {
  const [historicalCases, setHistoricalCases] = useState<Array<{title: string, summary: string, date: string}>>([]);
  const [groundingUrls, setGroundingUrls] = useState<Array<{uri: string, title: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const accessibleExplanation = useMemo(() => {
    return generateAccessibleExplanation({
      title: anomaly.title,
      description: anomaly.description,
      location: anomaly.location,
      category: anomaly.category
    });
  }, [anomaly]);


  // Deep Dive Assistant state
  const [deepDiveData, setDeepDiveData] = useState<AnomalyDeepDiveExplanation | null>(null);
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'historical' | 'factors' | 'experts'>('overview');

  useEffect(() => {
    const fetchCases = async () => {
      setIsLoading(true);
      try {
        const result = await getRelatedHistoricalCases(anomaly.title, anomaly.description);
        setHistoricalCases(result.cases);
        setGroundingUrls(result.groundingUrls);
      } catch (error) {
        console.error("Failed to fetch historical cases:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCases();
  }, [anomaly]);

  const handleFetchDeepDive = async () => {
    if (deepDiveData) return;
    setLoadingDeepDive(true);
    triggerTacticalVibration([20, 30]);
    try {
      const data = await getAnomalyWatchDeepDive(anomaly.title, anomaly.description);
      setDeepDiveData(data);
      setActiveTab('historical');
    } catch (e) {
      console.error("Deep dive generation failed:", e);
    } finally {
      setLoadingDeepDive(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#0a0c10] border border-cyan-500/40 rounded-2xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${anomaly.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-ufo-green uppercase tracking-widest">DOSSIER FILE</span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${anomaly.severity === 'CRITICAL' ? 'border-red-500 text-red-400' : 'border-cyan-500 text-cyan-400'}`}>
                  {anomaly.severity}
                </span>
              </div>
              <h2 className="text-xl font-display font-black text-white uppercase tracking-wider">{anomaly.title}</h2>
              <p className="text-xs font-mono text-slate-500 uppercase">{anomaly.location} • {new Date(anomaly.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Tabs & Assistant Trigger Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-1 bg-slate-950 border border-white/10 rounded-xl font-mono text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'overview' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'}`}
            >
              Overview
            </button>
            <button
              onClick={() => {
                if (!deepDiveData) handleFetchDeepDive();
                else setActiveTab('historical');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${activeTab === 'historical' ? 'bg-ufo-green text-black' : 'text-slate-400 hover:text-white'}`}
            >
              <History className="w-3.5 h-3.5" /> Historical
            </button>
            <button
              onClick={() => {
                if (!deepDiveData) handleFetchDeepDive();
                else setActiveTab('factors');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${activeTab === 'factors' ? 'bg-ufo-green text-black' : 'text-slate-400 hover:text-white'}`}
            >
              <Zap className="w-3.5 h-3.5" /> Causes
            </button>
            <button
              onClick={() => {
                if (!deepDiveData) handleFetchDeepDive();
                else setActiveTab('experts');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${activeTab === 'experts' ? 'bg-ufo-green text-black' : 'text-slate-400 hover:text-white'}`}
            >
              <Building2 className="w-3.5 h-3.5" /> Experts
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => ExportService.exportToPDFBrief(anomaly, deepDiveData)}
              className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500 border border-cyan-500/50 text-cyan-300 hover:text-black font-mono font-bold text-xs uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download Executive PDF Intelligence Briefing"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT PDF BRIEF</span>
            </button>

            <button
              onClick={() => {
                if (onOpenAssistantWithQuery) {
                  onOpenAssistantWithQuery(anomaly.title);
                  onClose();
                } else {
                  handleFetchDeepDive();
                }
              }}
              disabled={loadingDeepDive}
              className="px-3 py-1.5 bg-ufo-green/20 hover:bg-ufo-green border border-ufo-green/50 text-ufo-green hover:text-black font-mono font-bold text-xs uppercase rounded-lg transition-all flex items-center gap-1.5"
            >
              {loadingDeepDive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
              <span>ANOMALY WATCH Deep Dive</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-950/60 border border-white/10 rounded-xl space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Field Incident Report</h3>
              <p className="text-sm text-slate-200 leading-relaxed font-sans">{anomaly.description}</p>
            </div>

            {/* ACCESSIBLE EXPLANATION BREAKDOWN */}
            <div className="p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-black border border-cyan-500/30 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                      Concise Event Explanation
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      General audience overview detailing significance, causes & implications
                    </span>
                  </div>
                </div>
                <SpeechButton 
                  text={`${anomaly.title}. Significance: ${accessibleExplanation.significance}. Potential Causes: ${accessibleExplanation.potentialCauses.join(', ')}. Implications: ${accessibleExplanation.possibleImplications}`}
                  trackId={`modal-speech-${anomaly.id || 'current'}`}
                />
              </div>

              {/* Significance */}
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase block">💡 Significance</span>
                <p className="text-xs md:text-sm text-slate-200 font-sans leading-relaxed pl-3 border-l-2 border-cyan-500/50">
                  {accessibleExplanation.significance}
                </p>
              </div>

              {/* Potential Causes */}
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-amber-300 uppercase block">⚙️ Potential Causes</span>
                <ul className="space-y-1 pl-3 border-l-2 border-amber-500/50">
                  {accessibleExplanation.potentialCauses.map((cause, idx) => (
                    <li key={idx} className="text-xs text-slate-300 font-sans flex items-start gap-2">
                      <span className="text-amber-400 font-mono text-[10px] mt-0.5">◆</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Possible Implications */}
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-ufo-green uppercase block">🌐 Possible Implications</span>
                <p className="text-xs md:text-sm text-slate-200 font-sans leading-relaxed pl-3 border-l-2 border-ufo-green/50">
                  {accessibleExplanation.possibleImplications}
                </p>
              </div>
            </div>

            <div className="space-y-4">

              <h3 className="text-sm font-mono font-bold text-cyan-400 uppercase flex items-center gap-2">
                <History className="w-4 h-4" /> Related Historical Cases
              </h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                </div>
              ) : historicalCases.length > 0 ? (
                <div className="space-y-3">
                  {historicalCases.map((c, i) => (
                    <div key={i} className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-white">{c.title}</h4>
                        <span className="text-[10px] font-mono text-slate-500">{c.date}</span>
                      </div>
                      <p className="text-xs text-slate-400">{c.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No directly related historical cases identified.</p>
              )}
            </div>
          </div>
        )}

        {/* Deep Dive Content Tabs */}
        {loadingDeepDive && (
          <div className="py-12 text-center space-y-3 bg-slate-950/50 border border-ufo-green/30 rounded-xl">
            <Loader2 className="w-8 h-8 mx-auto text-ufo-green animate-spin" />
            <p className="font-mono text-xs text-ufo-green uppercase tracking-widest animate-pulse">
              Synthesizing ANOMALY WATCH Deep Dive Explanation...
            </p>
          </div>
        )}

        {!loadingDeepDive && deepDiveData && activeTab === 'historical' && (
          <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-white/10 font-sans">
            <h3 className="text-xs font-mono font-bold text-ufo-green uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4" /> 📜 Historical Context
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">{deepDiveData.historicalContext.originAndTimeline}</p>

            {deepDiveData.historicalContext.precursorCases.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-mono text-slate-400 uppercase">Precursor Historical Parallels</h4>
                {deepDiveData.historicalContext.precursorCases.map((pc, idx) => (
                  <div key={idx} className="p-3 bg-black/60 border border-white/10 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-bold text-white">
                      <span>{pc.title}</span>
                      <span className="font-mono text-slate-500">{pc.date}</span>
                    </div>
                    <p className="text-slate-300">{pc.description}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Historical Significance</span>
              <p className="text-xs text-slate-300 italic">{deepDiveData.historicalContext.significance}</p>
            </div>
          </div>
        )}

        {!loadingDeepDive && deepDiveData && activeTab === 'factors' && (
          <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-white/10 font-sans">
            <h3 className="text-xs font-mono font-bold text-ufo-green uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" /> ⚡ Contributing Factors & Potential Causes
            </h3>
            <div className="space-y-3">
              {deepDiveData.contributingFactorsAndCauses.primaryHypotheses.map((h, idx) => (
                <div key={idx} className="p-3 bg-black/60 border border-white/10 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between font-bold text-amber-300">
                    <span>{h.hypothesis}</span>
                    <span className="font-mono text-amber-400 text-[10px]">Prob: {h.probability}</span>
                  </div>
                  <p className="text-slate-300">{h.details}</p>
                </div>
              ))}
            </div>

            {deepDiveData.contributingFactorsAndCauses.environmentalOrTechnicalFactors.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-mono text-slate-400 uppercase mb-1">Environmental / Technical Factors</h4>
                <ul className="text-xs text-slate-300 list-disc list-inside space-y-1">
                  {deepDiveData.contributingFactorsAndCauses.environmentalOrTechnicalFactors.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono text-red-400 block uppercase">Unresolved High-Strangeness Factors</span>
              <p className="text-xs text-slate-300">{deepDiveData.contributingFactorsAndCauses.fringeOrUnexplainedElements}</p>
            </div>
          </div>
        )}

        {!loadingDeepDive && deepDiveData && activeTab === 'experts' && (
          <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-white/10 font-sans">
            <h3 className="text-xs font-mono font-bold text-ufo-green uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4" /> 🏛️ Expert & Organizational Views
            </h3>
            <div>
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Official Agency Stance</span>
              <p className="text-sm text-slate-200 leading-relaxed">{deepDiveData.expertAndOrganizationalViews.officialStance}</p>
            </div>

            {deepDiveData.expertAndOrganizationalViews.keyOrganizations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-slate-400 uppercase">Investigating Organizations</h4>
                {deepDiveData.expertAndOrganizationalViews.keyOrganizations.map((org, idx) => (
                  <div key={idx} className="p-3 bg-black/60 border border-white/10 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-bold text-white">
                      <span>{org.name}</span>
                      <span className="font-mono text-cyan-400 text-[10px]">Concern: {org.levelOfConcern}</span>
                    </div>
                    <p className="text-slate-300">{org.position}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono text-cyan-400 block uppercase">Expert Consensus</span>
              <p className="text-xs text-slate-300">{deepDiveData.expertAndOrganizationalViews.expertConsensus}</p>
            </div>
          </div>
        )}

        {/* Footer Citations */}
        {groundingUrls.length > 0 && (
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase">Cited Intelligence Sources</span>
            <div className="flex flex-wrap gap-2">
              {groundingUrls.map((url, i) => (
                <a key={i} href={url.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> {url.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

