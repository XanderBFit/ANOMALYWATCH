import React, { useState, useEffect } from 'react';
import { Database, Cpu, TrendingUp, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Activity } from 'lucide-react';
import { chronoEventSketcher } from '../services/chronoEventSketcher';
import { AnomalyCategory, UFOSighting, CaseRecord } from '../types';

interface ChronoSketchVisualizerProps {
  sightings: UFOSighting[];
  cases: CaseRecord[];
}

export const ChronoSketchVisualizer: React.FC<ChronoSketchVisualizerProps> = ({ sightings, cases }) => {
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<'positive' | 'negative' | null>(null);
  const [freqQuery, setFreqQuery] = useState('UFO / UAP');
  const [freqEstimate, setFreqEstimate] = useState<number | null>(null);
  const [trendCategory, setTrendCategory] = useState<string>('UFO / UAP');
  const [metrics, setMetrics] = useState({
    rawEventCount: 0,
    estimatedRawBytes: 0,
    sketchBytes: 0,
    savedPercent: 0,
    bloomBitSize: 2048,
    cmsSize: '256x4'
  });
  const [reconstitutedData, setReconstitutedData] = useState<{ label: string; count: number }[]>([]);

  const CATEGORIES: string[] = [
    'UFO / UAP', 'Paranormal', 'Cryptid', 'Gov / Black Ops', 
    'Phenomena', 'Site Intel', 'Geopolitical shifts', 
    'Scientific breakthroughs', 'Cultural trends', 
    'Economic anomalies', 'Technological oddities', 
    'Environmental events'
  ];

  const handleUpdateSketch = () => {
    const combined = [...sightings, ...cases];
    if (combined.length > 0) {
      chronoEventSketcher.sketchEvents(combined);
      updateMetricsAndQueries();
    }
  };

  const updateMetricsAndQueries = () => {
    setMetrics(chronoEventSketcher.getMemoryMetrics());
    setReconstitutedData(chronoEventSketcher.reconstituteTrend(trendCategory, 12));
    
    // Refresh live estimates
    if (freqQuery) {
      setFreqEstimate(chronoEventSketcher.getEstimatedFrequency(freqQuery));
    }
    if (testQuery) {
      const hasOccurred = chronoEventSketcher.hasEntityOccurred(testQuery);
      setTestResult(hasOccurred ? 'positive' : 'negative');
    }
  };

  // Re-run whenever sightings/cases update or category changes
  useEffect(() => {
    const combined = [...sightings, ...cases];
    if (combined.length > 0) {
      chronoEventSketcher.sketchEvents(combined);
    }
    updateMetricsAndQueries();
  }, [sightings, cases, trendCategory]);

  const handleTestBloom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery) {
      setTestResult(null);
      return;
    }
    const hasOccurred = chronoEventSketcher.hasEntityOccurred(testQuery);
    setTestResult(hasOccurred ? 'positive' : 'negative');
  };

  const handleFreqQueryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setFreqQuery(val);
    setFreqEstimate(chronoEventSketcher.getEstimatedFrequency(val));
  };

  return (
    <div className="glass-panel p-6 border border-white/[0.08] rounded-3xl bg-black/50 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] -mr-16 -mt-16 pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-[10px] font-mono text-white uppercase tracking-widest font-black">Chrono-Sketch Compression</h3>
            <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Zero-Memory Probabilistic Analytics</p>
          </div>
        </div>
        <button 
          onClick={handleUpdateSketch}
          className="p-1.5 hover:bg-white/5 rounded text-cyan-400 hover:text-cyan-300 transition-colors"
          title="Regenerate Sketches"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between">
          <span className="text-[8px] font-mono text-slate-500 uppercase">Native JSON Footprint</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-sm font-mono font-bold text-slate-300">{(metrics.estimatedRawBytes / 1024).toFixed(1)}</span>
            <span className="text-[9px] font-mono text-slate-600">KB</span>
          </div>
        </div>
        <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-1 right-2 flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
          </div>
          <span className="text-[8px] font-mono text-cyan-400/80 uppercase font-bold">Sketched Footprint</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-sm font-mono font-black text-cyan-400">{(metrics.sketchBytes / 1024).toFixed(2)}</span>
            <span className="text-[9px] font-mono text-cyan-500/80 font-bold">KB</span>
          </div>
        </div>
      </div>

      {/* Compression progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[9px] font-mono">
          <span className="text-slate-400">MEMORY RETENTION OPTIMIZATION</span>
          <span className="text-ufo-green font-bold">{metrics.savedPercent}% REDUCTION</span>
        </div>
        <div className="h-2 bg-slate-900 border border-white/5 rounded-full overflow-hidden p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-ufo-green rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-500"
            style={{ width: `${metrics.savedPercent}%` }}
          ></div>
        </div>
        <p className="text-[8px] font-mono text-slate-500 leading-relaxed uppercase">
          Saves trend signals via FNV-1a, DJB2, &amp; SDBM hash maps while discarding redundant raw strings
        </p>
      </div>

      <div className="h-px bg-white/[0.05]" />

      {/* Interactive tester blocks */}
      <div className="space-y-4">
        {/* Bloom Filter membership check */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <h4 className="text-[9px] font-mono text-slate-300 uppercase tracking-widest font-black">Bloom Sector Membership</h4>
          </div>
          <form onSubmit={handleTestBloom} className="flex gap-2">
            <input 
              type="text"
              placeholder="Query coordinate, keyword, sector..."
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50 font-mono"
            />
            <button 
              type="submit"
              className="px-3 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 font-mono text-[9px] font-bold uppercase rounded-xl hover:bg-cyan-500/10 transition-all"
            >
              Check
            </button>
          </form>
          {testResult !== null && (
            <div className={`p-2 rounded-xl text-[9px] font-mono flex items-center gap-2 border ${
              testResult === 'positive' 
                ? 'bg-ufo-green/5 border-ufo-green/20 text-ufo-green' 
                : 'bg-red-950/10 border-red-500/15 text-slate-500'
            }`}>
              {testResult === 'positive' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-ufo-green flex-shrink-0" />
                  <span className="uppercase tracking-wider">🟢 AFFIRMATIVE MATCH: "{testQuery}" recorded in historical telemetry</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span className="uppercase tracking-wider">🔴 NEGATIVE: No history matching "{testQuery}" found in sketcher</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Count-Min Sketch frequency lookups */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-cyan-400" />
            <h4 className="text-[9px] font-mono text-slate-300 uppercase tracking-widest font-black">Approximate Density Estimate</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={freqQuery}
              onChange={handleFreqQueryChange}
              className="bg-slate-950 border border-white/15 rounded-xl px-2 py-1.5 text-[10px] text-slate-300 outline-none focus:border-cyan-500/50 font-mono"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="bg-slate-950 border border-white/5 rounded-xl px-3 py-1.5 flex justify-between items-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Count Estimate</span>
              <span className="text-xs font-mono font-black text-cyan-400">{freqEstimate ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Reconstituted Trends sparkline */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              <h4 className="text-[9px] font-mono text-slate-300 uppercase tracking-widest font-black">Reconstituted Sketch Trend</h4>
            </div>
            <select
              value={trendCategory}
              onChange={(e) => setTrendCategory(e.target.value)}
              className="bg-transparent border-0 text-cyan-400 font-mono text-[8px] uppercase font-bold outline-none cursor-pointer"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-slate-950 text-slate-300">{cat}</option>
              ))}
            </select>
          </div>

          {/* Micro chart using raw SVG elements for extreme efficiency and styling alignment */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-end min-h-[90px]">
            {reconstitutedData.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-end justify-between h-10 gap-1 pt-1 select-none">
                  {reconstitutedData.map((bin, idx) => {
                    const maxCount = Math.max(...reconstitutedData.map(d => d.count)) || 1;
                    const pct = (bin.count / maxCount) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full group relative">
                        {/* Popover count */}
                        <div className="absolute bottom-full mb-1 bg-cyan-950 border border-cyan-500/20 text-[8px] px-1 py-0.5 rounded text-cyan-300 font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {bin.count}
                        </div>
                        <div 
                          className="w-full bg-cyan-500/30 group-hover:bg-cyan-400 transition-colors rounded-sm cursor-help relative"
                          style={{ height: `${Math.max(12, pct)}%` }}
                        >
                          {bin.count > 0 && (
                            <div className="absolute top-0 inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,1)]" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Labels */}
                <div className="flex justify-between text-[7px] font-mono text-slate-600 uppercase tracking-widest border-t border-white/[0.03] pt-1.5">
                  <span>{reconstitutedData[0]?.label || "START"}</span>
                  <span>TEMPORAL DISTRIBUTION GRID</span>
                  <span>{reconstitutedData[reconstitutedData.length - 1]?.label || "END"}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-[9px] font-mono text-slate-600 uppercase">
                Awaiting telemetry load...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
