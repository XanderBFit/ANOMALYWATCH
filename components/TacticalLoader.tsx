
import React, { useState, useEffect } from 'react';
import { ANOMALY_FACTS, ICONS } from '../constants';

interface TacticalLoaderProps {
  stage?: string;
}

const TACTICAL_PHASES = [
  "UPLINK_ESTABLISHED: SECURE_TUNNEL_D17",
  "DECRYPTING_SPECTRAL_INTERFERENCE...",
  "PARSING_ANOMALOUS_GEOMETRY...",
  "SCANNING_DEEP_INTEL_SILOS...",
  "SYNTHESIZING_STRATEGIC_BRIEF...",
  "ISOLATING_UAP_SIGNATURES...",
  "FINALIZING_UPLINK_ENCRYPTION...",
  "SYNCHRONIZING_GLOBAL_NODES...",
  "DECODING_SATELLITE_TELEM...",
  "DECRYPTING_SECTOR_4-B_DATA...",
  "SYNCING_WITH_OFFSITE_VAULT...",
  "CALIBRATING_QUANTUM_SENSORS...",
  "VERIFYING_ISOTOPIC_RATIOS...",
  "MAPPING_TEMPORAL_FLUX..."
];

const TacticalLoader: React.FC<TacticalLoaderProps> = ({ stage = 'Synchronizing...' }) => {
  const [factIndex, setFactIndex] = useState(Math.floor(Math.random() * ANOMALY_FACTS.length));
  const [logIndex, setLogIndex] = useState(0);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    // Fact rotation for user engagement
    const factInterval = setInterval(() => {
      setFactIndex(prev => (prev + 1) % ANOMALY_FACTS.length);
    }, 4500);

    // Tech logs rotation
    const logInterval = setInterval(() => {
      setLogIndex(prev => (prev + 1) % TACTICAL_PHASES.length);
    }, 800);

    // Simulated high-fidelity progress
    const progressInterval = setInterval(() => {
      setPercent(prev => {
        if (prev >= 95) {
          // Slow down significantly after 95% to avoid feeling "stuck" at 98%
          const slowJump = Math.random() > 0.9 ? 1 : 0;
          return prev + slowJump > 99 ? 99 : prev + slowJump;
        }
        const jump = Math.floor(Math.random() * 5) + 1;
        return prev + jump > 95 ? 95 : prev + jump;
      });
    }, 300);
    
    return () => { 
      clearInterval(factInterval); 
      clearInterval(logInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-16 text-center min-h-[400px] md:min-h-[500px] w-full bg-black/40 rounded-[2rem] md:rounded-[3rem] border border-ufo-green/20 relative overflow-hidden backdrop-blur-xl shadow-2xl">
      
      {/* Background HUD Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,157,1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,157,1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-10 space-y-8 md:space-y-12 w-full max-w-2xl">
        
        {/* Large Percentage Hub */}
        <div className="relative w-40 h-40 md:w-56 md:h-56 mx-auto flex items-center justify-center">
          {/* Animated SVG Ring - Added viewBox for proper scaling */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 224 224">
            <circle 
              cx="112" cy="112" r="100" 
              fill="transparent" 
              stroke="rgba(0,255,157,0.1)" 
              strokeWidth="4" 
            />
            <circle 
              cx="112" cy="112" r="100" 
              fill="transparent" 
              stroke="currentColor" 
              strokeWidth="6" 
              className="text-ufo-green drop-shadow-[0_0_12px_rgba(0,255,157,0.8)]"
              strokeDasharray={628}
              strokeDashoffset={628 - (628 * percent / 100)}
              style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          
          {/* Spinning Outer Gear */}
          <div className="absolute inset-2 border border-dashed border-ufo-green/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
          
          <div className="flex flex-col items-center justify-center bg-black/60 w-32 h-32 md:w-44 md:h-44 rounded-full border border-ufo-green/30 backdrop-blur-3xl shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] relative z-10">
            <div className="text-ufo-green text-xl md:text-2xl animate-pulse mb-1">{ICONS.BRAIN}</div>
            <div className="text-2xl md:text-4xl font-display font-black text-white tracking-widest">{percent}%</div>
            <div className="text-[7px] md:text-[8px] font-mono text-ufo-green/50 uppercase tracking-[0.4em] font-black">Syncing</div>
          </div>
        </div>

        {/* Intelligence HUD Section */}
        <div className="space-y-4">
           <div className="flex flex-col items-center gap-4">
             <h3 className="text-white font-display text-lg md:text-xl tracking-[0.4em] uppercase italic drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{stage}</h3>
             
             {/* Dynamic Log Line */}
             <div className="px-5 py-2 bg-ufo-green/5 border border-ufo-green/20 rounded-xl min-w-[280px] md:min-w-[320px]">
                <p className="text-[8px] md:text-[10px] font-mono text-ufo-green font-black uppercase tracking-[0.4em] animate-pulse">
                  {" >> "} {TACTICAL_PHASES[logIndex]}
                </p>
             </div>
           </div>
        </div>

        {/* Intelligence Fragment (Interesting Facts) */}
        <div className="glass-panel p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-black/80 relative group shadow-2xl overflow-hidden min-h-[140px] md:min-h-[180px] flex flex-col justify-center">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5 pointer-events-none"></div>
          
          <div className="absolute -top-3 left-10 px-4 py-1 bg-ufo-green text-black text-[9px] font-display font-black uppercase tracking-[0.3em] rounded-full shadow-[0_0_15px_rgba(0,255,157,0.4)]">
            DECLASSIFIED_INTEL_{factIndex.toString().padStart(2, '0')}
          </div>

          <div className="relative">
            <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-4 flex items-center justify-between opacity-50">
               <span>Archival Decryption: ACTIVE</span>
               <span className="animate-flicker">● SIGNAL_VERIFIED</span>
            </div>
            <p className="text-sm md:text-base font-mono text-slate-200 leading-relaxed italic text-left relative flex items-start" key={factIndex}>
              <span className="text-ufo-green mr-4 font-black shrink-0 animate-pulse">{" >> "}</span>
              <span className="animate-in fade-in slide-in-from-right-2 duration-500">
                {ANOMALY_FACTS[factIndex]}
                <span className="inline-block w-1.5 h-4 bg-ufo-green ml-2 animate-terminal-cursor shadow-[0_0_8px_#00ff9d]"></span>
              </span>
            </p>
          </div>

          {/* HUD Metadata */}
          <div className="mt-8 flex justify-between items-center opacity-20 text-[8px] font-mono uppercase tracking-[0.4em] font-black border-t border-white/5 pt-4">
            <div className="flex gap-4">
              <span>Sector_D17</span>
              <span>Vault_v4.2</span>
            </div>
            <div className="flex gap-2">
              <span className="w-1 h-1 bg-ufo-green rounded-full"></span>
              <span className="w-1 h-1 bg-ufo-green rounded-full animate-pulse"></span>
              <span className="w-1 h-1 bg-ufo-green rounded-full"></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TacticalLoader;
