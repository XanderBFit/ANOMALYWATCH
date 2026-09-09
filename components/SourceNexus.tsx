
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ICONS } from '../constants';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, isCloudEnabled, PresenceService, IntelNexus, NexusOps } from "../services/firebaseService";
import { moderateContent, triggerTacticalVibration } from "../services/geminiService";
import { ProgressionService, XP_VALUES } from '../services/progressionService';
import { InclusionReviewPanel } from './InclusionReviewPanel';
import { Sparkles } from 'lucide-react';

interface SignalLogCardProps {
  sig: any;
  getRoleColor: (role: string) => string;
}

const SignalLogCard: React.FC<SignalLogCardProps> = React.memo(({ sig, getRoleColor }) => {
  return (
    <div className="animate-in slide-in-from-left-2 bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col gap-1 content-contain">
       <div className="flex justify-between items-center text-[9px] font-mono opacity-50 uppercase tracking-widest">
          <span className={getRoleColor(sig.role)}>[{sig.sender}] // {sig.role}</span>
          <span>{sig.timestamp?.toDate ? sig.timestamp.toDate().toLocaleTimeString() : ''}</span>
       </div>
       <p className="text-sm font-mono text-slate-300 tracking-wide">{sig.text}</p>
    </div>
  );
});

SignalLogCard.displayName = 'SignalLogCard';

