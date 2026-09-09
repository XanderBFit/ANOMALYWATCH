
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CaseRecord, CaseStatus, SignalLogEntry } from '../types';
import { ICONS } from '../constants';
import { CaseOps } from '../services/caseOps';
import { ArchiveOps } from '../services/firebaseService';
import Markdown from 'react-markdown';
import { triggerTacticalVibration } from '../services/geminiService';
import { ProgressionService } from '../services/progressionService';
import { Sparkles } from 'lucide-react';

const DELETE_ICON = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const EXPORT_ICON = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;

interface OpsLogItemCardProps {
  item: any;
  activeTab: 'CASES' | 'ARCHIVE' | 'SCRAPED';
  isSelected: boolean;
  onSelect: (item: any) => void;
  getStatusColor: (status: CaseStatus) => string;
}

const OpsLogItemCard = React.memo<OpsLogItemCardProps>(({
  item,
  activeTab,
  isSelected,
  onSelect,
  getStatusColor
}) => {
  return (
    <div 
      onClick={() => onSelect(item)}
      className={`p-5 border rounded-2xl md:rounded-xl cursor-pointer transition-all group relative overflow-hidden content-contain active:scale-[0.98] ${
          isSelected 
          ? `bg-ufo-green/10 border-ufo-green/40 shadow-[0_0_20px_rgba(0,255,157,0.1)]` 
          : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10'
      }`}
    >
       <div className="flex justify-between items-start mb-3">
           <span className="font-mono text-[8px] font-black tracking-widest text-slate-600">{(item.id || '').slice(0, 8)}...</span>
           <span className={`text-[7px] px-2 py-0.5 border rounded-full uppercase font-black tracking-widest ${activeTab === 'CASES' ? getStatusColor(item.status) : activeTab === 'ARCHIVE' ? 'text-celestial-blue border-celestial-blue' : 'text-ufo-green border-ufo-green'}`}>
             {activeTab === 'CASES' ? item.status : activeTab === 'ARCHIVE' ? item.type : 'INTEL'}
           </span>
       </div>
       <h3 className="font-display font-black text-xs mb-3 group-hover:text-white uppercase tracking-wider leading-tight">
         {activeTab === 'CASES' ? item.title : item.query}
       </h3>
       <div className="flex justify-between items-center mt-auto pt-3 border-t border-white/5">
           <div className="flex items-center gap-2">
               {activeTab === 'SCRAPED' && <span className="text-[7px] font-mono text-ufo-green font-black uppercase">#WEB</span>}
               {(item.tags || []).slice(0, 1).map((t: string) => (
                   <span key={t} className="text-[7px] font-mono text-slate-500 uppercase font-black">#{t}</span>
               ))}
           </div>
           <span className="text-[7px] font-mono text-slate-600 font-bold uppercase">
             {item.timestamp?.toDate 
               ? item.timestamp.toDate().toLocaleDateString() 
               : (typeof item.timestamp === 'string' ? new Date(item.timestamp).toLocaleDateString() : 'PERSISTENT')}
           </span>
       </div>
    </div>
  );
});

OpsLogItemCard.displayName = 'OpsLogItemCard';

// Robust sanitizer to handle circular references and complex objects before stringification
const sanitizeForJson = (data: any, visited = new WeakSet()): any => {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  
  if (visited.has(data)) {
    return '[Circular Reference]';
  }
  
  visited.add(data);
  
  if (data instanceof Date) {
      return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForJson(item, visited));
  }
  
  const result: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // Exclude DOM nodes and events that cause strict circular errors (like 'src' loop)
      if (key.startsWith('_') || key === 'src' || data[key] instanceof Element || (typeof Event !== 'undefined' && data[key] instanceof Event)) {
          continue;
      }
      result[key] = sanitizeForJson(data[key], visited);
    }
  }
  
  return result;
};

interface OpsLogProps {
  initialFilterCategory?: string | null;
}

