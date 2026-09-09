
import React from 'react';
import { GlobalAlert, AppView } from '../types';

interface GlobalAlertHudProps {
  alerts: GlobalAlert[];
  onDismiss: (id: string) => void;
  onNavigate?: (view: AppView) => void;
}

const GlobalAlertHud: React.FC<GlobalAlertHudProps> = ({ alerts, onDismiss, onNavigate }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] w-full max-w-lg px-6 pointer-events-none">
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div 
            key={alert.id} 
            onClick={() => {
              if (alert.targetView && onNavigate) {
                onNavigate(alert.targetView);
                onDismiss(alert.id);
              }
            }}
            className={`pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-500 glass-panel border ${alert.severity === 'CRITICAL' ? 'border-danger-red/60 bg-danger-red/5' : 'border-ufo-green/40 bg-black/80'} backdrop-blur-xl p-4 rounded-2xl flex flex-col gap-3 shadow-[0_0_40px_rgba(0,0,0,0.8)] relative overflow-hidden group ${alert.targetView ? 'cursor-pointer hover:border-white/40' : ''}`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${alert.severity === 'CRITICAL' ? 'bg-danger-red' : 'bg-ufo-green'}`}></div>
            
            <div className="flex items-center gap-4">
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${alert.severity === 'CRITICAL' ? 'bg-danger-red/10 text-danger-red border-danger-red/30' : 'bg-ufo-green/10 text-ufo-green border-ufo-green/30'}`}>
                 <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-center mb-0.5">
                    <span className={`text-[10px] font-mono font-black uppercase tracking-widest ${alert.severity === 'CRITICAL' ? 'text-danger-red' : 'text-ufo-green'}`}>{alert.title}</span>
                    <span className="text-[8px] font-mono text-slate-500 uppercase">{new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                 </div>
                 <p className="text-xs text-slate-300 font-mono line-clamp-2 tracking-tight leading-relaxed">{alert.message}</p>
              </div>
              <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   onDismiss(alert.id);
                 }}
                 className="shrink-0 p-2 text-slate-500 hover:text-white transition-colors self-start"
              >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {(alert.actionUrl || alert.targetView) && (
              <div className="pl-14 pr-4 pb-1">
                 {alert.actionUrl ? (
                   <a 
                     href={alert.actionUrl} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     onClick={(e) => e.stopPropagation()}
                     className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-mono font-black uppercase tracking-[0.2em] transition-all border ${alert.severity === 'CRITICAL' ? 'bg-danger-red text-white border-danger-red/50 hover:bg-white hover:text-danger-red' : 'bg-ufo-green text-black border-ufo-green/50 hover:bg-white'}`}
                   >
                      <span>{alert.actionLabel || 'RESOLVE_SYSTEM_CONFLICT'}</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                   </a>
                 ) : alert.targetView && (
                   <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-mono font-black uppercase tracking-[0.2em] transition-all border ${alert.severity === 'CRITICAL' ? 'bg-danger-red text-white border-danger-red/50 group-hover:bg-white group-hover:text-danger-red' : 'bg-ufo-green text-black border-ufo-green/50 group-hover:bg-white'}`}>
                      <span>{alert.actionLabel || 'VIEW_INTEL_REPORT'}</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                   </div>
                 )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalAlertHud;
