import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Palette, 
  Sliders, 
  Globe, 
  ShieldCheck, 
  X,
  Sparkles
} from 'lucide-react';
import { InteractiveRadarWidget } from './InteractiveRadarWidget';

interface EmbedWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmbedWidgetModal: React.FC<EmbedWidgetModalProps> = ({ isOpen, onClose }) => {
  const [theme, setTheme] = useState<'emerald' | 'cyan' | 'amber' | 'crimson'>('emerald');
  const [domain, setDomain] = useState<'ALL' | 'AIR' | 'SOLAR' | 'TECTONIC' | 'SCIENTIFIC' | 'GEOPOLITICAL'>('ALL');
  const [height, setHeight] = useState<number>(540);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isUrlCopied, setIsUrlCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-s5d53dx5wapliajdfutdcn-8594280455.us-east5.run.app';
  const embedUrl = `${baseUrl}/?mode=widget&theme=${theme}&domain=${domain}`;
  
  const iframeSnippet = `<iframe 
  src="${embedUrl}" 
  width="100%" 
  height="${height}" 
  frameborder="0" 
  style="border: 1px solid rgba(0,255,157,0.25); border-radius: 16px; background: #020617; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);" 
  allow="clipboard-write"
  title="Anomaly Watch Live Radar Widget"
></iframe>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(iframeSnippet);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(embedUrl);
    setIsUrlCopied(true);
    setTimeout(() => setIsUrlCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-950 border border-ufo-green/30 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-black/60 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-ufo-green/10 border border-ufo-green/30 text-ufo-green">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-white tracking-widest uppercase">
                EMBEDDABLE RADAR WIDGET GENERATOR
              </h3>
              <p className="font-mono text-[10px] text-slate-400">
                Embed live anomaly surveillance & interactive telemetry on any blog, website, or dashboard
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Settings + Live Preview */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10 font-mono text-xs">
            
            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-ufo-green" />
                <span>COLOR THEME</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'emerald', label: 'Tactical Emerald', color: '#00ff9d' },
                  { id: 'cyan', label: 'Air Defense Cyan', color: '#06b6d4' },
                  { id: 'amber', label: 'Cosmic Amber', color: '#f59e0b' },
                  { id: 'crimson', label: 'Alert Crimson', color: '#ef4444' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      theme === t.id
                        ? 'bg-white/10 border-white/40 text-white'
                        : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Default Domain Filter */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>DEFAULT DOMAIN FOCUS</span>
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-ufo-green cursor-pointer"
              >
                <option value="ALL">ALL DOMAINS (Global 360°)</option>
                <option value="AIR">✈️ Air Defense / Aerospace</option>
                <option value="SOLAR">☀️ Solar & Cosmic Weather</option>
                <option value="TECTONIC">🌋 Seismic & Ocean Tectonic</option>
                <option value="SCIENTIFIC">🔬 Scientific Breakthroughs</option>
                <option value="GEOPOLITICAL">🌐 Geopolitical Outliers</option>
              </select>
            </div>

            {/* Height Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>WIDGET HEIGHT</span>
                </span>
                <span className="text-white">{height}px</span>
              </div>
              <input
                type="range"
                min="420"
                max="750"
                step="20"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full accent-ufo-green cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Compact (420px)</span>
                <span>Standard (540px)</span>
                <span>Large (750px)</span>
              </div>
            </div>
          </div>

          {/* Generated Code Snippet Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>HTML IFRAME CODE</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-ufo-green/10 text-ufo-green border border-ufo-green/20">
                  Ready to Paste
                </span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-[10px] font-bold transition-all cursor-pointer"
                >
                  {isUrlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{isUrlCopied ? 'URL COPIED!' : 'COPY DIRECT URL'}</span>
                </button>

                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-ufo-green hover:bg-ufo-green/90 text-black font-mono text-[10px] font-black tracking-wider transition-all shadow-[0_0_12px_rgba(0,255,157,0.3)] cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'CODE COPIED!' : 'COPY IFRAME SNIPPET'}</span>
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl bg-black border border-white/10 p-4 font-mono text-[11px] text-slate-300 overflow-x-auto custom-scrollbar">
              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                {iframeSnippet}
              </pre>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>LIVE RESPONSIVE PREVIEW</span>
                <span className="text-[9px] text-slate-500 font-normal">
                  (Fully interactive: click blips, scrub time, switch domains)
                </span>
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-950">
              <InteractiveRadarWidget
                theme={theme}
                defaultDomain={domain}
                compact={false}
                isStandalone={false}
              />
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-black/80 border-t border-white/10 font-mono text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero dependencies required. Seamlessly embeds across WordPress, Ghost, Substack, React, or static HTML.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer"
          >
            DONE
          </button>
        </div>

      </div>
    </div>
  );
};

export default EmbedWidgetModal;
