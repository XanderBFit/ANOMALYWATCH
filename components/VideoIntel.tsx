
import React, { useState, useEffect, useRef } from 'react';
import { analyzeVideoUrl, searchYoutubeVideos, getRecentAnomalyVideos, triggerTacticalVibration } from '../services/geminiService';
import { CaseOps } from '../services/caseOps';
import { ArchiveOps } from '../services/firebaseService';
import { AnalysisResult, VideoSearchResult } from '../types';
import Markdown from 'react-markdown';
import { ICONS, ANOMALY_FACTS } from '../constants';
import TacticalLoader from './TacticalLoader';

interface VideoIntelProps {
  setView: (view: string) => void;
  initialFilterCategory?: string | null;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const THINKING_STEPS = [
  "UPLINKING TO EXTERNAL STREAM...",
  "BUFFERING VIDEO SEGMENTS...",
  "INITIATING VISUAL PARSING ROUTINES...",
  "SCANNING AUDIO SPECTRUMS...",
  "CROSS-REFERENCING BEHAVIORAL PATTERNS...",
  "SYNTHESIZING MULTIMODAL REPORT...",
  "ANALYSIS COMPLETE."
];

const VideoIntel: React.FC<VideoIntelProps> = ({ setView, initialFilterCategory }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState(initialFilterCategory || '');
  const [searchResults, setSearchResults] = useState<VideoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date'>('relevance');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Feed State
  const [feedVideos, setFeedVideos] = useState<VideoSearchResult[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedFactIndex, setFeedFactIndex] = useState(0);

  useEffect(() => {
    if (initialFilterCategory) {
      // Create a dummy event to call handleSearchVideos
      handleSearchVideos({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [initialFilterCategory]);

  // UX State for loading
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const loggedCheckpoints = useRef<Set<number>>(new Set());

  // Player State
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const progressInterval = useRef<any>(null);

  useEffect(() => {
    // Initial load of live feed
    const loadFeed = async () => {
      setLoadingFeed(true);
      try {
        const videos = await getRecentAnomalyVideos();
        setFeedVideos(videos);
      } catch (err) {
        console.error("Failed to load video feed", err);
      } finally {
        setLoadingFeed(false);
      }
    };
    loadFeed();

    // Load YouTube API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    if (loadingFeed) {
      const interval = setInterval(() => {
        setFeedFactIndex(prev => (prev + 1) % ANOMALY_FACTS.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [loadingFeed]);

  useEffect(() => {
    // Extract video ID from URL
    const extractVideoId = (url: string) => {
      const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|\/(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(regex);
      return match ? match[1] : null;
    };

    if (youtubeUrl) {
      const id = extractVideoId(youtubeUrl);
      if (id) {
        setVideoId(id);
        setAnalysisResult(null);
      }
    } else {
      setVideoId(null);
    }
  }, [youtubeUrl]);

  // Initialize Player when videoId changes
  useEffect(() => {
    if (!videoId) return;

    // Cleanup old player
    if (playerRef.current) {
        try {
            playerRef.current.destroy();
        } catch (e) { /* ignore */ }
    }
    
    setPlayerReady(false);
    setCurrentTime(0);
    setDuration(0);

    const initPlayer = () => {
        if (!window.YT || !window.YT.Player) return;
        
        // Ensure container is empty before creating
        if (playerContainerRef.current) {
            playerContainerRef.current.innerHTML = '<div id="yt-player-placeholder"></div>';
        }

        playerRef.current = new window.YT.Player('yt-player-placeholder', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                modestbranding: 1,
                rel: 0,
                controls: 0, // Hide default controls for our custom timeline
                disablekb: 1,
                fs: 0
            },
            events: {
                onReady: (event: any) => {
                    setPlayerReady(true);
                    setDuration(event.target.getDuration());
                    event.target.playVideo();
                },
                onStateChange: (event: any) => {
                    // YT.PlayerState.PLAYING = 1
                    setIsPlaying(event.data === 1);
                }
            }
        });
    };

    if (window.YT && window.YT.Player) {
        initPlayer();
    } else {
        window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
       if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [videoId]);

  // Time Polling
  useEffect(() => {
      if (isPlaying && playerReady && playerRef.current) {
          progressInterval.current = setInterval(() => {
              try {
                  const curr = playerRef.current.getCurrentTime();
                  setCurrentTime(curr);
                  if (duration === 0) setDuration(playerRef.current.getDuration());
              } catch (e) {}
          }, 500);
      } else {
          if (progressInterval.current) clearInterval(progressInterval.current);
      }
      return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [isPlaying, playerReady, duration]);

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      if (playerRef.current && playerRef.current.seekTo) {
          playerRef.current.seekTo(time, true);
      }
  };

  const handlePlayPause = () => {
      if (!playerRef.current) return;
      if (isPlaying) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
  };

  const jumpToTime = (timeStr: string) => {
      const parts = timeStr.split(':');
      let seconds = 0;
      if (parts.length === 2) {
          seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      } else if (parts.length === 3) {
          seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      }
      
      if (playerRef.current && playerRef.current.seekTo) {
          playerRef.current.seekTo(seconds, true);
          triggerTacticalVibration(20);
      }
  };

  const executeSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await searchYoutubeVideos(searchQuery, sortBy);
      setSearchResults(results);
      
      ArchiveOps.logSignal({
          query: `Video Stream Search: ${searchQuery}`,
          response: `Located ${results.length} relevant streams. Top match: ${results[0]?.title || 'None'}`,
          groundingUrls: results.map(v => ({ uri: v.url, title: v.title })),
          type: 'MEDIA_ANALYSIS'
      });

    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchVideos = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const handleSelectResult = (result: VideoSearchResult) => {
    setYoutubeUrl(result.url);
    // setVideoId is handled by useEffect on youtubeUrl
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopySnippet = (e: React.MouseEvent, description: string | undefined, id: string) => {
    e.stopPropagation();
    if (!description) return;
    navigator.clipboard.writeText(description);
    setCopiedId(id);
    triggerTacticalVibration(10);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAnalyzeVideo = async () => {
    if (!videoId || !youtubeUrl) return;

    setAnalyzing(true);
    setAnalysisResult(null);
    setProgress(0);
    setLogs(['>> INITIALIZING VIDEO ANALYSER...']);
    setStage('PREPARING STREAM...');
    loggedCheckpoints.current.clear();

    const currentPrompt = analysisPrompt.trim() || "Identify any unusual objects, phenomena, or human behaviors within the video. Summarize key events and their potential implications.";

    const interval = setInterval(() => {
      setProgress(prev => {
        const increment = prev < 50 ? Math.random() * 10 : Math.random() * 3;
        const next = prev + increment;
        return next >= 95 ? 95 : next;
      });
    }, 200);

    try {
      const result = await analyzeVideoUrl(youtubeUrl, currentPrompt);
      
      clearInterval(interval);
      setProgress(100);
      setStage('COMPILING REPORT...');
      setLogs(prev => [...prev, '>> ANALYSIS SUCCESSFUL', '>> GENERATING OUTPUT...']);
      
      await new Promise(r => setTimeout(r, 800));

      setAnalysisResult(result);
      
      ArchiveOps.logSignal({
          query: `Video Stream Analysis: ${youtubeUrl}`,
          response: result.text,
          groundingUrls: result.groundingUrls || [],
          type: 'MEDIA_ANALYSIS'
      });

    } catch (e: any) {
      console.error("Video analysis failed:", e);
      setAnalysisResult({ text: `Video analysis failed: ${e.message}` });
      setLogs(prev => [...prev, '>> ERROR: VIDEO ANALYSER FAILED']);
    } finally {
      setAnalyzing(false);
      clearInterval(interval);
    }
  };

  const handleLogToOpsBoard = () => {
    if (!analysisResult || !youtubeUrl || !videoId) return;

    CaseOps.createCase(
      `Video Analysis: YouTube/${videoId}`,
      analysisResult.text,
      'Video Intel',
      {
        id: Date.now().toString(),
        type: 'Video Link',
        content: youtubeUrl,
        timestamp: Date.now(),
        urls: analysisResult.groundingUrls,
      }
    );
    setView('opslog');
  };

  const handleExportTXT = () => {
    if (!analysisResult || !youtubeUrl || !videoId) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ANOMALY_WATCH_VIDEO_REPORT_${videoId}_${timestamp}.txt`;
    
    let content = `ANOMALY WATCH // VIDEO ANALYSIS REPORT\n`;
    content += `YOUTUBE URL: ${youtubeUrl}\n`;
    content += `ANALYZED: ${new Date().toLocaleString()}\n`;
    content += `PROMPT: ${analysisPrompt}\n`;
    content += `=================================================================\n\n`;
    content += analysisResult.text;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!analyzing) return;
    
    const checkpoints = THINKING_STEPS.slice(0, -1).map((step, i) => ({
      p: Math.round(((i + 1) / (THINKING_STEPS.length - 1)) * 90),
      msg: `>> ${step}`,
      stage: step.replace('...', '')
    }));
    
    checkpoints.forEach(cp => {
        if (progress >= cp.p && !loggedCheckpoints.current.has(cp.p)) {
            loggedCheckpoints.current.add(cp.p);
            setLogs(prev => [...prev, cp.msg]);
            setStage(cp.stage);
        }
    });
  }, [progress, analyzing]);

  // Timestamp extraction helper for Markdown rendering
  const renderMarkdownWithTimestamps = (text: string) => {
      // Very basic regex to find HH:MM or MM:SS
      const parts = text.split(/(\b\d{1,2}:\d{2}(?::\d{2})?\b)/g);
      return parts.map((part, i) => {
          if (part.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)) {
              return (
                  <button 
                    key={i} 
                    onClick={() => jumpToTime(part)}
                    className="text-ufo-green hover:underline font-bold bg-ufo-green/10 px-1 rounded cursor-pointer mx-0.5"
                  >
                      {part}
                  </button>
              );
          }
          return <span key={i}>{part}</span>;
      });
  };

  const RenderVideoSkeleton = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-3 rounded border border-white/5 bg-white/[0.02] flex gap-3 animate-pulse relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-ufo-green/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            <div className="w-24 aspect-video bg-white/5 rounded shrink-0"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-2 bg-white/10 rounded w-3/4"></div>
              <div className="h-1.5 bg-white/5 rounded w-full"></div>
              <div className="h-1.5 bg-white/5 rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Dynamic Anomaly Fact in Sidebar Loader */}
      <div className="p-4 bg-ufo-green/5 border border-ufo-green/20 rounded-xl animate-in fade-in duration-1000">
         <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-ufo-green rounded-full animate-ping"></span>
            <span className="text-[8px] font-mono text-ufo-green uppercase tracking-widest font-black">ANOMALY_CORE_TIP</span>
         </div>
         <p className="text-[10px] font-mono text-slate-400 leading-relaxed italic" key={feedFactIndex}>
            {ANOMALY_FACTS[feedFactIndex]}
         </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 px-2 sm:px-0">
      <div className="text-center space-y-2 mb-10">
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-[0.2em] drop-shadow-[0_0_15px_rgba(0,208,255,0.4)] uppercase">VIDEO INTEL</h2>
        <p className="text-celestial-blue font-mono font-light tracking-widest text-xs sm:text-sm uppercase">YouTube Stream Archival & Analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT: Input & Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
           
           {/* Section 1: Search Integration */}
           <div className="glass-panel p-6 rounded-xl border border-celestial-blue/30 bg-black/40">
              <h3 className="text-xs font-mono text-celestial-blue uppercase tracking-widest mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-celestial-blue rounded-full mr-2 animate-ping"></span>
                  GLOBAL STREAM ARCHIVE
                </span>
                <span className="text-[9px] text-slate-500">UPLINK ACTIVE</span>
              </h3>
              
              <form onSubmit={handleSearchVideos} className="space-y-3 mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH FOR ANOMALIES..."
                    className="flex-1 bg-black/60 border border-slate-700 rounded p-3 text-xs font-mono text-celestial-blue focus:outline-none focus:border-celestial-blue placeholder-slate-600 transition-all"
                    disabled={searching}
                  />
                  <button
                    type="submit"
                    disabled={searching || !searchQuery.trim()}
                    className="px-4 py-2 bg-celestial-blue/10 border border-celestial-blue text-celestial-blue hover:bg-celestial-blue hover:text-black transition-all text-[10px] font-bold tracking-widest uppercase rounded"
                  >
                    {searching ? '...' : 'SCAN'}
                  </button>
                </div>
                
                <div className="flex items-center gap-4 px-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Sort By:</span>
                  <div className="flex bg-black/40 border border-slate-800 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setSortBy('relevance')}
                      className={`px-3 py-1 text-[8px] font-mono uppercase tracking-tighter rounded transition-all ${sortBy === 'relevance' ? 'bg-celestial-blue/20 text-celestial-blue font-black' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                      Relevance
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('date')}
                      className={`px-3 py-1 text-[8px] font-mono uppercase tracking-tighter rounded transition-all ${sortBy === 'date' ? 'bg-celestial-blue/20 text-celestial-blue font-black' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                      Date
                    </button>
                  </div>
                </div>
              </form>

              {/* Selectable Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1 animate-in fade-in slide-in-from-top-2">
                   {searchResults.map((video, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleSelectResult(video)}
                        className={`w-full text-left p-3 rounded border transition-all flex gap-3 group bg-slate-900/40 cursor-pointer relative ${videoId === video.videoId ? 'border-celestial-blue bg-celestial-blue/5' : 'border-slate-800 hover:border-slate-600'}`}
                      >
                         <div className="w-24 aspect-video bg-black shrink-0 relative overflow-hidden rounded">
                            <img src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Thumb" />
                         </div>
                         <div className="flex-1 min-w-0 pr-12">
                            <div className="text-[10px] font-bold text-slate-200 line-clamp-1 group-hover:text-celestial-blue transition-colors uppercase tracking-wide">{video.title}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                               {video.uploadDate && (
                                 <span className="text-[8px] font-mono text-celestial-blue/70 px-1.5 py-0.5 bg-celestial-blue/5 border border-celestial-blue/20 rounded uppercase tracking-tighter">
                                   {video.uploadDate}
                                 </span>
                               )}
                               <span className="text-[8px] font-mono text-slate-600 uppercase tracking-tighter">ARCHIVE_PKT_{video.videoId.slice(0,4)}</span>
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 mt-1 line-clamp-2">{video.snippet || video.description}</div>
                         </div>
                         {/* Copy Snippet Button */}
                         <button 
                           onClick={(e) => handleCopySnippet(e, video.snippet || video.description || '', video.videoId)}
                           className={`absolute right-3 top-3 p-1.5 rounded bg-black/60 border border-white/5 text-[8px] font-mono tracking-tighter uppercase transition-all z-10 ${copiedId === video.videoId ? 'text-ufo-green border-ufo-green/50 bg-ufo-green/10' : 'text-slate-500 hover:text-white hover:border-celestial-blue/30'}`}
                           title="Copy snippet to clipboard"
                         >
                            {copiedId === video.videoId ? 'COPIED' : 'COPY'}
                         </button>
                      </div>
                   ))}
                </div>
              )}

              {searchResults.length === 0 && !searching && searchQuery && (
                 <div className="text-center py-4 border border-dashed border-slate-800 rounded text-[10px] font-mono text-slate-600">
                    NO ARCHIVAL MATCHES DETECTED
                 </div>
              )}
           </div>

           {/* Section 2: Live Surveillance Feed */}
           <div className="glass-panel p-6 rounded-xl border border-ufo-green/20 bg-black/40">
              <h3 className="text-xs font-mono text-ufo-green uppercase tracking-widest mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-ufo-green rounded-full mr-2 animate-pulse shadow-[0_0_8px_#00ff9d]"></span>
                  LIVE SURVEILLANCE FEED
                </span>
                <span className="text-[9px] text-slate-600">SECURE_SYNC</span>
              </h3>

              {loadingFeed ? (
                <RenderVideoSkeleton />
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                   {feedVideos.map((video, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleSelectResult(video)}
                        className={`w-full text-left p-3 rounded border border-white/5 transition-all flex gap-3 group bg-white/[0.02] hover:bg-ufo-green/[0.03] hover:border-ufo-green/30 ${videoId === video.videoId ? 'border-ufo-green bg-ufo-green/5' : ''}`}
                      >
                         <div className="w-24 aspect-video bg-black shrink-0 relative overflow-hidden rounded border border-white/5">
                            <img src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="Thumb" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-slate-300 line-clamp-2 group-hover:text-white transition-colors uppercase tracking-tight leading-tight">{video.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                               {video.uploadDate && (
                                 <span className="text-[7px] font-mono text-ufo-green/70 px-1 py-0.5 bg-ufo-green/5 border border-ufo-green/20 rounded uppercase tracking-tighter">
                                   {video.uploadDate}
                                 </span>
                               )}
                               <div className="text-[8px] font-mono text-slate-600 uppercase tracking-tighter">SURVEILLANCE_PKT_{video.videoId.slice(0,4)}</div>
                            </div>
                            {video.snippet && <div className="text-[8px] font-mono text-slate-500 mt-1 line-clamp-1 italic">{video.snippet}</div>}
                         </div>
                      </button>
                   ))}
                </div>
              )}
           </div>

           {/* Section 3: URL & Analysis Config */}
           <div className="glass-panel p-6 rounded-xl border border-white/10 bg-black/40 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Target Stream URL</label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="PASTE YOUTUBE URL..."
                  className="w-full bg-black/60 border border-slate-700 rounded p-3 text-xs font-mono text-celestial-blue focus:outline-none focus:border-celestial-blue transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Analysis Directives</label>
                <textarea
                  value={analysisPrompt}
                  onChange={(e) => setAnalysisPrompt(e.target.value)}
                  placeholder="EX: FOCUS ON UNUSUAL AERIAL MANEUVERS..."
                  className="w-full bg-black/60 border border-slate-700 rounded p-3 text-xs font-mono text-white focus:outline-none focus:border-celestial-blue h-24 resize-none transition-all"
                />
              </div>

              <button
                onClick={handleAnalyzeVideo}
                disabled={!videoId || analyzing}
                className="w-full py-4 bg-celestial-blue text-black font-display font-bold text-sm uppercase tracking-[0.2em] hover:bg-white transition-all disabled:opacity-30 rounded shadow-[0_0_20px_rgba(0,208,255,0.2)]"
              >
                {analyzing ? 'ANALYSIS IN PROGRESS...' : 'INITIATE TACTICAL SCAN'}
              </button>
           </div>
        </div>

        {/* RIGHT: Player & Report (7 cols) */}
        <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
           
           {/* Tactical Player */}
           <div className="glass-panel border-2 border-celestial-blue/30 rounded-xl overflow-hidden relative bg-black shadow-2xl flex flex-col">
              {videoId ? (
                <div className="aspect-video w-full relative" ref={playerContainerRef}>
                    <div id="yt-player-placeholder" className="w-full h-full"></div>
                </div>
              ) : (
                <div className="aspect-video w-full flex flex-col items-center justify-center text-slate-700 space-y-4">
                   <div className="w-16 h-16 border border-slate-800 rounded-full flex items-center justify-center opacity-30 animate-pulse">
                      {ICONS.VIDEO}
                   </div>
                   <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Awaiting Stream Vector</span>
                </div>
              )}
              
              {/* Tactical Timeline Control */}
              {videoId && playerReady && (
                  <div className="bg-black/90 border-t border-white/10 p-4 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono font-black text-celestial-blue tracking-widest">
                          <span>{formatTime(currentTime)}</span>
                          <span className="uppercase">{isPlaying ? 'PLAYING' : 'PAUSED'}</span>
                          <span>{formatTime(duration)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                          <button 
                            onClick={handlePlayPause}
                            className="text-celestial-blue hover:text-white"
                          >
                              {isPlaying ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                              ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              )}
                          </button>
                          <input 
                            type="range" 
                            min="0" 
                            max={duration || 100} 
                            value={currentTime} 
                            onChange={handleSeek}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-celestial-blue hover:accent-white transition-all"
                          />
                      </div>
                  </div>
              )}

              {/* Overlay Decor */}
              <div className="absolute top-2 right-2 flex gap-2 pointer-events-none">
                 <span className="px-2 py-0.5 bg-black/60 border border-celestial-blue/30 text-[8px] font-mono text-celestial-blue rounded backdrop-blur-sm">LIVE FEED</span>
                 <span className="px-2 py-0.5 bg-black/60 border border-slate-800 text-[8px] font-mono text-slate-400 rounded backdrop-blur-sm">ENCRYPTION: 256-BIT</span>
              </div>
           </div>

           {/* Intelligence Output */}
           <div className="glass-panel min-h-[400px] rounded-xl border border-white/10 bg-[#050508] relative overflow-hidden flex flex-col">
              
              {/* Loading State Overlay */}
              {analyzing && (
                 <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                    <TacticalLoader stage={stage} />
                 </div>
              )}

              {/* Report Content */}
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                 {analysisResult ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                       <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                          <h4 className="text-celestial-blue font-display text-xs uppercase tracking-widest m-0 flex items-center gap-2">
                             <span className="w-1.5 h-1.5 bg-celestial-blue rounded-full"></span>
                             TACTICAL INTELLIGENCE REPORT
                          </h4>
                          <div className="flex gap-2">
                             <button onClick={handleExportTXT} className="p-2 border border-slate-800 rounded hover:bg-white/5" title="Export TXT">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
                             </button>
                             <button onClick={handleLogToOpsBoard} className="px-3 py-1 bg-celestial-blue/10 border border-celestial-blue text-celestial-blue rounded text-[10px] font-mono uppercase font-bold hover:bg-celestial-blue hover:text-black transition-all">
                                LOG TO OPS
                             </button>
                          </div>
                       </div>
                       
                       <div className="font-mono text-[11px] leading-relaxed text-slate-300">
                          {/* Use Markdown with custom components for timestamp seeking */}
                          <div>
                              {analysisResult.text.split('\n').map((line, i) => (
                                  <p key={i} className="mb-2">
                                      {renderMarkdownWithTimestamps(line)}
                                  </p>
                              ))}
                          </div>
                       </div>

                       {analysisResult.groundingUrls && (
                          <div className="mt-8 pt-6 border-t border-slate-800">
                             <h5 className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">Signal Verification Sources</h5>
                             <div className="flex flex-wrap gap-2">
                                {analysisResult.groundingUrls.map((u, i) => (
                                   <a key={i} href={u.uri} target="_blank" rel="noreferrer" className="text-[10px] text-celestial-blue bg-celestial-blue/5 px-2 py-1 border border-celestial-blue/20 rounded hover:bg-celestial-blue hover:text-black transition-all">
                                      {u.title} ↗
                                   </a>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                       <span className="text-4xl opacity-20">{ICONS.BRAIN}</span>
                       <p className="font-mono text-xs tracking-widest text-center max-w-xs">
                          NO ANALYSIS DATA GENERATED.<br/>INITIATE SCAN TO PROCESS STREAM.
                       </p>
                    </div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default VideoIntel;
