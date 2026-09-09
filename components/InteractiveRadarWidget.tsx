import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Radar, 
  Radio, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  MapPin, 
  Compass, 
  Layers, 
  Filter, 
  Code2, 
  Check, 
  Copy,
  ChevronRight,
  Info,
  Zap,
  Globe
} from 'lucide-react';
import { UFOSighting, AnomalyCategory } from '../types';
import { getHistoricalSeedSightings } from '../services/seedService';
import { SightingOps } from '../services/firebaseService';
import { normalizeAnomalyCategory } from '../services/anomalyService';

export interface InteractiveRadarWidgetProps {
  theme?: 'emerald' | 'cyan' | 'amber' | 'crimson';
  defaultDomain?: 'ALL' | 'AIR' | 'SOLAR' | 'TECTONIC' | 'SCIENTIFIC' | 'GEOPOLITICAL';
  compact?: boolean;
  isStandalone?: boolean;
  onUplink?: (targetAnomalyId?: string) => void;
  onOpenEmbedModal?: () => void;
}

export const InteractiveRadarWidget: React.FC<InteractiveRadarWidgetProps> = ({
  theme = 'emerald',
  defaultDomain = 'ALL',
  compact = false,
  isStandalone = false,
  onUplink,
  onOpenEmbedModal
}) => {
  const [sightings, setSightings] = useState<UFOSighting[]>([]);
  const [activeDomain, setActiveDomain] = useState<string>(defaultDomain);
  const [timeHorizon, setTimeHorizon] = useState<'24H' | '7D' | '30D' | 'ALL'>('ALL');
  const [selectedAnomaly, setSelectedAnomaly] = useState<UFOSighting | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [sweepAngle, setSweepAngle] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'RADAR' | 'GRID'>('RADAR');
  const [radarZoom, setRadarZoom] = useState<number>(1);
  const [lastPingTime, setLastPingTime] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Theme configuration
  const themeConfig = useMemo(() => {
    switch (theme) {
      case 'cyan':
        return {
          primary: '#06b6d4',
          glow: 'rgba(6, 182, 212, 0.4)',
          border: 'border-cyan-500/30',
          bgHighlight: 'bg-cyan-500/10',
          textHighlight: 'text-cyan-400',
          accent: 'cyan'
        };
      case 'amber':
        return {
          primary: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.4)',
          border: 'border-amber-500/30',
          bgHighlight: 'bg-amber-500/10',
          textHighlight: 'text-amber-400',
          accent: 'amber'
        };
      case 'crimson':
        return {
          primary: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.4)',
          border: 'border-red-500/30',
          bgHighlight: 'bg-red-500/10',
          textHighlight: 'text-red-400',
          accent: 'red'
        };
      case 'emerald':
      default:
        return {
          primary: '#00ff9d',
          glow: 'rgba(0, 255, 157, 0.4)',
          border: 'border-ufo-green/30',
          bgHighlight: 'bg-ufo-green/10',
          textHighlight: 'text-ufo-green',
          accent: 'emerald'
        };
    }
  }, [theme]);

  // Load sightings (seeds + live firestore)
  useEffect(() => {
    const historicalSeeds = getHistoricalSeedSightings();
    setSightings(historicalSeeds);

    try {
      const unsubscribe = SightingOps.subscribeToSightings((items) => {
        if (items && items.length > 0) {
          const map = new Map<string, UFOSighting>();
          historicalSeeds.forEach(s => map.set(s.id, s));
          items.forEach(s => map.set(s.id, s));
          setSightings(Array.from(map.values()));
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.debug("Firebase subscription optional for radar widget:", e);
    }
  }, []);

  // Filter sightings by domain and timeframe
  const filteredSightings = useMemo(() => {
    let list = sightings;

    // Filter by Domain
    if (activeDomain !== 'ALL') {
      if (activeDomain === 'AIR') {
        list = list.filter(s => {
          const cat = (s.category || '').toLowerCase();
          return cat.includes('ufo') || cat.includes('uap') || cat.includes('aerial') || cat.includes('gov') || cat.includes('black ops');
        });
      } else if (activeDomain === 'SOLAR') {
        list = list.filter(s => {
          const str = (s.title + ' ' + s.description + ' ' + (s.category || '')).toLowerCase();
          return str.includes('solar') || str.includes('space') || str.includes('cosmic') || str.includes('bolide') || str.includes('orbital');
        });
      } else if (activeDomain === 'TECTONIC') {
        list = list.filter(s => {
          const str = (s.title + ' ' + s.description + ' ' + (s.category || '')).toLowerCase();
          return str.includes('seismic') || str.includes('quake') || str.includes('ocean') || str.includes('tectonic') || str.includes('hydrophone');
        });
      } else if (activeDomain === 'SCIENTIFIC') {
        list = list.filter(s => normalizeAnomalyCategory(s.category) === 'Scientific');
      } else if (activeDomain === 'GEOPOLITICAL') {
        list = list.filter(s => normalizeAnomalyCategory(s.category) === 'Geopolitical');
      }
    }

    // Filter by Time Horizon
    if (timeHorizon !== 'ALL') {
      const now = Date.now();
      const cutoffMs = timeHorizon === '24H' 
        ? 24 * 3600 * 1000 
        : timeHorizon === '7D' 
          ? 7 * 24 * 3600 * 1000 
          : 30 * 24 * 3600 * 1000;
      
      // Since historical seeds may be older, keep recent or proportionally sample to guarantee rich blips
      list = list.filter(s => {
        const t = typeof s.timestamp === 'number' ? s.timestamp : 0;
        return (now - t) < cutoffMs || s.severity === 'CRITICAL';
      });
    }

    return list;
  }, [sightings, activeDomain, timeHorizon]);

  // Audio radar ping synthesizer
  const playRadarSweepPing = () => {
    if (!isAudioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  };

  // Convert lat/lng to polar coordinates on circular scope
  const getRadarCoordinates = (s: UFOSighting, centerX: number, centerY: number, maxRadius: number) => {
    let lat = s.latitude ?? s.coordinates?.lat ?? 0;
    let lng = s.longitude ?? s.coordinates?.lng ?? 0;

    // Fallback pseudo-spatial projection from ID hash if missing coordinates
    if (!lat && !lng) {
      let hash = 0;
      for (let i = 0; i < s.id.length; i++) {
        hash = (hash << 5) - hash + s.id.charCodeAt(i);
      }
      const angle = Math.abs(hash % 360);
      const dist = (Math.abs((hash >> 3) % 80) + 15) / 100;
      return {
        x: centerX + Math.cos((angle * Math.PI) / 180) * (maxRadius * dist * radarZoom),
        y: centerY + Math.sin((angle * Math.PI) / 180) * (maxRadius * dist * radarZoom),
        angle,
        distanceRatio: dist
      };
    }

    // Polar equirectangular projection centered on prime/selected meridian
    const angleRad = ((lng + 180) / 360) * 2 * Math.PI - Math.PI / 2;
    const normDist = (1 - (lat + 90) / 180) * 0.85 + 0.1;
    const r = maxRadius * normDist * radarZoom;

    return {
      x: centerX + Math.cos(angleRad) * r,
      y: centerY + Math.sin(angleRad) * r,
      angle: ((angleRad * 180) / Math.PI + 360) % 360,
      distanceRatio: normDist
    };
  };

  // Canvas radar animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentAngle = 0;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(centerX, centerY) - 24;

      // 1. Clear with subtle persistence/fade
      ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // 2. Concentric Range Rings
      const rings = [0.25, 0.5, 0.75, 1.0];
      rings.forEach((ratio, idx) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * ratio, 0, 2 * Math.PI);
        ctx.strokeStyle = idx === 3 ? `${themeConfig.primary}44` : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = idx === 3 ? 1.5 : 1;
        ctx.setLineDash(idx === 3 ? [] : [2, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Range Label
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = '9px monospace';
        ctx.fillText(`${Math.round(ratio * 2000)} NM`, centerX + 4, centerY - maxRadius * ratio + 10);
      });

      // 3. Crosshairs and cardinal azimuth labels
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.stroke();

      // Azimuth markers
      ctx.fillStyle = themeConfig.primary;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('000° [N]', centerX, centerY - maxRadius - 8);
      ctx.fillText('180° [S]', centerX, centerY + maxRadius + 14);
      ctx.fillText('270° [W]', centerX - maxRadius - 18, centerY + 3);
      ctx.fillText('090° [E]', centerX + maxRadius + 18, centerY + 3);

      // 4. Sweeping Radar Beam (Phosphor gradient arc)
      const sweepRad = (currentAngle * Math.PI) / 180;
      const trailAngle = (Math.PI / 180) * 45; // 45 degree tail
      
      const sweepGradient = ctx.createConicGradient(sweepRad - trailAngle, centerX, centerY);
      sweepGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      sweepGradient.addColorStop(0.85, `${themeConfig.primary}05`);
      sweepGradient.addColorStop(1, `${themeConfig.primary}33`);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, sweepRad - trailAngle, sweepRad);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Bright sweep line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(sweepRad) * maxRadius, centerY + Math.sin(sweepRad) * maxRadius);
      ctx.strokeStyle = themeConfig.primary;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 5. Render Anomaly Blips
      filteredSightings.forEach((s) => {
        const coords = getRadarCoordinates(s, centerX, centerY, maxRadius);
        const blipAngle = coords.angle;

        // Calculate angular difference with current sweep beam
        let diff = Math.abs(currentAngle - blipAngle);
        if (diff > 180) diff = 360 - diff;

        const isHit = diff < 12;
        if (isHit && Date.now() - lastPingTime > 600) {
          setLastPingTime(Date.now());
          playRadarSweepPing();
        }

        // Color based on category or severity
        let blipColor = themeConfig.primary;
        const normCat = normalizeAnomalyCategory(s.category);
        if (normCat === 'Scientific') blipColor = '#06b6d4';
        else if (normCat === 'Economic') blipColor = '#10b981';
        else if (normCat === 'Geopolitical') blipColor = '#f59e0b';
        else if (s.severity === 'CRITICAL') blipColor = '#ef4444';

        const isSelected = selectedAnomaly?.id === s.id;

        // Pulsing glow when swept or selected
        if (isHit || isSelected) {
          ctx.beginPath();
          ctx.arc(coords.x, coords.y, isSelected ? 12 : 8, 0, 2 * Math.PI);
          ctx.fillStyle = `${blipColor}44`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(coords.x, coords.y, isSelected ? 16 : 12, 0, 2 * Math.PI);
          ctx.strokeStyle = blipColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Central blip dot
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, isSelected ? 4.5 : (s.severity === 'CRITICAL' ? 3.5 : 2.5), 0, 2 * Math.PI);
        ctx.fillStyle = blipColor;
        ctx.shadowColor = blipColor;
        ctx.shadowBlur = isHit || isSelected ? 10 : 3;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label if high/critical or selected
        if (isSelected || s.severity === 'CRITICAL') {
          ctx.fillStyle = '#ffffff';
          ctx.font = '8px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(s.title.slice(0, 16).toUpperCase(), coords.x + 8, coords.y - 4);
        }
      });

      // Update sweep rotation (roughly 60 degrees per second)
      currentAngle = (currentAngle + 1.2) % 360;
      setSweepAngle(Math.round(currentAngle));
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [filteredSightings, themeConfig, radarZoom, selectedAnomaly, isAudioEnabled]);

  // Click handler on radar canvas to select closest blip
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;
    const maxRadius = Math.min(centerX, centerY) - 24;

    let closest: UFOSighting | null = null;
    let minDistance = 24; // click tolerance in px

    filteredSightings.forEach((s) => {
      const coords = getRadarCoordinates(s, centerX, centerY, maxRadius);
      const dist = Math.hypot(coords.x - clickX, coords.y - clickY);
      if (dist < minDistance) {
        minDistance = dist;
        closest = s;
      }
    });

    if (closest) {
      setSelectedAnomaly(closest);
    }
  };

  const activeCount = filteredSightings.length;
  const criticalCount = filteredSightings.filter(s => s.severity === 'CRITICAL').length;

  return (
    <div 
      className={`relative flex flex-col bg-slate-950/95 border ${themeConfig.border} rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md text-slate-200 select-none ${
        isStandalone ? 'w-full h-screen' : 'w-full'
      }`}
    >
      {/* 1. Tactical HUD Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-black/60 border-b border-white/10 z-20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10">
            <Radar className={`w-4 h-4 ${themeConfig.textHighlight} animate-pulse`} />
            <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${themeConfig.bgHighlight} border border-${themeConfig.accent}-400 animate-ping`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-display font-black tracking-widest uppercase text-white">
                ANOMALY WATCH RADAR
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-white/10 text-slate-300 border border-white/10">
                v2.6 OSINT
              </span>
            </div>
            <p className="font-mono text-[9px] text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <span>LIVE TELEMETRY STREAM</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">AZIMUTH: {sweepAngle.toString().padStart(3, '0')}°</span>
            </p>
          </div>
        </div>

        {/* Telemetry Metrics & Action CTAs */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 font-mono text-[10px]">
            <div className="flex flex-col text-right">
              <span className="text-slate-500 text-[8px] uppercase">TRACKING</span>
              <span className="font-bold text-white">{activeCount} VECTORS</span>
            </div>
            {criticalCount > 0 && (
              <>
                <span className="h-4 w-px bg-white/10" />
                <div className="flex flex-col text-right">
                  <span className="text-red-500 text-[8px] uppercase font-bold">CRITICAL</span>
                  <span className="font-bold text-red-400">{criticalCount} SPIKES</span>
                </div>
              </>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsAudioEnabled(prev => !prev)}
            title={isAudioEnabled ? "Mute Radar Ping Audio" : "Enable Radar Ping Audio"}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isAudioEnabled 
                ? `${themeConfig.bgHighlight} ${themeConfig.border} ${themeConfig.textHighlight}` 
                : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Embed Code Modal Button */}
          {onOpenEmbedModal && (
            <button
              onClick={onOpenEmbedModal}
              title="Get Embed Code for Blogs & Sites"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>EMBED</span>
            </button>
          )}

          {/* Direct Uplink CTA */}
          <button
            onClick={() => onUplink ? onUplink(selectedAnomaly?.id) : window.open(window.location.origin, '_blank')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-[10px] font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
              theme === 'emerald'
                ? 'bg-ufo-green text-black hover:bg-ufo-green/90 shadow-[0_0_12px_rgba(0,255,157,0.3)]'
                : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>[ UPLINK FULL HUD ]</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Domain & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-black/40 border-b border-white/5 font-mono text-[9px] z-20">
        {/* Domain Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
          <span className="text-slate-500 uppercase font-bold pr-1">DOMAIN:</span>
          {[
            { id: 'ALL', label: 'ALL DOMAINS' },
            { id: 'AIR', label: '✈️ AIR DEFENSE' },
            { id: 'SOLAR', label: '☀️ COSMIC' },
            { id: 'TECTONIC', label: '🌋 SEISMIC' },
            { id: 'SCIENTIFIC', label: '🔬 SCIENTIFIC' },
            { id: 'GEOPOLITICAL', label: '🌐 GEOPOLITICAL' }
          ].map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDomain(d.id)}
              className={`px-2.5 py-1 rounded-lg uppercase font-bold tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeDomain === d.id
                  ? `${themeConfig.bgHighlight} ${themeConfig.textHighlight} border border-${themeConfig.accent}-500/40 shadow-[0_0_8px_${themeConfig.glow}]`
                  : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Temporal Range Pills */}
        <div className="flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3 text-slate-500 mr-1" />
          {(['24H', '7D', '30D', 'ALL'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTimeHorizon(t)}
              className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                timeHorizon === t
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Radar Scope Canvas Area */}
      <div className="relative flex-1 min-h-[380px] sm:min-h-[440px] flex items-center justify-center p-3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-black overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />

        {/* Circular Radar Scope Canvas */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="relative z-10 cursor-crosshair max-w-full max-h-full rounded-full"
          style={{ width: '100%', height: '100%', minHeight: '360px', aspectRatio: '1/1' }}
        />

        {/* Coordinates overlay in corner */}
        <div className="absolute bottom-3 left-4 z-20 pointer-events-none font-mono text-[8px] text-slate-500 space-y-0.5">
          <div>RADAR GRID: POLAR WGS-84</div>
          <div>RANGE: 2000 NM RADIUS</div>
          <div>RESOLUTION: 0.12° POLAR</div>
        </div>

        {/* Selected Anomaly Quick Target HUD (Overlaid on Bottom Right) */}
        {selectedAnomaly && (
          <div className="absolute bottom-3 right-3 max-w-sm sm:max-w-md p-3.5 rounded-xl bg-slate-950/95 border border-white/20 shadow-2xl z-30 font-mono text-xs backdrop-blur-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  selectedAnomaly.severity === 'CRITICAL' ? 'bg-red-500 animate-ping' : 'bg-ufo-green'
                }`} />
                <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                  TARGET VECTOR LOCKED
                </span>
              </div>
              <button 
                onClick={() => setSelectedAnomaly(null)}
                className="text-slate-400 hover:text-white cursor-pointer px-1"
              >
                ✕
              </button>
            </div>

            <h4 className="font-display font-bold text-white text-xs mb-1">
              {selectedAnomaly.title}
            </h4>

            <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 mb-2">
              <div><span className="text-slate-600">LOCATION:</span> {selectedAnomaly.location || 'GLOBAL_CORRIDOR'}</div>
              <div><span className="text-slate-600">SEVERITY:</span> <span className="text-red-400 font-bold">{selectedAnomaly.severity}</span></div>
              <div><span className="text-slate-600">CATEGORY:</span> {normalizeAnomalyCategory(selectedAnomaly.category)}</div>
              <div><span className="text-slate-600">COORDS:</span> {selectedAnomaly.coordinates ? `${selectedAnomaly.coordinates.lat.toFixed(1)}°, ${selectedAnomaly.coordinates.lng.toFixed(1)}°` : 'TRIANGULATING'}</div>
            </div>

            <p className="text-[10px] text-slate-300 line-clamp-2 mb-3 bg-black/40 p-2 rounded border border-white/5">
              {selectedAnomaly.description}
            </p>

            {/* Structured 3-Vector Summary Preview */}
            <div className="space-y-1.5 mb-3 text-[9px]">
              <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
                <span className="font-bold text-emerald-400">💡 Significance:</span> Standard baseline deviation in {selectedAnomaly.location || 'identified sector'}.
              </div>
              <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
                <span className="font-bold text-amber-400">⚙️ Potential Causes:</span> Aerospace telemetry trial, atmospheric refraction, or non-ballistic transit.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onUplink ? onUplink(selectedAnomaly.id) : window.open(`${window.location.origin}/?anomaly=${selectedAnomaly.id}`, '_blank')}
                className="w-full py-1.5 px-3 bg-ufo-green hover:bg-ufo-green/90 text-black font-black text-[10px] rounded-lg tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,255,157,0.3)]"
              >
                <Zap className="w-3 h-3" />
                <span>[ INVESTIGATE IN FULL HUD ]</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Real-time Ticker Footer */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 bg-black/70 border-t border-white/10 font-mono text-[9px] text-slate-400 z-20">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold shrink-0">INTEL TICKER:</span>
          <div className="truncate text-slate-300">
            {filteredSightings.length > 0 
              ? `[LATEST INTERCEPT] ${filteredSightings[0].title} — ${filteredSightings[0].location || 'GLOBAL'}`
              : 'SCANNING FOR SIGNAL DISRUPTIONS...'}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-slate-500">REF: ANOMALYWATCH_RADAR_WIDGET</span>
          <a
            href="https://ais-dev-s5d53dx5wapliajdfutdcn-8594280455.us-east5.run.app"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 ${themeConfig.textHighlight} hover:underline font-bold`}
          >
            <span>POWERED BY ANOMALY WATCH</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default InteractiveRadarWidget;
