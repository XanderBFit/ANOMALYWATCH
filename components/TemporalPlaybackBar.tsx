import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Clock, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  BarChart2,
  FastForward
} from 'lucide-react';

interface TemporalPlaybackBarProps {
  onTimeChange?: (hoursAgo: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export const TemporalPlaybackBar: React.FC<TemporalPlaybackBarProps> = ({
  onTimeChange,
  onPlayStateChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentHour, setCurrentHour] = useState(0); // 0 = NOW, 72 = -72H
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 5>(1);

  // Playback timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentHour((prev) => {
          const next = prev + 1;
          if (next > 72) {
            setIsPlaying(false);
            if (onPlayStateChange) onPlayStateChange(false);
            return 0;
          }
          if (onTimeChange) onTimeChange(next);
          return next;
        });
      }, 1000 / speedMultiplier);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier, onTimeChange, onPlayStateChange]);

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (onPlayStateChange) onPlayStateChange(nextState);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentHour(val);
    if (onTimeChange) onTimeChange(val);
  };

  const handleResetNow = () => {
    setIsPlaying(false);
    setCurrentHour(0);
    if (onTimeChange) onTimeChange(0);
    if (onPlayStateChange) onPlayStateChange(false);
  };

  // Synthetic density histogram bars representing historical signal density spikes
  const histogramHeights = [
    20, 35, 15, 60, 80, 45, 30, 90, 75, 40, 25, 55, 70, 85, 30, 20, 65, 95, 40, 25,
    30, 50, 80, 60, 40, 20, 75, 90, 45, 35, 60, 85, 30, 15, 70, 95, 50, 35, 65, 40
  ];

  const formattedTimeLabel = currentHour === 0 
    ? 'LIVE GROUND TRUTH (NOW)' 
    : currentHour < 0 
    ? `+${Math.abs(currentHour)}H PREDICTIVE CORRIDOR` 
    : `-${currentHour}H HISTORICAL SCRUB`;

  return (
    <div className="w-full bg-slate-950/95 border-t border-ufo-green/30 backdrop-blur-xl p-3 md:px-6 md:py-3 font-mono flex flex-col md:flex-row items-center justify-between gap-3 text-xs shadow-2xl relative z-[100]">
      {/* Play Controls & Speed Toggles */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleResetNow}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Reset to Live Now"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            const next = Math.min(72, currentHour + 6);
            setCurrentHour(next);
            if (onTimeChange) onTimeChange(next);
          }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Step Backward -6 Hours"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className={`px-4 py-2 rounded-xl font-bold uppercase transition-all flex items-center gap-1.5 shadow-lg ${
            isPlaying 
              ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
              : 'bg-ufo-green text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(0,255,157,0.3)]'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isPlaying ? 'PAUSE 4D' : 'PLAY 4D'}</span>
        </button>

        <button
          onClick={() => {
            const next = Math.max(0, currentHour - 6);
            setCurrentHour(next);
            if (onTimeChange) onTimeChange(next);
          }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Step Forward +6 Hours"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed Multiplier */}
        <div className="flex items-center bg-black/50 p-1 rounded-xl border border-white/10">
          {([1, 2, 5] as const).map((spd) => (
            <button
              key={spd}
              onClick={() => setSpeedMultiplier(spd)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                speedMultiplier === spd ? 'bg-ufo-green text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Center Timeline & Histogram Density Slider */}
      <div className="flex-1 w-full max-w-2xl px-2 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="text-ufo-green flex items-center gap-1">
            <Clock className="w-3 h-3 animate-pulse" />
            <span>{formattedTimeLabel}</span>
          </span>
          <span className="text-slate-500">PAST 72 HOURS • COUNT-MIN SKETCH DENSITY</span>
        </div>

        {/* Mini Histogram Bars */}
        <div className="h-4 w-full flex items-end gap-1 px-1 opacity-60 pointer-events-none">
          {histogramHeights.map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-sm transition-all ${
                i === Math.floor((currentHour / 72) * histogramHeights.length)
                  ? 'bg-ufo-green shadow-[0_0_8px_#00ff9d]'
                  : 'bg-slate-700'
              }`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min={0}
          max={72}
          step={1}
          value={currentHour}
          onChange={handleSliderChange}
          className="w-full accent-ufo-green bg-slate-800 rounded-lg cursor-pointer"
        />
      </div>

      {/* Right Indicator Status Badge */}
      <div className="hidden lg:flex items-center gap-2 shrink-0 text-[10px] text-slate-400 font-bold border-l border-white/10 pl-4">
        <Sparkles className="w-4 h-4 text-ufo-green animate-pulse" />
        <span>TEMPORAL VECTOR REPLAY</span>
      </div>
    </div>
  );
};