const SourceNexus: React.FC = () => {
  const [broadcastInput, setBroadcastInput] = useState('');
  const [signals, setSignals] = useState<any[]>([]);
  const [intelBoard, setIntelBoard] = useState<any[]>([]);
  const [activeAgents, setActiveAgents] = useState<any[]>([]);
  const [isModerating, setIsModerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const specialty = localStorage.getItem('anomalyWatch_specialty') || 'ANALYST';
  const username = localStorage.getItem('anomalyWatch_username') || 'RECON_GUEST';

  useEffect(() => {
    // Shared Signal Relay
    const qSignals = query(collection(db, "GlobalSignals"), orderBy("timestamp", "desc"), limit(30));
    const unsubscribeSignals = onSnapshot(qSignals, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSignals(data.reverse());
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });

    // Global Intel Board
    const unsubscribeIntel = IntelNexus.subscribeToIntel((items) => {
      setIntelBoard(items);
    });

    // Active Roster
    const unsubscribeAgents = PresenceService.subscribeToAgents((agents) => {
      setActiveAgents(agents);
    });

    return () => {
      unsubscribeSignals();
      unsubscribeIntel();
      unsubscribeAgents();
    };
  }, []);

  const handleBroadcast = async () => {
    if (!broadcastInput.trim() || isModerating) return;
    
    setIsModerating(true);
    triggerTacticalVibration(30);
    
    try {
      const moderation = await moderateContent(broadcastInput);
      if (!moderation.safe) {
        alert(`BROADCAST REJECTED: ${moderation.reason || "Content violates security protocols."}`);
        setBroadcastInput('');
        return;
      }

      // Use NexusOps for broadcast to ensure offsite sync
      await NexusOps.broadcastSignal(broadcastInput);
      setBroadcastInput('');
      triggerTacticalVibration([10, 50, 10]);
      
      // [XP_REWARD]
      ProgressionService.addXP(XP_VALUES.BROADCAST_SIGNAL, "Signal Broadcast");

    } catch (e) {
      console.error(e);
    } finally {
      setIsModerating(false);
    }
  };

  const getRoleColor = useCallback((role: string) => {
    if (role === 'INVESTIGATOR') return 'text-ufo-green';
    if (role === 'ARCHIVIST') return 'text-warning-amber';
    return 'text-celestial-blue';
  }, []);

  const getRoleBg = (role: string) => {
    if (role === 'INVESTIGATOR') return 'bg-ufo-green';
    if (role === 'ARCHIVIST') return 'bg-warning-amber';
    return 'bg-celestial-blue';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-widest">NEXUS UPLINK</h2>
          <p className="text-ufo-green font-mono text-[10px] mt-1 uppercase tracking-[0.4em]">Global Signal Relay // Real-time Operational Comms</p>
        </div>
        <div className="flex items-center gap-4">
            {/* Secret Quantum Artifact Treasure Node */}
            <button
              onClick={() => ProgressionService.discoverArtifact('ARTIFACT_BLACK_BUDGET_LOG')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              title="Declassified Project Memorandum - Click to Uncover Blue Book Note"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400 hover:text-black" />
              <span>BB-LOG-1972</span>
            </button>

            <div className="glass-panel px-4 py-2 border-ufo-green/20">
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Link Latency</span>
                <span className="text-lg font-display font-bold text-white tracking-widest">24ms</span>
            </div>
            <div className="w-2 h-2 bg-ufo-green rounded-full animate-ping shadow-[0_0_10px_#00ff9d]"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Signal Stream */}
        <div className="lg:col-span-8 flex flex-col h-[650px] space-y-4">
           
           <div className="flex-1 flex flex-col glass-panel border-white/5 rounded-3xl overflow-hidden bg-black/40 relative">
              <div className="p-6 border-b border-white/5 bg-black/60 flex justify-between items-center">
                 <h3 className="text-xs font-mono text-ufo-green uppercase tracking-widest flex items-center gap-2">
                    {ICONS.NEXUS} BROADCAST_GRID
                 </h3>
                 <span className="text-[9px] font-mono text-slate-600 uppercase">Multi-agent Encryption: Active</span>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 {signals.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20">
                     <span className="text-[10px] font-mono uppercase tracking-[0.4em]">Awaiting Signals...</span>
                   </div>
                 )}
                 {signals.map((sig) => (
                   <div key={sig.id} className="animate-in slide-in-from-left-2 bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[9px] font-mono opacity-50 uppercase tracking-widest">
                         <span className={getRoleColor(sig.role)}>[{sig.sender}] // {sig.role}</span>
                         <span>{sig.timestamp?.toDate().toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm font-mono text-slate-300 tracking-wide">{sig.text}</p>
                   </div>
                 ))}
              </div>

              <div className="p-6 bg-black/60 border-t border-white/5 flex gap-4">
                 <input 
                   type="text" 
                   value={broadcastInput}
                   onChange={(e) => setBroadcastInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                   placeholder={isModerating ? "SCRIBING & SCANNING..." : "BROADCAST SIGNAL TO ALL AGENTS..."}
                   disabled={isModerating}
                   className="flex-1 bg-black border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-ufo-green/30 tracking-widest"
                 />
                 <button 
                  onClick={handleBroadcast} 
                  disabled={isModerating || !broadcastInput.trim()}
                  className="bg-ufo-green/10 text-ufo-green border border-ufo-green/30 px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-ufo-green hover:text-black transition-all disabled:opacity-30"
                 >
                   {isModerating ? "Scanned" : "Relay"}
                 </button>
              </div>
           </div>
        </div>

        {/* Global Hub HUD */}
        <div className="lg:col-span-4 space-y-6">
           
           {/* Live Roster */}
           <section className="glass-panel p-8 rounded-3xl border border-white/5 bg-black/20 space-y-6 shadow-2xl">
              <h3 className="text-xs font-display font-bold text-white tracking-[0.2em] uppercase border-b border-white/5 pb-4">Nexus Core</h3>
              <div className="space-y-6">
                 <div>
                    <span className="text-[10px] font-mono text-slate-600 block uppercase mb-3">Live Roster ({activeAgents.length})</span>
                    <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                       {activeAgents.length === 0 ? (
                         <div className="text-[9px] font-mono text-slate-700 uppercase italic">Solitary Operation...</div>
                       ) : activeAgents.map((agent, i) => (
                         <div key={i} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                               <div className={`w-1.5 h-1.5 rounded-full ${getRoleBg(agent.specialty)} shadow-[0_0_8px_currentColor] animate-pulse`}></div>
                               <span className="text-[10px] font-mono text-slate-300 group-hover:text-white transition-colors">{agent.username}</span>
                            </div>
                            <span className={`text-[8px] font-mono ${getRoleColor(agent.specialty)} opacity-60`}>{agent.specialty}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </section>

           {/* Intel Board */}
           <section className="glass-panel p-8 rounded-3xl border border-celestial-blue/20 bg-celestial-blue/5 space-y-4">
              <h3 className="text-xs font-display font-bold text-celestial-blue tracking-[0.2em] uppercase border-b border-celestial-blue/10 pb-4 flex justify-between items-center">
                GLOBAL INTEL BOARD
                <span className="text-[9px] animate-pulse">● LIVE</span>
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                 {intelBoard.length === 0 ? (
                    <div className="text-[9px] font-mono text-slate-600 uppercase italic text-center py-4">No broadcasts detected</div>
                 ) : intelBoard.map((intel) => (
                    <div key={intel.id} className="p-3 bg-black/40 border border-white/5 rounded-xl hover:border-celestial-blue/30 transition-all cursor-help group">
                       <div className="flex justify-between items-center mb-1">
                          <span className={`text-[8px] font-mono font-bold ${getRoleColor(intel.specialty)}`}>[{intel.author}]</span>
                          <span className="text-[8px] font-mono text-slate-600">{intel.timestamp?.toDate().toLocaleDateString()}</span>
                       </div>
                       <h4 className="text-[11px] font-bold text-white group-hover:text-celestial-blue transition-colors line-clamp-1">{intel.title}</h4>
                       <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">{intel.summary}</p>
                    </div>
                 ))}
              </div>
           </section>

           {/* Review Panel */}
           <section className="glass-panel p-8 rounded-3xl border border-red-500/10 bg-red-500/[0.02]">
              <InclusionReviewPanel />
           </section>

           <div className="p-8 bg-ufo-green/5 border border-ufo-green/20 rounded-3xl text-center">
              <div className="text-ufo-green mb-2 flex justify-center">{ICONS.SATELLITE}</div>
              <div className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest">Cloud Sync Ready</div>
              <div className="text-[8px] font-mono text-slate-600 mt-1">NEXUS_DEPOLOYMENT_4.0</div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default SourceNexus;
