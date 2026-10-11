import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useStageState } from './useStageStore';
import { audioEngine } from '../audio/AudioEngine';
import { audioStorage } from '../audio/audioStorage';
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

describe('useStageState — troca de música sem sobreposição de áudio', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    audioEngine.clearTracks();
  });

  afterEach(() => {
    cleanup();
  });

  it('não reinjeta o áudio da música anterior quando a troca acontece durante a hidratação, e hidrata a nova música uma única vez', async () => {
    // A primeira stem de A (song-demo-1) chega do IndexedDB com atraso — criando a
    // janela de corrida —; todas as demais respondem na hora para que todas as
    // promessas assentem dentro do próprio teste (sem órfãs pós-teardown).
    let slowCallDone = false;
    vi.mocked(audioStorage.getStemAudio).mockImplementation(async (id: string) => {
      if (!id.startsWith('stem-2-') && !slowCallDone) {
        slowCallDone = true;
        await new Promise((r) => setTimeout(r, 50));
      }
      return { stemId: id, fileName: `${id}.wav`, buffer: { duration: 240 } as unknown as ArrayBuffer, timestamp: 0 };
    });

    try {
      const { result } = renderHook(() => useStageState());

      // A hidratação de A (song-demo-1) dispara no mount e fica em voo.
      // Troca IMEDIATA para B enquanto a hidratação anterior ainda não terminou.
      const songB = result.current.songs.find((s) => s.id === 'song-demo-2')!;
      act(() => {
        result.current.handleSelectSong(songB.id);
      });

      // Espera a hidratação de B concluir...
      await vi.waitFor(() => {
        const loaded = vi.mocked(audioEngine.loadTrackFile).mock.calls.map((c) => (c[0] as StemTrack).id);
        expect(loaded.filter((id) => id.startsWith('stem-2-'))).toHaveLength(songB.stems.length);
      });

      // ...e dá tempo de qualquer hidratação órfã de A acordar do delay do IndexedDB.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 250));
      });

      const loadedIds = vi.mocked(audioEngine.loadTrackFile).mock.calls.map((c) => (c[0] as StemTrack).id);
      // Nenhuma stem de A pode ser (re)carregada após a troca
      expect(loadedIds.filter((id) => /^stem-\d+$/.test(id))).toEqual([]);
      // Cada stem de B carregada exatamente uma vez (handler + efeito não duplicam)
      expect(loadedIds.filter((id) => id.startsWith('stem-2-'))).toHaveLength(songB.stems.length);
    } finally {
      // Restaura o comportamento padrão do mock para os testes seguintes
      vi.mocked(audioStorage.getStemAudio).mockImplementation(async () => null);
    }
  });

  it('broadcast do palco deriva parsedLyrics do LRC quando a música salva não tem parsedLyrics (músicas antigas)', async () => {
    const broadcastStage = vi.fn(async (_payload?: unknown) => true);
    (window as unknown as { electronAPI: unknown }).electronAPI = {
      getStageInfo: vi.fn(async () => ({ addresses: [], count: 0 })),
      broadcastStage,
      readStorage: vi.fn(async () => null),
      writeStorage: vi.fn(async () => true)
    };

    const { result } = renderHook(() => useStageState());
    const loaded = result.current.currentSong!;
    const originalLrc = loaded.lyricsChordsLrc;
    expect(originalLrc).toBeTruthy();

    // Simula música salva por versão antiga: LRC presente, parsedLyrics vazio
    act(() => {
      result.current.setSongs((prev) =>
        prev.map((s) => (s.id === loaded.id ? { ...s, parsedLyrics: [] } : s))
      );
    });

    act(() => {
      result.current.handlePlay();
    });

    const payload = broadcastStage.mock.calls.at(-1)?.[0] as
      | { currentSong: { parsedLyrics: unknown[]; id: string } }
      | undefined;
    expect(payload).toBeTruthy();
    expect(payload!.currentSong.id).toBe(loaded.id);
    expect(payload!.currentSong.parsedLyrics.length).toBeGreaterThan(0);

    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
  });
});

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
