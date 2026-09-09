import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Keyboard, 
  X, 
  Command, 
  Compass, 
  Radio, 
  Map, 
  Search, 
  FileText, 
  Bell, 
  Play, 
  PlusCircle, 
  Sparkles,
  Terminal,
  Activity
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: 'PRIMARY MISSION NAVIGATION',
      shortcuts: [
        { key: '1', desc: 'Command Center & Real-Time Radar Overview', icon: <Activity className="w-3.5 h-3.5 text-ufo-green" /> },
        { key: '2', desc: 'Pattern Engine & Telemetry Correlations', icon: <Sparkles className="w-3.5 h-3.5 text-celestial-blue" /> },
        { key: '3', desc: 'Geospatial Radar Map (Full GIS View)', icon: <Map className="w-3.5 h-3.5 text-emerald-400" /> },
        { key: '4', desc: 'IRC Live Comms & Tactical Chatroom', icon: <Terminal className="w-3.5 h-3.5 text-amber-400" /> },
        { key: '5', desc: 'News Wire & Decrypted AI Daily Briefing', icon: <Search className="w-3.5 h-3.5 text-cyan-400" /> },
        { key: '6', desc: 'Operational Field Logs & Dossier Archive', icon: <FileText className="w-3.5 h-3.5 text-purple-400" /> },
      ]
    },
    {
      title: 'OPERATIVE HUD COMMANDS',
      shortcuts: [
        { key: '⌘ + K', altKey: 'Ctrl + K', desc: 'Universal Tactical Command Palette & Search', icon: <Command className="w-3.5 h-3.5 text-ufo-green" /> },
        { key: 'N', desc: 'Log New Sighting / Sighting Report Modal', icon: <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> },
        { key: 'G', desc: 'Open Geofenced Dispatch Alert Engine', icon: <Bell className="w-3.5 h-3.5 text-amber-400" /> },
        { key: 'Space', desc: 'Toggle 4D ChronoPlayback Time Scrubbing', icon: <Play className="w-3.5 h-3.5 text-cyan-400" /> },
        { key: '?', desc: 'Show/Hide Keyboard Tactical Cheat Sheet', icon: <Keyboard className="w-3.5 h-3.5 text-white" /> },
        { key: 'Esc', desc: 'Dismiss Active Slide-Over or Modal Dialog', icon: <X className="w-3.5 h-3.5 text-red-400" /> },
      ]
    }
  ];

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[280] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-mono"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-slate-950/95 border border-ufo-green/30 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,255,157,0.15)] space-y-6 my-auto"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-ufo-green/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-ufo-green/10 border border-ufo-green/30 text-ufo-green">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-display font-black text-white tracking-wide uppercase">
                  Tactical Keyboard Shortcuts
                </h3>
                <span className="text-[10px] text-slate-400">RAPID ACCESS COMMAND MATRIX</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Shortcut Sections */}
          <div className="space-y-6 relative z-10 text-xs">
            {shortcutSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-3">
                <h4 className="text-[10px] font-bold text-ufo-green/80 uppercase tracking-widest border-l-2 border-ufo-green pl-2">
                  {section.title}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {section.shortcuts.map((sc, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="shrink-0">{sc.icon}</div>
                        <span className="text-slate-300 text-[11px] truncate">{sc.desc}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <kbd className="px-2 py-1 rounded-lg bg-slate-900 border border-ufo-green/40 text-ufo-green font-mono text-[10px] font-black shadow-inner">
                          {sc.key}
                        </kbd>
                        {sc.altKey && (
                          <>
                            <span className="text-slate-600 text-[10px]">/</span>
                            <kbd className="px-2 py-1 rounded-lg bg-slate-900 border border-white/20 text-slate-300 font-mono text-[10px] font-bold">
                              {sc.altKey}
                            </kbd>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Tip */}
          <div className="p-3 rounded-2xl bg-ufo-green/5 border border-ufo-green/20 text-[10px] text-slate-400 flex items-center justify-between relative z-10">
            <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-ufo-green/30 text-ufo-green font-bold">?</kbd> at any time to open this reference.</span>
            <span className="text-ufo-green font-bold uppercase">HUD READY</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
