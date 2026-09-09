import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Newspaper, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  Globe, 
  DollarSign, 
  ShieldAlert, 
  ExternalLink, 
  Search, 
  Cpu, 
  Flame, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Radar,
  Radio,
  Layers
} from 'lucide-react';
import { 
  FinancialMarketAnomaly, 
  SocialMediaTrendFeed, 
  NewsAnomalyFeed, 
  EmergingAnomalyRealtimeAnalysis 
} from '../types';
import { RealWorldDataService } from '../services/realWorldDataService';
import { triggerTacticalVibration } from '../services/geminiService';

export const RealtimeFeedsTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'MARKETS' | 'SOCIAL' | 'NEWS' | 'EXPLAINER'>('MARKETS');
  
  // Data states
  const [marketAnomalies, setMarketAnomalies] = useState<FinancialMarketAnomaly[]>([]);
  const [socialTrends, setSocialTrends] = useState<SocialMediaTrendFeed[]>([]);
  const [newsAnomalies, setNewsAnomalies] = useState<NewsAnomalyFeed[]>([]);
  
  // Loading states
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(false);
  const [explainerInput, setExplainerInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<EmergingAnomalyRealtimeAnalysis | null>(null);

  const loadAllFeeds = async () => {
    setIsLoadingFeeds(true);
    triggerTacticalVibration(20);
    try {
      const [markets, social, news] = await Promise.all([
        RealWorldDataService.fetchFinancialMarketAnomalies(),
        RealWorldDataService.fetchSocialMediaTrends(),
        RealWorldDataService.fetchNewsAnomalies()
      ]);
      setMarketAnomalies(markets);
      setSocialTrends(social);
      setNewsAnomalies(news);
    } catch (e) {
      console.error("Failed to refresh real-time feeds:", e);
    } finally {
      setIsLoadingFeeds(false);
    }
  };

  useEffect(() => {
    loadAllFeeds();
    const interval = setInterval(() => {
      loadAllFeeds();
    }, 60000); // refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRunExplainer = async (titleToExplain?: string, context?: string) => {
    const topic = titleToExplain || explainerInput;
    if (!topic.trim()) return;
    
    setIsAnalyzing(true);
    setActiveTab('EXPLAINER');
    triggerTacticalVibration([30, 80, 30]);

    try {
      const result = await RealWorldDataService.explainEmergingAnomaly(topic, context);
      setActiveAnalysis(result);
    } catch (e) {
      console.error("Emerging anomaly analysis error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Glow ambient background */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-ufo-green/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-ufo-green/20 border border-ufo-green/40 text-ufo-green text-[10px] font-mono font-black uppercase rounded-full animate-pulse flex items-center gap-1">
              <Radar className="w-3 h-3 text-ufo-green animate-spin" /> LIVE INGRESS ENGINE
            </span>
            <span className="text-[10px] font-mono text-slate-400">REAL-TIME MULTI-STREAM CORRELATION</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-black text-white tracking-wider uppercase">
            Emerging Anomaly Feeds
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl font-sans">
            Cross-correlating financial market volatility spikes, social media OSINT velocity, and breaking global news APIs to identify and explain anomalies as they unfold.
          </p>
        </div>

        <button
          onClick={loadAllFeeds}
          disabled={isLoadingFeeds}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 border border-white/15 hover:border-ufo-green/50 text-ufo-green hover:bg-ufo-green/10 rounded-2xl text-xs font-mono font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg active:scale-95 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFeeds ? 'animate-spin' : ''}`} />
          <span>{isLoadingFeeds ? 'SYNCHRONIZING...' : 'REFRESH ALL FEEDS'}</span>
        </button>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 relative z-10">
        <button
          onClick={() => setActiveTab('MARKETS')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'MARKETS'
              ? 'bg-red-500/20 border border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
              : 'bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          <Activity className="w-4 h-4 text-red-400" />
          <span>FINANCIAL MARKETS ({marketAnomalies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SOCIAL')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'SOCIAL'
              ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>SOCIAL OSINT TRENDS ({socialTrends.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('NEWS')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'NEWS'
              ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              : 'bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          <Newspaper className="w-4 h-4 text-cyan-400" />
          <span>BREAKING NEWS WIRE ({newsAnomalies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EXPLAINER')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'EXPLAINER'
              ? 'bg-ufo-green/20 border border-ufo-green/50 text-ufo-green shadow-[0_0_15px_rgba(0,255,157,0.2)]'
              : 'bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          <Sparkles className="w-4 h-4 text-ufo-green" />
          <span>AI EMERGING EXPLAINER</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10">
        {/* TAB 1: FINANCIAL MARKETS */}
        {activeTab === 'MARKETS' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {marketAnomalies.map((mkt) => {
                const isPositive = mkt.change24h >= 0;
                return (
                  <motion.div
                    key={mkt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/90 border border-white/10 hover:border-red-500/40 rounded-2xl p-5 space-y-3 transition-all relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold rounded-lg uppercase">
                        {mkt.assetType} // {mkt.signalType}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        ANOMALY SCORE: <span className="text-red-400 font-black">{mkt.anomalyScore}/100</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-display font-bold text-white group-hover:text-red-400 transition-colors flex items-center justify-between">
                        <span>{mkt.asset}</span>
                        <span className="text-sm font-mono text-slate-200">{mkt.currentPrice}</span>
                      </h4>
                      <div className="flex items-center gap-1 mt-1">
                        {isPositive ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        )}
                        <span className={`text-xs font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{mkt.change24h}% 24H SHIFT
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 font-sans leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                      {mkt.description}
                    </p>

                    {(() => {
                      const incidents = Array.isArray(mkt.correlatedIncidents)
                        ? mkt.correlatedIncidents
                        : typeof mkt.correlatedIncidents === 'string'
                        ? [mkt.correlatedIncidents]
                        : [];
                      if (incidents.length === 0) return null;
                      return (
                        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400">Correlated:</span>
                          {incidents.map((inc, i) => (
                            <span key={i} className="text-[9px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-slate-300">
                              {inc}
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => handleRunExplainer(mkt.asset, mkt.description)}
                      className="w-full mt-2 py-2 bg-slate-800 hover:bg-red-950/60 border border-white/10 hover:border-red-500/40 text-red-300 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-red-400" />
                      <span>ANALYZE MARKET ANOMALY ROOT CAUSE</span>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SOCIAL MEDIA OSINT */}
        {activeTab === 'SOCIAL' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {socialTrends.map((trend) => (
                <motion.div
                  key={trend.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/90 border border-white/10 hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold rounded-lg uppercase">
                      {trend.platform} // {trend.hashtagOrSub}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      VELOCITY: {trend.velocityScore}/100
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-display font-bold text-white group-hover:text-amber-300 transition-colors">
                      {trend.topic}
                    </h4>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-1">
                      <span>Volume: {trend.postVolume24h.toLocaleString()} posts</span>
                      <span className="px-2 py-0.5 bg-black/60 rounded text-[10px] font-bold text-amber-300 uppercase">
                        Sentiment: {trend.sentiment}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                    {trend.topPostsSummary}
                  </p>

                  <button
                    onClick={() => handleRunExplainer(trend.topic, trend.topPostsSummary)}
                    className="w-full mt-2 py-2 bg-slate-800 hover:bg-amber-950/60 border border-white/10 hover:border-amber-500/40 text-amber-300 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>EXPLAIN CHATTER SURGE ROOT CAUSE</span>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: BREAKING NEWS WIRE */}
        {activeTab === 'NEWS' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsAnomalies.map((news) => (
                <motion.div
                  key={news.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/90 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 space-y-3 transition-all relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-lg uppercase border ${
                        news.urgency === 'BREAKING' ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' :
                        news.urgency === 'DEVELOPING' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
                        'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      }`}>
                        {news.urgency} WIRE
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{news.source}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(news.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="text-base font-display font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {news.headline}
                  </h4>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                    {news.summary}
                  </p>

                  {news.aiExplanation && (
                    <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-xs text-cyan-200 font-mono">
                      <span className="font-bold text-cyan-400 block mb-0.5">⚡ Instant AI Explanation:</span>
                      {news.aiExplanation}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => handleRunExplainer(news.headline, news.summary)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>DEEP DIVE EXPLANATION</span>
                    </button>

                    {news.groundingUrl && (
                      <a
                        href={news.groundingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-800 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AI EMERGING EXPLAINER */}
        {activeTab === 'EXPLAINER' && (
          <div className="space-y-6">
            {/* Custom Input Bar */}
            <div className="bg-slate-900 border border-white/15 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={explainerInput}
                  onChange={(e) => setExplainerInput(e.target.value)}
                  placeholder="Enter any emerging anomaly, event, or market spike (e.g. 'VLF signal pulse in North Sea' or 'Flash crash in Bitcoin during satellite blackout')..."
                  className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-ufo-green font-sans"
                />
              </div>
              <button
                onClick={() => handleRunExplainer()}
                disabled={isAnalyzing || !explainerInput.trim()}
                className="px-6 py-2.5 bg-ufo-green hover:bg-ufo-green/80 text-black font-mono font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,255,157,0.3)]"
              >
                {isAnalyzing ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>SYNTHESIZING...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>EXPLAIN EMERGING ANOMALY</span>
                  </>
                )}
              </button>
            </div>

            {/* Analysis Result */}
            {isAnalyzing && (
              <div className="p-12 text-center bg-slate-900/80 border border-ufo-green/30 rounded-3xl space-y-4 animate-pulse">
                <Cpu className="w-10 h-10 text-ufo-green animate-spin mx-auto" />
                <h3 className="text-sm font-mono font-bold text-ufo-green uppercase tracking-widest">
                  Synthesizing Social OSINT + Financial Volatility + Grounding News APIs...
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Cross-referencing multi-vector telemetry to identify probable root causes and immediate operational implications.
                </p>
              </div>
            )}

            {activeAnalysis && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900/90 border border-ufo-green/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <span className="px-2.5 py-0.5 bg-ufo-green/20 border border-ufo-green/40 text-ufo-green text-[10px] font-mono font-bold rounded-lg uppercase">
                      CONFIDENCE: {(activeAnalysis.confidenceScore * 100).toFixed(0)}% // DEEP SYNTHESIS
                    </span>
                    <h3 className="text-xl md:text-2xl font-display font-black text-white mt-1">
                      {activeAnalysis.title}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Detected At: {new Date(activeAnalysis.detectedAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Primary Drivers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-black/50 border border-white/5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1 uppercase">
                      <MessageSquare className="w-3.5 h-3.5" /> Social Media OSINT Surge
                    </span>
                    <p className="text-xs text-slate-300">{activeAnalysis.primaryDrivers.socialMedia}</p>
                  </div>

                  <div className="p-4 bg-black/50 border border-white/5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono font-bold text-red-400 flex items-center gap-1 uppercase">
                      <Activity className="w-3.5 h-3.5" /> Financial Market Volatility
                    </span>
                    <p className="text-xs text-slate-300">{activeAnalysis.primaryDrivers.financialMarkets}</p>
                  </div>

                  <div className="p-4 bg-black/50 border border-white/5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1 uppercase">
                      <Newspaper className="w-3.5 h-3.5" /> Breaking News Wire
                    </span>
                    <p className="text-xs text-slate-300">{activeAnalysis.primaryDrivers.newsBreaks}</p>
                  </div>

                  <div className="p-4 bg-black/50 border border-white/5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono font-bold text-ufo-green flex items-center gap-1 uppercase">
                      <Radar className="w-3.5 h-3.5" /> Physical Telemetry Sensors
                    </span>
                    <p className="text-xs text-slate-300">{activeAnalysis.primaryDrivers.physicalTelemetry}</p>
                  </div>
                </div>

                {/* Root Cause & Assessment */}
                <div className="space-y-4 pt-2">
                  <div className="p-5 bg-ufo-green/5 border border-ufo-green/20 rounded-2xl space-y-2">
                    <h4 className="text-xs font-mono font-bold text-ufo-green uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-ufo-green" /> Root Cause Analysis
                    </h4>
                    <p className="text-sm text-slate-200 leading-relaxed font-sans">
                      {activeAnalysis.rootCauseAnalysis}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950 border border-white/10 rounded-2xl space-y-1">
                      <h5 className="text-xs font-mono font-bold text-slate-400 uppercase">Impact Assessment</h5>
                      <p className="text-xs text-slate-300">{activeAnalysis.impactAssessment}</p>
                    </div>

                    <div className="p-4 bg-slate-950 border border-white/10 rounded-2xl space-y-1">
                      <h5 className="text-xs font-mono font-bold text-slate-400 uppercase">Actionable Guidance</h5>
                      <p className="text-xs text-slate-300">{activeAnalysis.recommendedAction}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
