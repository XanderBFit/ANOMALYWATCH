
import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { ICONS } from '../constants';
import { AgentIdentity, AlertSubscription } from '../types';
import { generateAgentPersona, triggerTacticalVibration } from '../services/geminiService';
import { ProgressionService, CLEARANCE_THRESHOLDS, CLASSIFIED_ARTIFACTS } from '../services/progressionService';
import { SubscriptionOps } from '../services/firebaseService';

interface AgentProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (identity: AgentIdentity) => void;
}

const SPECIALTIES = [
  'ANALYST', 'FIELD_RECON', 'VISUAL_FORENSICS', 'ARCHIVIST', 
  'SIGNAL_INTERCEPT', 'EXOBIOLOGY', 'TACTICAL_OPS'
];

const AgentProfile: React.FC<AgentProfileProps> = ({ isOpen, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loadingPersona, setLoadingPersona] = useState(false);
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]);
  const [newSub, setNewSub] = useState<Partial<AlertSubscription>>({});
  
  const [identity, setIdentity] = useState<AgentIdentity>(ProgressionService.getIdentity());
  const [newWatchword, setNewWatchword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIdentity(ProgressionService.getIdentity());
      const unsub = SubscriptionOps.getUserSubscriptions(setSubscriptions);
      return () => unsub();
    }
  }, [isOpen]);

  const handleAddSubscription = async () => {
    if (!newSub.location && (!newSub.keywords || newSub.keywords.length === 0) && !newSub.category) return;
    await SubscriptionOps.subscribeToAlerts(newSub as any);
    setNewSub({});
    triggerTacticalVibration(15);
  };

  const handleDeleteSubscription = async (id: string) => {
    await SubscriptionOps.deleteSubscription(id);
    triggerTacticalVibration(10);
  };

  const handleSave = () => {
    ProgressionService.saveIdentity(identity);
    localStorage.setItem('anomalyWatch_username', identity.username);
    localStorage.setItem('anomalyWatch_specialty', identity.specialty);
    onUpdate(identity);
    setIsEditing(false);
    triggerTacticalVibration([20, 50, 20]);
  };

  const generatePersona = async () => {
    setLoadingPersona(true);
    triggerTacticalVibration(20);
    try {
      const bio = await generateAgentPersona(identity.username, identity.specialty, identity.sector);
      setIdentity(prev => ({ ...prev, bio }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPersona(false);
    }
  };

  // Progression Logic
  const nextThreshold = ProgressionService.getNextThreshold(identity.clearance);
  const prevThreshold = identity.clearance === 'ALPHA' ? 0 : 
                        identity.clearance === 'BETA' ? CLEARANCE_THRESHOLDS.BETA :
                        identity.clearance === 'GAMMA' ? CLEARANCE_THRESHOLDS.GAMMA : 0;
  
  const currentLevelProgress = identity.xp - prevThreshold;
  const levelSpan = nextThreshold - prevThreshold;
  
  const progressPercent = identity.clearance === 'OMEGA' 
    ? 100 
    : Math.min(100, Math.max(0, (currentLevelProgress / levelSpan) * 100));

  const handleAddWatchword = () => {
    if (!newWatchword.trim()) return;
    const word = newWatchword.trim().toUpperCase();
    if (!identity.watchwords?.includes(word)) {
      setIdentity({
        ...identity,
        watchwords: [...(identity.watchwords || []), word]
      });
    }
    setNewWatchword('');
    triggerTacticalVibration(10);
  };

  const handleRemoveWatchword = (word: string) => {
    setIdentity({
      ...identity,
      watchwords: identity.watchwords?.filter(w => w !== word) || []
    });
    triggerTacticalVibration(5);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-2xl transform transition-all hover:scale-[1.01] duration-500 perspective-1000 group"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Holographic Effects */}
        <div className="absolute inset-0 bg-ufo-green/5 blur-3xl rounded-[3rem] animate-pulse"></div>
        <div className="absolute -inset-1 bg-gradient-to-r from-ufo-green/20 to-celestial-blue/20 rounded-[3rem] opacity-30 blur-md"></div>
        
        <div className="glass-panel border-2 border-white/10 rounded-[3rem] overflow-hidden bg-[#0a0a0c] shadow-[0_0_100px_rgba(0,0,0,0.8)] relative">
           
           {/* Card Scanner Animation */}
           <div className="absolute top-0 left-0 w-full h-2 bg-ufo-green/50 animate-[scanline_4s_linear_infinite] shadow-[0_0_20px_#00ff9d] opacity-50 z-20 pointer-events-none"></div>

           {/* Header / ID Strip */}
           <div className="bg-black/80 p-8 border-b border-white/10 flex justify-between items-start relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              
              <div className="flex items-center gap-6 relative z-10">
                 <div className="w-24 h-24 rounded-2xl border-2 border-ufo-green bg-ufo-green/10 flex items-center justify-center text-5xl text-ufo-green shadow-[0_0_30px_rgba(0,255,157,0.2)]">
                    {ICONS.NEXUS}
                 </div>
                 <div>
                    <div className="flex items-center gap-3 mb-1">
                       <h2 className="text-3xl font-display font-black text-white tracking-widest uppercase">{identity.username}</h2>
                       <div className="px-2 py-0.5 border border-ufo-green text-[9px] font-mono text-ufo-green rounded uppercase font-black tracking-widest bg-ufo-green/10">
                          {identity.clearance} CLEARANCE
                       </div>
                    </div>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.3em]">Operative ID: {identity.joined.toString().slice(-6)}</p>
                 </div>
              </div>

              <button 
                onClick={onClose}
                className="text-slate-500 hover:text-white transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
           </div>

           {/* Body Content */}
           <div className="p-10 space-y-8 relative z-10">
              
              {/* Tactical Progression Bar */}
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2">
                 <div className="flex justify-between items-end">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">Current Status</span>
                    <span className="text-[10px] font-mono text-ufo-green font-bold tracking-widest">{identity.xp} XP / {identity.clearance === 'OMEGA' ? 'MAX' : nextThreshold}</span>
                 </div>
                 <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-ufo-green shadow-[0_0_10px_#00ff9d] transition-all duration-1000 ease-out" 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                    {/* Tick marks */}
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_20%,rgba(0,0,0,0.5)_20%)] bg-[size:4px_100%] opacity-30"></div>
                 </div>
                 <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest text-right">
                    {identity.clearance === 'OMEGA' ? 'MAXIMUM CLEARANCE ACHIEVED' : `Next Promotion: ${Math.floor(nextThreshold - identity.xp)} XP Required`}
                 </div>
              </div>

              {/* Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div className="group/field">
                       <label className="text-[9px] font-mono text-ufo-green uppercase tracking-[0.3em] font-black mb-2 block">Tactical Callsign</label>
                       {isEditing ? (
                          <input 
                            type="text" 
                            value={identity.username} 
                            onChange={e => setIdentity({...identity, username: e.target.value.toUpperCase()})}
                            className="w-full bg-black/60 border border-ufo-green/30 rounded-xl px-4 py-3 text-white font-display uppercase tracking-widest focus:outline-none focus:border-ufo-green transition-all"
                          />
                       ) : (
                          <div className="text-xl text-white font-display tracking-widest uppercase border-b border-white/10 pb-2">{identity.username}</div>
                       )}
                    </div>

                    <div className="group/field">
                       <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] font-black mb-2 block group-hover/field:text-celestial-blue transition-colors">Specialization</label>
                       {isEditing ? (
                          <select 
                            value={identity.specialty}
                            onChange={e => setIdentity({...identity, specialty: e.target.value})}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs uppercase focus:outline-none focus:border-celestial-blue transition-all"
                          >
                             {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       ) : (
                          <div className="text-sm text-slate-300 font-mono tracking-widest uppercase border-b border-white/10 pb-2">{identity.specialty}</div>
                       )}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="group/field opacity-70">
                       <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] font-black mb-2 block">Clearance Tier (Locked)</label>
                       <div className="text-sm text-warning-amber font-mono tracking-widest uppercase border-b border-white/10 pb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          {identity.clearance}
                       </div>
                    </div>

                    <div className="group/field">
                       <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] font-black mb-2 block group-hover/field:text-celestial-blue transition-colors">Home Sector</label>
                       {isEditing ? (
                          <input 
                            type="text" 
                            value={identity.sector} 
                            onChange={e => setIdentity({...identity, sector: e.target.value.toUpperCase()})}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-celestial-blue transition-all"
                          />
                       ) : (
                          <div className="text-sm text-slate-300 font-mono tracking-widest uppercase border-b border-white/10 pb-2">{identity.sector}</div>
                       )}
                    </div>
                 </div>
              </div>

              {/* Bio Section */}
              <div className="pt-6 border-t border-white/5">
                 <div className="flex justify-between items-end mb-4">
                    <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] font-black">Service History [Redacted]</label>
                    {isEditing && (
                       <button 
                         onClick={generatePersona}
                         disabled={loadingPersona}
                         className="text-[9px] font-mono text-ufo-green bg-ufo-green/10 border border-ufo-green/30 px-3 py-1 rounded hover:bg-ufo-green hover:text-black transition-all uppercase tracking-widest"
                       >
                         {loadingPersona ? 'Generating...' : 'Generate AI Bio'}
                       </button>
                    )}
                 </div>
                 {isEditing ? (
                    <textarea 
                      value={identity.bio}
                      onChange={e => setIdentity({...identity, bio: e.target.value})}
                      className="w-full h-32 bg-black/60 border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-300 leading-relaxed focus:outline-none focus:border-ufo-green/50 transition-all resize-none"
                    />
                 ) : (
                    <div className="text-xs font-mono text-slate-400 leading-relaxed bg-black/40 p-6 rounded-xl border border-white/5 italic relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_10s_infinite]"></div>
                       "{identity.bio}"
                    </div>
                 )}
              </div>

              {/* Watchwords Section */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                 <div className="flex items-center justify-between">
                    <label className="text-[9px] font-mono text-celestial-blue uppercase tracking-[0.3em] font-black">Tactical Watchwords</label>
                    <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">Flash Traffic Trigger Active</span>
                 </div>

                 <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="NEW WATCHWORD..." 
                      value={newWatchword}
                      onChange={e => setNewWatchword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddWatchword()}
                      className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-mono text-white focus:border-celestial-blue/50 outline-none"
                    />
                    <button 
                      onClick={handleAddWatchword}
                      className="bg-celestial-blue/10 text-celestial-blue border border-celestial-blue/30 rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-celestial-blue hover:text-black transition-all"
                    >
                       Add
                    </button>
                 </div>

                 <div className="flex flex-wrap gap-2">
                    {identity.watchwords?.length === 0 ? (
                       <p className="text-[9px] font-mono text-slate-600 uppercase italic">No active watchwords.</p>
                    ) : (
                       identity.watchwords?.map(word => (
                          <div key={word} className="flex items-center gap-2 bg-celestial-blue/10 border border-celestial-blue/20 rounded px-2 py-1 group">
                             <span className="text-[9px] font-mono text-celestial-blue font-bold">{word}</span>
                             <button 
                               onClick={() => handleRemoveWatchword(word)}
                               className="text-slate-500 hover:text-danger-red transition-colors"
                             >
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                          </div>
                       ))
                    )}
                 </div>
              </div>

              {/* Classified Intel Artifacts Vault Section */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-mono text-amber-400 uppercase tracking-[0.3em] font-black">CLASSIFIED INTEL ARTIFACT VAULT</label>
                      <span className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[9px] font-mono font-bold">
                        {ProgressionService.getDiscoveredArtifactIds().length} / {CLASSIFIED_ARTIFACTS.length} RECOVERED
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Quantum Frequency Discoveries</span>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {CLASSIFIED_ARTIFACTS.map(artifact => {
                      const isDiscovered = ProgressionService.getDiscoveredArtifactIds().includes(artifact.id);
                      return (
                        <div 
                          key={artifact.id} 
                          className={`p-3 rounded-xl border transition-all ${isDiscovered ? 'bg-amber-950/20 border-amber-500/40 text-amber-300' : 'bg-white/[0.02] border-white/5 text-slate-600 opacity-60'}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-mono font-black uppercase tracking-wider">{isDiscovered ? artifact.code : 'CLASSIFIED // LOCKED'}</span>
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/5">
                              {isDiscovered ? `+${artifact.xpReward} XP` : '100 XP'}
                            </span>
                          </div>
                          <div className="text-xs font-bold font-mono tracking-tight text-white mb-1">
                            {isDiscovered ? artifact.title : `[Hidden Artifact in ${artifact.locationName}]`}
                          </div>
                          <p className="text-[9px] font-mono text-slate-400 leading-relaxed">
                            {isDiscovered ? artifact.description : `Search the ${artifact.locationName} view to uncover this hidden quantum transmission.`}
                          </p>
                        </div>
                      );
                    })}
                 </div>
              </div>

              {/* Alert Subscriptions Section */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                 <div className="flex items-center justify-between">
                    <label className="text-[9px] font-mono text-ufo-green uppercase tracking-[0.3em] font-black">Intel Alert Subscriptions</label>
                    <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">Real-time Matching Active</span>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input 
                      type="text" 
                      placeholder="LOCATION..." 
                      value={newSub.location || ''}
                      onChange={e => setNewSub({...newSub, location: e.target.value})}
                      className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-mono text-white focus:border-ufo-green/50 outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="KEYWORDS (comma separated)..." 
                      value={newSub.keywords?.join(', ') || ''}
                      onChange={e => setNewSub({...newSub, keywords: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')})}
                      className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-mono text-white focus:border-ufo-green/50 outline-none"
                    />
                    <button 
                      onClick={handleAddSubscription}
                      className="bg-ufo-green/10 text-ufo-green border border-ufo-green/30 rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-ufo-green hover:text-black transition-all"
                    >
                       Add Alert Filter
                    </button>
                 </div>

                 <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    {subscriptions.length === 0 ? (
                       <p className="text-[9px] font-mono text-slate-600 uppercase italic text-center py-2">No active alert filters.</p>
                    ) : (
                       subscriptions.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-lg p-3 group">
                             <div className="flex gap-4">
                                {sub.location && <span className="text-[9px] font-mono text-ufo-green"><span className="text-slate-600">LOC:</span> {sub.location}</span>}
                                {sub.keywords && sub.keywords.length > 0 && <span className="text-[9px] font-mono text-celestial-blue"><span className="text-slate-600">KEY:</span> {sub.keywords.join(', ')}</span>}
                             </div>
                             <button 
                               onClick={() => handleDeleteSubscription(sub.id)}
                               className="text-slate-600 hover:text-danger-red transition-colors opacity-0 group-hover:opacity-100"
                             >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                          </div>
                       ))
                    )}
                 </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                 {isEditing ? (
                    <>
                       <button onClick={handleSave} className="flex-1 py-3.5 bg-ufo-green text-black font-display font-black text-sm uppercase tracking-[0.3em] rounded-xl hover:bg-white transition-all shadow-lg active:scale-95">
                          Confirm Updates
                       </button>
                       <button onClick={() => setIsEditing(false)} className="px-6 py-3.5 bg-transparent border border-white/10 text-slate-500 font-display font-bold text-sm uppercase tracking-[0.2em] rounded-xl hover:text-white hover:border-white transition-all">
                          Cancel
                       </button>
                    </>
                 ) : (
                    <>
                       <button onClick={() => setIsEditing(true)} className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white font-display font-bold text-sm uppercase tracking-[0.2em] rounded-xl hover:bg-ufo-green hover:text-black hover:border-ufo-green transition-all shadow-lg">
                          Edit Personnel File
                       </button>
                       <button 
                         onClick={async () => {
                           try {
                             sessionStorage.removeItem('anomalyWatch_session_active');
                             window.dispatchEvent(new CustomEvent('anomaly-logout'));
                             await signOut(auth);
                             onClose();
                           } catch (e) {
                             console.error("Signout error", e);
                             window.dispatchEvent(new CustomEvent('anomaly-logout'));
                             onClose();
                           }
                         }} 
                         className="px-6 py-3.5 bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60 hover:text-red-200 font-mono text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                       >
                          DISCONNECT / SWITCH ALIAS
                       </button>
                    </>
                 )}
              </div>
           </div>
           
           {/* Footer Decor */}
           <div className="bg-black/80 p-3 px-8 flex justify-between items-center text-[8px] font-mono text-slate-600 uppercase tracking-widest">
              <span>Secure Connection: TLS 1.3</span>
              <span>Db_Ref: {identity.username}_V3</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AgentProfile;
