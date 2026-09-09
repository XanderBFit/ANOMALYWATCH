import React, { useState, useEffect, useRef } from 'react';
import { streamDailyBrief, searchGlobalIntel, generateTacticalBrief, getCorrelatedIntel, performDeepWebScan, getRelatedIntelForPreview } from '../services/geminiService';
import { CaseOps } from '../services/caseOps';
import { IntelNexus, PresenceService, isCloudEnabled, ArchiveOps } from '../services/firebaseService';
import { GlobalSearchResult, CorrelatedVector, AppView, AnomalyCategory } from '../types';
import Markdown from 'react-markdown';
import { ICONS } from '../constants';
import TacticalLoader from './TacticalLoader';
import { SpeechButton } from './SpeechButton';
import { ProgressionService, XP_VALUES } from '../services/progressionService';
import { useAudio } from '../contexts/AudioContext';
import { motion, AnimatePresence } from 'motion/react';
import { triggerTacticalVibration } from '../services/geminiService';
import { FullReportModal } from './FullReportModal';
import { useVoiceCommands } from '../src/hooks/useVoiceCommands';
import { highlightHighEntropyText, HighlightedToken } from '../services/entropyService';
import { RedditService, RedditPost } from '../services/redditService';
import { RedditMonitor } from './RedditMonitor';

const EntropyTextSpan: React.FC<{ text: string; threshold: number }> = ({ text, threshold }) => {
  const tokens = highlightHighEntropyText(text, threshold);
  return (
    <>
      {tokens.map((token, i) => {
        if (token.isAnomalous) {
          return (
            <span 
              key={i} 
              className="relative group rounded-lg px-1.5 py-0.5 border border-ufo-green/40 bg-ufo-green/10 text-ufo-green font-bold hover:bg-ufo-green/20 transition-all cursor-help select-text inline-block leading-tight text-[11px]"
            >
              {token.text}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 w-52 bg-slate-950/95 border border-ufo-green/50 rounded-xl p-2.5 text-[9px] font-mono shadow-2xl text-slate-200 normal-case tracking-normal leading-normal whitespace-normal backdrop-blur-xl">
                <div className="font-bold text-ufo-green flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ufo-green animate-ping" />
                  SHANNON SURPRISE SIGNAL
                </div>
                <div>Surprise: <span className="text-white font-bold">{token.entropy?.toFixed(3)}</span> bits</div>
                <div className="text-[8px] text-slate-400 mt-1 leading-relaxed">{token.reason}</div>
              </span>
            </span>
          );
        }
        return <span key={i}>{token.text}</span>;
      })}
    </>
  );
};

const renderChildWithEntropy = (child: React.ReactNode, threshold: number): React.ReactNode => {
  if (typeof child === 'string') {
    return <EntropyTextSpan text={child} threshold={threshold} />;
  }
  if (Array.isArray(child)) {
    return child.map((c, idx) => <React.Fragment key={idx}>{renderChildWithEntropy(c, threshold)}</React.Fragment>);
  }
  return child;
};

interface BriefingRoomProps {
  initialQuery?: string;
  setView: (view: AppView, filter?: string) => void;
}

const BRIEF_CACHE_KEY = 'anomaly_watch_cached_brief';