const OpsLog: React.FC<OpsLogProps> = ({ initialFilterCategory }) => {
  const [activeTab, setActiveTab] = useState<'CASES' | 'ARCHIVE' | 'SCRAPED'>('CASES');
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [archive, setArchive] = useState<SignalLogEntry[]>([]);
  const [scraped, setScraped] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<SignalLogEntry | null>(null);
  const [selectedScraped, setSelectedScraped] = useState<any | null>(null);
  
  const [filter, setFilter] = useState<'ALL' | CaseStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [noteInput, setNoteInput] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [archiveLimit, setArchiveLimit] = useState(50);
  const username = localStorage.getItem('anomalyWatch_username') || 'Guest';

  useEffect(() => {
    const unsubCases = CaseOps.subscribeToCases((updated) => {
      setCases(updated);
      setLoading(false);
      if (selectedCase) {
        const fresh = updated.find(c => c.id === selectedCase.id);
        if (fresh) setSelectedCase(fresh);
      }
    });

    // Subscribe with dynamic limit for pagination
    const unsubArchive = ArchiveOps.subscribeToArchive((updated) => {
      setArchive(updated);
    }, archiveLimit);

    const unsubScraped = import("../services/firebaseService").then(m => 
      m.ScrapeOps.subscribeToScrapedData((updated) => {
        setScraped(updated);
      }, archiveLimit)
    );

    return () => {
      unsubCases();
      unsubArchive();
      unsubScraped.then(unsub => unsub());
    };
  }, [selectedCase, archiveLimit]);

  useEffect(() => {
    if (initialFilterCategory && initialFilterCategory !== 'ALL') {
      setFilter(initialFilterCategory as CaseStatus);
    }
  }, [initialFilterCategory]);

  const handleStatusChange = async (status: CaseStatus) => {
    if (!selectedCase) return;
    const reason = prompt(`Intel update: Reason for status shift to ${status}?`);
    if (reason) await CaseOps.updateStatus(selectedCase.id, status, reason);
  };

  const handleAddNote = async () => {
    if (!selectedCase || !noteInput.trim()) return;
    await CaseOps.addNote(selectedCase.id, noteInput);
    setNoteInput('');
    triggerTacticalVibration(15);
  };

  const handleJoinDossier = async () => {
    if (!selectedCase) return;
    await CaseOps.addCollaborator(selectedCase.id, username);
    triggerTacticalVibration(20);
  };

  const handleLeaveDossier = async () => {
    if (!selectedCase) return;
    await CaseOps.removeCollaborator(selectedCase.id, username);
    triggerTacticalVibration(10);
  };

  const handleDelete = async (id: string) => {
    if (confirm("DANGER: This will purge the record from the global archive. Proceed?")) {
      await CaseOps.deleteCase(id);
      setSelectedCase(null);
      triggerTacticalVibration([30, 20, 30]);
    }
  };

  const handleLoadMoreArchive = () => {
    setArchiveLimit(prev => prev + 50);
    triggerTacticalVibration(10);
  };

  const filteredItems = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    if (activeTab === 'CASES') {
      return cases.filter(c => {
        const matchesStatus = filter === 'ALL' || c.status === filter;
        const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
        const matchesSearch = c.title.toLowerCase().includes(lowerQuery) || 
                              c.id.toLowerCase().includes(lowerQuery) ||
                              c.summary.toLowerCase().includes(lowerQuery) ||
                              c.tags.some(t => t.toLowerCase().includes(lowerQuery));
        return matchesStatus && matchesCategory && matchesSearch;
      });
    } else if (activeTab === 'ARCHIVE') {
      return archive.filter(s => 
        s.query.toLowerCase().includes(lowerQuery) ||
        s.response.toLowerCase().includes(lowerQuery) ||
        s.type.toLowerCase().includes(lowerQuery) ||
        s.operative.toLowerCase().includes(lowerQuery)
      );
    } else {
      return scraped.filter(s => 
        s.query.toLowerCase().includes(lowerQuery) ||
        (s.rawText || '').toLowerCase().includes(lowerQuery) ||
        s.operative.toLowerCase().includes(lowerQuery)
      );
    }
  }, [cases, archive, scraped, activeTab, filter, searchQuery]);

  const handleExportFullVault = () => {
    const payload = {
        identity: {
            username: localStorage.getItem('anomalyWatch_username'),
            specialty: localStorage.getItem('anomalyWatch_specialty')
        },
        cases,
        archive,
        timestamp: Date.now()
    };
    const sanitized = sanitizeForJson(payload);
    const blob = new Blob([JSON.stringify(sanitized, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ANOMALY_WATCH_RECOVERY_KEY_${Date.now()}.json`;
    a.click();
    setShowExportMenu(false);
  };

  const handleImportFullVault = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const data = JSON.parse(evt.target?.result as string);
            if (data.identity && data.identity.username) {
                localStorage.setItem('anomalyWatch_username', data.identity.username);
                localStorage.setItem('anomalyWatch_specialty', data.identity.specialty || 'GENERAL');
                alert("IDENTITY & LOGS IMPORTED. RELOADING HUDS...");
                window.location.reload();
            }
        } catch (e) {
            alert("CORRUPTED RECOVERY KEY.");
        }
    };
    reader.readAsText(file);
  };

  const handleExport = async (format: 'JSON' | 'TXT') => {
    const data = activeTab === 'CASES' ? cases : activeTab === 'ARCHIVE' ? archive : scraped;
    const content = format === 'JSON' 
      ? JSON.stringify(sanitizeForJson(data), null, 2)
      : data.map((c: any) => `[${c.type || c.status || 'SCRAPED'}] ${c.title || c.query}\n${c.summary || c.response || c.rawText || ''}\n\n`).join('---');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ANOMALY_VAULT_${activeTab}_EXPORT_${Date.now()}.${format.toLowerCase()}`;
    a.click();
    setShowExportMenu(false);
  };

  const getStatusColor = useCallback((status: CaseStatus) => {
    switch(status) {
      case 'New Lead': return 'text-ufo-green border-ufo-green';
      case 'Under Review': return 'text-warning-amber border-warning-amber';
      case 'Corroborated': return 'text-celestial-blue border-celestial-blue';
      case 'Discredited': return 'text-danger-red border-danger-red';
      default: return 'text-slate-500 border-slate-500';
    }
  }, []);

  const handleSelectItem = useCallback((item: any) => {
    if (activeTab === 'CASES') setSelectedCase(item);
    else if (activeTab === 'ARCHIVE') setSelectedSignal(item);
    else setSelectedScraped(item);
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto h-full md:h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4 md:gap-6 animate-in fade-in duration-500 pb-32 md:pb-0 px-4 md:px-0 relative">
      
      {/* Sidebar: Global Archive - Hidden on mobile if something is selected */}
      <div className={`w-full md:w-1/3 flex flex-col space-y-4 h-auto md:h-full ${((selectedCase || selectedSignal || selectedScraped)) ? 'hidden md:flex' : 'flex'}`}>
         <div className="glass-panel p-4 md:p-4 rounded-2xl md:rounded-lg flex flex-col gap-4 border-l-4 border-warning-amber bg-black/40 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-display font-bold text-white tracking-widest uppercase">Vault Records</h2>
                {/* Secret Quantum Artifact Treasure Node */}
                <button
                  onClick={() => ProgressionService.discoverArtifact('ARTIFACT_DEEP_RESEARCH_KEY')}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-mono font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  title="Sub-Oceanic Bathymetry Anomaly - Click to Decode Magnetic Key"
                >
                  <Sparkles className="w-3 h-3 animate-spin text-amber-400 hover:text-black" />
                  <span>OCEAN-MAG-08</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-ufo-green rounded-full animate-pulse shadow-[0_0_8px_#00ff9d]"></div>
                <span className="text-[8px] md:text-[10px] font-mono text-ufo-green uppercase tracking-wider">Sync Active</span>
              </div>
            </div>
            
            <div className="flex p-1 bg-black/60 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar-hide">
               <button 
                 onClick={() => { setActiveTab('CASES'); setSelectedCase(null); }}
                 className={`flex-1 min-w-[80px] py-3 text-[8px] md:text-[9px] font-mono uppercase tracking-[0.2em] rounded-lg transition-all ${activeTab === 'CASES' ? 'bg-warning-amber text-black font-black' : 'text-slate-500 hover:text-white'}`}
               >
                 Dossiers
               </button>
               <button 
                 onClick={() => { setActiveTab('ARCHIVE'); setSelectedSignal(null); }}
                 className={`flex-1 min-w-[80px] py-3 text-[8px] md:text-[9px] font-mono uppercase tracking-[0.2em] rounded-lg transition-all ${activeTab === 'ARCHIVE' ? 'bg-celestial-blue text-black font-black' : 'text-slate-500 hover:text-white'}`}
               >
                 Signals
               </button>
               <button 
                 onClick={() => { setActiveTab('SCRAPED'); setSelectedScraped(null); }}
                 className={`flex-1 min-w-[80px] py-3 text-[8px] md:text-[9px] font-mono uppercase tracking-[0.2em] rounded-lg transition-all ${activeTab === 'SCRAPED' ? 'bg-ufo-green text-black font-black' : 'text-slate-500 hover:text-white'}`}
               >
                 Intel
               </button>
            </div>
         </div>
         
         <div className="relative">
            <input 
              type="text" 
              placeholder="Filter vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-2xl md:rounded-lg p-4 text-[11px] font-mono text-white focus:outline-none focus:border-ufo-green/30 placeholder-slate-800 tracking-widest transition-all shadow-inner font-black"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 scale-75 md:scale-100">{ICONS.SEARCH}</div>
         </div>

         {activeTab === 'CASES' && (
           <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar-hide">
               {['ALL', 'New Lead', 'Under Review', 'Corroborated'].map((f) => (
                   <button
                      key={f}
                      onClick={() => setFilter(f as any)}
                      className={`px-4 py-1.5 rounded-full text-[8px] font-mono uppercase tracking-widest border whitespace-nowrap transition-all ${
                          filter === f ? 'bg-warning-amber text-black border-warning-amber font-black' : 'bg-black/40 text-slate-500 border-white/5 hover:text-white'
                      }`}
                   >
                       {f}
                   </button>
               ))}
           </div>
         )}

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-4 log-container-optimized">
             {loading ? (
                <div className="flex flex-col items-center justify-center py-10 md:py-20 opacity-30 animate-pulse">
                    <span className="text-[10px] font-mono uppercase tracking-[0.4em]">Downlinking...</span>
                </div>
             ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-700">Empty Sector</span>
                </div>
             ) : (
               <>
                 {filteredItems.map((item: any) => {
                   const isSelected = activeTab === 'CASES' 
                     ? selectedCase?.id === item.id 
                     : activeTab === 'ARCHIVE' 
                       ? selectedSignal?.id === item.id 
                       : selectedScraped?.id === item.id;

                   return (
                     <OpsLogItemCard
                       key={item.id}
                       item={item}
                       activeTab={activeTab}
                       isSelected={!!isSelected}
                       onSelect={handleSelectItem}
                       getStatusColor={getStatusColor}
                     />
                   );
                 })}
                 
                 {(activeTab === 'ARCHIVE' || activeTab === 'SCRAPED') && filteredItems.length >= archiveLimit && (
                    <button 
                      onClick={handleLoadMoreArchive}
                      className={`w-full py-5 text-[10px] font-mono uppercase tracking-widest font-black ${activeTab === 'ARCHIVE' ? 'text-celestial-blue border-celestial-blue/20 bg-celestial-blue/5' : 'text-ufo-green border-ufo-green/20 bg-ufo-green/5'} border border-dashed rounded-2xl hover:bg-white/5 transition-all text-center`}
                    >
                       Load More {activeTab === 'ARCHIVE' ? 'Signals' : 'Intel'}
                    </button>
                 )}
               </>
             )}
         </div>

         <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="w-full flex items-center justify-center space-x-2 p-5 bg-white/[0.02] border border-white/5 text-slate-500 text-[10px] font-mono font-black uppercase tracking-widest hover:text-white transition-all rounded-2xl">
               {EXPORT_ICON} <span>Maintenance</span>
            </button>
            {showExportMenu && (
               <div className="absolute bottom-full left-0 w-full mb-3 glass-panel border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-50 animate-in slide-in-from-bottom-2">
                  <button onClick={handleExportFullVault} className="w-full p-4 text-center text-[10px] font-mono text-white bg-ufo-green/10 hover:bg-ufo-green/20 border-b border-white/5 uppercase tracking-widest font-black">Recovery Key</button>
                  <label className="w-full p-4 text-center text-[10px] font-mono text-slate-300 hover:bg-white/10 border-b border-white/5 uppercase tracking-widest cursor-pointer block font-black">
                     Import
                     <input type="file" className="hidden" accept=".json" onChange={handleImportFullVault} />
                  </label>
                  <button onClick={() => handleExport('JSON')} className="w-full p-4 text-center text-[10px] font-mono text-slate-300 hover:bg-white/10 uppercase tracking-widest font-black">Download JSON</button>
               </div>
            )}
         </div>
      </div>

      {/* Main: Active Dossier / Signal Detail - Shown on mobile if something is selected */}
      <div className={`flex-1 glass-panel border border-white/5 rounded-2xl md:rounded-[3rem] flex flex-col overflow-hidden bg-black/60 shadow-2xl relative min-h-[500px] md:min-h-0 ${(!(selectedCase || selectedSignal || selectedScraped)) ? 'hidden md:flex' : 'flex'}`}>
         
         {/* Mobile Back Button */}
         {(selectedCase || selectedSignal || selectedScraped) && (
           <button 
             onClick={() => { setSelectedCase(null); setSelectedSignal(null); setSelectedScraped(null); }}
             className="md:hidden absolute top-6 left-6 z-50 w-12 h-12 glass-panel border border-white/10 rounded-full flex items-center justify-center text-white text-xl shadow-2xl"
           >
             ←
           </button>
         )}

         <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

         {activeTab === 'CASES' ? (
           !selectedCase ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20 p-20 text-center select-none">
                 <div className="text-6xl mb-6">{ICONS.ARCHIVE}</div>
                 <p className="font-mono text-[10px] md:text-xs tracking-[0.4em] uppercase font-black">Awaiting Subject Selection</p>
             </div>
           ) : (
             <>
                <div className="bg-black/80 border-b border-white/5 p-8 md:p-12 flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0 backdrop-blur-3xl z-10 pt-20 md:pt-12">
                    <div className="space-y-4 md:space-y-6">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-warning-amber tracking-[0.3em] font-black uppercase bg-warning-amber/10 px-3 py-1 rounded-full">Encrypted_Dossier</span>
                          <span className="text-[10px] font-mono text-slate-700">|</span>
                          <span className="text-[10px] font-mono text-slate-600 font-bold uppercase tracking-widest">{selectedCase.id.slice(0, 12)}</span>
                        </div>
                        <h2 className="text-2xl md:text-5xl font-display font-black text-white tracking-tight uppercase leading-tight">{selectedCase.title}</h2>
                        <div className="flex flex-wrap gap-3 md:gap-6 text-[10px] font-mono text-slate-500 uppercase font-black">
                             <span className={`px-4 py-1 border rounded-full ${getStatusColor(selectedCase.status)} bg-black/40 tracking-widest`}>{selectedCase.status}</span>
                             <span className="flex items-center gap-3"><span className="text-slate-800 tracking-widest">CATEG:</span> {selectedCase.category}</span>
                             <span className="flex items-center gap-3"><span className="text-slate-800 tracking-widest">TIER:</span> <span className="text-ufo-green">{selectedCase.evidenceTier}</span></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {selectedCase.collaborators?.includes(username) ? (
                          <button onClick={handleLeaveDossier} className="flex-1 md:flex-none px-8 py-3 bg-danger-red/10 border border-danger-red/30 text-danger-red text-[11px] font-mono font-black uppercase tracking-widest rounded-2xl hover:bg-danger-red hover:text-white transition-all shadow-xl">Leave</button>
                        ) : (
                          <button onClick={handleJoinDossier} className="flex-1 md:flex-none px-8 py-3 bg-ufo-green/10 border border-ufo-green/30 text-ufo-green text-[11px] font-mono font-black uppercase tracking-widest rounded-2xl hover:bg-ufo-green hover:text-black transition-all shadow-xl">Join</button>
                        )}
                        <button onClick={() => handleDelete(selectedCase.id)} className="w-12 h-12 glass-panel border border-white/5 rounded-full flex items-center justify-center text-slate-600 hover:text-danger-red transition-all active:scale-95">{DELETE_ICON}</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 md:p-16 space-y-12 md:space-y-20 custom-scrollbar z-10 bg-black/20">
                    {selectedCase.collaborators && selectedCase.collaborators.length > 0 && (
                      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                         <div className="flex items-center gap-4 mb-6">
                            <span className="text-[10px] font-mono text-slate-700 uppercase tracking-[0.5em] font-black border-b border-white/5 pb-3 flex-1">Authorized Operatives</span>
                            <div className="flex -space-x-3">
                               {selectedCase.collaborators.map(c => (
                                  <div key={c} className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-black border-2 border-ufo-green/20 flex items-center justify-center text-[10px] md:text-sm font-display font-black text-white uppercase shadow-2xl relative group" title={c}>
                                     <div className="absolute inset-0 bg-ufo-green/10 rounded-full animate-pulse"></div>
                                     {c.slice(0, 1)}
                                  </div>
                               ))}
                            </div>
                         </div>
                      </section>
                    )}
                    <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <h3 className="text-[10px] font-mono text-slate-800 uppercase tracking-[0.6em] mb-8 border-b border-white/5 pb-4 font-black">Forensic Summary</h3>
                        <div className="prose prose-invert prose-xs sm:prose-sm md:prose-xl max-w-none text-slate-400 font-mono tracking-tight leading-relaxed prose-headings:text-ufo-green prose-headings:font-display prose-headings:uppercase">
                            <Markdown>{selectedCase.summary}</Markdown>
                        </div>
                    </section>

                    {selectedCase.anomalyReasoning && (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 bg-ufo-green/[0.03] p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-ufo-green/10">
                            <h3 className="text-[10px] font-mono text-ufo-green uppercase tracking-[0.5em] mb-6 border-b border-ufo-green/5 pb-3 font-black">AI_ANOMALY_LOGIC</h3>
                            <div className="prose prose-invert prose-xs sm:prose-sm md:prose-lg max-w-none text-slate-400 font-mono tracking-tight leading-relaxed">
                                <Markdown>{selectedCase.anomalyReasoning}</Markdown>
                            </div>
                        </section>
                    )}

                    <section className="bg-white/[0.01] p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-inner">
                        <h3 className="text-[10px] font-mono text-slate-800 uppercase tracking-[0.5em] mb-8 font-black">Field_Comms</h3>
                        <div className="space-y-6 mb-10 overflow-hidden">
                             {selectedCase.notes.map((note) => (
                                 <div key={note.id} className="text-[10px] md:text-xs font-mono flex gap-4 animate-in slide-in-from-left-4 group">
                                     <span className="text-slate-700 shrink-0 w-16 md:w-20 group-hover:text-slate-500 transition-colors">{new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                     <div className="flex-1">
                                        <span className={note.author.includes('AI') ? 'text-celestial-blue' : 'text-warning-amber'}>[{note.author.toUpperCase()}]</span> 
                                        <div className="text-slate-500 leading-relaxed mt-1">{note.text}</div>
                                     </div>
                                 </div>
                             ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input 
                               type="text" 
                               value={noteInput}
                               onChange={(e) => setNoteInput(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                               placeholder="Append field entry..."
                               className="flex-1 bg-black border border-white/5 rounded-2xl px-6 py-4 text-[11px] font-mono text-white focus:outline-none focus:border-ufo-green/30 shadow-inner font-black"
                            />
                            <button onClick={handleAddNote} className="bg-ufo-green text-black px-10 py-4 rounded-2xl text-[10px] font-display font-black uppercase tracking-widest hover:bg-white transition-all shadow-2xl active:scale-95">Transmit</button>
                        </div>
                    </section>
                </div>
             </>
           )
         ) : activeTab === 'ARCHIVE' ? (
           !selectedSignal ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20 p-20 text-center select-none">
                 <div className="text-6xl mb-6">{ICONS.NEXUS}</div>
                 <p className="font-mono text-[10px] md:text-xs tracking-[0.4em] uppercase font-black">Awaiting Signal Acquisition</p>
             </div>
           ) : (
             <div className="flex flex-col h-full animate-in fade-in duration-500 z-10 pt-20 md:pt-0">
                <div className="bg-black/80 border-b border-white/5 p-8 md:p-12 backdrop-blur-3xl">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                         <div className="px-4 py-1.5 bg-celestial-blue/10 border border-celestial-blue/30 text-celestial-blue text-[9px] md:text-[10px] font-mono uppercase rounded-full font-black tracking-widest">Intercepted_Signal</div>
                         <span className="text-[10px] font-mono text-slate-800">|</span>
                         <span className="text-[10px] font-mono text-slate-600 truncate max-w-[150px] font-bold uppercase">{selectedSignal.id.slice(0, 12)}</span>
                      </div>
                   </div>
                   <h2 className="text-xl md:text-4xl font-display font-black text-white tracking-widest uppercase mb-6 leading-tight">{selectedSignal.query}</h2>
                   <div className="flex flex-wrap gap-4 md:gap-8 text-[10px] font-mono text-slate-500 uppercase font-black">
                      <span>SOURCE: <span className="text-warning-amber">{selectedSignal.operative.toUpperCase()}</span></span>
                      <span>FREQ: <span className="text-celestial-blue tracking-[0.2em]">{selectedSignal.type}</span></span>
                      <span>TIMESTAMP: {selectedSignal.timestamp?.toDate ? selectedSignal.timestamp.toDate().toLocaleDateString() : 'PERSISTENT'}</span>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar bg-black/20">
                   <div className="prose prose-invert prose-xs sm:prose-sm md:prose-xl max-w-none text-slate-400 font-mono tracking-tight leading-relaxed prose-headings:text-celestial-blue prose-headings:font-display prose-headings:uppercase">
                      <Markdown>{selectedSignal.response}</Markdown>
                   </div>
                   
                   {selectedSignal.groundingUrls && selectedSignal.groundingUrls.length > 0 && (
                      <div className="mt-12 md:mt-20 pt-8 md:pt-12 border-t border-white/5">
                        <h4 className="text-[10px] font-mono text-slate-800 uppercase tracking-[0.5em] mb-8 font-black">Verification Artifacts</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {selectedSignal.groundingUrls.map((u, i) => (
                              <a key={i} href={u.uri} target="_blank" rel="noreferrer" className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl hover:border-celestial-blue/40 hover:bg-celestial-blue/5 transition-all group flex flex-col justify-between h-full">
                                 <div className="text-[10px] md:text-sm font-black text-slate-300 group-hover:text-white transition-colors mb-2 uppercase leading-snug">{u.title}</div>
                                 <div className="text-[8px] md:text-[9px] font-mono text-slate-600 truncate uppercase tracking-widest">{new URL(u.uri).hostname}</div>
                              </a>
                           ))}
                        </div>
                      </div>
                   )}
                </div>
                <div className="p-8 bg-black/40 border-t border-white/5 flex justify-end gap-4 px-8 md:px-12 backdrop-blur-3xl">
                    <button 
                      onClick={() => {
                        CaseOps.createCase(
                          `Signal Artifact: ${selectedSignal.query.slice(0, 30)}`,
                          selectedSignal.response,
                          'Signal_Recovery',
                          { id: Date.now().toString(), type: 'Signal Recovery', content: selectedSignal.response, timestamp: Date.now(), urls: selectedSignal.groundingUrls }
                        );
                        setActiveTab('CASES');
                      }}
                      className="w-full md:w-auto px-10 py-5 bg-warning-amber text-black rounded-2xl text-[10px] md:text-xs font-display font-black uppercase tracking-widest hover:bg-white transition-all shadow-2xl active:scale-95"
                    >
                       Promote Intelligence
                    </button>
                </div>
             </div>
           )
         ) : (
           !selectedScraped ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20 p-10 text-center">
                 <div className="text-4xl md:text-6xl mb-4">{ICONS.SEARCH}</div>
                 <p className="font-mono text-[10px] md:text-xs tracking-[0.4em] uppercase">Select Offsite Intel</p>
             </div>
           ) : (
             <div className="flex flex-col h-full animate-in fade-in duration-500 z-10">
               <div className="bg-black/80 border-b border-ufo-green/20 p-8 md:p-12 backdrop-blur-3xl">
                  <div className="flex justify-between items-start mb-6">
                     <div className="flex items-center gap-4">
                        <div className="px-4 py-1.5 bg-ufo-green/10 border border-ufo-green/30 text-ufo-green text-[9px] md:text-[10px] font-mono uppercase rounded-full font-black tracking-widest">Offsite_Intelligence</div>
                        <span className="text-[10px] font-mono text-slate-800">|</span>
                        <span className="text-[10px] font-mono text-slate-600 truncate max-w-[150px] font-bold uppercase">{selectedScraped.id.slice(0, 12)}</span>
                     </div>
                  </div>
                  <h2 className="text-xl md:text-4xl font-display font-black text-white tracking-widest uppercase mb-6 leading-tight">{selectedScraped.query}</h2>
                  <div className="flex flex-wrap gap-4 md:gap-8 text-[10px] font-mono text-slate-500 uppercase font-black">
                     <span>ANALYST: <span className="text-ufo-green">{selectedScraped.operative.toUpperCase()}</span></span>
                     <span>VECTOR: <span className="text-ufo-green tracking-[0.2em]">EXTERNAL_DEEP_WEB</span></span>
                     <span>TIMESTAMP: {selectedScraped.timestamp?.toDate ? selectedScraped.timestamp.toDate().toLocaleDateString() : (typeof selectedScraped.timestamp === 'string' ? new Date(selectedScraped.timestamp).toLocaleDateString() : 'N/A')}</span>
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar bg-black/20">
                  {selectedScraped.rawText ? (
                    <div className="prose prose-invert prose-xs sm:prose-sm md:prose-xl max-w-none text-slate-400 font-mono tracking-tight leading-relaxed prose-headings:text-ufo-green prose-headings:font-display prose-headings:uppercase">
                       <Markdown>{selectedScraped.rawText}</Markdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center select-none">
                       <div className="text-4xl mb-4">⚠</div>
                       <span className="text-[10px] font-mono uppercase tracking-[0.4em]">Node Data Extraction Failed</span>
                    </div>
                  )}
                  
                  {selectedScraped.urls && selectedScraped.urls.length > 0 && (
                     <div className="mt-12 md:mt-20 pt-8 md:pt-12 border-t border-white/5">
                       <h4 className="text-[10px] font-mono text-slate-800 uppercase tracking-[0.5em] mb-8 font-black">Source Nodes</h4>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedScraped.urls.map((u: any, i: number) => (
                             <a key={i} href={u.uri} target="_blank" rel="noreferrer" className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl hover:border-ufo-green/40 hover:bg-ufo-green/5 transition-all group flex flex-col justify-between h-full">
                                <div className="text-[10px] md:text-sm font-black text-slate-300 group-hover:text-white transition-colors mb-2 uppercase leading-snug">{u.title}</div>
                                <div className="text-[8px] md:text-[9px] font-mono text-slate-600 truncate tracking-widest uppercase">{new URL(u.uri).hostname}</div>
                             </a>
                          ))}
                       </div>
                     </div>
                  )}
               </div>
               <div className="p-8 bg-black/40 border-t border-white/5 flex justify-end gap-4 px-8 md:px-12 backdrop-blur-3xl">
                    <button 
                      onClick={() => {
                        CaseOps.createCase(
                          `Offsite Intelligence: ${selectedScraped.query.slice(0, 30)}`,
                          selectedScraped.rawText || "Data Acquisition Fault",
                          'Offsite_Deep_Recovery',
                          { id: Date.now().toString(), type: 'Offsite Intel', content: selectedScraped.rawText, timestamp: Date.now(), urls: selectedScraped.urls }
                        );
                        setActiveTab('CASES');
                      }}
                      className="w-full md:w-auto px-10 py-5 bg-ufo-green text-black rounded-2xl text-[10px] md:text-xs font-display font-black uppercase tracking-widest hover:bg-white transition-all shadow-2xl active:scale-95"
                    >
                       Archive Intelligence
                    </button>
               </div>
             </div>
           )
         )}
      </div>
    </div>
  );
};

export default OpsLog;
