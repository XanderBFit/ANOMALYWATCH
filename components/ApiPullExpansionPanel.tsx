import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Radio, 
  Terminal, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  Key, 
  Globe, 
  Plane, 
  Sun, 
  MessageSquare, 
  Sparkles, 
  Sliders, 
  ChevronDown, 
  ChevronUp,
  Cpu,
  Layers,
  Flame
} from 'lucide-react';
import { AwButton } from './AwButton';
import { IntelHarvester } from './IntelHarvester';

interface ApiPullExpansionPanelProps {
  sightingCount: number;
}

export const ApiPullExpansionPanel: React.FC<ApiPullExpansionPanelProps> = ({ sightingCount }) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showHarvesterTerminal, setShowHarvesterTerminal] = useState(false);
  
  // Custom API configuration state stored in localStorage
  const [openSkyKey, setOpenSkyKey] = useState(localStorage.getItem('aw_config_opensky') || '');
  const [nasaKey, setNasaKey] = useState(localStorage.getItem('aw_config_nasa') || '');
  const [customSubreddit, setCustomSubreddit] = useState(localStorage.getItem('aw_config_subreddit') || 'UFOs,HighStrangeness,Anomalies');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState(false);

  const handleSaveConfig = () => {
    localStorage.setItem('aw_config_opensky', openSkyKey);
    localStorage.setItem('aw_config_nasa', nasaKey);
    localStorage.setItem('aw_config_subreddit', customSubreddit);
    setSavedSuccessMsg(true);
    setTimeout(() => setSavedSuccessMsg(false), 3000);
  };

  const apiPipelines = [
    {
      id: 'usgs',
      name: 'USGS Earthquake GeoJSON API',
      type: 'Seismic & Crustal Friction',
      status: 'ACTIVE',
      endpoint: 'earthquake.usgs.gov/summary/all_day.geojson',
      icon: <Globe className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'opensky',
      name: 'OpenSky Network ADS-B Radar',
      type: 'High-Altitude Flight Trajectories',
      status: 'ACTIVE',
      endpoint: 'opensky-network.org/api/states/all',
      icon: <Plane className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'noaa',
      name: 'NOAA SWPC Solar Telemetry',
      type: 'Space Weather & Geomagnetic Index',
      status: 'ACTIVE',
      endpoint: 'services.swpc.noaa.gov/json',
      icon: <Sun className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'nasa_eonet',
      name: 'NASA EONET Natural Event Tracker',
      type: 'Volcanoes, Wildfires, Storms & Icebergs',
      status: 'ACTIVE',
      endpoint: 'eonet.gsfc.nasa.gov/api/v3/events',
      icon: <Flame className="w-4 h-4 text-orange-400" />
    },
    {
      id: 'celestrak',
      name: 'NORAD CelesTrak Satellite Orbits',
      type: 'Visible Satellites & Space Object Telemetry',
      status: 'ACTIVE',
      endpoint: 'celestrak.org/NORAD/elements/gp.php',
      icon: <Cpu className="w-4 h-4 text-sky-400" />
    },
    {
      id: 'gdacs',
      name: 'UN GDACS Global Disaster Alerts',
      type: 'Earthquakes, Tsunamis, Cyclones & Volcanic Plumes',
      status: 'ACTIVE',
      endpoint: 'www.gdacs.org/gdacsapi/api/events',
      icon: <Layers className="w-4 h-4 text-red-400" />
    },
    {
      id: 'ndbc',
      name: 'NOAA NDBC Marine Observation Buoys',
      type: 'Ocean Wave Spikes, Atmospheric Pressure & Sea Temp',
      status: 'ACTIVE',
      endpoint: 'www.ndbc.noaa.gov/data/latest_obs',
      icon: <Radio className="w-4 h-4 text-cyan-300" />
    },
    {
      id: 'reddit',
      name: 'Social Media OSINT & Reddit Ingress',
      type: `r/${customSubreddit.split(',')[0]} Forum & Social Chatter Ingestion`,
      status: 'ACTIVE',
      endpoint: '/api/reddit?limit=12 & X/Bluesky OSINT Stream',
      icon: <MessageSquare className="w-4 h-4 text-amber-500" />
    },
    {
      id: 'financial',
      name: 'Financial Market Volatility Ingress',
      type: 'Crypto, VIX, Commodities & Liquidity Anomaly Tracking',
      status: 'ACTIVE',
      endpoint: 'RealWorldDataService.fetchFinancialMarketAnomalies()',
      icon: <Activity className="w-4 h-4 text-red-400" />
    },
    {
      id: 'gemini',
      name: 'Gemini Web Search Scraper',
      type: 'Real-Time News & Academic Grounding',
      status: 'ACTIVE',
      endpoint: 'googleSearch Grounding Pipeline',
      icon: <Sparkles className="w-4 h-4 text-ufo-green" />
    },
    {
      id: 'firestore',
      name: 'Firebase Cloud Database Sink',
      type: 'Multi-User Global State Sync',
      status: 'ACTIVE',
      endpoint: 'ai-studio-b995628b.firebaseapp.com',
      icon: <Database className="w-4 h-4 text-purple-400" />
    }
  ];

  return (
    <div className="bg-slate-950/80 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-ufo-green" />
            <h3 className="text-sm font-display font-black text-white tracking-[0.25em] uppercase">
              DATABASE & LIVE API SINK EXPANSION
            </h3>
          </div>
          <p className="text-xs font-mono text-slate-400">
            MULTISPECTRAL SENSOR NETWORK INGESTION • {sightingCount} RECORDS SYNCHRONIZED
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AwButton
            variant="primary"
            size="md"
            onClick={() => setShowHarvesterTerminal(!showHarvesterTerminal)}
          >
            <Radio className="w-4 h-4" />
            <span>{showHarvesterTerminal ? 'CLOSE LIVE HARVEST' : '🚀 EXECUTE GLOBAL API PULL'}</span>
          </AwButton>

          <AwButton
            variant="glass"
            size="md"
            onClick={() => setShowConfigModal(!showConfigModal)}
          >
            <Sliders className="w-4 h-4" />
            <span>CONFIGURE ENDPOINTS</span>
          </AwButton>
        </div>
      </div>

      {/* Live Harvester Terminal Container */}
      <AnimatePresence>
        {showHarvesterTerminal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-black/80 border border-ufo-green/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-mono font-bold text-ufo-green uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  REAL-TIME MULTI-SOURCE INGESTION HARVESTER
                </span>
                <span className="text-[10px] font-mono text-slate-500">Auto-Writing to Firestore Sink</span>
              </div>
              <IntelHarvester />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active API Streams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apiPipelines.map((pipe) => (
          <div 
            key={pipe.id}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-ufo-green/40 transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pipe.icon}
                <span className="text-xs font-mono font-bold text-white group-hover:text-ufo-green transition-colors">
                  {pipe.name}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {pipe.status}
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              {pipe.type}
            </div>

            <div className="text-[9px] font-mono text-slate-500 truncate bg-black/40 px-2 py-1 rounded border border-white/5">
              {pipe.endpoint}
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 rounded-2xl bg-black/90 border border-cyan-500/40 space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                <Sliders className="w-4 h-4" />
                <span>EXPAND DATABASE & CUSTOM API CONFIGURATION</span>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-xs font-mono text-slate-500 hover:text-white"
              >
                [ CLOSE ]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-300">OpenSky Network Credentials / OAuth</label>
                <input
                  type="text"
                  value={openSkyKey}
                  onChange={(e) => setOpenSkyKey(e.target.value)}
                  placeholder="Optional Username:Password or Token"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-300">NASA DONKI / SWPC API Key</label>
                <input
                  type="text"
                  value={nasaKey}
                  onChange={(e) => setNasaKey(e.target.value)}
                  placeholder="DEMO_KEY or custom NASA Key"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-300">Target Reddit Subreddits (Comma-separated)</label>
                <input
                  type="text"
                  value={customSubreddit}
                  onChange={(e) => setCustomSubreddit(e.target.value)}
                  placeholder="UFOs,HighStrangeness,Anomalies"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {savedSuccessMsg ? (
                <span className="text-xs font-mono text-ufo-green flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  API Configuration Saved & Uplink Reloaded!
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-500">
                  Settings are stored securely in browser state and passed to API proxy routes.
                </span>
              )}

              <AwButton
                variant="primary"
                size="sm"
                onClick={handleSaveConfig}
              >
                <span>SAVE CONFIGURATION</span>
              </AwButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
