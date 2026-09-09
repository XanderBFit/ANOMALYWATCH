import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface TemporalScrubberProps {
  currentHourOffset: number;
  onChangeHourOffset: (offset: number) => void;
  densityData: number[];
}

export const TemporalScrubber: React.FC<TemporalScrubberProps> = ({
  currentHourOffset,
  onChangeHourOffset,
  densityData,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        onChangeHourOffset(currentHourOffset >= 24 ? -72 : currentHourOffset + 1);
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentHourOffset, playbackSpeed]);

  return (
    <footer className="h-14 w-full bg-slate-950/90 backdrop-blur-md border-t border-cyan-500/20 px-4 flex items-center justify-between font-mono z-40 select-none">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onChangeHourOffset(0)}
          className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-all text-xs"
          title="Reset to Real-Time (Now)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 5 : 1)}
          className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-400 text-xs rounded hover:text-cyan-300"
        >
          {playbackSpeed}x
        </button>
      </div>

      <div className="flex-1 max-w-2xl mx-6 flex flex-col justify-center">
        <div className="flex items-end gap-1 h-3 mb-1 px-1 opacity-70">
          {(densityData.length ? densityData : Array(24).fill(20)).map((val, idx) => (
            <div
              key={idx}
              className="flex-1 bg-cyan-500/40 rounded-t-sm hover:bg-cyan-400 transition-all"
              style={{ height: `${Math.min(100, Math.max(15, val))}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          min="-72"
          max="24"
          value={currentHourOffset}
          onChange={(e) => onChangeHourOffset(parseInt(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      <div className="text-right text-xs">
        <div className="text-cyan-300 font-bold">
          {currentHourOffset === 0 ? "LIVE (T-0)" : currentHourOffset < 0 ? `${currentHourOffset}h (Historical)` : `+${currentHourOffset}h (Predictive)`}
        </div>
        <div className="text-[10px] text-slate-500">4D ChronoPlayback</div>
      </div>
    </footer>
  );
};
