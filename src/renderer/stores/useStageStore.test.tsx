import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useStageState } from './useStageStore';
import { audioEngine } from '../audio/AudioEngine';
import type { StemTrack } from '../../shared/types';

// O motor de áudio real depende de Web Audio/IndexedDB (indisponíveis no jsdom).
// O mock abaixo replica fielmente o CONTRATO do motor real:
// - com áudio carregado (state.audio > 0), a duração real manda e setSongDuration é ignorado;
// - sem áudio, setSongDuration adota o valor do cadastro.
vi.mock('../audio/AudioEngine', () => {
  const state = { manual: 0, audio: 0 };
  return {
    audioEngine: {
      onTimeUpdate: null,
      onVuMeterUpdate: null,
      onPlaybackEnd: null,
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      getIsPlaying: vi.fn(() => false),
      getDuration: vi.fn(() => (state.audio > 0 ? state.audio : state.manual)),
      setSongDuration: vi.fn((d: number) => {
        if (state.audio === 0 && d > 0) state.manual = d;
      }),
      clearTracks: vi.fn(() => {
        state.audio = 0;
        state.manual = 0;
      }),
      loadTrackFile: vi.fn(async (_stem: unknown, buffer: { duration: number }) => {
        state.audio = buffer.duration;
        return buffer.duration;
      }),
      setMasterVolume: vi.fn(),
      setTrackVolume: vi.fn(),
      setTrackRouting: vi.fn(),
      setTrackMute: vi.fn(),
      setTrackSolo: vi.fn(),
      removeTrack: vi.fn(),
    },
  };
});

vi.mock('../audio/audioStorage', () => ({
  audioStorage: {
    getStemAudio: vi.fn(async () => null),
    deleteStemAudio: vi.fn(),
  },
}));

describe('useStageState — handleUpdateSong (edição de músicas)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    audioEngine.clearTracks(); // reset do estado do motor simulado
  });

  afterEach(() => {
    cleanup();
  });

  it('atualiza os dados da música preservando id, stems, cifra e createdAt', () => {
    const { result } = renderHook(() => useStageState());

    const original = result.current.songs[0];
    const stemCount = original.stems.length;
    const createdAt = original.createdAt;

    act(() => {
      result.current.handleUpdateSong(original.id, {
        title: 'Título Editado',
        artist: 'Artista Editado',
        bpm: 99,
        duration: 200
      });
    });

    const updated = result.current.songs.find((s) => s.id === original.id)!;
    expect(updated.title).toBe('Título Editado');
    expect(updated.artist).toBe('Artista Editado');
    expect(updated.bpm).toBe(99);
    expect(updated.duration).toBe(200);
    expect(updated.id).toBe(original.id);
    expect(updated.createdAt).toBe(createdAt);
    expect(updated.stems).toHaveLength(stemCount);
    expect(updated.lyricsChordsLrc).toBe(original.lyricsChordsLrc);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(original.updatedAt);

    // Persistência no localStorage acompanha a edição
    const stored = JSON.parse(localStorage.getItem('stagedeck_songs') || '[]');
    expect(stored.find((s: { id: string }) => s.id === original.id).title).toBe('Título Editado');
  });

  it('quando a música editada é a carregada e não há áudio, o console adota a nova duração', () => {
    const { result } = renderHook(() => useStageState());

    const loadedSong = result.current.currentSong!;

    act(() => {
      result.current.handleUpdateSong(loadedSong.id, { duration: 240 });
    });

    expect(audioEngine.setSongDuration).toHaveBeenCalledWith(240);
    expect(result.current.duration).toBe(240);
  });

  it('quando o motor tem áudio real carregado, a duração do áudio manda (áudio > cadastro)', () => {
    const { result } = renderHook(() => useStageState());

    const loadedSong = result.current.currentSong!;
    // Simula stems com áudio real de 300s carregadas no motor
    act(() => {
      audioEngine.loadTrackFile({ id: 'stem-x' } as StemTrack, { duration: 300 } as unknown as ArrayBuffer);
    });

    act(() => {
      result.current.handleUpdateSong(loadedSong.id, { duration: 240 });
    });

    // O novo cadastro é repassado ao motor, mas o console mostra o que o motor reportar
    expect(audioEngine.setSongDuration).toHaveBeenCalledWith(240);
    expect(result.current.duration).toBe(300);
  });

  it('não altera a duração do console quando a música editada não é a carregada', () => {
    const { result } = renderHook(() => useStageState());

    const otherSong = result.current.songs[1];
    expect(otherSong.id).not.toBe(result.current.currentSong!.id);

    act(() => {
      result.current.handleUpdateSong(otherSong.id, { duration: 300 });
    });

    expect(result.current.duration).toBe(180);
  });
});
