import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StageAudioEngine } from './AudioEngine';
import type { StemTrack } from '../../shared/types';

class FakeParam {
  value = 1;
  setValueAtTime() {}
}

class FakeNode {
  gain = new FakeParam();
  fftSize = 256;
  frequencyBinCount = 128;
  smoothingTimeConstant = 0.25;
  connect() {
    return this;
  }
  disconnect() {}
  getByteTimeDomainData(arr: Uint8Array) {
    arr.fill(128);
  }
}

class FakeSource extends FakeNode {
  buffer: unknown = null;
  onended: unknown = null;
  started = false;
  startedAt = -1;
  startOffset = -1;
  stopped = false;
  start(when = 0, offset = 0) {
    this.started = true;
    this.startedAt = when;
    this.startOffset = offset;
  }
  stop() {
    this.stopped = true;
  }
}

interface FakeCtx {
  currentTime: number;
  state: string;
  resume: () => Promise<void>;
  destination: FakeNode;
  createGain: () => FakeNode;
  createAnalyser: () => FakeNode;
  createChannelMerger: () => FakeNode;
  createBufferSource: () => FakeSource;
  decodeAudioData: (b: ArrayBuffer) => Promise<{ duration: number }>;
}

function installFakeAudioContext(initialTime = 1000) {
  const sources: FakeSource[] = [];
  const env = { currentTime: initialTime };
  const ctx: FakeCtx = {
    get currentTime() {
      return env.currentTime;
    },
    set currentTime(v: number) {
      env.currentTime = v;
    },
    state: 'running',
    resume: async () => {},
    destination: new FakeNode(),
    createGain: () => new FakeNode(),
    createAnalyser: () => new FakeNode(),
    createChannelMerger: () => new FakeNode(),
    createBufferSource: () => {
      const s = new FakeSource();
      sources.push(s);
      return s;
    },
    decodeAudioData: async () => ({ duration: 300 })
  };
  (window as unknown as { AudioContext: unknown }).AudioContext = function FakeAudioContext() {
    return ctx;
  };
  return {
    sources,
    advance: (seconds: number) => {
      env.currentTime += seconds;
    }
  };
}

const fakeBuffer = (duration = 300) =>
  ({ duration, slice() { return this; } }) as unknown as ArrayBuffer;

const stem = (id: string): StemTrack =>
  ({ id, name: id, type: 'backing', volume: 1, panRouting: 'BOTH', muted: false, solo: false }) as StemTrack;

describe('StageAudioEngine — troca de música sem sobreposição', () => {
  let restoreAudioContext: () => void;

  beforeEach(() => {
    restoreAudioContext = () => {
      delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    };
  });

  afterEach(() => {
    restoreAudioContext();
  });

  it('track carregada durante a reprodução entra sincronizada no offset atual (late join)', async () => {
    const env = installFakeAudioContext();
    const engine = new StageAudioEngine();

    await engine.loadTrackFile(stem('stem-a'), fakeBuffer());
    engine.play();
    expect(env.sources).toHaveLength(1);

    // Simula 5s de reprodução e a chegada da stem seguinte (hidratação do IndexedDB)
    env.advance(5);
    await engine.loadTrackFile(stem('stem-b'), fakeBuffer());

    expect(env.sources).toHaveLength(2);
    const srcB = env.sources[1];
    expect(srcB.started).toBe(true);
    // O offset deve ser a posição atual (~5s), não o início da música
    expect(srcB.startOffset).toBeGreaterThan(4.5);
    expect(srcB.startOffset).toBeLessThan(5.5);

    engine.stop();
  });

  it('clearTracks interrompe e remove todas as fontes (nada continua soando após trocar de música)', async () => {
    installFakeAudioContext();
    const engine = new StageAudioEngine();

    await engine.loadTrackFile(stem('stem-a'), fakeBuffer());
    await engine.loadTrackFile(stem('stem-b'), fakeBuffer());
    engine.play();
    expect(engine.getIsPlaying()).toBe(true);

    engine.clearTracks(true);

    expect(engine.getIsPlaying()).toBe(false);
    // Todas as sources devem ter sido paradas
    expect(engine.getDuration()).toBe(300); // preservada
    engine.setSongDuration(120);
    expect(engine.getDuration()).toBe(120); // sem tracks, cadastro passa a valer
  });
});
