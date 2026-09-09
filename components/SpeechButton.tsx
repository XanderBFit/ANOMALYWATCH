import React from 'react';
import { Play, Pause, Square, Volume2, Radio } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { AnimatedLogo } from './AnimatedLogo';

interface SpeechButtonProps {
  text: string;
  trackId?: string;
  title?: string;
}

export const SpeechButton: React.FC<SpeechButtonProps> = ({ 
  text, 
  trackId = 'speech-' + Math.random().toString(36).substring(2, 7),
  title = 'Audio Intelligence Brief'
}) => {
  const { 
    isPlaying, 
    isLoading, 
    currentTrackId, 
    playAudio, 
    stopAudio, 
    togglePause, 
    volume, 
    setVolume 
  } = useAudio();

  const isCurrentTrack = currentTrackId === trackId;
  const isThisPlaying = isCurrentTrack && isPlaying;

  const handleToggle = () => {
    if (isCurrentTrack) {
      if (isPlaying) {
        togglePause();
      } else {
        playAudio(text, trackId, title);
      }
    } else {
      playAudio(text, trackId, title);
    }
  };

  return (
    <div className="flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-ufo-green/30 transition-all shadow-inner">
      <button
        onClick={handleToggle}
        disabled={isLoading && isCurrentTrack}
        className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isThisPlaying 
            ? 'bg-ufo-green text-black shadow-[0_0_15px_#00ff9d]' 
            : 'bg-white/5 text-ufo-green hover:bg-ufo-green/20'
        }`}
        title={isThisPlaying ? "Pause Audio" : "Synthesize Voice Briefing"}
      >
        {isLoading && isCurrentTrack ? (
          <AnimatedLogo className="w-4 h-4 animate-spin text-ufo-green" />
        ) : isThisPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {isCurrentTrack && (
        <button 
          onClick={stopAudio} 
          className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          title="Halt Frequency Stream"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      )}

      {isThisPlaying && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-ufo-green/10 border border-ufo-green/20 text-[9px] font-mono text-ufo-green animate-pulse">
          <Radio className="w-3 h-3 animate-spin" />
          <span className="font-bold tracking-widest uppercase">BROADCASTING</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 pl-1 border-l border-white/10">
        <Volume2 className="w-3.5 h-3.5 text-slate-500" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-14 h-1 bg-slate-800 accent-ufo-green rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
};
