import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Copy, 
  Check, 
  X, 
  Maximize2, 
  Shield, 
  Layers, 
  Crosshair, 
  Info, 
  Radio, 
  Compass, 
  Sliders,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { 
  ReconMode, 
  RECON_MODES, 
  GeneratedReconImage, 
  generateTacticalReconImage, 
  getReconVaultImages, 
  clearReconVault 
} from '../services/imageGenerationService';

interface VisualReconStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  initialMode?: ReconMode;
  sightingContext?: {
    id?: string;
    title?: string;
    location?: string;
    coordinates?: [number, number];
    category?: string;
    shape?: string;
  };
}

const PRESET_TARGETS = [
  {
    label: 'Tic-Tac Transmedium Intercept',
    prompt: 'Oblong white tic-tac cylindrical craft hovering motionless over ocean swells with no visible exhaust or flight control surfaces',
    mode: 'FLIR_THERMAL' as ReconMode
  },
  {
    label: 'TR-3B Black Triangle',
    prompt: 'Large matte-black triangular stealth craft with three circular white lights at each vertex and pulsing red ventral gravity oscillator over military test range',
    mode: 'NIGHT_VISION' as ReconMode
  },
  {
    label: 'Orbital Fast-Walker',
    prompt: 'Hyper-velocity luminescent object transiting low-Earth orbit past military surveillance satellite array at 22,000 mph',
    mode: 'SAR_SATELLITE' as ReconMode
  },
  {
    label: 'Cockpit Dogfight Telephoto',
    prompt: 'Metallic spinning saucer-shaped disc performing instantaneous 90-degree vector change against cloud banks captured by fighter jet camera',
    mode: 'GUN_CAMERA' as ReconMode
  },
  {
    label: 'Atmospheric Plasma Spheres',
    prompt: 'Cluster of self-luminous golden plasma orbs executing synchronized geometric formations over nuclear power facility cooling towers',
    mode: 'DAYLIGHT_TELEPHOTO' as ReconMode
  }
];

