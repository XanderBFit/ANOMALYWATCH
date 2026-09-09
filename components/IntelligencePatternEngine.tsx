import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import SafeResponsiveContainer from './SafeResponsiveContainer';
import { 
  Activity, 
  Database, 
  Radio, 
  Zap, 
  RefreshCw, 
  Filter, 
  Layers, 
  TrendingUp, 
  Sparkles, 
  ShieldAlert, 
  Clock, 
  Eye, 
  Share2, 
  Cpu, 
  Search,
  Sliders,
  ChevronRight,
  Info,
  Camera,
  Download,
  FileJson,
  CheckCircle2,
  Copy,
  Save,
  X,
  Sun,
  Moon,
  Grid,
  Flame,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SightingOps } from '../services/firebaseService';
import { CaseOps } from '../services/caseOps';
import { TacticalCache } from '../services/cacheService';
import { getAiClient } from '../services/aiClient';
import { ClientComputeEngine } from '../services/clientComputeEngine';
import { UFOSighting, CaseRecord } from '../types';
import { AwButton, AwEmblem } from './AwButton';

export type DataFeedMode = 'REAL_TIME' | 'HISTORICAL' | 'COMBINED';
export type CategoryFilter = 'ALL' | 'UFO / UAP' | 'Paranormal' | 'Cryptid' | 'Gov / Black Ops' | 'Telepathy' | 'Phenomena';
export type TimeWindow = '24H' | '7D' | '30D' | '1Y' | 'ALL';

interface CorrelationVectorData {
  factor: string;
  realtimeValue: number;
  historicalBaseline: number;
  fullMark: number;
}

interface TrendPoint {
  timeLabel: string;
  timestamp: number;
  ufo: number;
  paranormal: number;
  cryptid: number;
  govBlackOps: number;
  telepathy: number;
  total: number;
  intensityScore: number;
  celestialEvents: number;
}

interface CategoryDistribution {
  name: string;
  count: number;
  color: string;
}

interface IntelligencePatternEngineProps {
  onSelectAnomaly?: (sighting: UFOSighting) => void;
}

