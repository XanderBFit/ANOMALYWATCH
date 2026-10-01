import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Radio, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Sparkles,
  Copy, 
  Check, 
  AlertTriangle, 
  Activity, 
  Compass, 
  Layers, 
  Cpu, 
  FileText, 
  Maximize2,
  Zap,
  Globe,
  Radar,
  ArrowUpRight,
  Crosshair
} from 'lucide-react';
import TacticalLoader from './TacticalLoader';
import { triggerTacticalVibration, getFallbackDailyDispatch } from '../services/geminiService';
import { useAudio } from '../contexts/AudioContext';
import { VOICE_PERSONAS, VoicePersona } from '../services/speechNarrationService';
import Markdown from 'react-markdown';

interface DailyIntelligenceBriefingProps {
  briefingText: string;
  isLoading: boolean;
  onRescan: () => void;
  onOpenBriefingRoom?: () => void;
}

interface ParsedTelemetryVector {
  id: string;
  title: string;
  location?: string;
  altitude?: string;
  velocity?: string;
  sensor?: string;
  rawText: string;
}

export const DailyIntelligenceBriefing: React.FC<DailyIntelligenceBriefingProps> = ({
  briefingText,
  isLoading,
  onRescan,
  onOpenBriefingRoom
}) => {
  const [isVoiceDeckOpen, setIsVoiceDeckOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'SUMMARY_CARDS' | 'RAW_TELETYPE'>('SUMMARY_CARDS');

  const {
    isPlaying,
    isPaused,
    currentTrackId,
    playAudio,
    stopAudio,
    togglePause,
    skipForward,
    skipBackward,
    playbackSpeed,
    setPlaybackSpeed,
    voicePersona,
    setVoicePersona,
    speechEngine,
    setSpeechEngine,
    currentSegmentIndex,
    totalSegments,
    currentSectionTitle,
  } = useAudio();

  const isDailyBriefPlaying = isPlaying && currentTrackId === 'daily-intel-brief';

  const handlePlayPauseBrief = async () => {
    triggerTacticalVibration(30);
    if (isDailyBriefPlaying) {
      togglePause();
    } else {
      setIsVoiceDeckOpen(true);
      await playAudio(activeContent, 'daily-intel-brief', 'Daily Strategic Intelligence Dispatch');
    }
  };

  // Sanitize briefing content: Reject short/corrupted strings and 'caudate putamen'
  const activeContent = useMemo(() => {
    const trimmed = (briefingText || '').trim();
    if (
      trimmed.length < 120 || 
      trimmed.toLowerCase() === 'caudate putamen' ||
      trimmed.toLowerCase().includes('caudate putamen')
    ) {
      return getFallbackDailyDispatch();
    }
    return trimmed;
  }, [briefingText]);

  // Extract structured sections from the markdown content
  const parsedSections = useMemo(() => {
    const text = activeContent;
    
    // Extract timestamp or cycle date
    const cycleMatch = text.match(/\*\*CYCLE TIMESTAMP\*\*:\s*([^\n\r]+)/i) || 
                       text.match(/CYCLE[:\s]+([^\n\r]+)/i);
    const cycleStr = cycleMatch ? cycleMatch[1].trim() : `${new Date().toISOString().slice(0, 10)} // 04:00 UTC // DEFCON: 3`;

    // Extract Executive Overview
    const execMatch = text.match(/###\s*⚡?\s*EXECUTIVE OVERVIEW([\s\S]*?)(?=###|$)/i);
    const execOverview = execMatch ? execMatch[1].trim() : '';

    // Extract Significance
    const sigMatch = text.match(/###\s*💡?\s*SIGNIFICANCE([\s\S]*?)(?=###|$)/i);
    const significance = sigMatch ? sigMatch[1].trim() : '';

    // Extract Causes / Hypotheses
    const causesMatch = text.match(/###\s*⚙️?\s*POTENTIAL CAUSES[\s\S]*?([\s\S]*?)(?=###|$)/i);
    const causes = causesMatch ? causesMatch[1].trim() : '';

    // Extract Implications
    const impMatch = text.match(/###\s*🌐?\s*(?:POSSIBLE\s+)?IMPLICATIONS([\s\S]*?)(?=###|$)/i);
    const implications = impMatch ? impMatch[1].trim() : '';

    // Extract Telemetry Vectors
    const vecMatch = text.match(/###\s*📡?\s*(?:DETECTED\s+)?TELEMETRY VECTORS([\s\S]*?)(?=###|$)/i);
    const vectors = vecMatch ? vecMatch[1].trim() : '';

    return {
      cycleStr,
      execOverview: execOverview || text.slice(0, 450),
      significance,
      causes,
      implications,
      vectors,
      hasStructuredContent: !!(significance || causes || implications)
    };
  }, [activeContent]);

  // Parse Telemetry Vectors into high-contrast, structured telemetry cards
  const parsedVectors = useMemo<ParsedTelemetryVector[]>(() => {
    if (!parsedSections.vectors) return [];

    const lines = parsedSections.vectors
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l));

    return lines.map((line, idx) => {
      const cleanLine = line.replace(/^[-*•\d.]+\s*/, '').trim();
      
      // Look for format: **Title**: Detail | Alt: ... | Velocity: ... | Sensor: ...
      const titleMatch = cleanLine.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
      const title = titleMatch ? titleMatch[1] : `Vector 0${idx + 1}`;
      const payload = titleMatch ? titleMatch[2] : cleanLine;

      const segments = payload.split('|').map(s => s.trim());
      let location = segments[0] || 'Unspecified Corridor';
      let altitude: string | undefined;
      let velocity: string | undefined;
      let sensor: string | undefined;

      segments.forEach((seg, sIdx) => {
        if (sIdx === 0) return;
        const lower = seg.toLowerCase();
        if (lower.startsWith('alt:') || lower.includes('altitude')) {
          altitude = seg.replace(/^alt:\s*/i, '').trim();
        } else if (lower.startsWith('velocity:') || lower.startsWith('speed:') || lower.includes('mach')) {
          velocity = seg.replace(/^(?:velocity|speed):\s*/i, '').trim();
        } else if (lower.startsWith('sensor:') || lower.includes('radar') || lower.includes('ads-b') || lower.includes('noaa')) {
          sensor = seg.replace(/^sensor:\s*/i, '').trim();
        } else if (!sensor) {
          sensor = seg;
        }
      });

      return {
        id: `vec-${idx}`,
        title,
        location,
        altitude,
        velocity,
        sensor,
        rawText: cleanLine
      };
    });
  }, [parsedSections.vectors]);

  // Copy brief to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setIsCopied(true);
      triggerTacticalVibration(20);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.warn("Copy failed", e);
    }
  };

  return (
    <div 
      id="daily-intelligence-display-card"
      className="relative rounded-2xl bg-[#090a0f] border border-zinc-800 shadow-2xl overflow-hidden"
    >
      {/* Tactical Scanning Beam Animation: Sweeps across the top border continuously */}
      <div 
        id="tactical-scanning-beam"
        className="absolute top-0 left-0 w-48 h-[2px] bg-gradient-to-r from-transparent via-ufo-green to-transparent animate-scan-h pointer-events-none z-30" 
      />

      {/* Subtle high-contrast architectural grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none opacity-40" />

      {/* Top HUD Header Control Bar */}
      <header className="relative z-10 px-6 py-4 border-b border-zinc-800/80 bg-black/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Tactical Radar Beacon with Pulsing Ping Ring */}
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/70 text-ufo-green shrink-0">
            <Radar className="w-4 h-4 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ufo-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ufo-green"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xs md:text-sm font-display font-black text-white tracking-[0.2em] uppercase">
                DAILY STRATEGIC INTELLIGENCE DISPATCH
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE CHANNEL
              </span>
            </div>
            <div className="font-mono text-[10px] text-zinc-400 flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-zinc-300">CYCLE: {parsedSections.cycleStr}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-amber-400 font-semibold">DEFCON 3 ELEVATED</span>
            </div>
          </div>
        </div>

        {/* Tactical Control Actions */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono">
            <button
              id="btn-view-summary-cards"
              onClick={() => setViewMode('SUMMARY_CARDS')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'SUMMARY_CARDS'
                  ? 'bg-zinc-100 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              SUMMARY CARDS
            </button>
            <button
              id="btn-view-raw-teletype"
              onClick={() => setViewMode('RAW_TELETYPE')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'RAW_TELETYPE'
                  ? 'bg-cyan-400 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              RAW TELETYPE
            </button>
          </div>

          {/* Audio Synthesizer Button */}
          <button
            id="btn-daily-audio-narration"
            onClick={() => {
              if (isDailyBriefPlaying) {
                togglePause();
              } else {
                setIsVoiceDeckOpen(!isVoiceDeckOpen);
                if (!isVoiceDeckOpen) {
                  handlePlayPauseBrief();
                }
              }
            }}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              isDailyBriefPlaying
                ? isPaused
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse'
                : isVoiceDeckOpen
                ? 'bg-zinc-800 border-zinc-700 text-white'
                : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
            title="Listen to Tactical Audio Narration"
          >
            {isDailyBriefPlaying ? (
              isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">
              {isDailyBriefPlaying ? (isPaused ? 'RESUME AUDIO' : 'PAUSE AUDIO') : 'AUDIO BRIEF'}
            </span>
          </button>

          {/* Copy Button */}
          <button
            id="btn-copy-daily-dispatch"
            onClick={handleCopy}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
            title="Copy Intel to Clipboard"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-ufo-green" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isCopied ? 'COPIED' : 'COPY'}</span>
          </button>

          {/* Re-Scan Intel Button */}
          <button
            id="btn-rescan-daily-intel"
            onClick={() => {
              triggerTacticalVibration(40);
              onRescan();
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-ufo-green text-black hover:bg-ufo-green/90 font-mono text-[10px] font-black uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(0,255,157,0.3)] disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'SWEEPING...' : 'LIVE RE-SWEEP'}</span>
          </button>

          {/* Expand to Briefing Room */}
          {onOpenBriefingRoom && (
            <button
              id="btn-expand-briefing-room"
              onClick={onOpenBriefingRoom}
              className="p-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Open Full Briefing Command Room"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* TACTICAL VOICE READING COMLINK DECK */}
      <AnimatePresence>
        {(isVoiceDeckOpen || isDailyBriefPlaying) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden border-b border-zinc-800/80 bg-zinc-950/95 relative z-10"
          >
            <div className="p-4 md:p-5 flex flex-col gap-3.5">
              {/* Top telemetry status line */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  {/* Animated Equalizer Waveform */}
                  <div className="flex items-end gap-1 h-5 px-2 py-1 rounded bg-black/70 border border-zinc-800 shrink-0">
                    {[0.35, 0.9, 0.6, 1.0, 0.75, 0.5, 0.85, 0.4].map((height, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-sm transition-all duration-150 ${
                          isDailyBriefPlaying && !isPaused
                            ? 'bg-ufo-green animate-pulse'
                            : 'bg-zinc-700'
                        }`}
                        style={{
                          height: isDailyBriefPlaying && !isPaused ? `${Math.max(25, height * 100)}%` : '25%',
                          animationDelay: `${i * 110}ms`
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                      <Radio className={`w-3.5 h-3.5 ${isDailyBriefPlaying && !isPaused ? 'text-ufo-green animate-pulse' : 'text-zinc-500'}`} />
                      {isDailyBriefPlaying
                        ? isPaused
                          ? 'COMLINK AUDIO STREAM PAUSED'
                          : 'COMLINK AUDIO STREAM TRANSMITTING'
                        : 'TACTICAL VOICE ENGINE STANDBY'}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {totalSegments > 0 
                        ? `MILESTONE ${Math.min(totalSegments, currentSegmentIndex + 1)} OF ${totalSegments}: ${currentSectionTitle.toUpperCase()}`
                        : 'READY FOR DISPATCH'}
                    </span>
                  </div>
                </div>

                {/* Quick controls: Engine & Speed */}
                <div className="flex items-center gap-2">
                  {/* Speed toggle */}
                  <div className="flex items-center rounded-lg bg-black border border-zinc-800 p-0.5 text-[10px] font-mono">
                    {[0.85, 1.0, 1.2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => {
                          setPlaybackSpeed(spd);
                          triggerTacticalVibration(15);
                        }}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          playbackSpeed === spd
                            ? 'bg-zinc-700 text-white font-bold'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Engine switcher */}
                  <div className="flex items-center rounded-lg bg-black border border-zinc-800 p-0.5 text-[10px] font-mono">
                    <button
                      onClick={() => {
                        setSpeechEngine('local');
                        triggerTacticalVibration(20);
                      }}
                      className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        speechEngine === 'local'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title="Browser Tactical Synth (Fast, 100% Reliable, Zero-Lag, Never Cuts Out)"
                    >
                      TACTICAL SYNTH
                    </button>
                    <button
                      onClick={() => {
                        setSpeechEngine('gemini');
                        triggerTacticalVibration(20);
                      }}
                      className={`px-2.5 py-0.5 rounded font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        speechEngine === 'gemini'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title="Gemini Neural AI (High-Definition Voice Stream)"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      NEURAL AI
                    </button>
                  </div>
                </div>
              </div>

              {/* Narrative Milestones Progress Bar */}
              <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-gradient-to-r from-ufo-green to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${totalSegments > 0 ? Math.min(100, Math.round(((currentSegmentIndex + 1) / totalSegments) * 100)) : 0}%`
                  }}
                />
              </div>

              {/* Persona Selectors & Transport Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* Persona selector pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono mr-1">Voice Profile:</span>
                  {(['OPERATIVE', 'ANALYST', 'INTERCEPT'] as VoicePersona[]).map((p) => {
                    const cfg = VOICE_PERSONAS[p];
                    const isSelected = voicePersona === p;
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          setVoicePersona(p);
                          triggerTacticalVibration(20);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-200 text-black shadow-sm'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                        title={cfg.desc}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {/* Transport Action Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      skipBackward();
                      triggerTacticalVibration(20);
                    }}
                    disabled={!isDailyBriefPlaying}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 cursor-pointer transition-all"
                    title="Previous Chapter"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handlePlayPauseBrief}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-mono text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isDailyBriefPlaying
                        ? isPaused
                          ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                          : 'bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : 'bg-ufo-green text-black hover:bg-ufo-green/90 shadow-[0_0_12px_rgba(0,255,157,0.3)]'
                    }`}
                  >
                    {isDailyBriefPlaying ? (
                      isPaused ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          RESUME
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          PAUSE
                        </>
                      )
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        START BRIEFING
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      skipForward();
                      triggerTacticalVibration(20);
                    }}
                    disabled={!isDailyBriefPlaying}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 cursor-pointer transition-all"
                    title="Next Chapter"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>

                  {isDailyBriefPlaying && (
                    <button
                      onClick={() => {
                        stopAudio();
                        triggerTacticalVibration(30);
                      }}
                      className="p-1.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 hover:bg-red-900/60 hover:text-white cursor-pointer transition-all"
                      title="Halt Transmission"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Body */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 md:p-14 flex flex-col items-center justify-center min-h-[420px]"
          >
            {/* Preserving Full Tactical Scanning Animation & Radar Progress Hub */}
            <TacticalLoader stage="SWEEPING MULTI-DOMAIN SENSORS & TACTICAL FEEDS..." />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-6 md:p-8 space-y-6"
          >
            {viewMode === 'SUMMARY_CARDS' ? (
              <div className="space-y-6">
                {/* 1. MEANINGFUL SUMMARY OVERVIEW CARDS (Replacing Cryptic Keywords & Metrics) */}
                <div 
                  id="meaningful-summary-cards-strip" 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
                >
                  {/* Card 1: Primary Corridor */}
                  <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-2 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-ufo-green" />
                        PRIMARY CORRIDOR
                      </span>
                      <span className="text-[9px] font-mono font-bold text-ufo-green px-1.5 py-0.5 rounded bg-ufo-green/10 border border-ufo-green/20">
                        ACTIVE
                      </span>
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-white text-sm leading-snug">
                        Northern Pacific & Continental Atlantic
                      </h4>
                      <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                        Synchronized non-ballistic trajectories & micro-burst RF signatures.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Multi-Sensor Verification */}
                  <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-2 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        SENSOR VERIFICATION
                      </span>
                      <span className="text-[9px] font-mono font-bold text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                        3 ARRAYS
                      </span>
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-white text-sm leading-snug">
                        Tri-Domain Confirmation
                      </h4>
                      <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                        Corroborated across passive ADS-B, USGS seismics, and NOAA ionospheric monitors.
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Airspace Advisory */}
                  <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-2 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        AIRSPACE POSTURE
                      </span>
                      <span className="text-[9px] font-mono font-bold text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        ADVISORY
                      </span>
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-white text-sm leading-snug">
                        Commercial Vector Advisory
                      </h4>
                      <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                        Intermittent transponder drift and navigation anomalies logged in coastal corridors.
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Intelligence Disposition */}
                  <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-2 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-zinc-300" />
                        INTELLIGENCE LEAD
                      </span>
                      <span className="text-[9px] font-mono font-bold text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-700/40 border border-zinc-600/50">
                        45% EST
                      </span>
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-white text-sm leading-snug">
                        Aerospace Prototype Trials
                      </h4>
                      <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                        Evaluated alongside atmospheric plasma shear (35%) and unclassified vectors (20%).
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. EXECUTIVE OVERVIEW (Typography-First Editorial Lead) */}
                <article className="p-6 md:p-7 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3 relative">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-ufo-green" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                      EXECUTIVE OPERATIONAL SYNTHESIS
                    </span>
                  </div>
                  <div className="text-zinc-100 text-sm md:text-[15px] leading-relaxed max-w-4xl font-normal font-sans prose prose-invert prose-p:my-2 prose-strong:text-white">
                    <Markdown>{parsedSections.execOverview}</Markdown>
                  </div>
                </article>

                {/* 3. THREE CORE INTELLIGENCE SUMMARY CARDS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Card A: Operational Significance */}
                  <div 
                    id="card-operational-significance"
                    className="p-5 md:p-6 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <span className="text-base" role="img" aria-label="Significance">💡</span>
                          <h3 className="font-sans font-bold text-sm text-white tracking-tight uppercase">
                            Operational Significance
                          </h3>
                        </div>
                        <span className="text-[9px] font-mono font-semibold text-emerald-400/80 uppercase">
                          BASELINE DEPARTURE
                        </span>
                      </div>
                      
                      <div className="text-zinc-300 text-xs md:text-sm leading-relaxed prose prose-invert prose-p:my-1.5 prose-strong:text-zinc-100">
                        {parsedSections.significance ? (
                          <Markdown>{parsedSections.significance}</Markdown>
                        ) : (
                          <p>
                            Physical telemetry departures significantly outpace standard civilian air traffic baselines, 
                            warranting multi-spectrum sensor observation and cross-correlation with ground seismic arrays.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>CORROBORATION</span>
                      <span className="text-emerald-400 font-semibold">3+ Independent Sensors</span>
                    </div>
                  </div>

                  {/* Card B: Potential Causes */}
                  <div 
                    id="card-potential-causes"
                    className="p-5 md:p-6 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2 text-amber-400">
                          <span className="text-base" role="img" aria-label="Causes">⚙️</span>
                          <h3 className="font-sans font-bold text-sm text-white tracking-tight uppercase">
                            Evaluated Hypotheses
                          </h3>
                        </div>
                        <span className="text-[9px] font-mono font-semibold text-amber-400/80 uppercase">
                          MULTI-VECTOR TEST
                        </span>
                      </div>
                      
                      <div className="text-zinc-300 text-xs md:text-sm leading-relaxed prose prose-invert prose-p:my-1.5 prose-strong:text-zinc-100 prose-ul:pl-4 prose-li:my-1">
                        {parsedSections.causes ? (
                          <Markdown>{parsedSections.causes}</Markdown>
                        ) : (
                          <ul className="space-y-1.5 list-disc pl-4 text-xs">
                            <li>Conventional: Ionospheric shear filaments & plasma reflection (35% Est.)</li>
                            <li>Military: Nocturnal low-observable aerospace prototype trials (45% Est.)</li>
                            <li>Unconventional: Trans-medium non-ballistic kinetic vectors (20% Est.)</li>
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>PRIMARY VECTOR</span>
                      <span className="text-amber-400 font-semibold">Hypersonic Prototype Trials</span>
                    </div>
                  </div>

                  {/* Card C: Possible Implications */}
                  <div 
                    id="card-possible-implications"
                    className="p-5 md:p-6 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2 text-cyan-400">
                          <span className="text-base" role="img" aria-label="Implications">🌐</span>
                          <h3 className="font-sans font-bold text-sm text-white tracking-tight uppercase">
                            Strategic Implications
                          </h3>
                        </div>
                        <span className="text-[9px] font-mono font-semibold text-cyan-400/80 uppercase">
                          DIRECTIVES ACTIVE
                        </span>
                      </div>
                      
                      <div className="text-zinc-300 text-xs md:text-sm leading-relaxed prose prose-invert prose-p:my-1.5 prose-strong:text-zinc-100 prose-ul:pl-4 prose-li:my-1">
                        {parsedSections.implications ? (
                          <Markdown>{parsedSections.implications}</Markdown>
                        ) : (
                          <ul className="space-y-1.5 list-disc pl-4 text-xs">
                            <li>Civilian Airspace: Alert issued for commercial transponder drifts</li>
                            <li>Sensor Calibration: Doppler radar filtering threshold recalibration</li>
                            <li>Defense & Research: Coordinated optical observatory surveillance sweep</li>
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>ADVISORY DIRECTIVE</span>
                      <span className="text-cyan-400 font-semibold">Doppler Filter Recalibration</span>
                    </div>
                  </div>
                </div>

                {/* 4. DETECTED TELEMETRY VECTORS (Typography-First Structured Data Cards) */}
                {parsedVectors.length > 0 && (
                  <div 
                    id="detected-telemetry-vectors-card" 
                    className="p-5 md:p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crosshair className="w-4 h-4 text-ufo-green" />
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                          DETECTED SENSOR TELEMETRY VECTORS
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {parsedVectors.length} INTERCEPT NODES
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {parsedVectors.map(vec => (
                        <div 
                          key={vec.id}
                          className="p-4 rounded-lg bg-black/60 border border-zinc-800/90 space-y-2 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-ufo-green">
                              {vec.title}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase">
                              VERIFIED
                            </span>
                          </div>

                          <h4 className="font-sans font-semibold text-white text-xs leading-snug">
                            {vec.location}
                          </h4>

                          <div className="pt-2 border-t border-zinc-800/80 space-y-1 text-[11px] font-mono text-zinc-300">
                            {vec.altitude && (
                              <div className="flex justify-between text-zinc-400">
                                <span>ALTITUDE:</span>
                                <span className="text-zinc-200 font-bold">{vec.altitude}</span>
                              </div>
                            )}
                            {vec.velocity && (
                              <div className="flex justify-between text-zinc-400">
                                <span>VELOCITY:</span>
                                <span className="text-cyan-300 font-bold">{vec.velocity}</span>
                              </div>
                            )}
                            {vec.sensor && (
                              <div className="flex justify-between text-zinc-400">
                                <span>SENSOR:</span>
                                <span className="text-zinc-300 font-medium truncate max-w-[150px]">{vec.sensor}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* RAW TELETYPE VIEW */
              <div className="p-6 rounded-xl bg-black/90 border border-zinc-800 font-mono text-xs text-zinc-300 space-y-3 leading-relaxed max-h-[550px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-[10px] text-ufo-green">
                  <span>TERMINAL ENCRYPTION: DECRYPTED AES-256</span>
                  <span>CHAR_COUNT: {activeContent.length}</span>
                </div>
                <div className="prose prose-invert max-w-none text-zinc-300 prose-headings:text-white prose-strong:text-white">
                  <Markdown>{activeContent}</Markdown>
                </div>
              </div>
            )}

            {/* Bottom Telemetry Footer */}
            <footer className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 text-ufo-green" />
                  AUTHENTICATED SENSOR INTELLIGENCE
                </span>
                <span>•</span>
                <span>GROUNDING: LIVE OSINT + NOAA + USGS SEISMIC ARRAYS</span>
              </div>

              <div className="flex items-center gap-3">
                <span>STATUS: MULTI-VECTOR VERIFIED</span>
                <button
                  onClick={onRescan}
                  className="text-ufo-green hover:underline cursor-pointer font-bold"
                >
                  [ RE-SWEEP DISPATCH ]
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
