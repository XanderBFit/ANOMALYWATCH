
import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { generateAudioBriefing } from '../services/geminiService';
import { VoiceName } from '../types';
import { AudioCache } from '../services/cacheService';
import { AudioOrchestrator } from '../services/audioOrchestrator';
import { 
  formatIntelForSpeech, 
  splitIntoSpokenSegments, 
  SpokenSegment, 
  VoicePersona, 
  VOICE_PERSONAS, 
  resolvePersonaVoice 
} from '../services/speechNarrationService';

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
  isPaused: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  error: string | null;
  currentTrackId: string | null;
  currentTitle: string | null;
  volume: number;
  playbackSpeed: number;
  selectedVoice: VoiceName;
  speechEngine: 'local' | 'gemini';
  voicePersona: VoicePersona;
  currentSegmentIndex: number;
  totalSegments: number;
  currentSectionTitle: string;
  setSpeechEngine: (engine: 'local' | 'gemini') => void;
  setSelectedVoice: (voice: VoiceName) => void;
  setVoicePersona: (persona: VoicePersona) => void;
  playAudio: (text: string, id: string, title?: string, options?: { persona?: VoicePersona; engine?: 'local' | 'gemini' }) => Promise<void>;
  stopAudio: () => void;
  togglePause: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  setVolume: (val: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  dismissError: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.85); // Tactical audible volume
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [speechEngine, setSpeechEngineState] = useState<'local' | 'gemini'>('local'); // Default to 100% free, instantaneous in-browser synthesis
  const [selectedVoice, setSelectedVoiceState] = useState<VoiceName>('Charon'); // 'Charon' is signature mysterious voice
  const [voicePersona, setVoicePersonaState] = useState<VoicePersona>('OPERATIVE');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Telemetry Narrative Chapter / Chunk Tracking
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);
  const [currentSectionTitle, setCurrentSectionTitle] = useState('Briefing');
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Chunk queue references to guarantee unbroken speech without Chrome 15s freeze
  const segmentsRef = useRef<SpokenSegment[]>([]);
  const segmentIdxRef = useRef<number>(0);
  const keepAliveTimerRef = useRef<any>(null);

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
      utteranceRef.current.rate = (VOICE_PERSONAS[voicePersona]?.rate || 1.0) * playbackSpeed;
    }
  }, [playbackSpeed, voicePersona, isPlaying, speechEngine]);

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
      if (activeSourcesRef.current.size === 0 && !isBuffering) {
        setIsPlaying(false);
        setIsPaused(false);
        AudioOrchestrator.playComlinkOutro();
      }
    };

    source.start(startTime);
    activeSourcesRef.current.add(source);
    nextStartTimeRef.current = startTime + buffer.duration;
    setIsPlaying(true);
    setIsPaused(false);
  };

  // Play next spoken segment in queue
  const playNextSegment = useCallback((targetIndex: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const segments = segmentsRef.current;
    if (!segments || segments.length === 0 || targetIndex >= segments.length) {
      // Queue completed!
      setIsPlaying(false);
      setIsPaused(false);
      utteranceRef.current = null;
      AudioOrchestrator.playComlinkOutro();
      if (keepAliveTimerRef.current) {
        clearInterval(keepAliveTimerRef.current);
        keepAliveTimerRef.current = null;
      }
      return;
    }

    segmentIdxRef.current = targetIndex;
    setCurrentSegmentIndex(targetIndex);
    setCurrentSectionTitle(segments[targetIndex].sectionTitle);

    const segment = segments[targetIndex];
    const personaConfig = VOICE_PERSONAS[voicePersona] || VOICE_PERSONAS.OPERATIVE;
    const personaVoice = resolvePersonaVoice(voices, voicePersona);

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(segment.text);
      utteranceRef.current = utterance;
      if (personaVoice) {
        utterance.voice = personaVoice;
      }

      utterance.pitch = personaConfig.pitch;
      utterance.rate = personaConfig.rate * playbackSpeed;
      utterance.volume = volume;

      utterance.onstart = () => {
        setIsLoading(false);
        setIsBuffering(false);
        setIsPlaying(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        // Schedule next segment smoothly
        playNextSegment(targetIndex + 1);
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn("Speech segment synthesis error:", e);
          // Auto-recover to next chunk
          playNextSegment(targetIndex + 1);
        }
      };

      setTimeout(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        }
      }, 40);
    } catch (err) {
      console.warn("Failed to speak segment", err);
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [voices, voicePersona, playbackSpeed, volume]);

  const playAudio = async (
    text: string, 
    id: string, 
    title: string = 'Audio Briefing',
    options?: { persona?: VoicePersona; engine?: 'local' | 'gemini' }
  ) => {
    if (!text) return;
    
    // Dedicated Audio Orchestrator: Halt all existing audio streams across the app
    stopAudio();

    const activeEngine = options?.engine || speechEngine;
    const activePersona = options?.persona || voicePersona;
    if (options?.persona) setVoicePersonaState(options.persona);
    if (options?.engine) setSpeechEngineState(options.engine);
    
    setIsLoading(true);
    setIsBuffering(true);
    setError(null);
    setCurrentTrackId(id);
    setCurrentTitle(title);
    nextStartTimeRef.current = 0;
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Tactical Comlink Chirp Prelude
    AudioOrchestrator.playComlinkIntro();

    // Phonetic intelligence preprocessing
    const spokenIntel = formatIntelForSpeech(text);

    // --- MODE A: TACTICAL SYNTH (Browser Native, Segmented, 100% Reliable, Zero-Cutoff) ---
    if (activeEngine === 'local') {
      try {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          throw new Error("Speech synthesis unsupported in this browser.");
        }

        const segments = splitIntoSpokenSegments(spokenIntel);
        if (segments.length === 0) {
          setIsLoading(false);
          setIsBuffering(false);
          setIsPlaying(false);
          return;
        }

        segmentsRef.current = segments;
        segmentIdxRef.current = 0;
        setTotalSegments(segments.length);
        setCurrentSegmentIndex(0);
        setCurrentSectionTitle(segments[0].sectionTitle);

        // Keep-alive heartbeat: prevents Chrome from pausing synthesis after background inactivity
        if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
        keepAliveTimerRef.current = setInterval(() => {
          if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.resume();
          }
        }, 8000);

        // Small delay ensures comlink chirp completes before voice starts
        setTimeout(() => {
          playNextSegment(0);
        }, 120);

      } catch (e) {
        console.error("Local synth failed", e);
        setError("Tactical speech synthesizer offline.");
        setIsPlaying(false);
        setIsBuffering(false);
        setIsLoading(false);
      }
    } 
    // --- MODE B: QUANTUM AI VOICE (Gemini Charon/Fenrir Neural Speech with Preprocessing & Cache) ---
    else {
      initAudioCtx();
      try {
        const peakText = spokenIntel.substring(0, 1800);
        const cacheKey = `${selectedVoice}_${hashText(peakText)}`;
        let base64Audio = await AudioCache.get(cacheKey);

        if (!base64Audio) {
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
          // Fallback to local segment engine
          const segments = splitIntoSpokenSegments(spokenIntel);
          segmentsRef.current = segments;
          segmentIdxRef.current = 0;
          setTotalSegments(segments.length);
          setCurrentSegmentIndex(0);
          playNextSegment(0);
        }
      } finally {
        setIsBuffering(false);
        setIsLoading(false);
      }
    }
  };

  const stopAudio = () => {
    AudioOrchestrator.haltAllAudio();
    
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }

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
    segmentsRef.current = [];
    segmentIdxRef.current = 0;

    // Stop Gemini audio streams
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    activeSourcesRef.current.clear();
    
    setIsPlaying(false);
    setIsPaused(false);
    setIsBuffering(false);
    setIsLoading(false);
  };

  const togglePause = () => {
    if (speechEngine === 'local') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.speaking) {
          if (window.speechSynthesis.paused || isPaused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
            setIsPlaying(true);
          } else {
            window.speechSynthesis.pause();
            setIsPaused(true);
          }
        } else if (isPaused && segmentsRef.current.length > 0) {
          // Resume from segment
          setIsPaused(false);
          playNextSegment(segmentIdxRef.current);
        }
      }
    } else {
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend();
        setIsPaused(true);
      } else {
        audioCtxRef.current.resume();
        setIsPaused(false);
      }
    }
  };

  const skipForward = () => {
    if (speechEngine === 'local' && segmentsRef.current.length > 0) {
      const nextIdx = Math.min(segmentsRef.current.length - 1, segmentIdxRef.current + 1);
      playNextSegment(nextIdx);
    }
  };

  const skipBackward = () => {
    if (speechEngine === 'local' && segmentsRef.current.length > 0) {
      const prevIdx = Math.max(0, segmentIdxRef.current - 1);
      playNextSegment(prevIdx);
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

  const setVoicePersona = (persona: VoicePersona) => {
    setVoicePersonaState(persona);
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
      isPaused,
      isLoading,
      isBuffering,
      error,
      currentTrackId,
      currentTitle,
      volume,
      playbackSpeed,
      selectedVoice,
      speechEngine,
      voicePersona,
      currentSegmentIndex,
      totalSegments,
      currentSectionTitle,
      setSpeechEngine,
      setSelectedVoice,
      setVoicePersona,
      playAudio,
      stopAudio,
      togglePause,
      skipForward,
      skipBackward,
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