export const VisualReconStudioModal: React.FC<VisualReconStudioModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  initialMode = 'FLIR_THERMAL',
  sightingContext
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || sightingContext?.title || PRESET_TARGETS[0].prompt);
  const [mode, setMode] = useState<ReconMode>(initialMode);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '4:3'>('16:9');
  const [currentImage, setCurrentImage] = useState<GeneratedReconImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [vaultImages, setVaultImages] = useState<GeneratedReconImage[]>([]);
  const [activeTab, setActiveTab] = useState<'STUDIO' | 'VAULT'>('STUDIO');

  // Sync initial parameters when opened
  useEffect(() => {
    if (isOpen) {
      if (initialPrompt) setPrompt(initialPrompt);
      else if (sightingContext?.title) {
        setPrompt(`${sightingContext.shape ? `${sightingContext.shape} anomaly` : 'Unidentified aerial craft'} reported at ${sightingContext.location || 'undisclosed sector'}`);
      }
      if (initialMode) setMode(initialMode);
      setVaultImages(getReconVaultImages());
    }
  }, [isOpen, initialPrompt, initialMode, sightingContext]);

  // Load latest vault image or auto-generate initial sample if none
  useEffect(() => {
    if (isOpen && !currentImage) {
      const vault = getReconVaultImages();
      if (vault.length > 0) {
        setCurrentImage(vault[0]);
      } else {
        handleGenerate();
      }
    }
  }, [isOpen]);

  const getDimensions = () => {
    switch (aspectRatio) {
      case '1:1': return { width: 768, height: 768 };
      case '4:3': return { width: 1024, height: 768 };
      case '16:9':
      default: return { width: 1024, height: 576 };
    }
  };

  const handleGenerate = async (seedOverride?: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const { width, height } = getDimensions();
      const image = await generateTacticalReconImage({
        prompt: prompt.trim() || 'Anomalous aerial object in flight',
        mode,
        width,
        height,
        seed: seedOverride !== undefined ? seedOverride : Math.floor(Math.random() * 999999),
        sightingContext
      });
      setCurrentImage(image);
      setVaultImages(getReconVaultImages());
    } catch (err) {
      console.error('Recon image generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage.url;
    link.download = `ANOMALY_WATCH_RECON_${currentImage.mode}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    if (!currentImage) return;
    navigator.clipboard.writeText(currentImage.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-6xl h-[92vh] max-h-[900px] flex flex-col rounded-3xl bg-slate-950 border border-ufo-green/30 shadow-[0_0_50px_rgba(0,255,157,0.15)] overflow-hidden text-slate-200"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-ufo-green/10 border border-ufo-green/30 text-ufo-green shadow-[0_0_15px_rgba(0,255,157,0.2)]">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-display">
                    TACTICAL VISUAL RECON STUDIO
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    $0.00 FREE INFERENCE
                  </span>
                  <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono">
                    FLUX DIFFUSION + AESA RADAR
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Generate authentic defense-grade FLIR thermal signatures, satellite SAR returns, and night-vision optical captures.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono">
                <button
                  onClick={() => setActiveTab('STUDIO')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${activeTab === 'STUDIO' ? 'bg-ufo-green text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  STUDIO
                </button>
                <button
                  onClick={() => setActiveTab('VAULT')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === 'VAULT' ? 'bg-ufo-green text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  <Database className="w-3 h-3" />
                  <span>VAULT ({vaultImages.length})</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close Visual Recon Studio"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Content Body */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            
            {/* Left Column: Controls & Prompting (lg:col-span-5) */}
            <div className={`p-4 sm:p-5 border-r border-white/10 overflow-y-auto space-y-4 custom-scrollbar lg:col-span-5 ${activeTab === 'VAULT' ? 'hidden lg:block' : 'block'}`}>
              
              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders className="w-3 h-3 text-ufo-green" />
                  <span>TACTICAL INTEL PRESETS</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TARGETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(preset.prompt);
                        setMode(preset.mode);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-ufo-green/40 text-[11px] text-slate-300 transition-all text-left cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anomaly / Target Prompt Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Crosshair className="w-3 h-3 text-ufo-green" />
                    <span>TARGET PHENOMENON SPECIFICATION</span>
                  </label>
                  <span className="text-[10px] font-mono text-ufo-green">UNRESTRICTED</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the craft, flight behavior, shape, propulsion signature, or anomalous coordinates..."
                  rows={3}
                  className="w-full p-3 rounded-2xl bg-slate-900/80 border border-white/15 focus:border-ufo-green/60 text-sm text-white placeholder-slate-500 outline-none transition-all resize-none font-sans leading-relaxed"
                />
              </div>

              {/* Sensor Capture Mode Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-cyan-400" />
                  <span>RECONNAISSANCE SENSOR SUITE</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(RECON_MODES) as ReconMode[]).map((key) => {
                    const cfg = RECON_MODES[key];
                    const isSelected = mode === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setMode(key)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isSelected 
                            ? 'bg-ufo-green/15 border-ufo-green shadow-[0_0_15px_rgba(0,255,157,0.15)] text-white' 
                            : 'bg-slate-900/60 border-white/10 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold uppercase truncate">{cfg.name}</span>
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: cfg.color }}
                          />
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 truncate">
                          {cfg.sensorCode}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Aspect Ratio & Frame Geometry */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>FRAME GEOMETRY / ASPECT RATIO</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '16:9' as const, label: '16:9 Tactical Wide', dims: '1024 × 576' },
                    { id: '4:3' as const, label: '4:3 Gun Camera', dims: '1024 × 768' },
                    { id: '1:1' as const, label: '1:1 Sensor Grid', dims: '768 × 768' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => setAspectRatio(ratio.id)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        aspectRatio === ratio.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-slate-900/60 border-white/10 hover:border-white/20 text-slate-400'
                      }`}
                    >
                      <div className="text-xs">{ratio.label}</div>
                      <div className="text-[9px] font-mono opacity-60 mt-0.5">{ratio.dims}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Sensor Description */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                  <span className="text-slate-400">SENSOR SPECIFICATION</span>
                  <span className="text-ufo-green">{RECON_MODES[mode].badge}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {RECON_MODES[mode].description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => handleGenerate()}
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-ufo-green hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,255,157,0.3)] cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'SYNTHESIZING RECON CAPTURE...' : 'GENERATE RECONNAISSANCE CAPTURE ($0)'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleGenerate(Math.floor(Math.random() * 999999))}
                    disabled={loading || !currentImage}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-xs font-mono text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>RE-ROLL SEED</span>
                  </button>

                  <button
                    onClick={() => setMode('PROCEDURAL_RADAR')}
                    className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>AESA RADAR (OFFLINE)</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Visual Stage / Vault Gallery (lg:col-span-7) */}
            <div className="p-4 sm:p-5 flex flex-col justify-between overflow-y-auto bg-slate-950/60 custom-scrollbar lg:col-span-7">
              
              {activeTab === 'STUDIO' ? (
                <>
                  {/* Image Viewport Canvas */}
                  <div className="relative w-full flex-1 flex items-center justify-center min-h-[300px] sm:min-h-[380px] rounded-2xl bg-black border border-white/10 overflow-hidden group">
                    
                    {/* Scanner Grid Background */}
                    <div className="absolute inset-0 bg-[radial-gradient(#00ff9d_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

                    {/* HUD Corner Accents */}
                    <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-ufo-green pointer-events-none z-10" />
                    <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-ufo-green pointer-events-none z-10" />
                    <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-ufo-green pointer-events-none z-10" />
                    <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-ufo-green pointer-events-none z-10" />

                    {/* Image Render */}
                    {loading ? (
                      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-2 border-ufo-green/20 border-t-ufo-green animate-spin" />
                          <Crosshair className="w-6 h-6 text-ufo-green animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                            RESOLVING OPTICAL SENSOR TELEMETRY
                          </div>
                          <div className="text-xs text-ufo-green font-mono">
                            Applying {RECON_MODES[mode].name} filtering...
                          </div>
                        </div>
                      </div>
                    ) : currentImage ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={currentImage.url}
                          alt="Tactical Reconnaissance Anomaly Capture"
                          className="max-w-full max-h-full object-contain select-none"
                          referrerPolicy="no-referrer"
                        />

                        {/* Telemetry HUD Overlay in Bottom Left of Image */}
                        <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-ufo-green animate-ping" />
                            <span className="text-xs font-mono font-bold text-white uppercase">
                              {currentImage.modeLabel}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              SEED: {currentImage.seed}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-300">
                            <span>AZ: {currentImage.telemetry.azimuth.toFixed(1)}°</span>
                            <span>EL: {currentImage.telemetry.elevation.toFixed(1)}°</span>
                            <span className="text-ufo-green font-bold">{currentImage.source}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 text-slate-500 font-mono text-xs">
                        NO RECONNAISSANCE TELEMETRY BUFFERED. CLICK GENERATE TO INITIALIZE.
                      </div>
                    )}
                  </div>

                  {/* Bottom Image Control Tools */}
                  {currentImage && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-900 border border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-mono text-slate-300 truncate max-w-sm">
                        <span className="text-ufo-green font-bold">TARGET: </span>
                        <span>{currentImage.prompt}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyLink}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-ufo-green" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'COPIED' : 'COPY LINK'}</span>
                        </button>

                        <button
                          onClick={handleDownload}
                          className="px-3 py-1.5 rounded-xl bg-ufo-green hover:bg-emerald-400 text-black text-xs font-bold font-mono flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>DOWNLOAD CAPTURE</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Vault Gallery View */
                <div className="space-y-4 h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono uppercase">
                        RECONNAISSANCE VAULT ARCHIVE
                      </h4>
                      <p className="text-xs text-slate-400">
                        Cached visual evidence captures stored locally in browser session storage.
                      </p>
                    </div>
                    {vaultImages.length > 0 && (
                      <button
                        onClick={() => {
                          clearReconVault();
                          setVaultImages([]);
                        }}
                        className="text-[11px] font-mono text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        PURGE VAULT
                      </button>
                    )}
                  </div>

                  {vaultImages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/10 rounded-2xl">
                      <Camera className="w-10 h-10 text-slate-600 mb-2" />
                      <p className="text-xs font-mono text-slate-400">VAULT EMPTY</p>
                      <p className="text-[11px] text-slate-500 mt-1">Generate captures in the Studio tab to archive intelligence imagery.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto flex-1 custom-scrollbar pr-1">
                      {vaultImages.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setCurrentImage(item);
                            setActiveTab('STUDIO');
                          }}
                          className="group relative rounded-xl overflow-hidden border border-white/10 hover:border-ufo-green/60 transition-all cursor-pointer bg-slate-900"
                        >
                          <div className="aspect-video w-full overflow-hidden bg-black">
                            <img
                              src={item.url}
                              alt={item.prompt}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="p-2 space-y-0.5">
                            <div className="text-[10px] font-bold text-white font-mono truncate">
                              {item.prompt}
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                              <span className="text-ufo-green">{item.mode}</span>
                              <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
