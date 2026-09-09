import React, { useState, useEffect, useCallback } from 'react';
import { RedditService, RedditPost } from '../services/redditService';
import { CaseOps } from '../services/caseOps';
import { ProgressionService } from '../services/progressionService';
import { triggerTacticalVibration } from '../services/geminiService';
import { ICONS } from '../constants';
import { SightingOps } from '../services/firebaseService';
import { AnomalyCategory } from '../types';
import TacticalLoader from './TacticalLoader';

interface BulkLogItemProps {
  log: string;
}

const BulkLogItem = React.memo<BulkLogItemProps>(({ log }) => {
  let col = "text-slate-400";
  if (log.includes("✅") || log.includes("🎉") || log.includes("🎖️")) col = "text-emerald-400";
  else if (log.includes("❌")) col = "text-red-400 font-bold";
  else if (log.includes("⚡")) col = "text-celestial-blue";
  return (
    <div className={`content-contain ${col}`}>{log}</div>
  );
});

BulkLogItem.displayName = 'BulkLogItem';

interface RedditPostCardProps {
  post: RedditPost;
  report?: any;
  isAnalyzing: boolean;
  localHighlighting: boolean;
  entropyThreshold: number;
  highlightEntropyText: (text: string, threshold: number) => React.ReactNode;
  onAnalyze: (post: RedditPost) => void;
}

