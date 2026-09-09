import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rss, 
  Volume2, 
  Play, 
  Pause, 
  Copy, 
  Check, 
  X, 
  Lock, 
  Radio, 
  Headphones, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';

interface PodcastFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userClearance: string;
  onNeedUpgrade: () => void;
}

export const PodcastFeedModal: React.FC<PodcastFeedModalProps> = ({
  isOpen,
  onClose,
  userClearance,
  onNeedUpgrade
}) => {
  const isSubscriber = userClearance === 'OPERATIVE' || userClearance === 'ANALYST';

  const [copiedRss, setCopiedRss] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!isOpen) return null;

  const rssFeedUrl = `https://anomalywatch.ai.studio/rss/podcast-feed-${userClearance.toLowerCase()}-key-891a.xml`;

  const handleCopyRss = () => {
    navigator.clipboard.writeText(rssFeedUrl);
    setCopiedRss(true);
    setTimeout(() => setCopiedRss(false), 2000);
  };

  const toggleAudioPreview = () => {
    if (!isSubscriber) {
      onNeedUpgrade();
      return;
    }

    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      setIsPlayingAudio(true);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const text = "Anomaly Watch Tactical Audio Briefing for August 14. Primary global radar telemetry indicates quiet geomagnetic activity with a Kp-index of 3.2. Solar wind velocity is currently stable at 420 kilometers per second. OpenSky ADS-B transponder filters recorded zero unverified airframes in restricted airspace over Nevada during the last 6 hour surveillance cycle. End of audio brief.";
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 0.9;
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto font-mono">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-slate-950 border border-ufo-green/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 overflow-hidden my-auto"
        >
          {/* Top Bar */}
          <div className="flex items-start justify-between border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 text-ufo-green text-xs font-bold uppercase tracking-widest mb-1">
                <Rss className="w-4 h-4 animate-pulse" />
                <span>SUBSCRIBER-ONLY PODCAST & RSS AUDIO FEED</span>
              </div>
              <h2 className="text-xl md:text-2xl font-display font-extrabold text-white uppercase tracking-tight">
                DAILY TACTICAL AUDIO INTEL FEED
              </h2>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isSubscriber && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold uppercase block">Field Operative Clearance Required</span>
                  <p className="text-[10px] text-amber-200/80 mt-0.5">
                    Private RSS feeds for Apple Podcasts & Spotify require Field Operative or OSINT Analyst clearance.
                  </p>
                </div>
              </div>
              <button
                onClick={onNeedUpgrade}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-extrabold text-[10px] uppercase shrink-0 hover:bg-amber-400 transition-colors"
              >
                UPGRADE ($9/MO)
              </button>
            </div>
          )}

          {/* Player Banner */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-ufo-green/10 border border-ufo-green/20 text-ufo-green">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">Today's Daily OSINT Tactical Audio Briefing</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Synthesized by Gemini AI • Duration: 01:42</p>
                </div>
              </div>

              <button
                onClick={toggleAudioPreview}
                className={`p-3 rounded-2xl font-bold uppercase transition-all flex items-center justify-center ${
                  isPlayingAudio 
                    ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                    : 'bg-ufo-green text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(0,255,157,0.3)]'
                }`}
              >
                {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
            </div>

            {isPlayingAudio && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-xl bg-ufo-green/10 border border-ufo-green/30 text-ufo-green text-[11px] font-bold flex items-center gap-2"
              >
                <Radio className="w-4 h-4 animate-spin" />
                <span>STREAMING Gemini Tactical Voice Synthesis Pipeline...</span>
              </motion.div>
            )}
          </div>

          {/* RSS Feed URL Input */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
              YOUR PRIVATE SUBSCRIBER PODCAST RSS URL
            </span>

            <div className="flex items-center gap-2">
              <input
                readOnly
                type="text"
                value={rssFeedUrl}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-ufo-green font-mono focus:outline-none"
              />

              <button
                onClick={handleCopyRss}
                className="px-4 py-2 bg-ufo-green/20 hover:bg-ufo-green/30 text-ufo-green border border-ufo-green/40 rounded-xl text-xs font-bold uppercase shrink-0 transition-colors flex items-center gap-1.5"
              >
                {copiedRss ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedRss ? 'COPIED!' : 'COPY URL'}</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500">
              Paste this link into <strong>Apple Podcasts</strong>, <strong>Spotify</strong>, or <strong>Pocket Casts</strong> (Add RSS Feed) to receive daily automated audio briefings directly on your mobile device.
            </p>
          </div>

          {/* App Integrations */}
          <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-bold text-slate-400">
            <div className="p-3 rounded-2xl bg-slate-900 border border-white/5">
              <span>APPLE PODCASTS</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900 border border-white/5">
              <span>SPOTIFY RSS</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900 border border-white/5">
              <span>OVERCAST / POCKET CASTS</span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-colors"
            >
              CLOSE FEED PANEL
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
