
import React, { useState, useEffect } from 'react';

interface OnboardingProps {
  onComplete: (identity: { username: string; specialty: string }) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');

  const handleFinalize = () => {
    if (!username.trim()) return;
    onComplete({ username: username.trim(), specialty: 'ANALYST' });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-anomaly-black text-slate-200 font-sans flex flex-col items-center justify-center p-6 overflow-hidden">
      
      {/* Background Radar */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-10">
        <div className="relative w-[150vw] h-[150vw] max-w-[1000px] max-h-[1000px]">
          <div className="absolute inset-0 border border-ufo-green/20 rounded-full"></div>
          <div className="absolute inset-[20%] border border-ufo-green/10 rounded-full"></div>
          <div className="absolute inset-0 radar-sweep-effect rounded-full animate-radar origin-center"></div>
        </div>
      </div>
      
      <div className="w-full max-w-3xl text-center relative z-10 flex flex-col items-center">
        
        {/* Animated Brand Identity - Scaled Down */}
        <div className="mb-8 space-y-0">
          <h1 className="text-4xl md:text-8xl font-display font-black text-white/90 tracking-[-0.05em] uppercase leading-[0.7] italic drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] select-none">
            Anomaly
          </h1>
          <h1 className="text-4xl md:text-8xl font-display font-black text-ufo-green tracking-[0.05em] uppercase leading-[0.7] italic drop-shadow-[0_0_40px_#00ff9d] hypnotic-text select-none">
            Watch
          </h1>
          
          <div className="pt-6 flex flex-col items-center gap-4">
             <div className="px-6 py-3 border border-dashed border-ufo-green/40 rounded-xl bg-ufo-green/5">
                <span className="text-sm md:text-lg font-display font-black text-ufo-green uppercase tracking-[0.6em] animate-pulse">
                  Tactical Intelligence Core
                </span>
             </div>
          </div>
        </div>

        {/* Integrated Identity Input Hub - More Compact */}
        <div className="relative w-full max-w-2xl">
          
          <div className="glass-panel p-1 rounded-[2rem] border-[2px] border-ufo-green/40 bg-ufo-green/[0.02] shadow-[0_0_60px_rgba(0,255,157,0.15)]">
            <div className="flex flex-col md:flex-row items-center bg-black/95 rounded-[1.8rem] p-3 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-[1px] bg-ufo-green animate-[scanline_4s_linear_infinite] opacity-20"></div>
               
               {/* Label Section - Updated to ALIAS */}
               <div className="px-6 py-4 border-b md:border-b-0 md:border-r border-ufo-green/20 flex flex-col items-center md:items-start shrink-0 min-w-[160px]">
                  <span className="text-[9px] font-mono text-ufo-green/60 uppercase tracking-[0.4em] mb-1 font-black">OPERATIVE ID</span>
                  <span className="text-lg font-display font-black text-white tracking-[0.2em] uppercase italic">ALIAS</span>
               </div>

               {/* Interaction Zone */}
               <div className="flex-1 relative w-full px-6">
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFinalize()}
                    className="w-full bg-transparent text-white text-3xl py-3 font-display text-center md:text-left focus:outline-none uppercase placeholder-slate-900 tracking-[0.1em] italic"
                    placeholder="NAME..."
                    autoFocus
                  />
                  <div className="absolute bottom-3 left-6 w-[calc(100%-48px)] h-[1px] bg-ufo-green/20">
                     <div 
                       className="h-full bg-ufo-green transition-all duration-700 shadow-[0_0_10px_#00ff9d]"
                       style={{ width: username.length > 0 ? '100%' : '10%' }}
                     ></div>
                  </div>
               </div>

               {/* Action Button */}
               <div className="p-2 shrink-0 w-full md:w-auto">
                  <button 
                    onClick={handleFinalize} 
                    className="w-full md:w-auto px-8 py-4 bg-ufo-green text-black font-display font-black text-sm uppercase tracking-[0.3em] rounded-[1.5rem] hover:scale-105 hover:shadow-[0_0_30px_#00ff9d] transition-all active:scale-95 shadow-xl border-t border-white/30 flex items-center justify-center"
                  >
                    Uplink
                  </button>
               </div>
            </div>
          </div>
          
          {/* HUD Metadata Footer */}
          <div className="mt-8 flex justify-between w-full px-8 text-slate-700 font-mono text-[8px] uppercase tracking-[0.5em] font-black opacity-30">
              <div className="flex gap-6">
                 <span>SECURE_DATA_LINE</span>
                 <span>FREQ_1420.406_MHZ</span>
              </div>
              <div className="flex gap-4">
                 <span className="animate-pulse">SIGNAL_STRENGTH_100%</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
