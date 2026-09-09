import React, { useState, useEffect, useCallback } from 'react';
import { streamDailyBrief, getTrendData, getSocialIntel, queryArchive, getCorrelatedIntel } from '../services/geminiService';
import { categorizeAnomaly } from '../services/anomalyService';
import { StrategyService } from '../services/strategyService';
import { CaseOps } from '../services/caseOps';
import { ArchiveOps } from '../services/firebaseService';
import { fetchCelestialEvents } from '../services/celestialService';
import Markdown from 'react-markdown';
import TacticalLoader from './TacticalLoader';
import { AnomalyMap } from './AnomalyMap';
import TemporalFrequencyChart from './TemporalFrequencyChart';
import { AnomalyVisualizer } from './AnomalyVisualizer';
import { TrackingSettings } from './TrackingSettings';
import { SightingOps } from '../services/firebaseService';
import { getHistoricalSeedSightings } from '../services/seedService';
import { IntelHarvester } from './IntelHarvester';
import { TrendingAnomaliesFeed } from './TrendingAnomaliesFeed';
import { AnomalyDetailModal } from './AnomalyDetailModal';
import { TopImpactCard } from './TopImpactCard';
import { RealtimeFeedsTracker } from './RealtimeFeedsTracker';
import { CommandPaletteModal } from './CommandPaletteModal';
import { CaseDossierInspector } from './CaseDossierInspector';
import { TriangulationMatrixModal } from './TriangulationMatrixModal';
import { TemporalPlaybackBar } from './TemporalPlaybackBar';
import { CreatorExportModal } from './CreatorExportModal';
import ErrorBoundary from './ErrorBoundary';
import { 
  TrendData, 
  MissionDirective, 
  CorrelatedVector, 
  AppView, 
  CelestialEvent,
  UFOSighting,
  AlertSubscription,
  CaseRecord
} from '../types';
import { AnomalySubmissionModal } from './AnomalySubmissionModal';
import { SubmissionReviewQueueModal } from './SubmissionReviewQueueModal';
import { CategoryFilterBar } from './CategoryFilterBar';
import { AnomalyTrendAnalysis } from './AnomalyTrendAnalysis';
import { InteractiveRadarWidget } from './InteractiveRadarWidget';
import { EmbedWidgetModal } from './EmbedWidgetModal';
import { SubmissionOps } from '../services/firebaseService';
import { normalizeAnomalyCategory } from '../services/anomalyService';
import { ShieldAlert, ChevronRight, Zap, Radar, Volume2, Radio, Video, Compass, BookOpen, Globe, Flame, Plus, CheckSquare, Activity, Code2, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAudio } from '../contexts/AudioContext';

interface DashboardProps {
  setView: (view: AppView, initialFilterCategory?: string | null) => void;
  specialty: string;
  subscriptions: AlertSubscription[];
}