const RedditPostCard = React.memo<RedditPostCardProps>(({
  post,
  report,
  isAnalyzing,
  localHighlighting,
  entropyThreshold,
  highlightEntropyText,
  onAnalyze
}) => {
  return (
    <div 
      className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all relative overflow-hidden flex flex-col gap-4 shadow-xl content-contain"
    >
      <div className="flex justify-between items-center flex-wrap gap-2 text-[10px] font-mono">
        <span className="px-3 py-1.5 bg-celestial-blue/10 border border-celestial-blue/20 text-celestial-blue rounded-lg font-black tracking-widest uppercase">
          r/{post.subreddit}
        </span>
        <div className="flex gap-4 text-slate-500 font-bold">
          <span>BY: <span className="text-slate-300">u/{post.author}</span></span>
          <span>SCORE: <span className="text-white font-black">{post.score}</span></span>
          <span>COMMENTS: <span className="text-white font-black">{post.num_comments}</span></span>
          <span>{new Date(post.created_utc * 1000).toLocaleDateString()}</span>
        </div>
      </div>

      <h3 className="text-base md:text-lg font-display font-black text-white cursor-pointer select-text tracking-wide leading-tight">
        {post.title}
      </h3>

      {post.selftext && (
        <div className="text-[11px] font-mono text-slate-400 break-words max-h-40 overflow-y-auto custom-scrollbar bg-slate-950/50 p-4 rounded-xl border border-white/5 select-text leading-relaxed">
          {localHighlighting ? (
            highlightEntropyText(post.selftext, entropyThreshold)
          ) : (
            post.selftext
          )}
        </div>
      )}

      {report && (
        <div className="mt-2 p-5 rounded-2xl bg-celestial-blue/[0.03] border border-celestial-blue/30 space-y-3 relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none font-display font-black text-3xl italic">FORENSIC_DECR</div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-[9px] font-mono text-celestial-blue bg-celestial-blue/10 px-2.5 py-1 rounded font-black tracking-widest uppercase border border-celestial-blue/20">
              ANOMALY: {report.category}
            </span>
            <span className={`text-[9px] font-mono px-2.5 py-1 rounded font-black tracking-widest border ${
              report.severity === 'CRITICAL' ? 'bg-red-500/15 border-red-500/30 text-red-400' :
              report.severity === 'HIGH' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
              'bg-white/5 border-white/10 text-slate-400'
            }`}>
              SEVERITY: {report.severity}
            </span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded font-black">
              CONFIDENCE: {report.credibilityScore}%
            </span>
            {report.isActionable && (
              <span className="text-[9px] font-mono text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded font-black animate-pulse">
                ⚠️ OPERATIVE DEBIAS PRIORITY
              </span>
            )}
          </div>
          
          <div className="text-[11px] font-mono text-slate-300 leading-relaxed select-text italic">
            {report.tacticalAnalysis}
          </div>

          {report.suspiciousKeywords && report.suspiciousKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[9px] font-mono text-slate-500 font-bold">KEYWORDS:</span>
              {report.suspiciousKeywords.map((kw: string, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 text-[9px] font-mono text-white rounded">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end items-center mt-2 flex-wrap">
        {post.url && (
          <a 
            href={post.url} 
            target="_blank" 
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-mono uppercase tracking-widest text-slate-400 hover:text-white hover:border-white/30 transition-all font-semibold"
          >
            VIEW MEDIA ↗
          </a>
        )}
        <a 
          href={post.permalink} 
          target="_blank" 
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-mono uppercase tracking-widest text-slate-400 hover:text-white hover:border-white/30 transition-all font-semibold"
        >
          LINK THREAD 🔗
        </a>
        <button
          disabled={isAnalyzing}
          onClick={() => onAnalyze(post)}
          className="px-5 py-2 bg-celestial-blue text-black font-display font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-white hover:shadow-[0_0_20px_#00d0ff] hover:border-black/0 transition-all cursor-pointer font-black border border-celestial-blue"
        >
          {isAnalyzing ? "DECRYPTING..." : "FORUM FORENSICS PASS"}
        </button>
      </div>
    </div>
  );
});

RedditPostCard.displayName = 'RedditPostCard';

interface RedditMonitorProps {
  localHighlighting: boolean;
  entropyThreshold: number;
  highlightEntropyText: (text: string, threshold: number) => React.ReactNode;
}

export const RedditMonitor: React.FC<RedditMonitorProps> = ({
  localHighlighting,
  entropyThreshold,
  highlightEntropyText
}) => {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSubreddit, setSelectedSubreddit] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeAnalysis, setActiveAnalysis] = useState<Record<string, any>>({});
  const [analyzingPostId, setAnalyzingPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<string | null>(null);

  // Bulk OSINT Ingestion States
  const [isBulkIngesting, setIsBulkIngesting] = useState<boolean>(false);
  const [bulkLogs, setBulkLogs] = useState<string[]>([]);
  const [showBulkPanel, setShowBulkPanel] = useState<boolean>(false);

  const handleBulkIngest = async () => {
    if (posts.length === 0 || isBulkIngesting) return;
    setIsBulkIngesting(true);
    setBulkLogs(["📡 Establishing OSINT Bulk Ingest Session...", "🔗 Mapping local buffer to remote AnomalyVault indices..."]);
    
    let ingestedCount = 0;
    try {
      const targetPosts = posts.slice(0, 5); // process top 5 posts
      
      for (const post of targetPosts) {
        setBulkLogs(prev => [...prev, `⚡ Analyzing post telemetry: r/${post.subreddit} - "${post.title.substring(0, 40)}..."`]);
        
        let category: AnomalyCategory = "UFO / UAP";
        if (post.subreddit?.toLowerCase().includes("paranormal")) {
          category = "Paranormal";
        } else if (post.subreddit?.toLowerCase().includes("highstrangeness")) {
          category = "Phenomena";
        } else if (post.selftext?.toLowerCase().includes("cryptid") || post.selftext?.toLowerCase().includes("sasquatch")) {
          category = "Cryptid";
        } else if (post.title?.toLowerCase().includes("military") || post.title?.toLowerCase().includes("space force")) {
          category = "Gov / Black Ops";
        }

        const severity = post.score > 250 ? "CRITICAL" : post.score > 100 ? "HIGH" : post.score > 30 ? "MEDIUM" : "LOW";

        // Extract location or use hashing fallback
        let location = "Pacific Ocean";
        const locationMatches = post.selftext.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s[A-Z]{2,})\b/g) || 
                              post.title.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s[A-Z]{2,})\b/g);
        if (locationMatches && locationMatches.length > 0) {
          location = locationMatches[0];
        } else {
          const fallbacks = [
            "Pine Gap, Australia", "Dulce, New Mexico", "Mount Shasta, California", 
            "Point Pleasant, West Virginia", "Sedona, Arizona", "Groom Lake, Nevada",
            "Perm Anomaly Zone, Russia", "Skinwalker Ranch, Utah", "Rendlesham Forest, UK"
          ];
          const hashVal = post.title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          location = fallbacks[hashVal % fallbacks.length];
        }

        const sightingData = {
          title: post.title,
          date: new Date(post.created_utc * 1000).toLocaleDateString(),
          location: location,
          description: post.selftext.substring(0, 500) || `Transcript metadata captured via r/${post.subreddit}. Live source tracking at ${post.permalink}`,
          category: category,
          severity: severity as any,
          operative: "OSINT_TACTICIAN"
        };

        // Report as official global sighting
        await SightingOps.reportSighting(sightingData);

        // Add case file to Intelligence dossier
        const brief = `Classified OSINT Intel Feed Extraction.
        
Subreddit ID: r/${post.subreddit}
Operator Tag: u/${post.author}
Telemetry Uplink Score: ${post.score}
Engagement Metric: ${post.num_comments} comments

Abstract:
${post.selftext || "(Observer captured no secondary audio data. Flight telemetry status unchecked)"}

Operational Directives: Review localized RF signals and track Space Weather patterns. Keep intelligence channels encrypted.`;

        await CaseOps.createCase(`r/${post.subreddit}: ${post.title}`, brief, "Reddit Extraction");
        
        ingestedCount++;
        setBulkLogs(prev => [...prev, `✅ Ingested successfully as sighting and dossier case!`]);
        
        // Stagger to prevent Firebase write spam & provide awesome experience
        await new Promise(r => setTimeout(r, 1000));
      }

      setBulkLogs(prev => [...prev, `🎉 Mass ingest complete. Ingested ${ingestedCount} active telemetry files.`, "🎖️ Operations bonus: +150 XP awarded!"]);
      ProgressionService.addXP(150, "Executed OSINT Bulk Ingest Loop");
      triggerTacticalVibration(30);
    } catch (e: any) {
      setBulkLogs(prev => [...prev, `❌ CRITICAL FAULT: Uplink destabilized during stream write. ${e.message || "Timeout"}`]);
    } finally {
      setIsBulkIngesting(false);
    }
  };

  const loadData = async (sub: string = selectedSubreddit, query: string = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      let resData;
      const targetSub = sub === 'ALL' ? undefined : sub;
      
      if (query.trim()) {
        resData = await RedditService.searchReddit(query, targetSub);
      } else {
        resData = await RedditService.fetchLatestSubredditPosts(targetSub);
      }
      
      setPosts(resData.items || []);
      setEngine(resData.engine || null);

      if (resData.error) {
        setError(resData.error);
      } else {
        ProgressionService.addXP(25, "Reddit Telemetry Stream Connected");
      }
    } catch (e: any) {
      console.error("Reddit fetch failure:", e);
      setError(e.message || "Uplink failure during Reddit forum sweep.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedSubreddit, searchQuery);
  }, [selectedSubreddit]);

  const handleAnalyze = useCallback(async (post: RedditPost) => {
    setAnalyzingPostId(post.id);
    try {
      const report = await RedditService.analyzeRedditPostWithAi(post.title, post.selftext, post.subreddit);
      setActiveAnalysis(prev => ({ ...prev, [post.id]: report }));

      const contentSummary = `Reddit Post by u/${post.author} on r/${post.subreddit}:
      
Title: ${post.title}
Score: ${post.score} | Comments: ${post.num_comments}
Permalink: ${post.permalink}
      
--- TACTICAL FORENSIC ANOMALY ANALYSIS ---
Category: ${report.category}
Severity: ${report.severity}
Confidence Rating: ${report.credibilityScore}%

Forensic Deductions:
${report.tacticalAnalysis}
      
Suspicious Keywords Identified: ${report.suspiciousKeywords?.join(', ') || 'None'}
Actionable Operative Priority: ${report.isActionable ? 'YES - DEBIAS AND MONITOR' : 'NO'}`;

      CaseOps.createCase(`r/${post.subreddit}: ${post.title}`, contentSummary, 'Reddit Extraction');
      ProgressionService.addXP(50, "Extracted Reddit Anomaly Signature");
      triggerTacticalVibration(15);
    } catch (err) {
      console.error("Reddit post analysis failure:", err);
    } finally {
      setAnalyzingPostId(null);
    }
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      <main className="lg:col-span-8 space-y-4 md:space-y-6">
        <div className="glass-panel min-h-[500px] md:min-h-[650px] flex flex-col border border-white/10 rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-black/80 shadow-2xl relative">
          <div className="absolute top-0 right-0 p-6 md:p-10 opacity-5 pointer-events-none font-display font-black text-6xl md:text-8xl tracking-tighter uppercase italic select-none">REDDIT_FEED</div>
          
          <div className="p-6 md:p-10 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 relative z-10 backdrop-blur-3xl bg-white/[0.03]">
            <div className="flex flex-col items-center md:items-start">
              <h2 className="text-3xl md:text-5xl font-display font-black text-white/90 tracking-[-0.05em] uppercase leading-[0.8] italic select-none">
                REDDIT OSINT
              </h2>
              <h2 className="text-3xl md:text-5xl font-display font-black text-celestial-blue tracking-[0.05em] uppercase leading-[0.8] italic drop-shadow-[0_0_50px_#00d0ff] select-none">
                INTELLIGENCE
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-4">
                <span className="h-1.5 w-12 md:h-2 md:w-16 bg-celestial-blue/60 rounded-full shadow-[0_0_15px_#00d0ff]"></span>
                <span className="text-[9px] md:text-[11px] font-mono text-slate-500 uppercase tracking-widest font-black">
                  Subreddit: r/{selectedSubreddit}
                </span>
                <span className="text-[9.5px] font-mono px-2.5 py-0.5 rounded font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  ⚠️ UNVERIFIED SOCIAL SIGNALS (ISOLATED FROM SENSOR RADAR)
                </span>
                {engine && (
                  <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded font-black tracking-wider uppercase ${
                    engine === 'REDDIT_OAUTH_PROD' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                  }`}>
                    {engine === 'REDDIT_OAUTH_PROD' ? '📡 SECURE LINK' : '🌐 PUBLIC SCAPE'}
                  </span>
                )}
                {error && (
                  <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 uppercase font-black tracking-wider animate-pulse">
                    ⚠️ LINK BLOCKED
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex-1 max-w-xs w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadData(selectedSubreddit, searchQuery)}
                  placeholder="SEARCH REDDIT FEEDS..."
                  className="w-full bg-slate-950/95 border border-white/10 rounded-xl px-4 py-3 text-[10px] text-white focus:outline-none focus:border-celestial-blue/70 font-mono tracking-widest placeholder-slate-700"
                />
                <button 
                  onClick={() => loadData(selectedSubreddit, searchQuery)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-celestial-blue font-mono font-black text-[9px] hover:text-white uppercase transition-colors"
                >
                  PROBE
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-12 flex-1 overflow-y-auto custom-scrollbar relative bg-black/40">
            {posts.length > 0 && !loading && (
              <div className="mb-6 p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 bg-celestial-blue/70 rounded-full animate-pulse"></span>
                      AUTONOMOUS OSINT FEED INGESTION
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Stagger-scans the active {posts.length} posts, triggers cryptographic geo-hash mapping, and registers verified sightings to our global databases.
                    </p>
                  </div>
                  <button
                    onClick={handleBulkIngest}
                    disabled={isBulkIngesting}
                    className={`px-4 py-2.5 rounded-lg text-[9px] font-mono tracking-widest uppercase font-black transition-all ${
                      isBulkIngesting 
                        ? 'bg-celestial-blue/25 text-celestial-blue border border-celestial-blue/30 cursor-wait' 
                        : 'bg-celestial-blue text-black hover:bg-white active:scale-98 shadow-[0_0_15px_rgba(0,208,255,0.15)] font-bold'
                    }`}
                  >
                    {isBulkIngesting ? "INGESTION STREAM ACTIVE..." : "⚡ START MASS INGEST"}
                  </button>
                </div>

                {bulkLogs.length > 0 && (
                  <div className="p-3 bg-black/75 rounded-xl border border-white/5 font-mono text-[9px] text-slate-400 space-y-1 max-h-40 overflow-y-auto custom-scrollbar select-none animate-in fade-in slide-in-from-top-2 duration-205">
                    {bulkLogs.map((log, idx) => (
                      <BulkLogItem key={idx} log={log} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <TacticalLoader stage="DECRYPTING OSINT FORUM TRAFFIC IN SEARCH OF UNIDENTIFIED PHENOMENA..." />
            ) : posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map((post) => {
                  const report = activeAnalysis[post.id];
                  const isAnalyzing = analyzingPostId === post.id;
                  
                  return (
                    <RedditPostCard
                      key={post.id}
                      post={post}
                      report={report}
                      isAnalyzing={isAnalyzing}
                      localHighlighting={localHighlighting}
                      entropyThreshold={entropyThreshold}
                      highlightEntropyText={highlightEntropyText}
                      onAnalyze={handleAnalyze}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="space-y-6">
                {error && (
                  <div className="p-6 rounded-3xl bg-celestial-blue/5 border border-celestial-blue/20 flex flex-col gap-3 relative overflow-hidden">
                    <span className="text-celestial-blue font-mono text-[10px] uppercase tracking-widest font-black flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-celestial-blue animate-pulse"></span>
                      📡 INTELLIGENCE FEED RE-ROUTED TO SECURE ARCHIVE TELEMETRY
                    </span>
                    <p className="text-slate-400 text-[11px] font-mono leading-relaxed select-text">
                      Live forum uplink active. Displaying cryptographically logged anomaly transcripts and active community OSINT reports.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <aside className="lg:col-span-4 space-y-6 md:space-y-8 h-full flex flex-col">
        <div className="glass-panel p-6 md:p-8 rounded-[2rem] border border-white/15 bg-black/80 shadow-2xl relative overflow-hidden flex flex-col">
          <h3 className="text-[10px] md:text-xs font-display font-black text-white tracking-[0.3em] uppercase mb-6 flex items-center justify-between z-10">
            <span>OSINT CONTROL</span>
            <span className="text-celestial-blue text-xl">{ICONS.NEXUS}</span>
          </h3>
          
          <div className="space-y-6 relative z-10">
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-3 font-black">Target Forum Channels</span>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'ALL', label: 'ALL CRITICAL DISCUSSION' },
                  { id: 'UFOs', label: 'r/UFOs // UNIDENTIFIED' },
                  { id: 'HighStrangeness', label: 'r/HighStrangeness // CONSPIRACY' },
                  { id: 'paranormal', label: 'r/paranormal // SPECTRAL' },
                  { id: 'aliens', label: 'r/aliens // NON-HUMAN' }
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubreddit(sub.id);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left font-mono tracking-widest text-[9px] transition-all flex items-center justify-between uppercase ${selectedSubreddit === sub.id ? 'bg-celestial-blue/20 border-celestial-blue text-celestial-blue font-black' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30 hover:text-white'}`}
                  >
                    <span>{sub.label}</span>
                    <span className="text-[8px] opacity-60">
                      {selectedSubreddit === sub.id ? '[ STREAMING ]' : '[ CLOSED ]'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-celestial-blue/5 border border-celestial-blue/20 rounded-2xl p-5 space-y-3 font-mono text-[9px] text-slate-400 leading-relaxed">
              <div className="text-[10px] text-celestial-blue font-black tracking-widest uppercase">Reddit Data Link Layer</div>
              <p>
                This terminal is linked to real-world social forum backplanes. When you execute a forensics pass on a thread, Gemini performs an objective tactical triangulation of:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Estimated Credibility & Anomaly Categorization</li>
                <li>Strategic risk profiling & action priority indices</li>
                <li>Entropy analysis and keyword triggers</li>
              </ul>
              <p className="text-slate-500">
                Extracted threat vectors are committed sequentially to your Operations Dossier Vault to assist multi-vector intelligence collation.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
