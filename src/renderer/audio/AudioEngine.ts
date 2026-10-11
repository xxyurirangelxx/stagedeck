import { AudioRouting, StemTrack } from '../../shared/types';

interface LoadedTrackNode {
  trackId: string;
  buffer: AudioBuffer;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  monoNode: GainNode;
  analyserNode: AnalyserNode;
  dataArray: Uint8Array<ArrayBuffer>;
  routing: AudioRouting;
  muted: boolean;
  solo: boolean;
  volume: number;
}

export class StageAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;
  private tracks: Map<string, LoadedTrackNode> = new Map();

  private isPlaying: boolean = false;
  private playbackStartTime: number = 0;
  private currentOffset: number = 0;
  private songDuration: number = 0;
  private animationFrameId: number | null = null;

  public onTimeUpdate: ((time: number, duration: number) => void) | null = null;
  public onPlaybackEnd: (() => void) | null = null;
  public onVuMeterUpdate: ((meters: Record<string, number>) => void) | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContextIfNeeded() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 44100 });
      
      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      // Stereo Output Merger (Input 0 = Left, Input 1 = Right)
      this.mergerNode = this.ctx.createChannelMerger(2);
      this.mergerNode.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public async loadTrackFile(track: StemTrack, fileOrBuffer: File | ArrayBuffer): Promise<number> {
    this.initContextIfNeeded();
    if (!this.ctx || !this.mergerNode) return 0;

    let arrayBuffer: ArrayBuffer;
    if (fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      arrayBuffer = fileOrBuffer;
    }

    // Decode audio data (native Chromium supports WAV, FLAC, M4A/AAC, MP3)
    // Use .slice(0) to avoid neutering the buffer in case caller needs to persist it
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));

    // Create mono downmixing node:
    // When a stereo track enters a node with channelCount = 1 & channelInterpretation = 'speakers',
    // Web Audio performs (0.5 * L) + (0.5 * R) mono downmix.
    const monoNode = this.ctx.createGain();
    monoNode.channelCount = 1;
    monoNode.channelCountMode = 'explicit';
    monoNode.channelInterpretation = 'speakers';

    // Volume Gain Node
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = track.muted ? 0 : track.volume;

    // Analyser Node for live VU meters
    const analyserNode = this.ctx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.25;
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    monoNode.connect(gainNode);
    gainNode.connect(analyserNode);

    // Clean up existing track nodes if reloaded
    const existing = this.tracks.get(track.id);
    if (existing) {
      if (existing.source) {
        try {
          existing.source.stop();
          existing.source.disconnect();
        } catch {}
      }
      try {
        existing.gainNode.disconnect();
        existing.monoNode.disconnect();
      } catch {}
    }

    const loadedNode: LoadedTrackNode = {
      trackId: track.id,
      buffer: audioBuffer,
      source: null,
      gainNode,
      monoNode,
      analyserNode,
      dataArray,
      routing: track.panRouting,
      muted: track.muted,
      solo: track.solo,
      volume: track.volume
    };

    this.tracks.set(track.id, loadedNode);
    this.recalculateSongDuration();
    this.applyRouting(loadedNode);
    this.updateSoloMuteStates();

    // Late join: when a track arrives while playback is already running (e.g. a
    // song's stems are still hydrating from IndexedDB when the user hits play),
    // start it immediately at the current transport position so it joins in sync
    // instead of staying silent until the next play/pause cycle.
    if (this.isPlaying && this.ctx) {
      const source = this.ctx.createBufferSource();
      source.buffer = loadedNode.buffer;
      source.connect(loadedNode.monoNode);
      const startAudioTime = this.ctx.currentTime + 0.05;
      source.start(startAudioTime, this.getCurrentTime());
      loadedNode.source = source;
    }

    // Immediately notify UI of the true audio duration
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentOffset, this.songDuration);
    }

    return audioBuffer.duration;
  }

  private applyRouting(trackNode: LoadedTrackNode) {
    if (!this.mergerNode) return;

    // Disconnect gainNode from outputs before rewiring
    try {
      trackNode.gainNode.disconnect(this.mergerNode);
    } catch {
      // Ignore if not connected
    }

    // Strict routing to stereo output:
    // 'L' -> Merger Input 0 (Left channel only)
    // 'R' -> Merger Input 1 (Right channel only)
    // 'BOTH' -> Merger Input 0 and Input 1 (both channels)
    if (trackNode.routing === 'L') {
      trackNode.gainNode.connect(this.mergerNode, 0, 0);
    } else if (trackNode.routing === 'R') {
      trackNode.gainNode.connect(this.mergerNode, 0, 1);
    } else {
      trackNode.gainNode.connect(this.mergerNode, 0, 0);
      trackNode.gainNode.connect(this.mergerNode, 0, 1);
    }
  }

  public setTrackRouting(trackId: string, routing: AudioRouting) {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode) return;
    trackNode.routing = routing;
    this.applyRouting(trackNode);
  }

  public setTrackVolume(trackId: string, volume: number) {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode) return;
    trackNode.volume = volume;
    this.updateTrackEffectiveGain(trackNode);
  }

  public setTrackMute(trackId: string, muted: boolean) {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode) return;
    trackNode.muted = muted;
    this.updateSoloMuteStates();
  }

  public setTrackSolo(trackId: string, solo: boolean) {
    const trackNode = this.tracks.get(trackId);
    if (!trackNode) return;
    trackNode.solo = solo;
    this.updateSoloMuteStates();
  }

  private updateSoloMuteStates() {
    const hasSolo = Array.from(this.tracks.values()).some((t) => t.solo);

    for (const trackNode of this.tracks.values()) {
      if (hasSolo) {
        // Only soloed tracks sound, unless they are individually muted
        const shouldSound = trackNode.solo && !trackNode.muted;
        trackNode.gainNode.gain.setValueAtTime(
          shouldSound ? trackNode.volume : 0,
          this.ctx ? this.ctx.currentTime : 0
        );
      } else {
        // Normal mute/unmute
        const shouldSound = !trackNode.muted;
        trackNode.gainNode.gain.setValueAtTime(
          shouldSound ? trackNode.volume : 0,
          this.ctx ? this.ctx.currentTime : 0
        );
      }
    }
  }

  private updateTrackEffectiveGain(trackNode: LoadedTrackNode) {
    const hasSolo = Array.from(this.tracks.values()).some((t) => t.solo);
    let effectiveVolume = 0;
    if (hasSolo) {
      effectiveVolume = trackNode.solo && !trackNode.muted ? trackNode.volume : 0;
    } else {
      effectiveVolume = trackNode.muted ? 0 : trackNode.volume;
    }

    if (this.ctx) {
      trackNode.gainNode.gain.setValueAtTime(effectiveVolume, this.ctx.currentTime);
    } else {
      trackNode.gainNode.gain.value = effectiveVolume;
    }
  }

  public setMasterVolume(volume: number) {
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
  }

  private recalculateSongDuration() {
    if (this.tracks.size > 0) {
      let maxDuration = 0;
      for (const t of this.tracks.values()) {
        if (t.buffer && t.buffer.duration > maxDuration) {
          maxDuration = t.buffer.duration;
        }
      }
      if (maxDuration > 0) {
        this.songDuration = maxDuration;
      }
    }
  }

  public setSongDuration(duration: number) {
    // Only use manual duration if there are NO audio tracks currently loaded in memory
    if (this.tracks.size === 0) {
      if (duration > 0) {
        this.songDuration = duration;
      }
    } else {
      this.recalculateSongDuration();
    }
  }

  public play() {
    this.initContextIfNeeded();
    if (!this.ctx) return;

    if (this.isPlaying) return;

    // Ensure valid duration for master transport clock
    if (this.songDuration <= 0) {
      this.songDuration = 180;
    }

    // Start all tracks at currentOffset
    const startAudioTime = this.ctx.currentTime + 0.05; // 50ms buffer for lock-step sync
    this.playbackStartTime = startAudioTime - this.currentOffset;

    for (const trackNode of this.tracks.values()) {
      // Create new buffer source node
      const source = this.ctx.createBufferSource();
      source.buffer = trackNode.buffer;
      source.connect(trackNode.monoNode);

      source.onended = () => {
        // Handled globally in ticker
      };

      source.start(startAudioTime, this.currentOffset);
      trackNode.source = source;
    }

    this.isPlaying = true;
    this.startTicker();
  }

  public pause() {
    if (!this.isPlaying) return;

    this.currentOffset = this.getCurrentTime();
    this.stopSources();
    this.isPlaying = false;
    this.stopTicker();

    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentOffset, this.songDuration);
    }
  }

  public stop() {
    this.stopSources();
    this.isPlaying = false;
    this.currentOffset = 0;
    this.stopTicker();

    if (this.onTimeUpdate) {
      this.onTimeUpdate(0, this.songDuration);
    }
  }

  public seek(targetSeconds: number) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }

    this.currentOffset = Math.max(0, Math.min(targetSeconds, this.songDuration));

    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentOffset, this.songDuration);
    }

    if (wasPlaying) {
      this.play();
    }
  }

  private stopSources() {
    for (const trackNode of this.tracks.values()) {
      if (trackNode.source) {
        try {
          trackNode.source.stop();
          trackNode.source.disconnect();
        } catch {
          // Ignore if already stopped
        }
        trackNode.source = null;
      }
    }
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) {
      return this.currentOffset;
    }
    const elapsed = this.ctx.currentTime - this.playbackStartTime;
    return Math.max(0, Math.min(elapsed, this.songDuration));
  }

  public getDuration(): number {
    return this.songDuration;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public removeTrack(trackId: string) {
    const trackNode = this.tracks.get(trackId);
    if (trackNode) {
      if (trackNode.source) {
        try {
          trackNode.source.stop();
          trackNode.source.disconnect();
        } catch {
          // Ignore
        }
      }
      try {
        trackNode.gainNode.disconnect();
        trackNode.monoNode.disconnect();
      } catch {
        // Ignore
      }
      this.tracks.delete(trackId);
      this.recalculateSongDuration();
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.currentOffset, this.songDuration);
      }
    }
  }

  public clearTracks(preserveDuration: boolean = false) {
    this.stop();
    this.tracks.clear();
    if (!preserveDuration) {
      this.songDuration = 0;
    }
  }

  private startTicker() {
    const tick = () => {
      const now = this.getCurrentTime();

      if (this.onTimeUpdate) {
        this.onTimeUpdate(now, this.songDuration);
      }

      // Read VU meters
      if (this.onVuMeterUpdate) {
        const meters: Record<string, number> = {};
        for (const [id, node] of this.tracks.entries()) {
          node.analyserNode.getByteTimeDomainData(node.dataArray);
          let sumSquares = 0;
          let peak = 0;
          for (let i = 0; i < node.dataArray.length; i++) {
            const normalized = (node.dataArray[i] - 128) / 128; // -1.0 to 1.0
            const abs = Math.abs(normalized);
            if (abs > peak) peak = abs;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / node.dataArray.length);
          // Perceptual sensitivity blend: RMS weighted with peak, scaled for natural meter ballistics
          const rawEnergy = (rms * 0.75 + peak * 0.25) * 2.2;
          // Log-like perceptual response curve (gamma = 0.65) so quiet/mid dynamics bounce noticeably
          const meterLevel = Math.min(1.0, Math.max(0, Math.pow(rawEnergy, 0.65)));
          meters[id] = meterLevel;
        }
        this.onVuMeterUpdate(meters);
      }

      // Check if finished
      if (now >= this.songDuration && this.songDuration > 0) {
        this.stop();
        if (this.onPlaybackEnd) {
          this.onPlaybackEnd();
        }
        return;
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  private stopTicker() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

// Global Audio Engine singleton
export const audioEngine = new StageAudioEngine();