const Dashboard: React.FC<DashboardProps> = ({ setView, specialty, subscriptions }) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState<UFOSighting | null>(null);
  const [briefingText, setBriefingText] = useState("");

  // Tactical Dashboard States
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [inspectorSighting, setInspectorSighting] = useState<UFOSighting | null>(null);
  const [triangulateSighting, setTriangulateSighting] = useState<UFOSighting | null>(null);
  const [mediaExportSighting, setMediaExportSighting] = useState<UFOSighting | null>(null);
  const [activeMissionMode, setActiveMissionMode] = useState<'ALL' | 'AIR' | 'SOLAR' | 'TECTONIC'>('ALL');
  const [scrubHours, setScrubHours] = useState<number>(0);

  // Anomaly Submissions & Categorization & Trends State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSubmissionModal, setShowSubmissionModal] = useState<boolean>(false);
  const [showReviewQueueModal, setShowReviewQueueModal] = useState<boolean>(false);
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState<number>(0);
  const [dashboardTab, setDashboardTab] = useState<'FEED' | 'TRENDS' | 'GEOSPATIAL'>('FEED');
  const [showEmbedModal, setShowEmbedModal] = useState<boolean>(false);
  const [radarDisplayMode, setRadarDisplayMode] = useState<'MAP' | 'SCOPE'>('MAP');

  useEffect(() => {
    const unsub = SubmissionOps.subscribeToSubmissions((items) => {
      const pending = items.filter(s => s.status === 'PENDING_REVIEW').length;
      setPendingSubmissionsCount(pending);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleToggleCmd = () => setShowCommandPalette(prev => !prev);
    window.addEventListener('toggle-command-palette', handleToggleCmd);
    return () => window.removeEventListener('toggle-command-palette', handleToggleCmd);
  }, []);

  const [isBriefingLoading, setIsBriefingLoading] = useState(true);
  const [nextEvent, setNextEvent] = useState<CelestialEvent | null>(null);
  const [isFilterActive, setIsFilterActive] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      const events = await fetchCelestialEvents();
      if (events.length > 0) {
        setNextEvent(events[0]);
      }
    };
    loadEvent();
  }, []);
  
  const [correlatedVectors, setCorrelatedVectors] = useState<CorrelatedVector[]>([]);
  const [isCorrelating, setIsCorrelating] = useState(false);
  
  const { playAudio, isPlaying, currentTrackId, stopAudio } = useAudio();
  
  const [social, setSocial] = useState<{ loading: boolean; data: any | null }>({ loading: true, data: null });
  const [overlooked, setOverlooked] = useState<{ loading: boolean; data: any | null }>({ loading: true, data: null });
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [caseCount, setCaseCount] = useState(0);
  const [directive, setDirective] = useState<MissionDirective>(StrategyService.getCurrentDirective());
  const [sightings, setSightings] = useState<UFOSighting[]>([]);
  const [verifiedReports, setVerifiedReports] = useState<CaseRecord[]>([]);

  const categoryCounts = React.useMemo(() => {
    const counts: { [key: string]: number } = {
      Scientific: 0,
      Economic: 0,
      Social: 0,
      Geopolitical: 0,
      Cultural: 0,
      'UFO / UAP': 0,
      Phenomena: 0
    };
    sightings.forEach(s => {
      const cat = normalizeAnomalyCategory(s.category);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [sightings]);

  const filteredSightings = React.useMemo(() => {
    let result = sightings;

    if (selectedCategory !== 'ALL') {
      result = result.filter(s => normalizeAnomalyCategory(s.category) === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.title.toLowerCase().includes(q) || 
        (s.location && s.location.toLowerCase().includes(q)) || 
        s.description.toLowerCase().includes(q)
      );
    }

    if (isFilterActive && subscriptions.length > 0) {
      result = result.filter(s => {
        return subscriptions.some(sub => {
          const matchesCategory = sub.category === s.category;
          const matchesLocation = !sub.location || s.location.toLowerCase().includes(sub.location.toLowerCase()) || s.title.toLowerCase().includes(sub.location.toLowerCase());
          const matchesKeywords = !sub.keywords || sub.keywords.some(k => 
            s.description.toLowerCase().includes(k.toLowerCase()) || 
            s.title.toLowerCase().includes(k.toLowerCase())
          );
          return matchesCategory || matchesLocation || matchesKeywords;
        });
      });
    }

    if (activeMissionMode === 'AIR') {
      result = result.filter(s => (s.category as string) === 'UFO / UAP' || (s.category as string) === 'Aerospace' || (s.category as string) === 'Gov / Black Ops' || s.severity === 'CRITICAL' || s.severity === 'HIGH');
    } else if (activeMissionMode === 'SOLAR') {
      result = result.filter(s => (s.category as string) === 'Phenomena' || (s.category as string) === 'Space Weather' || (s.category as string) === 'Orbital' || s.title.toLowerCase().includes('solar') || s.title.toLowerCase().includes('satellite'));
    } else if (activeMissionMode === 'TECTONIC') {
      result = result.filter(s => (s.category as string) === 'Environmental events' || (s.category as string) === 'Seismic' || (s.category as string) === 'Atmospheric' || s.title.toLowerCase().includes('quake') || s.title.toLowerCase().includes('buoy'));
    }

    return result;
  }, [sightings, subscriptions, isFilterActive, activeMissionMode, selectedCategory, searchQuery]);

  const topImpactAnomaly = React.useMemo(() => {
    if (!filteredSightings || filteredSightings.length === 0) return null;
    const severityWeight = (s: UFOSighting) => {
      if (s.severity === 'CRITICAL') return 4;
      if (s.severity === 'HIGH') return 3;
      if (s.severity === 'MEDIUM') return 2;
      return 1;
    };
    return [...filteredSightings].sort((a, b) => {
      const sDiff = severityWeight(b) - severityWeight(a);
      if (sDiff !== 0) return sDiff;
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
      return timeB - timeA;
    })[0];
  }, [filteredSightings]);

  useEffect(() => {
    const historicalSeeds = getHistoricalSeedSightings();
    const unsubscribe = SightingOps.subscribeToSightings(async (items) => {
      const categorizedItems = await Promise.all(items.map(async item => {
        if (!item.category || item.category === 'Phenomena') {
          const { category } = await categorizeAnomaly(item);
          return { ...item, category };
        }
        return item;
      }));

      // Combine live sightings with historical archive seeds without duplicates
      const idMap = new Map<string, UFOSighting>();
      historicalSeeds.forEach(s => idMap.set(s.id, s));
      categorizedItems.forEach(s => idMap.set(s.id, s));

      setSightings(Array.from(idMap.values()));
    });

    // Fallback if subscription returns immediately empty
    if (sightings.length === 0) {
      setSightings(historicalSeeds);
    }

    return () => unsubscribe();
  }, [isFilterActive, subscriptions]);

  useEffect(() => {
    const unsub = CaseOps.subscribeToCases((cases) => {
      setVerifiedReports(cases.filter(c => c.isPublicFeed));
    });
    return () => unsub();
  }, []);

  const playBriefingAudio = useCallback(async (textToPlay?: string) => {
    const text = textToPlay || briefingText;
    if (!text) return;
    const trackId = `dashboard-brief-${textToPlay ? textToPlay.substring(0, 20) : 'default'}`;
    
    try {
      if (isPlaying && currentTrackId === trackId) {
        stopAudio();
      } else {
        await playAudio(text.slice(0, 1000), trackId, 'Tactical Intelligence Briefing');
      }
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  }, [briefingText, isPlaying, currentTrackId, playAudio, stopAudio]);

  const loadData = useCallback(async (isRefresh = false) => {
    const hasScanned = localStorage.getItem('anomalyWatch_hasInitialScan');
    const shouldScan = isRefresh || !hasScanned;

    if (!shouldScan) {
      setIsBriefingLoading(true);
      try {
        const [brief, socialSig, archiveSig] = await Promise.all([
          ArchiveOps.getLatestBrief(),
          ArchiveOps.getLatestSignalByType('MEDIA_ANALYSIS'),
          ArchiveOps.getLatestSignalByType('ARCHIVE_QUERY')
        ]);
        
        if (brief) {
          setBriefingText(brief);
        }
        if (socialSig) setSocial({ loading: false, data: { text: socialSig.response, groundingUrls: socialSig.groundingUrls } });
        if (archiveSig) setOverlooked({ loading: false, data: { text: archiveSig.response, groundingUrls: archiveSig.groundingUrls } });
        
        const [directiveRes, casesRes] = await Promise.all([
          StrategyService.generateGlobalDirective(false),
          CaseOps.getAllCases()
        ]);
        setDirective(directiveRes);
        setCaseCount(casesRes.length || 0);
        
      } catch (e) {
        console.error("Failed to load cached intel", e);
      } finally {
        setIsBriefingLoading(false);
      }
      return;
    }

    if (isRefresh) {
      setBriefingText("");
      setIsBriefingLoading(true);
      setSocial({ loading: true, data: null });
      setOverlooked({ loading: true, data: null });
    }
    
    localStorage.setItem('anomalyWatch_hasInitialScan', 'true');

    const fetchCoreIntel = async () => {
      try {
        const [directiveRes, casesRes] = await Promise.all([
          StrategyService.generateGlobalDirective(isRefresh),
          CaseOps.getAllCases()
        ]);
        
        setDirective(directiveRes);
        setCaseCount(casesRes.length || 0);

        let hasReceived = false;
        let finalBrief = "";
        await streamDailyBrief((chunk) => {
            if (chunk && chunk.trim().length > 0) {
              setBriefingText(chunk);
              finalBrief = chunk;
              setIsBriefingLoading(false);
              hasReceived = true;
            }
        });
        
        if (!hasReceived) {
           setBriefingText("");
           setIsBriefingLoading(false);
        }

      } catch (e) {
        console.error("Core intel fetch error", e);
        setIsBriefingLoading(false);
      }
    };

    const fetchSupportSignals = async () => {
      try {
        const [trendRes, socialRes] = await Promise.all([
          getTrendData(),
          getSocialIntel()
        ]);
        setTrends(trendRes || []);
        setSocial({ loading: false, data: socialRes });

        if (socialRes) {
           ArchiveOps.logSignal({
             query: "Global Social Frequency Scan",
             response: socialRes.text,
             groundingUrls: socialRes.groundingUrls || [],
             type: 'MEDIA_ANALYSIS'
           });
        }

      } catch (e) {
        setSocial({ loading: false, data: null });
      }
    };

    const fetchArchivalIntel = async () => {
      try {
        const overlookedRes = await queryArchive("significant anomalous artifacts news last 24h");
        setOverlooked({ loading: false, data: overlookedRes });
        
        if (overlookedRes) {
           ArchiveOps.logSignal({
             query: `Deep Archive Sweep: ${new Date().toLocaleDateString()}`,
             response: overlookedRes.text,
             groundingUrls: overlookedRes.groundingUrls || [],
             type: 'ARCHIVE_QUERY'
           });
        }
      } catch (e) {
        setOverlooked({ loading: false, data: null });
      }
    };

    fetchCoreIntel();
    fetchSupportSignals();
    fetchArchivalIntel();
  }, []);

  useEffect(() => { 
    loadData(); 
  }, [loadData]);

  useEffect(() => {
    const fetchCorrelations = async () => {
      if (briefingText && briefingText.length > 100 && !isBriefingLoading) {
        setIsCorrelating(true);
        try {
          const vectors = await getCorrelatedIntel(briefingText);
          setCorrelatedVectors(vectors);
        } catch (e) {
          console.error("Correlation failed", e);
        } finally {
          setIsCorrelating(false);
        }
      }
    };
    fetchCorrelations();
  }, [briefingText, isBriefingLoading]);

  const handleUnifiedRescan = async () => {
    localStorage.removeItem('anomalyWatch_hasInitialScan');
    localStorage.removeItem('anomaly_watch_cached_brief');
    await loadData(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="max-w-[1700px] mx-auto space-y-6 md:space-y-12 pb-32 relative px-4 md:px-0"
    >
      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 pt-4 md:pt-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-10 md:space-y-16">
          
          {/* TOP IMPACT ANOMALY HIGHLIGHT */}
          {topImpactAnomaly && (
            <TopImpactCard
              anomaly={topImpactAnomaly}
              onSelectAnomaly={(anomaly) => setSelectedAnomaly(anomaly)}
              onOpenMap={() => setView('map')}
            />
          )}

          {/* Header Directive */}
          <motion.section 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.05] pb-4">
              <div className="flex flex-col">
                <span className="micro-label text-ufo-green uppercase tracking-widest font-black">Strategic Directive</span>
                <span className="font-mono text-[9px] text-slate-500">REF: ANOMALY_{new Date().toLocaleDateString([], { month: '2-digit', day: '2-digit' }).replace(/\//g, '')}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5">
                <button 
                  onClick={() => setShowSubmissionModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-ufo-green text-black hover:bg-ufo-green/90 transition-all rounded-xl text-[10px] font-mono font-black tracking-widest shadow-[0_0_15px_rgba(0,255,157,0.3)] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>[ + SUBMIT ANOMALY ]</span>
                </button>

                <button 
                  onClick={() => setShowReviewQueueModal(true)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all text-[10px] font-mono font-bold tracking-widest cursor-pointer ${
                    pendingSubmissionsCount > 0
                      ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>REVIEW QUEUE</span>
                  {pendingSubmissionsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-black text-[8px] font-bold">
                      {pendingSubmissionsCount}
                    </span>
                  )}
                </button>

                <button 
                  onClick={handleUnifiedRescan}
                  disabled={isBriefingLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-ufo-green/15 border border-ufo-green/40 hover:bg-ufo-green hover:text-black hover:border-ufo-green transition-all rounded-xl text-[10px] font-mono font-bold tracking-widest disabled:opacity-50 cursor-pointer"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isBriefingLoading ? 'bg-ufo-green animate-ping' : 'bg-ufo-green shadow-[0_0_8px_#00ff9d]'}`}></span>
                  <span>[ RE-SCAN INTEL ]</span>
                </button>

                <button 
                  onClick={() => setIsFilterActive(!isFilterActive)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all text-[10px] font-mono font-bold tracking-widest cursor-pointer ${
                    isFilterActive 
                      ? 'bg-ufo-green/10 border-ufo-green/40 text-ufo-green' 
                      : 'bg-white/[0.02] border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                >
                  <span>PERSONALIZATION: {isFilterActive ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-display font-black text-white uppercase leading-none tracking-tight">
                {directive?.title || "Establishing Command..."}
              </h1>
              <p className="font-serif italic text-lg md:text-xl text-slate-400 max-w-4xl leading-relaxed border-l border-ufo-green/30 pl-6">
                {directive?.description}
              </p>
            </div>
          </motion.section>

          {/* CONSOLE NAVIGATION TABS */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/90 border border-white/10 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setDashboardTab('FEED')}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 shrink-0 ${
                dashboardTab === 'FEED'
                  ? 'bg-ufo-green text-black shadow-[0_0_15px_rgba(0,255,157,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Anomaly Feed & OSINT</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold ${dashboardTab === 'FEED' ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-400'}`}>
                {filteredSightings.length}
              </span>
            </button>

            <button
              onClick={() => setDashboardTab('TRENDS')}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 shrink-0 ${
                dashboardTab === 'TRENDS'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Trend Analysis & Patterns</span>
              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-white/10 text-cyan-300">
                AI ENGINE
              </span>
            </button>

            <button
              onClick={() => setDashboardTab('GEOSPATIAL')}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 shrink-0 ${
                dashboardTab === 'GEOSPATIAL'
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Geospatial Radar Map</span>
            </button>
          </div>

          {/* TAB 1: ANOMALY FEED & CATEGORIZATION */}
          {dashboardTab === 'FEED' && (
            <div className="space-y-8">
              {/* Category Filter Bar */}
              <section className="space-y-2">
                <CategoryFilterBar 
                  selectedCategory={selectedCategory}
                  onSelectCategory={(cat) => setSelectedCategory(cat)}
                  categoryCounts={categoryCounts}
                  searchQuery={searchQuery}
                  onSearchChange={(q) => setSearchQuery(q)}
                  totalCount={sightings.length}
                />
              </section>

              {/* REAL-TIME FEEDS (MARKETS, SOCIAL OSINT, NEWS WIRE, AI EXPLAINER) */}
              <section className="space-y-4">
                <ErrorBoundary fallbackTitle="REAL-TIME FEEDS ISOLATED">
                  <RealtimeFeedsTracker />
                </ErrorBoundary>
              </section>

              {/* REAL-TIME TRENDING ANOMALIES FEED */}
              <section className="space-y-4">
                <ErrorBoundary fallbackTitle="TRENDING FEED ISOLATED">
                  <TrendingAnomaliesFeed 
                    sightings={filteredSightings}
                    onSelectAnomaly={(anomaly) => setSelectedAnomaly(anomaly)}
                  />
                </ErrorBoundary>
              </section>
            </div>
          )}

          {/* TAB 2: ANOMALY TREND ANALYSIS & RECURRING PATTERNS */}
          {dashboardTab === 'TRENDS' && (
            <section className="space-y-6">
              <ErrorBoundary fallbackTitle="TREND ANALYSIS ISOLATED">
                <AnomalyTrendAnalysis 
                  sightings={sightings}
                  onSelectAnomaly={(s) => setSelectedAnomaly(s)}
                />
              </ErrorBoundary>
            </section>
          )}

          {/* TAB 3: GEOSPATIAL INTELLIGENCE MAP */}
          {dashboardTab === 'GEOSPATIAL' && (
            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <h3 className="text-xs font-display font-black text-white tracking-[0.3em] uppercase">GEOSPATIAL INTELLIGENCE MAP & RADAR</h3>
                  <span className="font-mono text-[9px] text-slate-500">LIVE ANOMALOUS SIGHTINGS, SEISMIC & RADAR OVERLAYS</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Scope Mode Switcher */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 font-mono text-[10px]">
                    <button
                      onClick={() => setRadarDisplayMode('MAP')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        radarDisplayMode === 'MAP'
                          ? 'bg-ufo-green text-black shadow-[0_0_8px_#00ff9d]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      MAP
                    </button>
                    <button
                      onClick={() => setRadarDisplayMode('SCOPE')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        radarDisplayMode === 'SCOPE'
                          ? 'bg-cyan-500 text-black shadow-[0_0_8px_#06b6d4]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SCOPE
                    </button>
                  </div>

                  {/* Embed Generator Button */}
                  <button
                    onClick={() => setShowEmbedModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white font-mono text-[10px] font-bold tracking-wider transition-all cursor-pointer"
                    title="Get embed code for public websites and articles"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>EMBED WIDGET</span>
                  </button>

                  <button 
                    onClick={() => setView('map')}
                    className="group flex items-center gap-2 text-ufo-green hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase hover:underline">[ FULLSCREEN ]</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* MISSION FOCUS PRESETS SEGMENT CONTROL */}
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border border-white/10 font-mono text-[10px] overflow-x-auto custom-scrollbar">
                <span className="text-slate-500 font-bold px-2 uppercase shrink-0">MISSION PRESET:</span>
                <button
                  onClick={() => setActiveMissionMode('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all shrink-0 ${
                    activeMissionMode === 'ALL'
                      ? 'bg-ufo-green text-black shadow-[0_0_10px_#00ff9d]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🛰️ ALL SIGNALS
                </button>
                <button
                  onClick={() => setActiveMissionMode('AIR')}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all shrink-0 ${
                    activeMissionMode === 'AIR'
                      ? 'bg-cyan-500 text-black shadow-[0_0_10px_#06b6d4]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✈️ AIR DEFENSE
                </button>
                <button
                  onClick={() => setActiveMissionMode('SOLAR')}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all shrink-0 ${
                    activeMissionMode === 'SOLAR'
                      ? 'bg-amber-500 text-black shadow-[0_0_10px_#f59e0b]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ☀️ SOLAR / SPACE
                </button>
                <button
                  onClick={() => setActiveMissionMode('TECTONIC')}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all shrink-0 ${
                    activeMissionMode === 'TECTONIC'
                      ? 'bg-orange-500 text-black shadow-[0_0_10px_#f97316]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🌋 TECTONIC / MARINE
                </button>
              </div>

              {/* Display Area: Map or Tactical Radar Oscilloscope */}
              {radarDisplayMode === 'MAP' ? (
                <div className="rounded-3xl overflow-hidden border border-white/15 shadow-2xl h-[480px] relative bg-slate-950">
                  <ErrorBoundary fallbackTitle="RADAR MAP FEED ISOLATED">
                    <AnomalyMap sightings={filteredSightings} />
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="rounded-3xl overflow-hidden border border-white/15 shadow-2xl relative bg-slate-950">
                  <InteractiveRadarWidget 
                    theme={activeMissionMode === 'AIR' ? 'cyan' : activeMissionMode === 'SOLAR' ? 'amber' : 'emerald'}
                    defaultDomain={activeMissionMode}
                    onOpenEmbedModal={() => setShowEmbedModal(true)}
                  />
                </div>
              )}

              <ErrorBoundary fallbackTitle="FREQUENCY CHART ISOLATED">
                <TemporalFrequencyChart />
              </ErrorBoundary>
            </section>
          )}

          {/* Intelligence Relay / Decrypted Brief */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-xs font-display font-black text-white tracking-[0.3em] uppercase">Intelligence Relay</h3>
                <span className="font-mono text-[9px] text-ufo-green/50">STATION_DECRYPT_ACTIVE</span>
              </div>
              <button 
                onClick={() => setView('briefing')}
                className="group flex items-center gap-2 micro-label text-ufo-green hover:opacity-80 transition-opacity"
              >
                <span className="text-[10px] font-mono font-bold tracking-widest">[ FULL BRIEFINGS ]</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="glass-panel relative overflow-hidden rounded-3xl flex flex-col border border-white/[0.08]">
              <AnimatePresence mode="wait">
                {isBriefingLoading ? (
                  <motion.div 
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-16 flex flex-col items-center justify-center min-h-[300px]"
                  >
                    <TacticalLoader stage="SWEEPING SECURED CHANNELS..." />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col"
                  >
                    <div className="px-8 py-4 border-b border-white/[0.08] flex justify-between items-center bg-white/[0.01]">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-ufo-green shadow-[0_0_8px_#00ff9d]"></div>
                          <span className="text-[10px] font-mono text-slate-400">Node::Uplink_Encrypted</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => playBriefingAudio()}
                            disabled={isBriefingLoading}
                            className={`p-2 rounded-lg border transition-all ${isPlaying && currentTrackId === 'dashboard-brief' ? 'bg-ufo-green border-ufo-green text-black animate-pulse' : 'bg-white/[0.03] border-white/10 text-ufo-green hover:bg-ufo-green/10'}`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                    </div>

                    <div className="p-8 relative flex-1">
                      <div className="prose prose-invert prose-slate max-w-none prose-p:font-sans prose-p:text-slate-300 prose-p:leading-relaxed prose-strong:text-ufo-green">
                        <Markdown
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-white font-display font-black tracking-tight uppercase border-b border-white/[0.08] pb-4 mb-6 text-xl" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-ufo-green font-display font-medium tracking-wide uppercase mt-8 mb-4 text-sm md:text-base border-l border-ufo-green/30 pl-3" {...props} />,
                            p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-sm font-light text-slate-300" {...props} />,
                            li: ({node, ...props}) => <li className="mb-2 list-none grid grid-cols-[auto_1fr] gap-3 items-start text-sm font-light text-slate-400">
                              <span className="text-ufo-green mt-1 text-xs">◆</span>
                              <span {...props} />
                            </li>,
                            strong: ({node, ...props}) => <strong className="text-white font-medium bg-ufo-green/10 px-1 rounded" {...props} />
                          }}
                        >
                          {briefingText}
                        </Markdown>
                      </div>

                      {/* Decrypted Vector Nodes */}
                      <AnimatePresence>
                        {correlatedVectors.length > 0 && !isBriefingLoading && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-8 pt-6 border-t border-white/10 space-y-4"
                          >
                            <div className="flex items-center gap-2">
                              <Zap className="w-3.5 h-3.5 text-celestial-blue" />
                              <h4 className="text-[10px] font-mono text-celestial-blue uppercase tracking-widest font-black">AI Associated Tracks</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {correlatedVectors.slice(0, 2).map((vector, idx) => (
                                <button 
                                  key={idx}
                                  onClick={() => setView(vector.suggestedModule || 'briefing', vector.topic)}
                                  className="text-left p-4 bg-celestial-blue/5 border border-celestial-blue/20 rounded-2xl hover:bg-celestial-blue/10 transition-all relative overflow-hidden"
                                >
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Associated Link</span>
                                    <span className="text-xs font-display font-bold text-slate-200 uppercase tracking-wider">{vector.topic}</span>
                                    <p className="text-[10px] font-mono text-slate-500 mt-1 line-clamp-1 italic">{vector.reasoning}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Trends Dashboard */}
          <section className="space-y-4">
            <div className="flex flex-col">
              <h3 className="text-xs font-display font-black text-white tracking-[0.3em] uppercase">Trend Analysis</h3>
              <span className="font-mono text-[9px] text-slate-500">HISTORICAL CORRELATIONS & RECURRING PATTERNS</span>
            </div>
            <AnomalyVisualizer sightings={sightings} />
          </section>

          {/* Verified Community Intel */}
          {verifiedReports.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-xs font-display font-black text-white tracking-[0.3em] uppercase">Verified Logs Feed</h3>
                  <span className="font-mono text-[9px] text-slate-500">{verifiedReports.length} Authenticated Field Transmissions</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verifiedReports.slice(0, 4).map(report => (
                  <motion.div 
                    key={report.id}
                    className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl group cursor-pointer relative overflow-hidden hover:bg-white/[0.04] transition-all"
                    onClick={() => setView('opslog', report.category)}
                  >
                    <div className="relative z-10 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono text-ufo-green uppercase">Field_Log</span>
                        <span className="text-[9px] font-mono text-slate-500">Sector_{report.category || 'NA'}</span>
                      </div>
                      <h4 className="text-sm font-display font-bold text-white uppercase tracking-wider group-hover:text-ufo-green transition-colors">{report.title}</h4>
                      <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-2 italic">"{report.summary}"</p>
                      <div className="pt-3 border-t border-white/[0.05] flex justify-between items-center text-[9px] font-mono text-slate-500">
                        <span>SIG_{report.id.slice(0,6)}</span>
                        <span>{new Date(report.createdTimestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: Streamlined Metrics HUD & Settings */}
        <div className="lg:col-span-4 space-y-6">
           
           {/* Streamlined Stats Panel */}
           <section className="glass-panel p-5 rounded-3xl border border-white/[0.08] space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
                 <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-ufo-green" />
                    <h3 className="text-[10px] font-mono text-white uppercase tracking-widest font-black">Operator status</h3>
                 </div>
                 <span className="text-[10px] font-mono text-ufo-green py-0.5 px-2 bg-ufo-green/10 rounded">NOMINAL</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-mono text-slate-500 uppercase">Sightings Tracker</span>
                    <span className="text-lg font-display font-black text-white">{sightings.length}</span>
                 </div>
                 <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-mono text-slate-500 uppercase">Verified Cabinets</span>
                    <span className="text-lg font-display font-black text-white">{verifiedReports.length}</span>
                 </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>Channel Encryption Integrity</span>
                  <span>100% SECURE</span>
                </div>
                <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full w-[100%] bg-ufo-green shadow-[0_0_8px_#00ff9d]"></div>
                </div>
              </div>
           </section>

           {/* Calibration & Subscriptions */}
           <section className="glass-panel p-5 rounded-3xl border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
                 <div className="flex items-center gap-2">
                    <Radar className="w-4 h-4 text-celestial-blue" />
                    <h3 className="text-[10px] font-mono text-white uppercase tracking-widest font-black">Tracker Calibration</h3>
                  </div>
              </div>
              <div className="space-y-3">
                 <TrackingSettings />
                 <p className="text-[10px] font-mono text-slate-500 leading-relaxed italic">
                   Specify tracking filters, sector coordinates, and focus keywords above to tune telemetry feeds.
                 </p>
              </div>
           </section>

           <IntelHarvester />

        </div>
      </div>

      {/* Anomaly Detail Modal */}
      {selectedAnomaly && (
        <AnomalyDetailModal 
          anomaly={selectedAnomaly} 
          onClose={() => setSelectedAnomaly(null)}
          onOpenAssistantWithQuery={(query) => {
            setSelectedAnomaly(null);
            setView('briefing', query);
          }}
        />
      )}

      {/* Command Palette Modal (Cmd + K) */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectSighting={(s) => setInspectorSighting(s)}
        onNavigateView={(v) => setView(v)}
        sightings={filteredSightings}
      />

      {/* Case Dossier Inspector Drawer (380px Split-Screen Slide-Over) */}
      <CaseDossierInspector
        sighting={inspectorSighting}
        onClose={() => setInspectorSighting(null)}
        onTriangulate={(s) => {
          setInspectorSighting(null);
          setTriangulateSighting(s);
        }}
        onOpenMediaStudio={(s) => {
          setInspectorSighting(null);
          setMediaExportSighting(s);
        }}
      />

      {/* Triangulation Matrix Modal */}
      <TriangulationMatrixModal
        isOpen={!!triangulateSighting}
        onClose={() => setTriangulateSighting(null)}
        sighting={triangulateSighting}
      />

      {/* Creator Media Studio Export Modal */}
      {mediaExportSighting && (
        <CreatorExportModal
          isOpen={!!mediaExportSighting}
          onClose={() => setMediaExportSighting(null)}
          sighting={mediaExportSighting}
          userClearance="ANALYST"
          onNeedUpgrade={() => {}}
        />
      )}

      {/* Anomaly Submission Modal */}
      <AnomalySubmissionModal
        isOpen={showSubmissionModal}
        onClose={() => setShowSubmissionModal(false)}
      />

      {/* Submission Review Queue Modal */}
      <SubmissionReviewQueueModal
        isOpen={showReviewQueueModal}
        onClose={() => setShowReviewQueueModal(false)}
      />

      {/* Embeddable Radar Widget Code Generator Modal */}
      <EmbedWidgetModal
        isOpen={showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
      />

      {/* 4D Temporal Playback Bar (Bottom Anchored) */}
      <div className="fixed bottom-0 left-0 right-0 z-[150]">
        <TemporalPlaybackBar
          onTimeChange={(hours) => setScrubHours(hours)}
        />
      </div>
    </motion.div>
  );
};

export default Dashboard;

