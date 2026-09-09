import React, { useState, useEffect } from 'react';
import { ICONS, ANOMALY_FACTS } from '../constants';
import { isCloudEnabled, ScrapeOps } from '../services/firebaseService';
import { AppView } from '../types';
import { Download, Plus, ChevronRight, Settings, Menu, PanelLeftClose, PanelLeftOpen, Terminal, Sparkles, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReportModal from './ReportModal';
import { AwButton, AwEmblem } from './AwButton';

interface NavBarProps {
  currentView: string;
  setView: (view: AppView) => void;
  onSearch?: (term: string) => void;
  specialty: string;
  setSpecialty: (spec: string) => void;
  onOpenProfile?: () => void;
  onOpenPersonalization?: () => void;
  cloudStatus: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ 
  currentView, 
  setView, 
  onSearch, 
  specialty, 
  setSpecialty, 
  onOpenProfile, 
  onOpenPersonalization, 
  cloudStatus,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('anomalyWatch_username') || 'Guest');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const isOffsiteConnected = !!import.meta.env.VITE_OFFSITE_DB_ENDPOINT || !!isCloudEnabled();

  // Listen for storage events to update name if changed in profile
  useEffect(() => {
    const checkName = () => setUsername(localStorage.getItem('anomalyWatch_username') || 'Guest');
    window.addEventListener('storage', checkName);
    const interval = setInterval(checkName, 2000);
    return () => {
      window.removeEventListener('storage', checkName);
      clearInterval(interval);
    };
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: {id: AppView, keyHint: string, label: string, icon: React.ReactNode, desc: string}[] = [
    { id: 'dashboard', keyHint: '1', label: 'OVERVIEW', icon: ICONS.GRID, desc: 'Command Center' },
    { id: 'patternEngine', keyHint: '2', label: 'PATTERN ENGINE', icon: <Sparkles className="w-5 h-5" />, desc: 'Trend Matrix & Bayes' },
    { id: 'map', keyHint: '3', label: 'ANOMALY MAP', icon: ICONS.MAP, desc: 'Geospatial Radar' },
    { id: 'chatroom', keyHint: '4', label: 'IRC CHATROOM', icon: <Terminal className="w-5 h-5" />, desc: 'Freq-99 Live Comms' },
    { id: 'briefing', keyHint: '5', label: 'NEWS & INTEL', icon: ICONS.SEARCH, desc: 'Live Intel Wire' },
    { id: 'opslog', keyHint: '6', label: 'MY REPORTS', icon: ICONS.FOLDER, desc: 'Personal Archives' },
  ];

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (onSearch && searchTerm.trim()) {
        onSearch(searchTerm);
        setView('briefing');
      }
      setSearchTerm('');
      setIsMobileMenuOpen(false);
    }
  };

  const handleNavClick = (id: AppView) => {
    setView(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className={`fixed z-[60] border-r border-white/[0.08] bg-anomaly-black hidden md:flex top-0 left-0 h-full flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-20 lg:w-80'}`}>
        
        {/* Background Grid Ornament */}
        <div className="absolute inset-0 grid-pattern pointer-events-none opacity-20"></div>
        <div className="absolute top-0 right-0 w-[1px] h-full bg-white/[0.03]"></div>
        <div className="absolute top-[10%] left-0 w-full h-[1px] bg-white/[0.03]"></div>

        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <div className={`p-6 flex items-center justify-between relative shrink-0 ${isCollapsed ? 'flex-col gap-4 px-2' : ''}`}>
            {/* Pulsing Green Ambient Backdrop Aura */}
            <div className="absolute top-2 left-2 w-56 h-24 bg-ufo-green/15 blur-2xl rounded-full animate-pulse pointer-events-none"></div>

            <div className="relative z-10">
              {!isCollapsed ? (
                <div className="flex flex-col">
                  <h1 className="text-3xl font-display font-black tracking-[0.35em] text-white uppercase leading-none">
                    ANOMALY
                  </h1>
                  <h1 className="text-2xl font-display font-light tracking-[0.55em] text-ufo-green uppercase leading-none mt-2">
                    WATCH
                  </h1>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-2">
                  <AwEmblem size={28} className="animate-pulse" />
                </div>
              )}
            </div>

            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-xl bg-white/5 hover:bg-ufo-green/20 hover:text-ufo-green text-slate-400 border border-white/10 transition-all flex items-center justify-center shrink-0 relative z-20 group cursor-pointer"
                title={isCollapsed ? "Expand Navigation Sidebar" : "Collapse Sidebar Navigation"}
              >
                {isCollapsed ? <PanelLeftOpen className="w-5 h-5 text-ufo-green" /> : <PanelLeftClose className="w-5 h-5 group-hover:text-ufo-green" />}
              </button>
            )}
          </div>

          {!isCollapsed && (
            <div className="px-6 py-2 shrink-0 space-y-3">
              <AwButton 
                variant="primary" 
                size="lg" 
                className="w-full py-3.5"
                onClick={() => setIsReportModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                New Intel Report
              </AwButton>

              <AwButton 
                variant="ghost" 
                size="md" 
                className="w-full py-3"
                onClick={onOpenPersonalization}
              >
                <Settings className="w-4 h-4 text-slate-400 group-hover:text-ufo-green transition-colors" />
                Calibration Mode
              </AwButton>

              <div className="relative group/search pt-1">
                 <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within/search:text-ufo-green transition-colors mt-1">
                    {ICONS.SEARCH}
                 </div>
                 <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearch}
                    placeholder="Search database..." 
                    className="w-full bg-black/40 border border-white/10 text-white text-xs font-mono rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-ufo-green/40 transition-all placeholder-slate-600"
                 />
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="px-2 py-3 shrink-0 flex flex-col items-center gap-2">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="w-12 h-12 rounded-xl bg-ufo-green text-black flex items-center justify-center font-bold hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,157,0.4)] cursor-pointer"
                title="New Intel Report"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={onOpenPersonalization}
                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 hover:border-ufo-green/50 text-slate-400 hover:text-ufo-green flex items-center justify-center transition-all cursor-pointer"
                title="Calibration Mode"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className={`flex-1 ${isCollapsed ? 'px-2 py-4' : 'px-4 py-4'} space-y-1`}>
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? `${item.label} [${item.keyHint}] - ${item.desc}` : undefined}
                  className={`
                    group flex items-center justify-between transition-all duration-200 rounded-xl cursor-pointer
                    ${isCollapsed ? 'px-3 py-3.5 justify-center' : 'px-5 py-3.5 w-full'} mb-1 relative overflow-hidden
                    ${isActive 
                      ? `bg-white/[0.08] text-white shadow-inner` 
                      : `text-slate-400 hover:text-white hover:bg-white/[0.03]`}
                  `}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator"
                      className="absolute left-0 w-1 h-1/2 bg-ufo-green rounded-r-full shadow-[0_0_10px_#00ff9d]"
                    />
                  )}
                  <div className="flex items-center min-w-0">
                    <div className={`text-lg transition-transform group-hover:scale-110 ${isCollapsed ? '' : 'mr-4'} ${isActive ? 'text-ufo-green' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <div className="flex flex-col items-start min-w-0 overflow-hidden text-left">
                        <span className={`micro-label font-bold tracking-[0.2em] uppercase ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {item.label}
                        </span>
                        <span className={`text-[9px] font-mono uppercase mt-0.5 transition-colors truncate w-full ${isActive ? 'text-ufo-green/80' : 'text-slate-500'}`}>
                          {item.desc}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isCollapsed && (
                    <kbd className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-opacity ${
                      isActive ? 'bg-ufo-green/20 text-ufo-green border border-ufo-green/40' : 'bg-white/5 text-slate-500 border border-white/10 opacity-60 group-hover:opacity-100'
                    }`}>
                      {item.keyHint}
                    </kbd>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`shrink-0 ${isCollapsed ? 'p-3' : 'p-5'} border-t border-white/[0.05] bg-black/40 space-y-3`}>
          {!isCollapsed ? (
            <>
              {/* System Status Section */}
              <div className="space-y-2">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${cloudStatus ? 'bg-ufo-green shadow-[0_0_8px_#00ff9d]' : 'bg-danger-red animate-pulse'}`}></div>
                       <span className="micro-label font-bold">Signal_Uplink</span>
                    </div>
                    <span className="data-value text-[9px] text-emerald-400 font-mono font-bold">8 FEEDS LIVE</span>
                 </div>

                 <AwButton 
                    variant="glass"
                    size="sm"
                    className="w-full mt-1"
                    onClick={() => ScrapeOps.exportAllData()}
                 >
                    <Download className="w-3 h-3 group-hover:animate-bounce" />
                    <span>Export Intel Archive</span>
                 </AwButton>
              </div>

              <button 
                onClick={onOpenProfile}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center text-white font-display font-black group-hover:border-ufo-green/50 transition-colors text-xs">
                     {username[0]?.toUpperCase() || 'O'}
                   </div>
                   <div className="flex flex-col items-start min-w-0">
                      <span className="micro-label text-[8px] opacity-40">Operative</span>
                      <span className="data-value text-xs text-white truncate max-w-[110px]">{username}</span>
                   </div>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-ufo-green transition-colors" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={onOpenProfile}
                title={`Operative: ${username}`}
                className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center text-white font-display font-black hover:border-ufo-green/50 transition-colors text-xs cursor-pointer"
              >
                {username[0]?.toUpperCase() || 'O'}
              </button>
            </div>
          )}
        </div>

        <ReportModal 
          isOpen={isReportModalOpen} 
          onClose={() => setIsReportModalOpen(false)} 
          onSuccess={() => setView('opslog')}
        />
      </nav>

      {/* Mobile Nav - Minimal Floating Dock */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-sm h-14 rounded-full bg-anomaly-black/95 backdrop-blur-2xl flex items-center justify-around px-2 border border-white/15 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[90]">
        {navItems.slice(0, 4).map((item) => {
          const isActive = currentView === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => handleNavClick(item.id)} 
              className={`relative flex flex-col items-center justify-center p-2 min-h-[44px] min-w-[44px] transition-all active:scale-90 ${isActive ? 'text-ufo-green' : 'text-slate-400'}`}
            >
              <div className={`text-lg transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}>{item.icon}</div>
              {isActive && (
                <motion.div 
                  layoutId="activeTabMobile"
                  className="absolute -bottom-1 w-1 h-1 bg-ufo-green rounded-full shadow-[0_0_10px_#00ff9d]"
                />
              )}
            </button>
          );
        })}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center p-2 min-h-[44px] min-w-[44px] transition-all active:scale-90 ${isMobileMenuOpen ? 'text-ufo-green' : 'text-slate-400'}`}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-[99] bg-black/80 backdrop-blur-md md:hidden"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-4 z-[100] glass-panel rounded-[2.5rem] flex flex-col p-6 md:p-8 border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden md:hidden"
            >
              <div className="absolute inset-0 bg-ufo-green/[0.02] pointer-events-none"></div>
              
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex flex-col">
                   <span className="text-[10px] font-mono text-ufo-green uppercase tracking-[0.4em] font-black">Tactical Hub</span>
                   <h1 className="text-xl font-display font-black tracking-widest text-white uppercase mt-1">Anomaly Watch</h1>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white text-lg hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pb-6">
                <div className="relative">
                   <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                      {ICONS.SEARCH}
                   </div>
                   <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleSearch}
                      placeholder="Search database..." 
                      className="w-full bg-white/[0.02] border border-white/10 text-white text-sm font-mono rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-ufo-green/50 transition-all placeholder-slate-600"
                   />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {navItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`
                          flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95
                          ${isActive 
                            ? `bg-ufo-green/10 border-ufo-green/40 shadow-[0_0_20px_rgba(0,255,157,0.1)]` 
                            : `bg-white/[0.03] border-white/5 hover:bg-white/5`}
                        `}
                      >
                        <div className={`text-xl mb-1.5 ${isActive ? 'text-ufo-green' : 'text-slate-400'}`}>
                          {item.icon}
                        </div>
                        <span className={`font-mono text-[9px] tracking-widest uppercase text-center ${isActive ? 'text-white font-black' : 'text-slate-400'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2.5 pt-2">
                  <button 
                    onClick={() => { setIsReportModalOpen(true); setIsMobileMenuOpen(false); }}
                    className="w-full py-3.5 bg-ufo-green text-black font-display font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-[0_10px_30px_rgba(0,255,157,0.3)]"
                  >
                    <Plus className="w-4 h-4" />
                    New Field Report
                  </button>
                  
                  <button 
                    onClick={() => { onOpenProfile?.(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] transition-colors hover:bg-white/5 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-full bg-ufo-green/10 border border-ufo-green/20 flex items-center justify-center text-ufo-green font-display font-black text-xs">
                         {username[0]?.toUpperCase() || 'O'}
                       </div>
                       <div className="flex flex-col items-start">
                          <span className="text-[8px] font-mono text-ufo-green/60 uppercase font-bold tracking-widest">Operator Identity</span>
                          <span className="text-xs font-mono text-white font-black tracking-wider">{username}</span>
                       </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavBar;
