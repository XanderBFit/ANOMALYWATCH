import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RealWorldDataService } from '../services/realWorldDataService';
import { gatherIntelligenceFromRealTelemetry } from '../services/geminiService';
import { SightingOps } from '../services/firebaseService';
import { ProgressionService, XP_VALUES } from '../services/progressionService';
import { Play, CheckCircle2, Terminal, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TerminalLogItemProps {
  log: string;
}

const TerminalLogItem: React.FC<TerminalLogItemProps> = React.memo(({ log }) => {
  let colorClass = "text-slate-400";
  if (log.includes("✅")) colorClass = "text-ufo-green";
  else if (log.includes("🛰️") || log.includes("✈️") || log.includes("🤖") || log.includes("☀️")) colorClass = "text-celestial-blue";
  else if (log.includes("⚠️") || log.includes("🎖️")) colorClass = "text-warning-amber";
  else if (log.includes("❌")) colorClass = "text-danger-red font-bold";
  else if (log.includes("⚡")) colorClass = "text-ufo-green font-bold animate-pulse";

  return (
    <div className={`leading-relaxed whitespace-pre-wrap content-contain ${colorClass}`}>
      {log}
    </div>
  );
});

TerminalLogItem.displayName = 'TerminalLogItem';

export const IntelHarvester: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'harvesting' | 'completed' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [activeIncident, setActiveIncident] = useState<any>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const addLogWithDelay = useCallback((message: string, delay: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
        resolve();
      }, delay);
    });
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleInterceptHarvest = useCallback(async () => {
    if (status === 'harvesting') return;
    setStatus('harvesting');
    setLogs([]);
    setActiveIncident(null);

    try {
      await addLogWithDelay("Establishing connection to orbital satellite intercept arrays...", 300);
      await addLogWithDelay("Uplink synchronized. Tuning receiver to live telemetry pipelines...", 400);

      // --- STAGE 1: GEOSPATIAL USGS EARTHQUAKES ---
      await addLogWithDelay("🛰️ Initializing USGS seismic anomaly sweep...", 500);
      const seismic = await RealWorldDataService.fetchSeismicAnomalies();
      const seismicCount = seismic.length;
      await addLogWithDelay(`✅ Extrapolated ${seismicCount} recent crustal friction anomalies.`, 400);
      const targetedUSGS = seismic.slice(0, 3).map(s => `${s.place || 'Unknown'} (Mag ${s.mag || 0}, Depth ${s.depth}km)`).join('; ');
      await addLogWithDelay(`🔍 Targeting high-frequency epicenter zones: ${targetedUSGS || 'No active crustal anomalies'}`, 300);

      // --- STAGE 2: OPENSKY FLIGHT TRAJECTORIES ---
      await addLogWithDelay("✈️ Tapping OpenSky high-altitude transponder state matrices...", 500);
      const flights = await RealWorldDataService.fetchLiveFlights({
        minLat: 30, minLng: -120, maxLat: 50, maxLng: -70
      });
      const flightCount = flights.length;
      await addLogWithDelay(`✅ Tracked ${flightCount} high-altitude airborne vectors within boundary quadrant.`, 400);
      const abnormalFlights = flights.filter(f => f.velocity > 600 || f.altitude > 40000);
      if (abnormalFlights.length > 0) {
        await addLogWithDelay(`⚠️ Detected ${abnormalFlights.length} supersonic or high-stratosphere vectors.`, 300);
      } else {
        await addLogWithDelay(`ℹ️ All transponding paths operating at standard civil speed profiles.`, 300);
      }

      // --- STAGE 3: NOAA SPACE WEATHER ---
      await addLogWithDelay("☀️ Scanning NOAA solar flare index and geomagnetic density fields...", 500);
      const spaceWeather = await RealWorldDataService.fetchSpaceWeather();
      await addLogWithDelay(`✅ Solar indices telemetry mapped: ${spaceWeather[0]?.description || 'Ionosphere Nominal'}`, 400);

      // --- STAGE 4: GEMINI FORENSIC PASS ---
      await addLogWithDelay("🤖 Channeling high-entropy metrics to Gemini Sentinel Threat Correlation Engine...", 700);
      const seismicTxt = JSON.stringify(seismic.slice(0, 5));
      const flightTxt = JSON.stringify(flights.slice(0, 10));
      const spaceWeatherTxt = JSON.stringify(spaceWeather);

      const sighting = await gatherIntelligenceFromRealTelemetry(seismicTxt, flightTxt, spaceWeatherTxt);
      await addLogWithDelay("⚡ Threat patterns correlated! Synthesizing formal intelligence dossier...", 600);

      // Save to real database
      const userCallsign = localStorage.getItem('anomalyWatch_username') || 'AGENT';
      
      const newSighting = {
        title: sighting.title,
        date: new Date().toLocaleDateString(),
        location: sighting.location,
        description: sighting.description,
        category: sighting.category,
        severity: sighting.severity,
      };

      await SightingOps.reportSighting(newSighting);
      
      await addLogWithDelay(`📝 Incident written to global dossier database as: SIG_${Math.random().toString(36).substring(3,9).toUpperCase()}`, 300);
      await addLogWithDelay("🎖️ XP authorized for spectrum gathering execution.", 200);

      // Award XP
      ProgressionService.addXP(XP_VALUES.CREATE_CASE * 1.5, `Harvested real telemetric anomaly: ${sighting.title}`);

      // Emit global notification alert
      const customEvent = new CustomEvent('anomaly-new-intel', {
        detail: {
          title: sighting.title,
          summary: sighting.description,
          category: sighting.category,
          author: userCallsign
        }
      });
      window.dispatchEvent(customEvent);

      setActiveIncident(newSighting);
      setStatus('completed');
    } catch (e) {
      console.error(e);
      setStatus('error');
      await addLogWithDelay("❌ SYSTEM DOWN: Encrypted pipeline disruption detected over secure channels.", 100);
    }
  }, [status, addLogWithDelay]);

  return (
    <section className="glass-panel p-6 rounded-3xl border border-white/[0.08] space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-ufo-green" />
          <h3 className="text-[10px] font-mono text-white uppercase tracking-widest font-black">ACTIVE INTEL HARVESTER</h3>
        </div>
        <span className={`h-2 w-2 rounded-full ${status === 'harvesting' ? 'bg-ufo-green animate-ping' : 'bg-slate-700'}`}></span>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
          Gathers the earth's current live telemetry feeds (real time earthquakes, active flight transponders, space solar weather) and routes them through Gemini to correlate real-time anomalies.
        </p>

        {/* Console view */}
        <div className="bg-black/80 rounded-2xl border border-white/5 p-4 h-[180px] font-mono text-[9px] flex flex-col justify-between overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black to-transparent pointer-events-none z-10"></div>
          <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black to-transparent pointer-events-none z-10"></div>
          
          <div ref={terminalRef} className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 pr-1 select-none log-container-optimized">
            {logs.length === 0 ? (
              <span className="text-slate-600 block italic">[Terminal standby. Ready for execution input...]</span>
            ) : (
              logs.slice(-100).map((log, index) => (
                <TerminalLogItem key={index} log={log} />
              ))
            )}
          </div>
        </div>

        {/* Actions or Dossier Result */}
        <AnimatePresence mode="wait">
          {status === 'completed' && activeIncident && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 bg-ufo-green/5 border border-ufo-green/20 rounded-2xl space-y-2 mt-2"
            >
              <div className="flex justify-between items-start">
                <span className="text-[8px] font-mono text-ufo-green uppercase tracking-wider">HARVESTED DOSSIER METRICS</span>
                <span className="text-[8px] font-mono text-white bg-ufo-green/20 py-0.5 px-1.5 rounded uppercase font-bold">{activeIncident.severity} THREAT</span>
              </div>
              <h4 className="text-xs font-display font-black text-white uppercase tracking-wider">{activeIncident.title}</h4>
              <p className="text-[10px] text-slate-400 font-sans italic leading-relaxed">
                "{activeIncident.description.slice(0, 150)}..."
              </p>
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-1 border-t border-white/[0.04]">
                <span>LOCATION: {activeIncident.location}</span>
                <span>CAT: {activeIncident.category}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleInterceptHarvest}
          disabled={status === 'harvesting'}
          className={`w-full py-3.5 flex items-center justify-center gap-2 font-mono font-bold uppercase text-[10px] rounded-xl transition-all ${
            status === 'harvesting'
              ? 'bg-ufo-green/10 text-ufo-green border border-ufo-green/20 cursor-wait'
              : 'bg-ufo-green text-black hover:bg-white active:scale-98 shadow-[0_0_20px_rgba(0,255,157,0.15)]'
          }`}
        >
          {status === 'harvesting' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>HARVESTING ATMOSPHERIC DATA...</span>
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>INITIALIZE SPECTRUM ANOMALY HARVEST</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
};

