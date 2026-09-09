import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Activity, 
  Calendar, 
  Layers, 
  AlertTriangle, 
  Zap, 
  Sparkles, 
  Flame, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  ArrowUpRight, 
  Download, 
  Filter, 
  Search, 
  BarChart3, 
  PieChart as PieIcon, 
  Compass, 
  Eye, 
  CheckCircle,
  Atom,
  Users,
  Globe2,
  Palette
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend, 
  ScatterChart, 
  Scatter, 
  ZAxis, 
  Cell 
} from 'recharts';
import { UFOSighting, RecurringPattern, EmergingAnomalyPattern } from '../types';
import { calculateAnomalyTrendAnalysis, normalizeAnomalyCategory } from '../services/anomalyService';

interface AnomalyTrendAnalysisProps {
  sightings: UFOSighting[];
  onSelectAnomaly?: (sighting: UFOSighting) => void;
}

export const AnomalyTrendAnalysis: React.FC<AnomalyTrendAnalysisProps> = ({
  sightings,
  onSelectAnomaly
}) => {
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30);
  const [selectedPattern, setSelectedPattern] = useState<RecurringPattern | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PATTERNS' | 'EMERGING' | 'HISTORICAL'>('OVERVIEW');

  // Compute trend data
  const trendData = useMemo(() => {
    return calculateAnomalyTrendAnalysis(sightings, timeRangeDays);
  }, [sightings, timeRangeDays]);

  // Filtered historical records for table
  const filteredHistory = useMemo(() => {
    return sightings.filter(s => {
      const cat = normalizeAnomalyCategory(s.category);
      const matchesCat = selectedCategoryFilter === 'ALL' || cat === selectedCategoryFilter;
      const q = tableSearch.toLowerCase();
      const matchesSearch = !q || 
        s.title.toLowerCase().includes(q) || 
        (s.location && s.location.toLowerCase().includes(q)) || 
        s.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [sightings, selectedCategoryFilter, tableSearch]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Category', 'Severity', 'Date', 'Location', 'Description'];
    const rows = filteredHistory.map(s => [
      `"${s.id || ''}"`,
      `"${s.title.replace(/"/g, '""')}"`,
      `"${s.category || ''}"`,
      `"${s.severity || ''}"`,
      `"${s.date || ''}"`,
      `"${s.location || ''}"`,
      `"${s.description.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `anomaly_historical_trends_${timeRangeDays}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 text-left">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 bg-slate-950/80 border border-white/10 rounded-3xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <TrendingUp className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-[0.25em]">
                HISTORICAL TELEMETRY & PREDICTIVE ANALYTICS
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-ufo-green/10 text-ufo-green border border-ufo-green/20">
                ACTIVE RADAR
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-wider">
              Anomaly Trend Analysis Engine
            </h2>
          </div>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-2xl border border-white/10 self-stretch sm:self-auto overflow-x-auto">
          {[
            { label: '24 Hours', days: 1 },
            { label: '7 Days', days: 7 },
            { label: '30 Days', days: 30 },
            { label: '90 Days', days: 90 },
            { label: 'All-Time', days: 365 }
          ].map(tf => (
            <button
              key={tf.days}
              onClick={() => setTimeRangeDays(tf.days)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                timeRangeDays === tf.days
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-950/80 border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>HISTORICAL VOLUME</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl md:text-3xl font-display font-black text-white">
            {trendData.summaryStats.totalAnomalies}
          </div>
          <div className="text-[10px] font-mono text-cyan-400 mt-1 flex items-center gap-1">
            <span>+{Math.round(trendData.summaryStats.totalAnomalies * 0.22)}% vs prior baseline</span>
          </div>
        </div>

        <div className="p-5 bg-slate-950/80 border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>ACTIVE SURGE SPIKES</span>
            <Flame className="w-4 h-4 text-ufo-green animate-pulse" />
          </div>
          <div className="text-2xl md:text-3xl font-display font-black text-ufo-green">
            {trendData.summaryStats.activeSpikes}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Across 4 observational sectors
          </div>
        </div>

        <div className="p-5 bg-slate-950/80 border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>DOMINANT CLASSIFICATION</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl md:text-2xl font-display font-black text-white truncate">
            {trendData.summaryStats.dominantCategory}
          </div>
          <div className="text-[10px] font-mono text-amber-400 mt-1">
            Leading activity domain
          </div>
        </div>

        <div className="p-5 bg-slate-950/80 border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>AVG SIGNAL CONFIDENCE</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl md:text-3xl font-display font-black text-purple-400">
            {trendData.summaryStats.avgConfidence}%
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Sensor telemetry correlation
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'OVERVIEW', label: 'Timeline & Distribution Charts', icon: BarChart3 },
          { id: 'PATTERNS', label: `Recurring Patterns (${trendData.recurringPatterns.length})`, icon: Compass },
          { id: 'EMERGING', label: `Emerging Anomaly Radar (${trendData.emergingAnomalies.length})`, icon: Zap },
          { id: 'HISTORICAL', label: `Historical Archive (${filteredHistory.length})`, icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                isSelected
                  ? 'bg-ufo-green/10 border-ufo-green/40 text-ufo-green shadow-[0_0_15px_rgba(0,255,157,0.15)]'
                  : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CHARTS & OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Main Temporal Frequency Chart */}
          <div className="p-6 md:p-8 bg-slate-950/90 border border-white/10 rounded-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Temporal Occurrence Timeline ({timeRangeDays}d Window)
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Daily frequency trajectory across Scientific, Economic, Social, Geopolitical & Cultural categories.
                </p>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-ufo-green"><span className="w-2 h-2 rounded-full bg-[#00ff9d]" /> Scientific</span>
                <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Economic</span>
                <span className="flex items-center gap-1 text-pink-400"><span className="w-2 h-2 rounded-full bg-[#f472b6]" /> Social</span>
                <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Geopolitical</span>
                <span className="flex items-center gap-1 text-purple-400"><span className="w-2 h-2 rounded-full bg-[#a855f7]" /> Cultural</span>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScientific" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00ff9d" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorEconomic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorGeopolitical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="dateStr" 
                    stroke="#64748b" 
                    fontSize={10} 
                    fontFamily="monospace"
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    fontFamily="monospace"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#020617', 
                      borderColor: 'rgba(255,255,255,0.1)', 
                      borderRadius: '16px',
                      fontFamily: 'monospace',
                      fontSize: '11px'
                    }} 
                  />
                  <Area type="monotone" dataKey="total" stroke="#00ff9d" strokeWidth={2} fillOpacity={1} fill="url(#colorScientific)" name="Total Anomalies" />
                  <Area type="monotone" dataKey="Scientific" stroke="#00ff9d" strokeDasharray="3 3" strokeWidth={1.5} fillOpacity={0} name="Scientific" />
                  <Area type="monotone" dataKey="Economic" stroke="#38bdf8" strokeWidth={1.5} fillOpacity={0} name="Economic" />
                  <Area type="monotone" dataKey="Social" stroke="#f472b6" strokeWidth={1.5} fillOpacity={0} name="Social" />
                  <Area type="monotone" dataKey="Geopolitical" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={0} name="Geopolitical" />
                  <Area type="monotone" dataKey="Cultural" stroke="#a855f7" strokeWidth={1.5} fillOpacity={0} name="Cultural" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Grid: Category Breakdown & Impact Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Bar Chart */}
            <div className="p-6 md:p-7 bg-slate-950/90 border border-white/10 rounded-3xl space-y-4">
              <div>
                <h3 className="text-base font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-ufo-green" />
                  Anomaly Volume by Category
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Aggregate distribution across core anomaly domains.
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData.categoryDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} fontFamily="monospace" />
                    <YAxis stroke="#64748b" fontSize={9} fontFamily="monospace" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#020617', 
                        borderColor: 'rgba(255,255,255,0.1)', 
                        borderRadius: '12px',
                        fontFamily: 'monospace',
                        fontSize: '11px'
                      }} 
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {trendData.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Progress Rows */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                {trendData.categoryDistribution.map(cat => (
                  <div key={cat.name} className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="text-slate-400 font-bold">{cat.count} ({cat.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact vs Frequency Hotspot Scatter/Matrix */}
            <div className="p-6 md:p-7 bg-slate-950/90 border border-white/10 rounded-3xl space-y-4">
              <div>
                <h3 className="text-base font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  Frequency vs Impact Matrix
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  X: Occurrence Frequency • Y: Impact Score (0-100) • Size: Signal Confidence
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      type="number" 
                      dataKey="frequency" 
                      name="Frequency" 
                      unit=" events" 
                      stroke="#64748b" 
                      fontSize={9} 
                      fontFamily="monospace"
                    />
                    <YAxis 
                      type="number" 
                      dataKey="impactScore" 
                      name="Impact Score" 
                      stroke="#64748b" 
                      fontSize={9} 
                      fontFamily="monospace"
                    />
                    <ZAxis type="number" dataKey="confidence" range={[60, 300]} name="Confidence" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }} 
                      contentStyle={{ 
                        backgroundColor: '#020617', 
                        borderColor: 'rgba(255,255,255,0.1)', 
                        borderRadius: '12px',
                        fontFamily: 'monospace',
                        fontSize: '11px'
                      }} 
                    />
                    <Scatter name="Anomalies" data={trendData.impactMatrix} fill="#00ff9d">
                      {trendData.impactMatrix.map((entry, index) => {
                        const color = entry.severity === 'CRITICAL' ? '#ef4444' :
                                      entry.severity === 'HIGH' ? '#f59e0b' : '#00d0ff';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-white/5">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical Hotspots</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> High Velocity</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Medium Activity</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECURRING PATTERNS */}
      {activeTab === 'PATTERNS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trendData.recurringPatterns.map((pat) => (
              <motion.div
                key={pat.id}
                onClick={() => setSelectedPattern(pat)}
                whileHover={{ scale: 1.01 }}
                className="p-6 bg-slate-950/90 border border-white/10 hover:border-ufo-green/40 rounded-3xl cursor-pointer transition-all space-y-4 group relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-xl text-[9px] font-mono font-bold bg-ufo-green/10 text-ufo-green border border-ufo-green/30">
                    {pat.patternType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {pat.confidence}% MATCH CONFIDENCE
                  </span>
                </div>

                <div>
                  <h4 className="text-base md:text-lg font-display font-black text-white uppercase tracking-wider group-hover:text-ufo-green transition-colors">
                    {pat.name}
                  </h4>
                  <span className="text-xs font-mono text-slate-400 block mt-1">
                    Cadence: <span className="text-white font-bold">{pat.cadence}</span>
                  </span>
                </div>

                <p className="text-xs font-mono text-slate-300 leading-relaxed italic bg-black/40 p-3.5 rounded-2xl border border-white/5">
                  "{pat.description}"
                </p>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="p-2.5 bg-white/5 rounded-xl">
                    <span className="text-slate-500 block">FREQUENCY</span>
                    <span className="text-white font-bold">{pat.frequency} recorded events</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-xl">
                    <span className="text-slate-500 block">IMPACT RATING</span>
                    <span className="text-ufo-green font-bold">{pat.avgImpactScore}/100</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Sectors: {pat.locations.slice(0, 2).join(', ')}</span>
                  <span className="text-ufo-green group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold">
                    Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Selected Pattern Modal */}
          <AnimatePresence>
            {selectedPattern && (
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-2xl bg-slate-950 border border-ufo-green/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div>
                      <span className="text-[10px] font-mono text-ufo-green font-bold uppercase tracking-widest block">
                        PATTERN DISCOVERY • {selectedPattern.id}
                      </span>
                      <h3 className="text-xl font-display font-black text-white uppercase tracking-wider">
                        {selectedPattern.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedPattern(null)}
                      className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-xs font-mono">
                    <div>
                      <label className="text-slate-500 uppercase tracking-widest block mb-1">Temporal Cadence</label>
                      <div className="text-white font-bold bg-slate-900 p-3 rounded-xl border border-white/5">
                        {selectedPattern.cadence}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-500 uppercase tracking-widest block mb-1">Detailed Analysis</label>
                      <p className="text-slate-200 leading-relaxed bg-slate-900 p-4 rounded-xl border border-white/5 italic">
                        "{selectedPattern.description}"
                      </p>
                    </div>

                    <div>
                      <label className="text-slate-500 uppercase tracking-widest block mb-1">Historical Precedents</label>
                      <ul className="list-disc list-inside text-slate-300 space-y-1 bg-slate-900 p-3 rounded-xl border border-white/5">
                        {selectedPattern.historicalPrecedents.map((prec, i) => (
                          <li key={i}>{prec}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <label className="text-slate-500 uppercase tracking-widest block mb-1">Strategic Countermeasure</label>
                      <div className="text-ufo-green font-bold bg-ufo-green/10 border border-ufo-green/30 p-3.5 rounded-xl">
                        {selectedPattern.recommendedAction}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* TAB 3: EMERGING ANOMALY RADAR */}
      {activeTab === 'EMERGING' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trendData.emergingAnomalies.map((em) => (
              <div
                key={em.id}
                className="p-6 bg-slate-950/90 border border-white/10 rounded-3xl space-y-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-xl text-[9px] font-mono font-black tracking-widest bg-ufo-green/10 text-ufo-green border border-ufo-green/30 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-ufo-green animate-pulse" />
                    +{em.surgeVelocity}% VELOCITY
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                    em.status === 'CRITICAL_SPIKE' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {em.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-display font-black text-white uppercase tracking-wider mb-1">
                    {em.title}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    First Detected: {em.firstDetected} • Domain: {em.category}
                  </span>
                </div>

                <p className="text-xs font-mono text-slate-300 leading-relaxed bg-black/40 p-3.5 rounded-2xl border border-white/5 italic">
                  "{em.summary}"
                </p>

                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                    Telemetry Drivers
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {em.contributingDrivers.map((driver, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-mono text-cyan-300">
                        {driver}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HISTORICAL DATA TABLE & EXPORT */}
      {activeTab === 'HISTORICAL' && (
        <div className="p-6 md:p-8 bg-slate-950/90 border border-white/10 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search historical records..."
                  className="w-full bg-slate-900 border border-white/10 focus:border-cyan-400 rounded-2xl pl-9 pr-4 py-2 text-xs font-mono text-white outline-none"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 text-xs font-mono text-white rounded-2xl px-3 py-2 outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="Scientific">Scientific</option>
                <option value="Economic">Economic</option>
                <option value="Social">Social</option>
                <option value="Geopolitical">Geopolitical</option>
                <option value="Cultural">Cultural</option>
                <option value="UFO / UAP">Aerial / UAP</option>
                <option value="Phenomena">Phenomena</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-ufo-green" />
              <span>Export CSV ({filteredHistory.length})</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-slate-500 uppercase tracking-widest text-[9px]">
                  <th className="pb-3">Designation / Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Impact</th>
                  <th className="pb-3">Sector</th>
                  <th className="pb-3">Observed Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredHistory.slice(0, 25).map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-white max-w-xs truncate">{s.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{s.description}</div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-cyan-300 font-bold text-[10px]">
                        {normalizeAnomalyCategory(s.category)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        s.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                        s.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {s.severity || 'MEDIUM'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-slate-300 truncate max-w-[120px]">
                      {s.location || 'Global'}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-400">
                      {s.date || 'Recent'}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => onSelectAnomaly && onSelectAnomaly(s)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-ufo-green/20 text-slate-300 hover:text-ufo-green rounded-xl transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
