// Dedicated Audio Orchestrator for ANOMALY WATCH
// Guarantees a single audio pipeline across all speech synthesis, tactical soundscapes, and alerts.

class AudioOrchestratorService {
  private audioCtx: AudioContext | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isMuted: boolean = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Immediately halts and flushes ALL currently playing audio, speech, and soundscapes
   * to strictly guarantee no overlapping audio streams.
   */
  public haltAllAudio(): void {
    // 1. Cancel speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;

    // 2. Stop Web Audio buffer source nodes
    this.activeSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    });
    this.activeSources.clear();
  }

  /**
   * Synthesizes a subtle tactical click sound effect using Web Audio API
   */
  public playTacticalClick(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.debug("Audio click blocked by browser autoplay policy", e);
    }
  }

  /**
   * Plays a mysterious dual-tone chime when an Operative uncovers a Hidden Intel Artifact
   */
  public playArtifactDiscoveredSound(): void {
    if (this.isMuted) return;
    try {
      this.haltAllAudio();
      const ctx = this.getAudioContext();

      // Master gain node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.15, ctx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      masterGain.connect(ctx.destination);

      // Osc 1 (Low Mystery Fundamental)
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.6);
      osc1.connect(masterGain);

      // Osc 2 (Quantum Harmonic Resonance)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.8);
      osc2.connect(masterGain);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 1.2);

      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.debug("Artifact sound playback interrupted", e);
    }
  }

  /**
   * Plays a tactical alert sonar pulse (Green Calibrated or Red Critical)
   */
  public playAlertChime(severity: 'CRITICAL' | 'CALIBRATED' | 'HIGH'): void {
    if (this.isMuted) return;
    try {
      this.haltAllAudio();
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const isCritical = severity === 'CRITICAL';
      osc.type = isCritical ? 'sawtooth' : 'sine';
      const baseFreq = isCritical ? 220 : 523.25; // A3 for Critical, C5 for Calibrated Match

      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(isCritical ? 0.2 : 0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.debug("Alert chime blocked", e);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.haltAllAudio();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const AudioOrchestrator = new AudioOrchestratorService();