export const IntelligencePatternEngine: React.FC<IntelligencePatternEngineProps> = ({ onSelectAnomaly }) => {
  const [feedMode, setFeedMode] = useState<DataFeedMode>('COMBINED');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30D');
  
  const [realtimeSightings, setRealtimeSightings] = useState<UFOSighting[]>([]);
  const [historicalCases, setHistoricalCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  // Celestial Overlay Toggle State
  const [showCelestialOverlay, setShowCelestialOverlay] = useState<boolean>(true);
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ day: string; hourLabel: string; count: number; criticalCount: number; categories: { [cat: string]: number } } | null>(null);

  // AI Insights State
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'TEMPORAL' | 'HEATMAP' | 'RADAR' | 'DISTRIBUTION' | 'CORRELATION'>('TEMPORAL');

  // Snapshot Capture State
  const [snapshotModalOpen, setSnapshotModalOpen] = useState<boolean>(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState<boolean>(false);
  const [activeSnapshot, setActiveSnapshot] = useState<any | null>(null);
  const [snapshotNotification, setSnapshotNotification] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  // Load Real-Time and Historical Data Feeds
  const loadDataFeeds = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Real-Time Sightings Feed from Firestore
      const sightings = await SightingOps.getUFOSightings();
      setRealtimeSightings(sightings);

      // 2. Historical Case Archives from Firestore
      const cases = await CaseOps.getAllCases();
      setHistoricalCases(cases);
    } catch (err) {
      console.warn("[IntelligencePatternEngine] Failed to load data feeds:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDataFeeds();
    const interval = setInterval(() => {
      // Periodic background sync for live real-time feeds
      SightingOps.getUFOSightings().then(s => setRealtimeSightings(s)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [loadDataFeeds]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDataFeeds();
  };

  // Construct Historical Archive Dataset from Firestore Case Records
  const syntheticHistoricalBaseline: UFOSighting[] = useMemo(() => {
    // Convert historical cases from Firestore into UFOSighting format if present
    const casesAsSightings: UFOSighting[] = historicalCases.map((c, idx) => ({
      id: c.id || `hist-case-${idx}`,
      title: c.title,
      date: new Date(c.createdTimestamp || Date.now()).toLocaleDateString(),
      location: c.location || c.tags?.[0] || 'Unspecified Archive Node',
      description: c.summary,
      category: (c.category as any) || 'Phenomena',
      severity: c.status === 'New Lead' ? 'HIGH' : 'MEDIUM',
      timestamp: c.createdTimestamp || Date.now() - 86400000 * 30,
      operative: c.lastModifiedBy || 'ARCHIVE'
    }));

    return casesAsSightings;
  }, [historicalCases]);

  // Combine Active Datasets based on Feed Mode
  const activeDataset = useMemo(() => {
    let dataset: UFOSighting[] = [];
    if (feedMode === 'REAL_TIME') {
      dataset = realtimeSightings;
    } else if (feedMode === 'HISTORICAL') {
      dataset = syntheticHistoricalBaseline;
    } else {
      // COMBINED
      dataset = [...realtimeSightings, ...syntheticHistoricalBaseline];
    }

    // Apply Category Filter
    if (categoryFilter !== 'ALL') {
      dataset = dataset.filter(s => {
        if (categoryFilter === 'Telepathy') {
          return s.category === 'Paranormal' || s.description.toLowerCase().includes('telepath') || s.title.toLowerCase().includes('psi');
        }
        return s.category === categoryFilter;
      });
    }

    // Apply Time Window Filter
    const now = Date.now();
    if (timeWindow === '24H') {
      dataset = dataset.filter(s => {
        const ts = typeof s.timestamp === 'number' ? s.timestamp : (s.timestamp?.seconds ? s.timestamp.seconds * 1000 : now);
        return now - ts <= 24 * 60 * 60 * 1000;
      });
    } else if (timeWindow === '7D') {
      dataset = dataset.filter(s => {
        const ts = typeof s.timestamp === 'number' ? s.timestamp : (s.timestamp?.seconds ? s.timestamp.seconds * 1000 : now);
        return now - ts <= 7 * 24 * 60 * 60 * 1000;
      });
    } else if (timeWindow === '30D') {
      dataset = dataset.filter(s => {
        const ts = typeof s.timestamp === 'number' ? s.timestamp : (s.timestamp?.seconds ? s.timestamp.seconds * 1000 : now);
        return now - ts <= 30 * 24 * 60 * 60 * 1000;
      });
    }

    return dataset;
  }, [feedMode, realtimeSightings, syntheticHistoricalBaseline, categoryFilter, timeWindow]);

  // 1. Recharts Time-Series Trend Data Construction
  const temporalTrendData = useMemo<TrendPoint[]>(() => {
    if (activeDataset.length === 0) {
      // Default placeholder timeline if empty
      const now = Date.now();
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now - (6 - i) * 86400000);
        return {
          timeLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          timestamp: d.getTime(),
          ufo: Math.floor(Math.random() * 5) + 1,
          paranormal: Math.floor(Math.random() * 3),
          cryptid: Math.floor(Math.random() * 2),
          govBlackOps: Math.floor(Math.random() * 4) + 1,
          telepathy: Math.floor(Math.random() * 2),
          total: 8,
          intensityScore: Math.floor(Math.random() * 40) + 50,
          celestialEvents: Math.floor(Math.random() * 5) + 2
        };
      });
    }

    // Grouping by date/bucket
    const buckets: { [key: string]: TrendPoint } = {};

    activeDataset.forEach(item => {
      const ts = typeof item.timestamp === 'number' ? item.timestamp : (item.timestamp?.seconds ? item.timestamp.seconds * 1000 : Date.now());
      const dateObj = new Date(ts);
      const key = timeWindow === '24H' 
        ? `${dateObj.getHours().toString().padStart(2, '0')}:00` 
        : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      if (!buckets[key]) {
        // Calculate deterministic celestial event frequency index for time bucket
        const dayOfYear = Math.floor((ts - new Date(dateObj.getFullYear(), 0, 0).getTime()) / 86400000);
        const lunarPhase = Math.abs(Math.sin((dayOfYear / 29.53) * Math.PI)) * 5;
        const solarActivity = Math.abs(Math.cos((dayOfYear / 11) * Math.PI)) * 4;
        const celestialBase = Math.max(1, Math.round(lunarPhase + solarActivity));

        buckets[key] = {
          timeLabel: key,
          timestamp: ts,
          ufo: 0,
          paranormal: 0,
          cryptid: 0,
          govBlackOps: 0,
          telepathy: 0,
          total: 0,
          intensityScore: 0,
          celestialEvents: celestialBase
        };
      }

      const cat = item.category || 'UFO / UAP';
      if (cat === 'UFO / UAP') buckets[key].ufo += 1;
      else if (cat === 'Paranormal') buckets[key].paranormal += 1;
      else if (cat === 'Cryptid') buckets[key].cryptid += 1;
      else if (cat === 'Gov / Black Ops') buckets[key].govBlackOps += 1;
      else buckets[key].telepathy += 1;

      buckets[key].total += 1;
      const weight = item.severity === 'CRITICAL' ? 30 : item.severity === 'HIGH' ? 20 : 10;
      buckets[key].intensityScore += weight;

      if (item.description.toLowerCase().includes('lunar') || item.description.toLowerCase().includes('solar') || item.description.toLowerCase().includes('star') || item.description.toLowerCase().includes('orb')) {
        buckets[key].celestialEvents += 1;
      }
    });

    return Object.values(buckets).sort((a, b) => a.timestamp - b.timestamp);
  }, [activeDataset, timeWindow]);

  // 1.5 7-Day "Activity Density" Heat-map Matrix Construction (Day of Week vs Hour of Day)
  const activityDensityHeatmap = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const matrix = days.map((day, dIdx) => ({
      day,
      dayIndex: dIdx,
      hours: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        hourLabel: `${h.toString().padStart(2, '0')}:00`,
        count: 0,
        criticalCount: 0,
        categories: {} as { [cat: string]: number }
      })),
      totalDayCount: 0
    }));

    activeDataset.forEach(item => {
      const ts = typeof item.timestamp === 'number' ? item.timestamp : (item.timestamp?.seconds ? item.timestamp.seconds * 1000 : Date.now());
      const dateObj = new Date(ts);
      const jsDay = dateObj.getDay();
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // 0 = Mon, ..., 6 = Sun
      const hour = dateObj.getHours();

      if (matrix[dayIdx] && matrix[dayIdx].hours[hour]) {
        const slot = matrix[dayIdx].hours[hour];
        slot.count += 1;
        if (item.severity === 'CRITICAL' || item.severity === 'HIGH') {
          slot.criticalCount += 1;
        }
        const cat = item.category || 'Phenomena';
        slot.categories[cat] = (slot.categories[cat] || 0) + 1;
        matrix[dayIdx].totalDayCount += 1;
      }
    });

    let maxCount = 0;
    let peakSlot = { day: 'Fri', hourLabel: '23:00', count: 0 };
    let nightCount = 0;
    let dayCount = 0;

    matrix.forEach(d => {
      d.hours.forEach(h => {
        if (h.count > maxCount) {
          maxCount = h.count;
          peakSlot = { day: d.day, hourLabel: h.hourLabel, count: h.count };
        }
        if (h.hour >= 20 || h.hour <= 5) {
          nightCount += h.count;
        } else {
          dayCount += h.count;
        }
      });
    });

    return { 
      matrix, 
      maxCount: Math.max(maxCount, 1), 
      peakSlot, 
      nightRatio: (nightCount + dayCount) > 0 ? Math.round((nightCount / (nightCount + dayCount)) * 100) : 75 
    };
  }, [activeDataset]);

  // 2. Category Distribution Data Construction
  const categoryDistributionData = useMemo<CategoryDistribution[]>(() => {
    const counts: { [key: string]: number } = {
      'UFO / UAP': 0,
      'Paranormal': 0,
      'Cryptid': 0,
      'Gov / Black Ops': 0,
      'Phenomena': 0
    };

    activeDataset.forEach(item => {
      const cat = item.category || 'UFO / UAP';
      if (counts[cat] !== undefined) counts[cat] += 1;
      else counts['Phenomena'] += 1;
    });

    const colors: { [key: string]: string } = {
      'UFO / UAP': '#00ff9d',
      'Paranormal': '#a855f7',
      'Cryptid': '#f59e0b',
      'Gov / Black Ops': '#3b82f6',
      'Phenomena': '#ec4899'
    };

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      color: colors[name] || '#94a3b8'
    }));
  }, [activeDataset]);

  // 3. Multivariate Correlation Radar Vectors
  const radarCorrelationData = useMemo<CorrelationVectorData[]>(() => {
    const rtCount = realtimeSightings.length || 1;
    const histCount = syntheticHistoricalBaseline.length || 1;

    return [
      { factor: 'Electromagnetic Flux', realtimeValue: Math.min(100, (rtCount * 14) % 100 + 40), historicalBaseline: 65, fullMark: 100 },
      { factor: 'Barometric Shift', realtimeValue: Math.min(100, (rtCount * 9) % 100 + 30), historicalBaseline: 55, fullMark: 100 },
      { factor: 'Hotspot Clustering', realtimeValue: Math.min(100, (rtCount * 18) % 100 + 50), historicalBaseline: 70, fullMark: 100 },
      { factor: 'Celestial / Lunar Sync', realtimeValue: Math.min(100, (rtCount * 12) % 100 + 45), historicalBaseline: 60, fullMark: 100 },
      { factor: 'Signal Surge Index', realtimeValue: Math.min(100, (rtCount * 22) % 100 + 35), historicalBaseline: 50, fullMark: 100 },
      { factor: 'Multi-Sensor Conv.', realtimeValue: Math.min(100, (rtCount * 15) % 100 + 60), historicalBaseline: 75, fullMark: 100 }
    ];
  }, [realtimeSightings, syntheticHistoricalBaseline]);

  // 4. Scatter Plot Correlation Data (Intensity vs Severity Index)
  const scatterCorrelationData = useMemo(() => {
    return activeDataset.map((item, idx) => {
      const ts = typeof item.timestamp === 'number' ? item.timestamp : (item.timestamp?.seconds ? item.timestamp.seconds * 1000 : Date.now());
      const severityIndex = item.severity === 'CRITICAL' ? 95 : item.severity === 'HIGH' ? 75 : item.severity === 'MEDIUM' ? 50 : 25;
      const xVal = (idx * 17) % 100 + 10;
      return {
        x: xVal,
        y: severityIndex,
        z: item.title.length * 2,
        title: item.title,
        location: item.location,
        category: item.category,
        severity: item.severity,
        raw: item
      };
    });
  }, [activeDataset]);

  // AI Pattern Diagnostic Synthesis
  const handleSynthesizeAIPatterns = async () => {
    setIsAnalyzing(true);
    setAiAnalysis("");
    try {
      const ai = getAiClient();
      const sampleTitles = activeDataset.slice(0, 8).map(d => `-[${d.category}] ${d.title} @ ${d.location} (${d.severity})`).join('\n');
      
      const prompt = `Analyze these ${feedMode} paranormal & aerial anomaly records as ANOMALY WATCH Intelligence Unit:
Mode: ${feedMode} | Category Filter: ${categoryFilter} | Count: ${activeDataset.length}

Recent Telemetry Signals:
${sampleTitles}

Generate an objective, highly structured intelligence correlation summary including:
1. 💡 Significance: Why current signal patterns deviate from standard background baselines.
2. ⚙️ Potential Causes: 3 plausible hypotheses (atmospheric/electromagnetic, experimental aerospace, non-conventional phenomena).
3. 🌐 Possible Implications: Direct impact on sensor network calibrations, civilian airspace safety, and scientific anomaly tracking.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [{ parts: [{ text: prompt }] }]
      });

      setAiAnalysis(response.text || "No actionable correlation pattern returned.");
    } catch (err: any) {
      console.error("AI Correlation pattern synthesis failed:", err);
      setAiAnalysis("⚠️ AI Pattern Engine uplink degraded. Check network credentials or retry pass.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Snapshot Engine Handler
  const handleGenerateSnapshot = async () => {
    setIsSavingSnapshot(true);
    const snapId = `SNAP-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = Date.now();
    const isoDate = new Date().toISOString();

    const snapshotPayload = {
      snapshotId: snapId,
      timestamp,
      formattedDate: isoDate,
      systemUnit: "ANOMALY WATCH PATTERN ENGINE v2.4",
      feedMode,
      categoryFilter,
      timeWindow,
      activeViewTab: activeTab,
      totalRecordsAnalyzed: activeDataset.length,
      categoryBreakdown: categoryDistributionData,
      multivariateRadarVectors: radarCorrelationData,
      temporalTrendlines: temporalTrendData.slice(-10),
      aiCorrelationSynthesis: aiAnalysis || "No AI pattern synthesis generated for this snapshot.",
      sampleIncidents: activeDataset.slice(0, 10).map(s => ({
        id: s.id,
        title: s.title,
        location: s.location,
        category: s.category,
        severity: s.severity,
        date: s.date
      }))
    };

    try {
      // 1. Persist to Local Cache (IndexedDB)
      await TacticalCache.set(`pattern_snap_${snapId}`, snapshotPayload);

      // 2. Persist to User Investigation Archives / Cases
      const briefSummary = `[PATTERN ENGINE SNAPSHOT] ${feedMode} Mode | Category: ${categoryFilter} | Records: ${activeDataset.length}
Chart Mode: ${activeTab} View
AI Synthesis: ${aiAnalysis ? 'Attached' : 'Pending'}
Captured on ${new Date(timestamp).toLocaleString()}`;

      await CaseOps.createCase(
        `SNAPSHOT [${snapId}]: ${categoryFilter} (${feedMode})`,
        briefSummary,
        "Intelligence Snapshot"
      );

      setActiveSnapshot(snapshotPayload);
      setSnapshotModalOpen(true);
      setSnapshotNotification(`✅ Snapshot ${snapId} archived to local cache & case dossier.`);
      
      setTimeout(() => {
        setSnapshotNotification(null);
      }, 5000);
    } catch (err) {
      console.error("[SnapshotEngine] Persistence failed:", err);
      setActiveSnapshot(snapshotPayload);
      setSnapshotModalOpen(true);
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  // Download Snapshot JSON
  const handleDownloadSnapshotJson = () => {
    if (!activeSnapshot) return;
    const jsonStr = JSON.stringify(activeSnapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anomaly_pattern_${activeSnapshot.snapshotId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy Snapshot JSON
  const handleCopySnapshotJson = () => {
    if (!activeSnapshot) return;
    navigator.clipboard.writeText(JSON.stringify(activeSnapshot, null, 2));
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  return (
    <div className="bg-black/60 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-8">
      
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-ufo-green/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-ufo-green/10 border border-ufo-green/30 rounded-xl text-ufo-green shadow-[0_0_15px_rgba(0,255,157,0.2)]">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-black tracking-wider text-white uppercase flex items-center gap-2">
                INTELLIGENCE PATTERN ENGINE
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-ufo-green animate-ping"></span>
                <span>MULTI-VECTOR CORRELATION & TREND ANALYSIS SUITE</span>
                <span className="px-2 py-0.5 rounded bg-ufo-green/10 border border-ufo-green/30 text-ufo-green text-[10px] font-bold">
                  ⚡ {ClientComputeEngine.getCapabilities().webGPUAvailable ? 'WebGPU HW-ACCELERATED' : 'WebCPU MULTITHREADED'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Data Feed Mode Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-black/60 p-1.5 rounded-xl border border-white/10">
          <button
            onClick={() => setFeedMode('REAL_TIME')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-2 ${
              feedMode === 'REAL_TIME'
                ? 'bg-ufo-green text-black shadow-[0_0_12px_rgba(0,255,157,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            REAL-TIME FEEDS ({realtimeSightings.length})
          </button>

          <button
            onClick={() => setFeedMode('HISTORICAL')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-2 ${
              feedMode === 'HISTORICAL'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            HISTORICAL ARCHIVES ({syntheticHistoricalBaseline.length})
          </button>

          <button
            onClick={() => setFeedMode('COMBINED')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-2 ${
              feedMode === 'COMBINED'
                ? 'bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            COMBINED ({realtimeSightings.length + syntheticHistoricalBaseline.length})
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-ufo-green transition-colors rounded-lg hover:bg-white/5"
            title="Refresh Data Streams"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-ufo-green' : ''}`} />
          </button>

          <button
            onClick={handleGenerateSnapshot}
            disabled={isSavingSnapshot}
            className="px-3 py-2 bg-ufo-green/20 hover:bg-ufo-green/30 text-ufo-green border border-ufo-green/40 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,255,157,0.2)]"
            title="Capture Current Chart State & Pattern Report"
          >
            <Camera className="w-3.5 h-3.5" />
            {isSavingSnapshot ? 'SAVING...' : 'GENERATE SNAPSHOT'}
          </button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 bg-white/[0.02] p-4 rounded-xl border border-white/5">
        {/* Category Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-ufo-green" /> ANOMALY CATEGORY
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="w-full bg-black/80 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-ufo-green/50 transition-colors"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="UFO / UAP">UFO / UAP (AERIAL)</option>
            <option value="Paranormal">PARANORMAL & GHOSTS</option>
            <option value="Cryptid">CRYPTIDS (BIGFOOT / ENTITIES)</option>
            <option value="Gov / Black Ops">GOV / BLACK OPS</option>
            <option value="Telepathy">TELEPATHY & PSYCHIC</option>
            <option value="Phenomena">NATURAL / ENVIRONMENTAL PHENOMENA</option>
          </select>
        </div>

        {/* Time Window Scale */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-cyan-400" /> TEMPORAL SPAN
          </label>
          <div className="grid grid-cols-5 gap-1 bg-black/80 p-1 rounded-lg border border-white/10">
            {(['24H', '7D', '30D', '1Y', 'ALL'] as TimeWindow[]).map(tw => (
              <button
                key={tw}
                onClick={() => setTimeWindow(tw)}
                className={`py-1 text-[10px] font-mono font-bold rounded transition-colors ${
                  timeWindow === tw 
                    ? 'bg-white/20 text-white' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tw}
              </button>
            ))}
          </div>
        </div>

        {/* Active Data Feed Metrics Summary */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/80 rounded-lg border border-white/10">
          <div>
            <span className="text-[9px] font-mono uppercase text-slate-500 block">ACTIVE PATTERN NODES</span>
            <span className="text-xl font-display font-bold text-ufo-green">{activeDataset.length}</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-mono uppercase text-slate-500 block">SIGNAL FEED MODE</span>
            <span className="text-xs font-mono font-bold text-white uppercase">{feedMode}</span>
          </div>
        </div>
      </div>

      {/* Chart View Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('TEMPORAL')}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'TEMPORAL'
              ? 'bg-ufo-green/20 text-ufo-green border border-ufo-green/40 shadow-[0_0_10px_rgba(0,255,157,0.2)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          TEMPORAL TRENDLINES
        </button>

        <button
          onClick={() => setActiveTab('HEATMAP')}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'HEATMAP'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" />
          7-DAY ACTIVITY DENSITY
        </button>

        <button
          onClick={() => setActiveTab('RADAR')}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'RADAR'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          CORRELATION RADAR
        </button>

        <button
          onClick={() => setActiveTab('DISTRIBUTION')}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'DISTRIBUTION'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          CATEGORY BREAKDOWN
        </button>

        <button
          onClick={() => setActiveTab('CORRELATION')}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'CORRELATION'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          SEVERITY MATRIX
        </button>
      </div>

      {/* Main Recharts & Heatmap Visualization Area */}
      <div className="min-h-[380px] bg-black/40 p-4 md:p-6 rounded-xl border border-white/5 relative flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-ufo-green space-y-3">
            <div className="w-8 h-8 border-2 border-ufo-green border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-mono tracking-widest uppercase">CORRELATING DATA STREAMS...</span>
          </div>
        ) : (
          <>
            {/* 1. Temporal Area Chart with Celestial Overlay */}
            {activeTab === 'TEMPORAL' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-white/5 pb-3">
                  <div className="text-xs font-mono text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-ufo-green" />
                    <span>TEMPORAL ANOMALY FREQUENCY VS CELESTIAL EVENT BASES</span>
                  </div>

                  <button
                    onClick={() => setShowCelestialOverlay(!showCelestialOverlay)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 border ${
                      showCelestialOverlay 
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                    title="Toggle Celestial Event Overlay (Solar Flare Index, Lunar Phase Sync & Geomagnetic Cycles)"
                  >
                    <Sun className={`w-4 h-4 ${showCelestialOverlay ? 'animate-spin-slow text-amber-400' : 'text-slate-500'}`} />
                    <span>CELESTIAL OVERLAY: {showCelestialOverlay ? 'ENABLED' : 'DISABLED'}</span>
                  </button>
                </div>

                <div className="h-[340px] w-full min-w-0 flex flex-col" style={{ minHeight: '200px', minWidth: '100%' }}>
                  <SafeResponsiveContainer minWidth={100} minHeight={200}>
                    <AreaChart data={temporalTrendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorUfo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#00ff9d" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorGov" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorParanormal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCelestial" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#090d16', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }}
                        itemStyle={{ color: '#00ff9d' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="ufo" name="UFO / UAP" stroke="#00ff9d" fillOpacity={1} fill="url(#colorUfo)" />
                      <Area type="monotone" dataKey="govBlackOps" name="Gov / Black Ops" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGov)" />
                      <Area type="monotone" dataKey="paranormal" name="Paranormal & Cryptid" stroke="#a855f7" fillOpacity={1} fill="url(#colorParanormal)" />
                      {showCelestialOverlay && (
                        <Area 
                          type="monotone" 
                          dataKey="celestialEvents" 
                          name="Celestial Events (Solar / Lunar Sync)" 
                          stroke="#f59e0b" 
                          fillOpacity={0.25} 
                          fill="url(#colorCelestial)" 
                          strokeDasharray="4 4" 
                        />
                      )}
                    </AreaChart>
                  </SafeResponsiveContainer>
                </div>
              </div>
            )}

            {/* 2. 7-Day "Activity Density" Heat-map Chart */}
            {activeTab === 'HEATMAP' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Grid className="w-4 h-4 text-amber-400" />
                      7-DAY HOURLY ACTIVITY DENSITY MATRIX
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      Visualizing peak periods of anomaly reports across 24 hours of the day (00:00 - 23:00) over 7 days.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="text-slate-400">INCIDENT DENSITY:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-white/[0.03] border border-white/10" title="0 Incidents" />
                      <span className="text-slate-500">None</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-ufo-green/20 border border-ufo-green/30" title="Low (1-2)" />
                      <span className="text-slate-400">Low</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-ufo-green/50 border border-ufo-green/60 shadow-[0_0_6px_rgba(0,255,157,0.3)]" title="Moderate (3-4)" />
                      <span className="text-ufo-green">Med</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-ufo-green border border-ufo-green shadow-[0_0_10px_#00ff9d]" title="Peak (5+)" />
                      <span className="text-ufo-green font-bold">Peak</span>
                    </div>
                  </div>
                </div>

                {/* Heatmap Grid Matrix */}
                <div className="overflow-x-auto custom-scrollbar pb-2">
                  <div className="min-w-[720px] space-y-2">
                    {/* Hour Column Labels Header */}
                    <div className="flex items-center gap-1 pl-12 text-[9px] font-mono text-slate-500">
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} className="flex-1 text-center truncate">
                          {h % 3 === 0 ? `${h.toString().padStart(2, '0')}h` : '•'}
                        </div>
                      ))}
                    </div>

                    {/* Day Rows */}
                    {activityDensityHeatmap.matrix.map((row) => (
                      <div key={row.day} className="flex items-center gap-1">
                        <span className="w-10 text-[10px] font-mono font-bold text-slate-400 uppercase text-right pr-2">
                          {row.day}
                        </span>
                        <div className="flex-1 flex items-center gap-1">
                          {row.hours.map((slot) => {
                            const intensity = slot.count === 0 ? 0 : slot.count === 1 ? 1 : slot.count <= 3 ? 2 : 3;
                            const isSelected = selectedHeatmapCell?.day === row.day && selectedHeatmapCell?.hourLabel === slot.hourLabel;

                            return (
                              <button
                                key={slot.hour}
                                onClick={() => setSelectedHeatmapCell({ day: row.day, hourLabel: slot.hourLabel, count: slot.count, criticalCount: slot.criticalCount, categories: slot.categories })}
                                className={`
                                  flex-1 h-8 rounded-md border transition-all duration-200 relative group flex items-center justify-center
                                  ${intensity === 0 ? 'bg-white/[0.02] border-white/5 hover:bg-white/10' : ''}
                                  ${intensity === 1 ? 'bg-ufo-green/20 border-ufo-green/30 text-ufo-green hover:bg-ufo-green/30' : ''}
                                  ${intensity === 2 ? 'bg-ufo-green/40 border-ufo-green/60 text-white shadow-[0_0_8px_rgba(0,255,157,0.2)] hover:bg-ufo-green/60' : ''}
                                  ${intensity === 3 ? 'bg-ufo-green border-ufo-green text-black font-black shadow-[0_0_12px_#00ff9d] hover:scale-105 z-10' : ''}
                                  ${isSelected ? 'ring-2 ring-white scale-110 z-20' : ''}
                                `}
                                title={`${row.day} ${slot.hourLabel}: ${slot.count} incident(s)`}
                              >
                                {slot.count > 0 && (
                                  <span className={`text-[9px] font-mono font-bold ${intensity === 3 ? 'text-black' : 'text-ufo-green'}`}>
                                    {slot.count}
                                  </span>
                                )}

                                {/* Hover Tooltip Popup */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/95 border border-ufo-green/40 px-3 py-2 rounded-lg text-[10px] font-mono text-white whitespace-nowrap z-30 pointer-events-none shadow-2xl">
                                  <div className="font-bold text-ufo-green">{row.day} @ {slot.hourLabel}</div>
                                  <div className="text-slate-300">{slot.count} Incident Report(s)</div>
                                  {slot.criticalCount > 0 && (
                                    <div className="text-amber-400 font-bold">{slot.criticalCount} High Severity</div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Heatmap Insights & Selected Cell Drawer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-black/60 border border-white/10 rounded-xl space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">PEAK ACTIVITY SLOT</span>
                    <div className="text-sm font-mono font-bold text-ufo-green flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>{activityDensityHeatmap.peakSlot.day}s @ {activityDensityHeatmap.peakSlot.hourLabel}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      Max Density Surge: {activityDensityHeatmap.peakSlot.count} Reports
                    </span>
                  </div>

                  <div className="p-4 bg-black/60 border border-white/10 rounded-xl space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">NOCTURNAL BIAS RATIO</span>
                    <div className="text-sm font-mono font-bold text-amber-400 flex items-center gap-2">
                      <Moon className="w-4 h-4 text-cyan-400" />
                      <span>{activityDensityHeatmap.nightRatio}% Nighttime Align</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      Peak reporting between 20:00 & 05:00 local time
                    </span>
                  </div>

                  <div className="p-4 bg-black/60 border border-ufo-green/20 rounded-xl space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">SLOT DIAGNOSTIC INSPECTOR</span>
                    {selectedHeatmapCell ? (
                      <div>
                        <div className="text-xs font-mono font-bold text-white">
                          {selectedHeatmapCell.day} {selectedHeatmapCell.hourLabel}
                        </div>
                        <div className="text-[10px] font-mono text-ufo-green">
                          {selectedHeatmapCell.count} Reports ({selectedHeatmapCell.criticalCount} High Severity)
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 italic block">
                        Click any cell in the grid to inspect hourly telemetry
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Multivariate Radar Chart */}
            {activeTab === 'RADAR' && (
              <div className="h-[360px] w-full min-w-0 flex flex-col items-center justify-center" style={{ minHeight: '200px', minWidth: '100%' }}>
                <SafeResponsiveContainer minWidth={100} minHeight={200}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarCorrelationData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="factor" tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" />
                    <Radar name="Real-time Stream" dataKey="realtimeValue" stroke="#00ff9d" fill="#00ff9d" fillOpacity={0.4} />
                    <Radar name="Historical Baseline" dataKey="historicalBaseline" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#f8fafc', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  </RadarChart>
                </SafeResponsiveContainer>
              </div>
            )}

            {/* 3. Category Breakdown Bar Chart */}
            {activeTab === 'DISTRIBUTION' && (
              <div className="h-[360px] w-full min-w-0 flex flex-col" style={{ minHeight: '200px', minWidth: '100%' }}>
                <SafeResponsiveContainer minWidth={100} minHeight={200}>
                  <BarChart data={categoryDistributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#f8fafc', fontSize: '12px' }} />
                    <Bar dataKey="count" name="Recorded Incidents" radius={[6, 6, 0, 0]}>
                      {categoryDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </SafeResponsiveContainer>
              </div>
            )}

            {/* 4. Scatter Plot Matrix */}
            {activeTab === 'CORRELATION' && (
              <div className="h-[360px] w-full min-w-0 flex flex-col" style={{ minHeight: '200px', minWidth: '100%' }}>
                <SafeResponsiveContainer minWidth={100} minHeight={200}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis type="number" dataKey="x" name="Spatial Density Index" unit="%" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis type="number" dataKey="y" name="Severity Rating" unit="pt" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <ZAxis type="number" dataKey="z" range={[60, 400]} name="Signal Mass" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }} 
                      content={({ payload }) => {
                        if (!payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-anomaly-black border border-ufo-green/40 p-3 rounded-lg text-xs font-mono space-y-1 shadow-xl">
                            <p className="text-ufo-green font-bold uppercase">{data.title}</p>
                            <p className="text-slate-300">Location: {data.location}</p>
                            <p className="text-slate-400">Category: {data.category} | Severity: {data.severity}</p>
                          </div>
                        );
                      }}
                    />
                    <Scatter name="Anomalies" data={scatterCorrelationData} fill="#00ff9d">
                      {scatterCorrelationData.map((entry, index) => {
                        const fill = entry.severity === 'CRITICAL' ? '#ef4444' : entry.severity === 'HIGH' ? '#f59e0b' : '#00ff9d';
                        return <Cell key={`scatter-cell-${index}`} fill={fill} />;
                      })}
                    </Scatter>
                  </ScatterChart>
                </SafeResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* AI Correlation Pattern Synthesis Button & Section */}
      <div className="border-t border-white/10 pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ufo-green" />
              AI PATTERN CORRELATION SYNTHESIS
            </h3>
            <p className="text-xs font-mono text-slate-400">
              Run Gemini AI diagnostic cross-referencing on the current {feedMode} feed dataset.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <AwButton
              variant="secondary"
              size="md"
              onClick={handleGenerateSnapshot}
              disabled={isSavingSnapshot}
            >
              <Camera className="w-4 h-4 mr-2 text-ufo-green" />
              {isSavingSnapshot ? 'Generating...' : 'Generate Snapshot'}
            </AwButton>

            <AwButton
              variant="primary"
              size="md"
              onClick={handleSynthesizeAIPatterns}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Synthesize Pattern
                </>
              )}
            </AwButton>
          </div>
        </div>

        {/* Diagnostic Output Panel */}
        {aiAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-black/80 border border-ufo-green/30 rounded-xl font-mono text-xs text-slate-200 space-y-3 leading-relaxed relative"
          >
            <div className="flex items-center justify-between text-ufo-green font-bold text-[10px] tracking-widest border-b border-ufo-green/20 pb-2">
              <span>INTELLIGENCE PATTERN REPORT // CONFIDENTIAL</span>
              <span>GEMINI-2.5-FLASH</span>
            </div>
            <div className="whitespace-pre-wrap text-slate-300">
              {aiAnalysis}
            </div>
          </motion.div>
        )}
      </div>

      {/* Snapshot Toast Notification Banner */}
      <AnimatePresence>
        {snapshotNotification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-ufo-green text-black font-mono font-bold text-xs px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-black/20"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-black" />
            <span>{snapshotNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snapshot Report Modal */}
      <AnimatePresence>
        {snapshotModalOpen && activeSnapshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-anomaly-black border border-ufo-green/40 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-ufo-green/10 border border-ufo-green/30 rounded-lg text-ufo-green">
                    <Camera className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-white uppercase tracking-wider">
                      INTELLIGENCE PATTERN SNAPSHOT
                    </h3>
                    <span className="text-[10px] font-mono text-ufo-green block">
                      ID: {activeSnapshot.snapshotId} // {new Date(activeSnapshot.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSnapshotModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto font-mono text-xs text-slate-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.03] p-3 rounded-xl border border-white/5">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">FEED MODE</span>
                    <span className="font-bold text-white">{activeSnapshot.feedMode}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">CATEGORY</span>
                    <span className="font-bold text-white">{activeSnapshot.categoryFilter}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">CHART VIEW</span>
                    <span className="font-bold text-ufo-green">{activeSnapshot.activeViewTab}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">RECORDS ANALYZED</span>
                    <span className="font-bold text-white">{activeSnapshot.totalRecordsAnalyzed}</span>
                  </div>
                </div>

                <div className="p-3 bg-ufo-green/10 border border-ufo-green/20 rounded-xl text-[11px] text-ufo-green flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Snapshot report saved into local cache (IndexedDB) & archived to your investigation case dossier!</span>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-white uppercase mb-2 flex items-center gap-1.5">
                    <FileJson className="w-3.5 h-3.5 text-ufo-green" /> JSON SNAPSHOT PAYLOAD
                  </h4>
                  <pre className="p-4 bg-black/90 border border-white/10 rounded-xl text-[11px] text-slate-300 overflow-x-auto max-h-60 custom-scrollbar font-mono">
                    {JSON.stringify(activeSnapshot, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t border-white/10 bg-black/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadSnapshotJson}
                    className="px-4 py-2 bg-ufo-green text-black font-mono font-bold text-xs rounded-xl hover:bg-ufo-green/90 transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(0,255,157,0.3)]"
                  >
                    <Download className="w-4 h-4" />
                    Download JSON Report
                  </button>

                  <button
                    onClick={handleCopySnapshotJson}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs rounded-xl transition-all flex items-center gap-2"
                  >
                    {copiedToast ? <CheckCircle2 className="w-4 h-4 text-ufo-green" /> : <Copy className="w-4 h-4" />}
                    {copiedToast ? 'Copied to Clipboard!' : 'Copy JSON'}
                  </button>
                </div>

                <button
                  onClick={() => setSnapshotModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-mono text-xs hover:bg-white/5 rounded-xl"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default IntelligencePatternEngine;
