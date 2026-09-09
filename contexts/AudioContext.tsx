
import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { generateAudioBriefing } from '../services/geminiService';
import { VoiceName } from '../types';
import { AudioCache } from '../services/cacheService';
import { AudioOrchestrator } from '../services/audioOrchestrator';

const hashText = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
};

interface AudioContextType {
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  error: string | null;
  currentTrackId: string | null;
  currentTitle: string | null;
  volume: number;
  playbackSpeed: number;
  selectedVoice: VoiceName;
  speechEngine: 'local' | 'gemini';
  setSpeechEngine: (engine: 'local' | 'gemini') => void;
  setSelectedVoice: (voice: VoiceName) => void;
  playAudio: (text: string, id: string, title?: string) => Promise<void>;
  stopAudio: () => void;
  togglePause: () => void;
  setVolume: (val: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  dismissError: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.8); // Good medium audibility
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [speechEngine, setSpeechEngineState] = useState<'local' | 'gemini'>('local'); // Default to 100% free, instantaneous in-browser synthesis
  const [selectedVoice, setSelectedVoiceState] = useState<VoiceName>('Charon'); // 'Charon' is our signature mysterious voice
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Sync volume with browser Synthesis if playing locally
  useEffect(() => {
    if (utteranceRef.current) {
      utteranceRef.current.volume = volume;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // Handle browser speech synthesis on speed adjustment
  useEffect(() => {
    if (utteranceRef.current && isPlaying && speechEngine === 'local') {
      // Re-trigger playback with new speed if user modifies it while reading
      const currentText = utteranceRef.current.text;
      const currentTrack = currentTrackId;
      const currentTitleTxt = currentTitle;
      if (currentText && currentTrack) {
        stopAudio();
        setTimeout(() => {
          playAudio(currentText, currentTrack, currentTitleTxt || 'Audio Briefing');
        }, 100);
      }
    }
  }, [playbackSpeed]);

  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
      audioCtxRef.current = new AudioCtxClass({ sampleRate: 24000 });
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.gain.value = volume;
      gainNodeRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
  };

  const decodeAndSchedule = async (base64: string, ctx: AudioContext) => {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    
    let buffer: AudioBuffer;
    try {
      // First attempt native Web Audio container decode (handles MP3/WAV headers)
      const arrayCopy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      buffer = await ctx.decodeAudioData(arrayCopy);
    } catch {
      // Fallback to raw 24kHz 16-bit LE PCM mono audio returned by Gemini API
      const samples = Math.floor(len / 2);
      const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, samples);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

      buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);
    }
    
    const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNodeRef.current!);
    source.playbackRate.value = playbackSpeed;
    
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0 && !isBuffering) setIsPlaying(false);
    };

    source.start(startTime);
    activeSourcesRef.current.add(source);
    nextStartTimeRef.current = startTime + buffer.duration;
    setIsPlaying(true);
  };

  // Find the highest quality, most natural English voice from the browser's speechSynthesis engine
  const getBestLocalVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const allVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const englishVoices = allVoices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('en-'));
    
    // Comprehensive priority list for natural, deep, professional intelligence operative voices
    const profiles = [
      'natural',
      'google uk english male', 
      'microsoft guy online',
      'microsoft christopher online',
      'microsoft eric online',
      'microsoft david', 
      'microsoft mark',
      'daniel', 
      'oliver',
      'arthur',
      'alex',
      'google us english', 
      'google uk english female',
      'samantha',
      'karen',
      'male', 
      'en-us', 
      'en-gb'
    ];
    
    for (const profile of profiles) {
      const match = englishVoices.find(v => v.name.toLowerCase().includes(profile));
      if (match) return match;
    }
    
    return englishVoices[0] || allVoices[0] || null;
  };

  const playAudio = async (text: string, id: string, title: string = 'Audio Briefing') => {
    if (!text) return;
    
    // Dedicated Audio Orchestrator: Halt all existing audio streams across the app
    stopAudio();
    
    setIsLoading(true);
    setIsBuffering(true);
    setError(null);
    setCurrentTrackId(id);
    setCurrentTitle(title);
    nextStartTimeRef.current = 0;
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const executeLocalSynth = (cleanText: string) => {
      try {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          throw new Error("Speech synthesis unsupported.");
        }

        // Resume & cancel engine queue so it's not stuck in paused or active state
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();

        // Minor sanitization of markup/metadata
        const speakableText = cleanText
          .substring(0, 4200)
          .replace(/[\[\]\(\)\{\}]/g, ' ')
          .replace(/[*_#~`\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!speakableText) {
          setIsLoading(false);
          setIsBuffering(false);
          setIsPlaying(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(speakableText);
        utteranceRef.current = utterance;
        if (typeof window !== 'undefined') {
          (window as any)._activeSpeechUtterance = utterance;
        }

        // Custom Calibration of the atmospheric agent voice
        const signatureVoice = getBestLocalVoice();
        if (signatureVoice) {
          utterance.voice = signatureVoice;
        }

        // Calibrate mysterious intelligence briefing tone and cadence
        utterance.pitch = 0.82; // Lower pitch gives a serious, mysterious clandestine station vibe
        utterance.rate = 0.96 * playbackSpeed; // Slightly slower pacing feels analytic/covert
        utterance.volume = volume;

        utterance.onstart = () => {
          setIsLoading(false);
          setIsBuffering(false);
          setIsPlaying(true);
        };

        utterance.onend = () => {
          setIsPlaying(false);
          utteranceRef.current = null;
          if (typeof window !== 'undefined') {
            (window as any)._activeSpeechUtterance = null;
          }
        };

        utterance.onerror = (e) => {
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.warn("Speech synthesis error occurred:", e);
            setError("Local synthesizer feed interrupted.");
            setIsPlaying(false);
          }
          utteranceRef.current = null;
          if (typeof window !== 'undefined') {
            (window as any)._activeSpeechUtterance = null;
          }
        };

        // Small delay (60ms) allows browser SpeechSynthesis engine to finish processing cancel() before receiving speak()
        setTimeout(() => {
          if (abortController.signal.aborted) return;
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        }, 60);
      } catch (e) {
        console.error("Local synth failed", e);
        setError("Local synthesizer offline.");
        setIsPlaying(false);
        setIsBuffering(false);
        setIsLoading(false);
      }
    };

    // --- MODE A: TACTICAL SYNTH (Browser Native, Free, Fast, Consistent) ---
    if (speechEngine === 'local') {
      executeLocalSynth(text);
    } 
    // --- MODE B: QUANTUM AI VOICE (Unified optimized single-blast Gemini Charon/Fenrir TTS with auto-fallback) ---
    else {
      initAudioCtx();
      try {
        // Sanitize to reasonable length for optimal costing and speed
        const peakText = text
          .substring(0, 1500) // Truncate to robust summary length to prevent high latency or billing
          .replace(/[\[\]\(\)\{\}]/g, ' ')
          .replace(/[*_#~`\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const cacheKey = `${selectedVoice}_${hashText(peakText)}`;
        let base64Audio = await AudioCache.get(cacheKey);

        if (!base64Audio) {
          // One single highly-optimized unified call. 
          base64Audio = await generateAudioBriefing(peakText, selectedVoice);
          if (base64Audio) {
            try {
              await AudioCache.set(cacheKey, base64Audio);
            } catch (e) {
              console.warn("Failed to write to AudioCache", e);
            }
          }
        }
        
        if (abortController.signal.aborted) return;
        
        if (base64Audio && audioCtxRef.current) {
          if (audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
          }
          setIsLoading(false);
          setIsBuffering(false);
          await decodeAndSchedule(base64Audio, audioCtxRef.current);
        } else {
          throw new Error("Empty audio stream");
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn("Quantum TTS Failed, falling back seamlessly to local synthesizer...", e);
          executeLocalSynth(text);
        }
      } finally {
        setIsBuffering(false);
        setIsLoading(false);
      }
    }
  };

  const stopAudio = () => {
    AudioOrchestrator.haltAllAudio();
    
    // Stop local synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn("Speech synthesis cancellation error:", e);
      }
    }
    utteranceRef.current = null;
    if (typeof window !== 'undefined') {
      (window as any)._activeSpeechUtterance = null;
    }

    // Stop Gemini audio streams
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    activeSourcesRef.current.clear();
    
    setIsPlaying(false);
    setIsBuffering(false);
    setIsLoading(false);
  };

  const togglePause = () => {
    if (speechEngine === 'local') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.speaking) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setIsPlaying(true);
          } else {
            window.speechSynthesis.pause();
            setIsPlaying(false);
          }
        }
      }
    } else {
      if (!audioCtxRef.current) return;
      audioCtxRef.current.state === 'running' ? audioCtxRef.current.suspend() : audioCtxRef.current.resume();
      setIsPlaying(audioCtxRef.current.state === 'running');
    }
  };

  const setSpeechEngine = (engine: 'local' | 'gemini') => {
    stopAudio();
    setSpeechEngineState(engine);
  };

  const setSelectedVoice = (voice: VoiceName) => {
    stopAudio();
    setSelectedVoiceState(voice);
  };

  // Keep voices loaded in browser SpeechSynthesis and handle dynamic loading
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, []);

  return (
    <AudioContext.Provider value={{
      isPlaying,
      isLoading,
      isBuffering,
      error,
      currentTrackId,
      currentTitle,
      volume,
      playbackSpeed,
      selectedVoice,
      speechEngine,
      setSpeechEngine,
      setSelectedVoice,
      playAudio,
      stopAudio,
      togglePause,
      setVolume: setVolumeState,
      setPlaybackSpeed,
      dismissError: () => setError(null)
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio requires AudioProvider');
  return context;
};