const BriefingRoom: React.FC<BriefingRoomProps> = ({ initialQuery, setView }) => {
  const { isListening, startListening } = useVoiceCommands({
    onNavigate: (view) => {
      if (view.includes('dashboard')) setView('dashboard');
      else if (view.includes('analyzer')) setView('analyzer');
      else if (view.includes('briefing')) setView('briefing');
    },
    onSearch: (query) => {
      setSearchQuery(query);
      handleSearch();
    }
  });
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [selectedItems, setSelectedItems] = useState<GlobalSearchResult[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [relatedVectors, setRelatedVectors] = useState<CorrelatedVector[]>([]);
  const [activePreview, setActivePreview] = useState<GlobalSearchResult | null>(null);
  const [fullReportItem, setFullReportItem] = useState<{title: string, snippet: string} | null>(null);
  const [isDeepScan, setIsDeepScan] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<AnomalyCategory | 'ALL'>('ALL');

  // Reddit OSINT Monitoring States
  const [redditMode, setRedditMode] = useState<boolean>(false);
  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([]);
  const [redditLoading, setRedditLoading] = useState<boolean>(false);
  const [selectedSubreddit, setSelectedSubreddit] = useState<string>('ALL');
  const [redditSearchQuery, setRedditSearchQuery] = useState<string>('');
  const [activeRedditAnalysis, setActiveRedditAnalysis] = useState<Record<string, any>>({});
  const [analyzingPostId, setAnalyzingPostId] = useState<string | null>(null);

  // Receptor Parametrics calibration state hooks
  const [rawExhaustMode, setRawExhaustMode] = useState<boolean>(false);
  const [localHighlighting, setLocalHighlighting] = useState<boolean>(true);
  const [entropyThreshold, setEntropyThreshold] = useState<number>(3.5);
  const [tunerExpanded, setTunerExpanded] = useState<boolean>(false);

  const [temperature, setTemperature] = useState<number>(() => {
    return parseFloat(localStorage.getItem('anomalyWatch_temperature') || '1.0');
  });
  const [topK, setTopK] = useState<number>(() => {
    return parseInt(localStorage.getItem('anomalyWatch_topK') || '40');
  });
  const [topP, setTopP] = useState<number>(() => {
    return parseFloat(localStorage.getItem('anomalyWatch_topP') || '0.95');
  });
  const [divergencePass, setDivergencePass] = useState<boolean>(() => {
    return localStorage.getItem('anomalyWatch_divergencePass') === 'true';
  });

  // Keep localStorage perfectly updated whenever state changes
  useEffect(() => {
    localStorage.setItem('anomalyWatch_temperature', temperature.toString());
  }, [temperature]);

  useEffect(() => {
    localStorage.setItem('anomalyWatch_topK', topK.toString());
  }, [topK]);

  useEffect(() => {
    localStorage.setItem('anomalyWatch_topP', topP.toString());
  }, [topP]);

  useEffect(() => {
    localStorage.setItem('anomalyWatch_divergencePass', divergencePass.toString());
  }, [divergencePass]);
  
  const { playAudio, isPlaying, currentTrackId, stopAudio, speechEngine, setSpeechEngine } = useAudio();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const username = localStorage.getItem('anomalyWatch_username') || 'Guest';

  useEffect(() => {
    const checkCache = () => {
      const cached = localStorage.getItem(BRIEF_CACHE_KEY);
      if (cached) {
        try {
          const { content, date, owner } = JSON.parse(cached);
          const today = new Date().toDateString();
          if (date === today && owner === username && !initialQuery) {
            setReport(content);
            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    };

    if (initialQuery) {
      handleSearch();
    } else if (!report) {
      if (!checkCache()) handleMorningBrief();
    }
  }, [initialQuery, username, report]);

  // AI-Driven Correlation Engine
  useEffect(() => {
    const fetchCorrelations = async () => {
      if (activePreview) {
        // Use the new, more tailored correlation function for preview items
        const intel = await getRelatedIntelForPreview(activePreview.title, activePreview.snippet);
        // Map to the existing CorrelatedVector interface (or update types if needed)
        const vectors: CorrelatedVector[] = intel.map(i => ({
          topic: i.title,
          reasoning: i.snippet,
          confidence: 90,
          suggestedModule: i.type === 'ARCHIVES' ? 'archives' : 'opslog'
        }));
        setRelatedVectors(vectors);
      } else if (report && report.length > 50) {
        // Original behavior for daily brief/synthesis
        const vectors = await getCorrelatedIntel(report);
        setRelatedVectors(vectors);
      }
    };
    if (!isStreaming) fetchCorrelations();
  }, [report, isStreaming, activePreview]);

  const handleMorningBrief = async (force = false) => {
    if (force) {
      localStorage.removeItem('anomalyWatch_hasInitialScan');
      localStorage.removeItem(BRIEF_CACHE_KEY);
    }
    setLoading(true);
    setReport(""); 
    setIsStreaming(true);
    setActivePreview(null);
    try {
      let fullReport = "";
      await streamDailyBrief((chunk) => {
        if (chunk.trim().length > 5) {
            setLoading(false);
        }
        setReport(chunk);
        fullReport = chunk;
      });
      
      if (fullReport) {
        localStorage.setItem(BRIEF_CACHE_KEY, JSON.stringify({
            content: fullReport,
            date: new Date().toDateString(),
            owner: username,
            timestamp: Date.now()
        }));
        if (force) ProgressionService.addXP(XP_VALUES.DAILY_LOGIN, "Intelligence Briefing Sync");
      }
    } catch (error) {
      console.error("Briefing failed", error);
      setReport(prev => prev ? prev + "\n\n[CONNECTION LOST]" : "Could not connect to the news feed. Secure channel disruption detected.");
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setExpandedResults(new Set());
    setIsDeepScan(false);
    try {
      const results = await searchGlobalIntel(searchQuery);
      setSearchResults(results);
      
      if (results.length > 0) {
        ArchiveOps.logSignal({
            query: `Global Intel Search: ${searchQuery}`,
            response: `Retrieved ${results.length} intelligence artifacts. Top source: ${results[0].source} - ${results[0].title}`,
            groundingUrls: results.map(r => ({ uri: r.url, title: r.title })),
            type: 'GLOBAL_SEARCH'
        });
      }

      ProgressionService.addXP(XP_VALUES.SCAN_INTEL, "Global Network Probe");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeepScan = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setExpandedResults(new Set());
    setReport(null);
    setActivePreview(null);
    setIsDeepScan(true);
    try {
      const result = await performDeepWebScan(searchQuery);
      setReport(result.text || "No deep signal detected.");
      
      if (result.groundingUrls && result.groundingUrls.length > 0) {
        setSearchResults(result.groundingUrls.map(u => ({
          title: u.title,
          url: u.uri,
          snippet: "Deep-web archival mention or fringe forum log entry.",
          source: "DEEP_SCAN_NODE"
        })));
      }

      ProgressionService.addXP(XP_VALUES.DEEP_DIVE, "Deep Web Infiltration");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadRedditData = async (sub: string = selectedSubreddit, query: string = redditSearchQuery) => {
    setRedditLoading(true);
    try {
      let postsList: RedditPost[] = [];
      const targetSub = sub === 'ALL' ? undefined : sub;
      if (query.trim()) {
        const responseData = await RedditService.searchReddit(query, targetSub);
        postsList = responseData.items;
      } else {
        const responseData = await RedditService.fetchLatestSubredditPosts(targetSub);
        postsList = responseData.items;
      }
      setRedditPosts(postsList);
      ProgressionService.addXP(XP_VALUES.SCAN_INTEL || 25, "Reddit Telemetry Sync");
    } catch (e) {
      console.error("Reddit feed load failure:", e);
    } finally {
      setRedditLoading(false);
    }
  };

  const handleAnalyzeRedditPost = async (post: RedditPost) => {
    setAnalyzingPostId(post.id);
    try {
      const analysis = await RedditService.analyzeRedditPostWithAi(post.title, post.selftext, post.subreddit);
      setActiveRedditAnalysis(prev => ({ ...prev, [post.id]: analysis }));
      
      // Auto-log to Vault/Cases so the user has persistent dossier archives
      const contentSummary = `Reddit Post by u/${post.author} on r/${post.subreddit}:
      
      Title: ${post.title}
      Score: ${post.score} | Comments: ${post.num_comments}
      Permalink: ${post.permalink}
      
      --- TACTICAL FORENSIC ANOMALY ANALYSIS ---
      Category: ${analysis.category}
      Severity: ${analysis.severity}
      Confidence Rating: ${analysis.credibilityScore}%
      Forensic Deductions:
      ${analysis.tacticalAnalysis}
      
      Suspicious Keywords Identified: ${analysis.suspiciousKeywords?.join(', ') || 'None'}
      Actionable Operative Priority: ${analysis.isActionable ? 'YES - DEBIAS AND MONITOR' : 'NO'}`;

      CaseOps.createCase(`r/${post.subreddit}: ${post.title}`, contentSummary, 'Reddit Extraction');
      ProgressionService.addXP(50, "Extracted Reddit Anomaly Signature");
      
      triggerTacticalVibration(15);
    } catch (err) {
      console.error("Reddit analyzing failure:", err);
    } finally {
      setAnalyzingPostId(null);
    }
  };

  const toggleSelection = (item: GlobalSearchResult) => {
    if (selectedItems.some(i => i.url === item.url)) {
      setSelectedItems(prev => prev.filter(i => i.url !== item.url));
    } else {
      setSelectedItems(prev => [...prev, item]);
    }
  };

  const toggleExpandResult = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); 
    setExpandedResults(prev => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
    });
  };

  const handlePreviewResult = (result: GlobalSearchResult) => {
    setActivePreview(result);
    setReport(null);
    setRelatedVectors([]);
  };

  const handleSynthesize = async () => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    setReport(null);
    setActivePreview(null);
    try {
      const texts = selectedItems.map(i => `${i.title} (${i.source}): ${i.snippet} - ${i.url}`);
      const brief = await generateTacticalBrief(texts);
      setReport(brief);
      setSearchResults([]);
      
      ArchiveOps.logSignal({
          query: `Brief Synthesis: ${selectedItems.length} selected sources`,
          response: brief,
          groundingUrls: selectedItems.map(i => ({ uri: i.url, title: i.title })),
          type: 'DEEP_DIVE'
      });

      setSelectedItems([]);
      localStorage.setItem(BRIEF_CACHE_KEY, JSON.stringify({
        content: brief,
        date: new Date().toDateString(),
        owner: username,
        timestamp: Date.now()
      }));
      ProgressionService.addXP(XP_VALUES.ANALYZE_MEDIA, "Data Synthesis Complete");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAudioPlayback = () => {
    const textToPlay = activePreview ? activePreview.snippet : report;
    if (!textToPlay) return;
    if (isPlaying && currentTrackId === 'daily-brief') stopAudio();
    else playAudio(textToPlay, 'daily-brief', 'Intelligence Intel Stream');
  };

  const filteredResults = searchResults.filter(r => 
    (severityFilter === 'ALL' || r.severity === severityFilter) &&
    (categoryFilter === 'ALL' || r.category === categoryFilter)
  );

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-danger-red/20 text-danger-red border-danger-red/50';
      case 'HIGH': return 'bg-warning-amber/20 text-warning-amber border-warning-amber/50';
      case 'MEDIUM': return 'bg-celestial-blue/20 text-celestial-blue border-celestial-blue/50';
      case 'LOW': return 'bg-ufo-green/20 text-ufo-green border-ufo-green/50';
      default: return 'bg-white/10 text-slate-400 border-white/20';
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-8 animate-in fade-in duration-500 pb-20 relative px-4 md:px-0">
      <AnimatePresence mode="wait">
        {/* Flash alert removed */}
      </AnimatePresence>
      
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch">
         <div className="lg:col-span-8 glass-panel p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] bg-black/60 border border-white/15 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10 overflow-hidden">
               <div className="h-full w-48 bg-ufo-green animate-scan-h blur-md opacity-60 shadow-[0_0_15px_#00ff9d]"></div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 relative z-10">
               <div className="w-16 h-16 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center bg-ufo-green/10 border border-ufo-green/50 text-3xl md:text-5xl shadow-[0_0_35px_rgba(0,255,157,0.3)] group-hover:scale-105 transition-transform duration-700">
                  <div className="text-ufo-green drop-shadow-[0_0_15px_#00ff9d]">
                     {ICONS.NEXUS}
                  </div>
               </div>
               <div className="flex-1 text-center md:text-left">
                  <span className="text-[9px] md:text-[11px] font-mono text-slate-500 uppercase tracking-[0.3em] md:tracking-[0.5em] block mb-1 md:mb-2 font-black">Identity Verified // Archive Sector</span>
                  <div className="flex items-center gap-3 md:gap-4 justify-center md:justify-start">
                     <h1 className="text-2xl md:text-4xl font-display font-black text-white uppercase tracking-[0.1em] drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{username}</h1>
                     <span className="h-2 w-2 md:h-3 md:w-3 rounded-full bg-ufo-green shadow-[0_0_15px_#00ff9d] animate-pulse"></span>
                  </div>
               </div>
               <div className="hidden md:flex flex-col items-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Protocol Version</span>
                  <span className="text-xs font-mono text-ufo-green font-black">4.2.0-STABLE</span>
               </div>
            </div>
         </div>

         <div className="lg:col-span-4 glass-panel p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] bg-ufo-green/10 border border-ufo-green/50 relative overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,157,0.06)_1px,transparent_1px)] bg-[size:100%_6px] pointer-events-none opacity-80"></div>
            <div className="flex flex-col h-full justify-between relative z-10">
               <div>
                  <span className="text-[9px] md:text-[11px] font-mono text-ufo-green uppercase tracking-[0.3em] md:tracking-[0.4em] block mb-2 md:mb-3 font-black">System Signal Card</span>
                  <div className="flex items-center gap-3 md:gap-4">
                     <div className="relative">
                        <div className="w-5 h-5 md:w-6 md:h-6 bg-ufo-green rounded-full animate-ping opacity-40"></div>
                        <div className="absolute inset-0 m-auto w-3 h-3 md:w-3.5 md:h-3.5 bg-ufo-green rounded-full shadow-[0_0_20px_#00ff9d]"></div>
                     </div>
                     <span className="text-2xl md:text-3xl font-display font-black text-white tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">NOMINAL</span>
                  </div>
               </div>
               <div className="mt-4 pt-4 border-t border-ufo-green/25 flex justify-between items-center">
                  <span className="text-[9px] md:text-[10px] font-mono text-ufo-green/80 uppercase font-black tracking-widest">Sync Integrity</span>
                  <span className="text-xs md:text-sm font-mono text-ufo-green font-black">100%</span>
               </div>
            </div>
         </div>
      </header>

      {/* Primary OSINT Feed Toggler Mode */}
      <div className="flex bg-slate-950/90 p-1.5 rounded-2xl border border-white/10 max-w-lg shadow-2xl">
         <button
           onClick={() => setRedditMode(false)}
           className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-[10px] uppercase tracking-widest transition-all ${!redditMode ? 'bg-ufo-green text-black font-black shadow-[0_0_15px_rgba(0,255,157,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
         >
           [ INTEL ARCHIVE TELEMETRY ]
         </button>
         <button
           onClick={() => {
             setRedditMode(true);
             if (redditPosts.length === 0) {
               loadRedditData('ALL');
             }
           }}
           className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-[10px] uppercase tracking-widest transition-all ${redditMode ? 'bg-celestial-blue text-black font-black shadow-[0_0_15px_rgba(0,208,255,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
         >
           [ REDDIT OSINT MONITOR ]
         </button>
      </div>

      {/* Dynamic Calibration & Metric Control Console */}
      <div className="glass-panel p-5 rounded-[2rem] bg-black/50 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]"></div>
             <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">RECEPTOR PARAMETRICS</span>
                <h4 className="text-sm font-display font-black text-white uppercase tracking-wider">ANOMALOUS SENSITIVITY CALIBRATION</h4>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Secret Quantum Artifact Treasure Node */}
            <button
              onClick={() => ProgressionService.discoverArtifact('ARTIFACT_SHANNON_ENTROPY_KEY')}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-mono font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              title="Quantum Entropy Fragment - Click to Decode Shannon Key"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>ENT-KEY-99</span>
            </button>

            {/* Local Highlighting state */}
            <button
              onClick={() => setLocalHighlighting(!localHighlighting)}
              className={`px-4 py-2.5 rounded-xl border font-mono text-[9px] uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
                localHighlighting 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                  : 'bg-white/5 border-white/15 text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${localHighlighting ? 'bg-amber-400 animate-ping' : 'bg-slate-600'}`}></span>
              LOCAL SHANNON ENTROPY: {localHighlighting ? "ACTIVE" : "BYPASSED"}
            </button>

            {/* Raw Mode Toggle */}
            <button
              onClick={() => setRawExhaustMode(!rawExhaustMode)}
              className={`px-4 py-2.5 rounded-xl border font-mono text-[9px] uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
                rawExhaustMode 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'bg-white/5 border-white/15 text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${rawExhaustMode ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
              RAW EXHAUST SCAN: {rawExhaustMode ? "ACTIVE" : "BYPASSED"}
            </button>

            {/* Collapse Toggle */}
            <button
               onClick={() => setTunerExpanded(!tunerExpanded)}
               className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-mono text-[9px] uppercase tracking-wider text-slate-300 hover:text-white transition-all font-bold"
            >
               {tunerExpanded ? "[ COLLAPSE TUNERS ]" : "[ CALIBRATE SENSORS ]"}
            </button>
          </div>
        </div>

        {/* Sliders and custom system prompt toggle when expanded */}
        <AnimatePresence>
          {tunerExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-5 pt-5 border-t border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-6 relative"
            >
              {/* Divergence mode system calibration */}
              <div className="lg:col-span-4 space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">GEMINI STRATIGRAPHY</span>
                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded border font-black ${
                     divergencePass 
                       ? 'bg-red-950/40 border-red-500/35 text-red-400 animate-pulse' 
                       : 'bg-emerald-950/40 border-emerald-500/35 text-emerald-500'
                  }`}>
                    {divergencePass ? "DIVERGENCE ACTIVE" : "COHESIVE INTEGRATOR"}
                  </span>
                </div>
                
                <p className="text-[9px] font-mono text-slate-500 leading-relaxed">
                  Toggle dynamic divergence to instruct Gemini to run non-summarized forensics searching strictly for outliers, contradictions, and non-linear patterns.
                </p>

                <button
                  onClick={() => setDivergencePass(!divergencePass)}
                  className={`w-full py-2.5 rounded-xl border text-[9px] font-mono font-black uppercase tracking-wider transition-all ${
                     divergencePass 
                       ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                       : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {divergencePass ? "DEACTIVATE FORENSIC PASS" : "ACTIVATE FORENSIC DIVERGENCE PASS"}
                </button>
              </div>

              {/* Sliders for temperature, topK, topP */}
              <div className="lg:col-span-4 space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>COSMIC TEMPERATURE</span>
                    <span className="text-cyan-400 font-bold">{temperature.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="2.0" 
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-900 border border-white/5 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-slate-600">
                    <span>DETERMINISTIC (0.1)</span>
                    <span>CHAOTIC (2.0)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>SAMPLE BANDWIDTH (TOP K)</span>
                    <span className="text-cyan-400 font-bold">{topK}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    step="1"
                    value={topK}
                    onChange={(e) => setTopK(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-900 border border-white/5 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-slate-600">
                    <span>MEDIAN VECTORS (1)</span>
                    <span>BROAD SEARCH (100)</span>
                  </div>
                </div>
              </div>

              {/* Sliders for Top P & Shannon entropy limit */}
              <div className="lg:col-span-4 space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>PROBABILITY CAP (TOP P)</span>
                    <span className="text-cyan-400 font-bold">{topP.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05"
                    value={topP}
                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-900 border border-white/5 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-slate-600">
                    <span>PRECISION (0.1)</span>
                    <span>NUCLEUS (1.0)</span>
                  </div>
                </div>

                {localHighlighting && (
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>SHANNON SURPRISE THRESHOLD</span>
                      <span className="text-amber-400 font-bold">{entropyThreshold.toFixed(2)} BITS</span>
                    </div>
                    <input 
                      type="range" 
                      min="1.5" 
                      max="5.0" 
                      step="0.1"
                      value={entropyThreshold}
                      onChange={(e) => setEntropyThreshold(parseFloat(e.target.value))}
                      className="w-full accent-amber-400 bg-slate-900 border border-white/5 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-slate-600">
                      <span>HIGH SURPRISE ONLY (5.0)</span>
                      <span>ALL WORDS (1.5)</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {redditMode ? (
         <RedditMonitor 
           localHighlighting={localHighlighting}
           entropyThreshold={entropyThreshold}
           highlightEntropyText={(text, thresh) => <EntropyTextSpan text={text} threshold={thresh} />}
         />
      ) : (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <main className="lg:col-span-8 space-y-4 md:space-y-6">
           <div className="glass-panel min-h-[500px] md:min-h-[650px] flex flex-col border border-white/10 rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-black/80 shadow-2xl relative">
              <div className="absolute top-0 right-0 p-6 md:p-10 opacity-5 pointer-events-none font-display font-black text-6xl md:text-8xl tracking-tighter uppercase italic select-none">INTEL_FEED</div>
              
              <div className="p-6 md:p-10 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 relative z-10 backdrop-blur-3xl bg-white/[0.03]">
                 <div className="flex flex-col items-center md:items-start">
                    <h2 className="text-3xl md:text-6xl font-display font-black text-white/90 tracking-[-0.05em] uppercase leading-[0.8] italic drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] select-none">
                      {activePreview ? 'Intel' : 'Daily'}
                    </h2>
                    <h2 className="text-3xl md:text-6xl font-display font-black text-ufo-green tracking-[0.05em] uppercase leading-[0.8] italic drop-shadow-[0_0_50px_#00ff9d] hypnotic-text select-none">
                      {activePreview ? 'Artifact' : 'Intelligence'}
                    </h2>
                    <div className="flex items-center gap-2 md:gap-3 mt-3 md:mt-4">
                       <span className="h-1.5 w-12 md:h-2 md:w-16 bg-ufo-green/60 rounded-full shadow-[0_0_15px_#00ff9d]"></span>
                       <span className="text-[9px] md:text-[11px] font-mono text-slate-500 uppercase tracking-widest font-black">
                          {activePreview ? activePreview.source : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                       </span>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-3 md:gap-4 w-full md:w-auto items-center">
                    <div className="flex flex-col gap-1">
                       <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black">Voice Engine</span>
                       <select
                         value={speechEngine}
                         onChange={(e) => setSpeechEngine(e.target.value as 'local' | 'gemini')}
                         className="px-4 py-2 bg-black/50 border border-white/10 text-ufo-green rounded-xl text-[10px] font-mono tracking-wider focus:outline-none focus:border-ufo-green/45 hover:bg-black/90 transition-all cursor-pointer outline-none uppercase font-black"
                       >
                         <option value="local">TACTICAL SYNTH (FREE)</option>
                         <option value="gemini">QUANTUM AI (CHARON)</option>
                       </select>
                    </div>
                    <button 
                       onClick={handleAudioPlayback}
                       disabled={loading || (!report && !activePreview)}
                       className={`flex-1 md:flex-none group px-6 py-4 md:py-5 bg-white/5 border border-white/20 rounded-xl md:rounded-2xl hover:bg-white hover:text-black hover:border-white transition-all shadow-lg flex items-center justify-center gap-3 ${isPlaying && currentTrackId === 'daily-brief' ? 'bg-ufo-green text-black border-ufo-green' : ''}`}
                    >
                       <div className="w-4 h-4 flex items-center justify-center">
                          {isPlaying && currentTrackId === 'daily-brief' ? (
                            <div className="flex gap-0.5 items-end h-3">
                              <div className="w-1 bg-current animate-[pulse_0.6s_infinite] h-full"></div>
                              <div className="w-1 bg-current animate-[pulse_0.8s_infinite] h-2/3"></div>
                              <div className="w-1 bg-current animate-[pulse_1.0s_infinite] h-1/2"></div>
                            </div>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          )}
                       </div>
                       <span className="text-[9px] md:text-[11px] font-display font-black uppercase tracking-widest hidden md:inline-block">
                          {isPlaying && currentTrackId === 'daily-brief' ? 'STOP' : 'LISTEN'}
                       </span>
                    </button>
                    {!activePreview && (
                      <button 
                        onClick={() => handleMorningBrief(true)} 
                        disabled={loading} 
                        className="flex-[2] md:flex-none group px-6 md:px-8 py-4 md:py-5 bg-ufo-green/15 border border-ufo-green/40 rounded-xl md:rounded-2xl hover:bg-ufo-green hover:text-black transition-all shadow-xl flex items-center justify-center gap-3 md:gap-4"
                      >
                        <svg className={`w-5 h-5 md:w-6 md:h-6 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        <span className="text-[9px] md:text-[11px] font-display font-black uppercase tracking-widest">RE-SCAN</span>
                      </button>
                    )}
                    {activePreview && (
                      <button 
                        onClick={() => { setActivePreview(null); setReport(""); handleMorningBrief(); }} 
                        className="flex-[2] md:flex-none group px-6 md:px-8 py-4 md:py-5 bg-white/5 border border-white/20 rounded-xl md:rounded-2xl hover:bg-white hover:text-black transition-all shadow-xl flex items-center justify-center gap-3 md:gap-4"
                      >
                         <span className="text-[9px] md:text-[11px] font-display font-black uppercase tracking-widest">BACK</span>
                      </button>
                    )}
                 </div>
              </div>

              <div ref={scrollContainerRef} className="p-6 md:p-12 flex-1 overflow-y-auto custom-scrollbar relative bg-black/40">
                 {loading ? <TacticalLoader stage="SCRAPING GLOBAL INTELLIGENCE NODES..." /> : (report || isStreaming || activePreview || rawExhaustMode) ? (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
                       {rawExhaustMode ? (
                          <div className="space-y-6 font-mono text-[11px] text-emerald-400 p-6 bg-slate-950 border border-emerald-500/30 rounded-2xl overflow-y-auto max-h-[700px] shadow-inner custom-scrollbar relative">
                             <div className="absolute top-2 right-4 text-[9px] px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/30 rounded text-emerald-500 animate-pulse font-black">
                                RAW EXHAUST UPLINK DIRECT
                             </div>
                             <div className="space-y-4">
                                <div>
                                   <span className="text-emerald-600 font-bold">{"//"} SYSTEM CONTEXT CALIBRATION</span>
                                   <pre className="text-slate-400 mt-1 whitespace-pre-wrap rounded bg-slate-900 border border-white/5 p-3">
{`TEMPERATURE  : ${temperature.toFixed(2)}
TOP_K        : ${topK}
TOP_P        : ${topP.toFixed(2)}
DIVERGENCE   : ${divergencePass ? "ACTIVE (OUTLIER PASS)" : "INACTIVE (COHESIVE PASS)"}
CAPABILITIES : [RAW_EXHAUST_PASSTHROUGH, SHANNON_ENTROPY_ANALYSIS]`}
                                   </pre>
                                </div>

                                <div>
                                   <span className="text-emerald-600 font-bold">{"//"} SENSORY RAW TELEMETRY NODES</span>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                      <button 
                                        onClick={async () => {
                                          const res = await fetch('/api/sensory/quantum-noise?length=30');
                                          const data = await res.json();
                                          alert("QRNG RAW ENTROPY BYTES:\n\n" + JSON.stringify(data, null, 2));
                                        }}
                                        className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-left hover:bg-emerald-950/10 hover:border-emerald-500/20 active:scale-98 transition-all"
                                      >
                                         <div className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">📡 GET RAW QRNG ENTROPY POOL</div>
                                         <div className="text-[8px] text-slate-500 mt-1">Fetch un-summarized physical vacuum fluctuation bytes.</div>
                                      </button>

                                      <button 
                                        onClick={async () => {
                                          const res = await fetch('/api/sensory/magnetometer');
                                          const data = await res.json();
                                          alert("NOAA GOES MAGNETOMETER TELEMETRY:\n\n" + JSON.stringify(data, null, 2));
                                        }}
                                        className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-left hover:bg-emerald-950/10 hover:border-emerald-500/20 active:scale-98 transition-all"
                                      >
                                         <div className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">🛰️ GET RAW NOAA GOES MAGNETOMETER</div>
                                         <div className="text-[8px] text-slate-500 mt-1">Retrieve direct geostationary HP/HE/HN vector maps.</div>
                                      </button>
                                   </div>
                                </div>

                                <div>
                                   <span className="text-emerald-600 font-bold">{"//"} RAW TEXT TRANSCRIPT EXHAUST BUFFER (BYTES: {activePreview ? activePreview.snippet.length : report ? report.length : 0})</span>
                                   <pre className="text-emerald-300 mt-1 whitespace-pre-wrap select-text h-[350px] overflow-y-auto bg-slate-900 border border-white/5 p-4 rounded-lg custom-scrollbar">
{activePreview 
  ? `[CLASSIFIED PROBE PREVIEW LOG]\nSOURCE_NODE : ${activePreview.source}\nTITLE       : ${activePreview.title}\nURL         : ${activePreview.url}\n\n${activePreview.snippet}`
  : report 
    ? report 
    : "[EXHAUST STREAM CONGESTED - AWAITING DECRYPTOR HANDSHAKE]"}
                                   </pre>
                                </div>

                                <div>
                                   <span className="text-emerald-600 font-bold">{"//"} GLOBAL SEARCH DIRECT JSON BUFFER</span>
                                   <pre className="text-slate-500 text-[10px] whitespace-pre-wrap select-text bg-slate-900/40 border border-white/5 p-3 rounded-lg max-h-[250px] overflow-y-auto custom-scrollbar">
{JSON.stringify(searchResults, null, 2)}
                                   </pre>
                                </div>
                             </div>
                          </div>
                       ) : (
                          <div className="prose prose-invert prose-base max-w-none text-slate-100 font-mono text-base leading-loose tracking-wide mb-12">
                             {activePreview ? (
                               <div className="space-y-8">
                                  <div className="p-8 bg-ufo-green/5 border border-ufo-green/20 rounded-3xl relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-6 opacity-10 text-ufo-green text-5xl">{ICONS.INFO}</div>
                                     <h3 className="text-white text-2xl font-display font-black uppercase tracking-widest mb-4">
                                       {localHighlighting ? renderChildWithEntropy(activePreview.title, entropyThreshold) : activePreview.title}
                                     </h3>
                                     <p className="text-slate-300 leading-loose">
                                       {localHighlighting ? renderChildWithEntropy(activePreview.snippet, entropyThreshold) : activePreview.snippet}
                                     </p>
                                     <a href={activePreview.url} target="_blank" rel="noreferrer" className="inline-block mt-6 text-ufo-green hover:underline uppercase tracking-widest font-black text-xs">VISUALIZE SOURCE ↗</a>
                                     <button onClick={() => setFullReportItem({ title: activePreview.title, snippet: activePreview.snippet })} className="inline-block mt-6 ml-4 text-celestial-blue hover:underline uppercase tracking-widest font-black text-xs">VIEW FULL REPORT ↗</button>
                                  </div>
                               </div>
                             ) : (
                               <Markdown
                                 components={{
                                   h1: ({node, ...props}) => <h1 className="text-ufo-green font-display font-black tracking-widest uppercase border-b border-ufo-green/20 pb-4 mb-8 text-3xl" {...props} />,
                                   h2: ({node, ...props}) => <h2 className="text-celestial-blue font-display font-bold tracking-wider uppercase mt-12 mb-6 text-2xl" {...props} />,
                                   h3: ({node, ...props}) => <h3 className="text-warning-amber font-mono font-black tracking-[0.2em] uppercase mt-10 mb-4 border-l-4 border-warning-amber/50 pl-4 text-xl" {...props} />,
                                   p: ({node, children, ...props}) => (
                                     <p className="mb-8 leading-loose text-slate-100 font-mono text-sm" {...props}>
                                       {localHighlighting ? renderChildWithEntropy(children, entropyThreshold) : children}
                                     </p>
                                   ),
                                   li: ({node, children, ...props}) => (
                                     <li className="mb-4 list-none border-l-2 border-white/5 pl-6 hover:border-ufo-green/40 transition-colors" {...props}>
                                       {localHighlighting ? renderChildWithEntropy(children, entropyThreshold) : children}
                                     </li>
                                   ),
                                   strong: ({node, children, ...props}) => (
                                     <strong className="text-ufo-green font-black tracking-wide" {...props}>
                                        {localHighlighting ? renderChildWithEntropy(children, entropyThreshold) : children}
                                     </strong>
                                   ),
                                   blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-white/10 pl-6 py-2 my-8 italic bg-white/5 rounded-r-xl" {...props} />
                                 }}
                               >
                                   {report || "Establishing secure stream..."}
                               </Markdown>
                             )}
                          </div>
                       )}

                       {/* Enhanced Related Intel Vectors Section */}
                       {relatedVectors.length > 0 && !isStreaming && (
                         <div className="mt-16 pt-12 border-t border-white/10 animate-in fade-in duration-1000">
                            <div className="flex items-center justify-between mb-8">
                               <div className="flex items-center gap-4">
                                  <div className="w-2 h-2 bg-celestial-blue rounded-full shadow-[0_0_10px_#00d0ff] animate-pulse"></div>
                                  <h4 className="text-xs font-display font-black text-celestial-blue tracking-[0.4em] uppercase">AI-Driven Intel Correlations</h4>
                               </div>
                               <span className="text-[10px] font-mono text-slate-600 uppercase font-black">NEXUS_SYNC: NOMINAL</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {relatedVectors.map((vector, idx) => (
                                 <button 
                                   key={idx}
                                   onClick={() => { 
                                     if (vector.suggestedModule && vector.suggestedModule !== 'briefing') {
                                       setView(vector.suggestedModule, vector.topic);
                                     } else {
                                       setSearchQuery(vector.topic); 
                                       handleSearch(); 
                                     }
                                   }}
                                   className="text-left p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-celestial-blue/[0.05] hover:border-celestial-blue/30 transition-all group relative overflow-hidden"
                                 >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 font-mono text-[8px] text-celestial-blue">CONF_{vector.confidence}%</div>
                                    <div className="flex flex-col gap-2">
                                       <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{" >> "} Path Vector</span>
                                          {vector.suggestedModule && (
                                            <span className="px-2 py-0.5 bg-celestial-blue/10 border border-celestial-blue/30 text-celestial-blue text-[8px] font-mono uppercase rounded">
                                              Target: {vector.suggestedModule}
                                            </span>
                                          )}
                                       </div>
                                       <div className="flex items-center justify-between">
                                          <span className="text-xs font-display font-black text-slate-300 group-hover:text-white transition-colors uppercase tracking-widest">{vector.topic}</span>
                                          <span className="text-celestial-blue opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            {vector.suggestedModule ? `OPEN ${vector.suggestedModule.toUpperCase()}` : 'PROBE'} ↗
                                          </span>
                                       </div>
                                       {vector.reasoning && (
                                         <p className="text-[10px] font-mono text-slate-500 leading-relaxed mt-1 line-clamp-2 italic">
                                           {vector.reasoning}
                                         </p>
                                       )}
                                    </div>
                                    <div className="mt-4 h-[1px] w-full bg-white/5 relative">
                                       <div className="absolute h-full bg-celestial-blue shadow-[0_0_8px_#00d0ff]" style={{ width: `${vector.confidence}%` }}></div>
                                    </div>
                                 </button>
                               ))}
                            </div>
                         </div>
                       )}

                       {!isStreaming && (
                          <div className="mt-16 pt-12 border-t border-white/10 flex justify-center pb-12">
                             <button onClick={() => {
                                const content = activePreview ? activePreview.snippet : (report || "");
                                const title = activePreview ? `Artifact: ${activePreview.title}` : `News: ${new Date().toLocaleDateString()}`;
                                CaseOps.createCase(title, content, 'Briefing');
                                setView('opslog');
                             }} className="flex items-center gap-5 px-14 py-7 bg-ufo-green/15 border border-ufo-green/40 text-ufo-green rounded-[2.5rem] text-xs font-display font-black uppercase tracking-[0.5em] hover:bg-ufo-green hover:text-black transition-all hover:shadow-[0_0_50px_rgba(0,255,157,0.4)] group/btn">
                               <div className="text-2xl group-hover/btn:scale-125 transition-transform">{ICONS.FOLDER}</div>
                               <span>COMMIT TO PERMANENT VAULT</span>
                             </button>
                          </div>
                       )}
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-800 space-y-8 opacity-40 select-none">
                       <div className="w-48 h-48 border-2 border-dashed border-slate-800 rounded-full flex items-center justify-center text-8xl animate-pulse">
                          {ICONS.BRAIN}
                       </div>
                       <p className="font-display text-xl tracking-[0.7em] uppercase text-center max-w-md leading-loose">Awaiting Manual Intel Sweep</p>
                    </div>
                 )}
              </div>
           </div>
        </main>

        <aside className="lg:col-span-4 space-y-6 md:space-y-8 h-full flex flex-col order-first lg:order-last">
           <div className="glass-panel p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/15 bg-black/80 shadow-2xl group relative overflow-hidden flex flex-col max-h-[500px] md:max-h-[800px]">
              <div className="absolute inset-0 bg-ufo-green/[0.04] pointer-events-none group-focus-within:bg-ufo-green/[0.08] transition-colors"></div>
              <h3 className="text-[10px] md:text-xs font-display font-black text-white tracking-[0.3em] md:tracking-[0.5em] uppercase mb-6 md:mb-10 flex items-center justify-between relative z-10 shrink-0">
                 <span>Global Probe</span>
                 <span className="text-ufo-green group-focus-within:scale-150 transition-transform text-xl md:text-2xl drop-shadow-[0_0_12px_#00ff9d]">{ICONS.SEARCH}</span>
              </h3>
              <div className="flex flex-col gap-4 md:gap-6 relative z-10 shrink-0">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="INPUT PARAMETERS..."
                  className="w-full bg-black/90 border border-slate-700 rounded-xl md:rounded-2xl p-5 md:p-7 text-xs md:text-sm text-white focus:outline-none focus:border-ufo-green/70 transition-all placeholder-slate-800 font-mono tracking-widest shadow-inner"
                />
                <div className="flex gap-3 md:gap-4">
                  <button 
                    onClick={handleSearch} 
                    className="flex-1 py-5 md:py-7 bg-white/10 border border-white/20 rounded-xl md:rounded-2xl text-[10px] md:text-[12px] font-display font-black uppercase tracking-[0.3em] md:tracking-[0.5em] hover:bg-ufo-green hover:text-black hover:border-ufo-green transition-all shadow-2xl"
                  >
                    SCAN
                  </button>
                  <button 
                    onClick={handleDeepScan} 
                    className="flex-1 py-5 md:py-7 bg-danger-red/10 border border-danger-red/30 rounded-xl md:rounded-2xl text-[10px] md:text-[12px] font-display font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-danger-red hover:bg-danger-red hover:text-black hover:border-danger-red transition-all shadow-2xl"
                  >
                    DEEP
                  </button>
                </div>
                <button
                    onClick={startListening}
                    className={`w-full py-4 border border-white/20 rounded-xl md:rounded-2xl text-[10px] md:text-[12px] font-display font-black uppercase tracking-[0.3em] md:tracking-[0.5em] transition-all shadow-2xl ${isListening ? 'bg-danger-red/50 text-white border-danger-red animate-pulse' : 'bg-white/5 text-white hover:bg-ufo-green hover:text-black'}`}
                >
                    {isListening ? 'LISTENING...' : 'COMMAND MODE'}
                </button>
              </div>

              {/* Search Results Area */}
              {searchResults.length > 0 && (
                 <div className="mt-8 flex-1 overflow-y-auto custom-scrollbar space-y-4 relative z-10 pr-2 pb-2">
                    <div className="sticky top-0 bg-black/80 p-4 backdrop-blur-md z-20 border-b border-white/5 space-y-4">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                             {isDeepScan ? 'Deep Web Artifacts' : 'Intercepted Intel'} ({searchResults.length})
                          </span>
                          {selectedItems.length > 0 && (
                             <button 
                               onClick={handleSynthesize}
                               disabled={loading}
                               className="text-[9px] font-mono text-ufo-green bg-ufo-green/10 px-3 py-1 rounded border border-ufo-green/30 hover:bg-ufo-green hover:text-black transition-all uppercase font-bold"
                             >
                                Synthesize ({selectedItems.length})
                             </button>
                          )}
                       </div>

                       <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                          <div className="flex gap-2">
                           <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center pr-2">Severity:</span>
                           {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                              <button
                                 key={sev}
                                 onClick={() => setSeverityFilter(sev)}
                                 className={`px-3 py-1 rounded-full text-[8px] font-mono uppercase tracking-widest border transition-all whitespace-nowrap ${severityFilter === sev ? 'bg-ufo-green text-black border-ufo-green' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'}`}
                              >
                                 {sev}
                              </button>
                           ))}
                          </div>
                          <div className="flex gap-2 ml-4 border-l border-white/10 pl-4">
                           <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center pr-2">Type:</span>
                           {['ALL', 'UFO / UAP', 'Paranormal', 'Cryptid', 'Gov / Black Ops', 'Phenomena', 'Site Intel'].map((cat) => (
                              <button
                                 key={cat}
                                 onClick={() => setCategoryFilter(cat as AnomalyCategory | 'ALL')}
                                 className={`px-3 py-1 rounded-full text-[8px] font-mono uppercase tracking-widest border transition-all whitespace-nowrap ${categoryFilter === cat ? 'bg-celestial-blue text-black border-celestial-blue' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'}`}
                              >
                                 {cat}
                              </button>
                           ))}
                          </div>
                       </div>
                    </div>
                    
                    {filteredResults.map((result, idx) => {
                       const isSelected = selectedItems.some(i => i.url === result.url);
                       const isExpanded = expandedResults.has(idx);
                       const isPreviewing = activePreview?.url === result.url;
                       
                       return (
                          <div 
                            key={idx} 
                            className={`p-5 rounded-2xl border transition-all cursor-pointer group/item relative overflow-hidden flex flex-col gap-4 ${isPreviewing ? 'border-celestial-blue bg-celestial-blue/5' : isSelected ? 'bg-ufo-green/5 border-ufo-green shadow-[0_0_20px_rgba(0,255,157,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'}`}
                            onClick={() => toggleSelection(result)}
                          >
                             {/* Prominent Source Badge */}
                             <div className="flex justify-between items-start">
                                <div className="flex flex-wrap gap-2">
                                   <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ufo-green/10 border border-ufo-green/20">
                                      <div className={`w-1.5 h-1.5 rounded-full ${isPreviewing ? 'bg-celestial-blue shadow-[0_0_8px_#00d0ff]' : 'bg-ufo-green shadow-[0_0_8px_#00ff9d]'}`}></div>
                                      <span className={`text-[10px] font-mono ${isPreviewing ? 'text-celestial-blue' : 'text-ufo-green'} uppercase tracking-widest font-black truncate max-w-[150px]`}>
                                         {result.source || 'UNKNOWN_NODE'}
                                      </span>
                                   </div>
                                   {result.severity && (
                                      <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-[10px] font-mono font-black uppercase tracking-widest ${getSeverityColor(result.severity)}`}>
                                         {result.severity}
                                      </div>
                                   )}
                                </div>
                                
                                {/* Selection Indicator */}
                                <div className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-ufo-green bg-ufo-green text-black' : 'border-white/20 bg-black/20'}`}>
                                   {isSelected && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                </div>
                             </div>
                             
                             {/* Title */}
                             <h4 className="text-sm font-display font-bold text-white leading-snug group-hover/item:text-ufo-green transition-colors uppercase tracking-wide">
                                {result.title}
                             </h4>

                             {/* Snippet Content - Enhanced Expand/Collapse Toggle */}
                             <div className={`relative overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[800px] mb-2' : 'max-h-[3.6em]'}`}>
                                <div className={`text-[11px] font-mono leading-relaxed transition-colors duration-500 ${isExpanded ? 'text-slate-200' : 'text-slate-500'}`}>
                                   {result.snippet}
                                </div>
                                {!isExpanded && <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>}
                             </div>

                             {/* Footer Actions */}
                             <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-auto relative z-10">
                                <div className="flex gap-2">
                                  <button 
                                    onClick={(e) => toggleExpandResult(e, idx)}
                                    className={`text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2 transition-all py-1.5 px-3 -ml-2 rounded-lg ${isExpanded ? 'bg-ufo-green/20 text-ufo-green font-black shadow-[0_0_10px_rgba(0,255,157,0.2)]' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
                                  >
                                    <span>{isExpanded ? '[ SHOW_LESS ]' : '[ SHOW_MORE ]'}</span>
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handlePreviewResult(result); }}
                                    className={`text-[10px] font-mono uppercase tracking-[0.2em] py-1.5 px-3 rounded-lg hover:bg-celestial-blue/10 transition-all ${isPreviewing ? 'bg-celestial-blue/20 text-celestial-blue font-black' : 'text-slate-500 hover:text-celestial-blue'}`}
                                  >
                                     [ PREVIEW ]
                                  </button>
                                </div>

                                <a 
                                  href={result.url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-celestial-blue/70 hover:text-celestial-blue hover:underline uppercase tracking-widest flex items-center gap-1"
                                >
                                   <span>SOURCE ↗</span>
                                </a>
                             </div>
                          </div>
                       );
                    })}
                 </div>
              )}
           </div>
        </aside>
      </div>
      )}
      <FullReportModal item={fullReportItem} onClose={() => setFullReportItem(null)} />
    </div>
  );
};

export default BriefingRoom;
