import { useState, useEffect, useCallback, useRef } from 'react';
import { Song, StemTrack, Setlist, Show, StageAlert, StageSyncPayload, AudioRouting } from '../../shared/types';
import { audioEngine } from '../audio/AudioEngine';
import { audioStorage } from '../audio/audioStorage';
import { parseLyricsChordsLrc } from '../utils/lyricsParser';
import { INITIAL_DEMO_SONGS, INITIAL_DEMO_SETLISTS, INITIAL_DEMO_SHOWS } from '../mockData';

declare global {
  interface Window {
    electronAPI?: {
      getStageInfo: () => Promise<{ addresses: { url: string; qrDataUrl: string }[]; count: number }>;
      broadcastStage: (payload: StageSyncPayload) => Promise<boolean>;
      readStorage: <T>(key: string, fallback: T) => Promise<T>;
      writeStorage: <T>(key: string, data: T) => Promise<boolean>;
      openAudioFiles: () => Promise<string[]>;
    };
  }
}

export function useStageState() {
  const [songs, setSongs] = useState<Song[]>(() => {
    const saved = localStorage.getItem('stagedeck_songs');
    return saved ? JSON.parse(saved) : INITIAL_DEMO_SONGS;
  });

  const [currentSongId, setCurrentSongId] = useState<string>(() => {
    return INITIAL_DEMO_SONGS[0]?.id || '';
  });

  const [setlists, setSetlists] = useState<Setlist[]>(() => {
    const saved = localStorage.getItem('stagedeck_setlists');
    return saved ? JSON.parse(saved) : INITIAL_DEMO_SETLISTS;
  });

  const [activeSetlistId, setActiveSetlistId] = useState<string>(() => {
    return INITIAL_DEMO_SETLISTS[0]?.id || '';
  });

  const [shows, setShows] = useState<Show[]>(() => {
    const saved = localStorage.getItem('stagedeck_shows');
    return saved ? JSON.parse(saved) : INITIAL_DEMO_SHOWS;
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(180);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [isMasterMuted, setIsMasterMuted] = useState<boolean>(false);
  const [autoStopOnSongEnd, setAutoStopOnSongEnd] = useState<boolean>(true);
  const [activeAlert, setActiveAlert] = useState<StageAlert | null>(null);
  const [vuMeters, setVuMeters] = useState<Record<string, number>>({});

  const [stageAddresses, setStageAddresses] = useState<{ url: string; qrDataUrl: string }[]>([]);
  const [stageConnectedCount, setStageConnectedCount] = useState<number>(0);

  // Generation token for async stem hydration: only the most recent hydrate call
  // is allowed to load tracks. Prevents an in-flight hydration of the PREVIOUS
  // song from re-injecting its stems after the user has already switched songs
  // (which made both songs play at once and showed the old duration).
  const hydrateTokenRef = useRef(0);

  const currentSong = songs.find((s) => s.id === currentSongId) || songs[0] || null;
  const activeSetlist = setlists.find((sl) => sl.id === activeSetlistId) || null;

  // On initial mount: load from native Electron disk storage if present
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.readStorage<Song[]>('songs', []).then((storedSongs) => {
        if (storedSongs && storedSongs.length > 0) {
          setSongs(storedSongs);
        }
      });
      window.electronAPI.readStorage<Setlist[]>('setlists', []).then((storedSetlists) => {
        if (storedSetlists && storedSetlists.length > 0) {
          setSetlists(storedSetlists);
        }
      });
      window.electronAPI.readStorage<Show[]>('shows', []).then((storedShows) => {
        if (storedShows && storedShows.length > 0) {
          setShows(storedShows);
        }
      });
    }
  }, []);

  // Sync to local storage / Electron storage
  useEffect(() => {
    localStorage.setItem('stagedeck_songs', JSON.stringify(songs));
    if (window.electronAPI) {
      window.electronAPI.writeStorage('songs', songs);
    }
  }, [songs]);

  useEffect(() => {
    localStorage.setItem('stagedeck_setlists', JSON.stringify(setlists));
    if (window.electronAPI) {
      window.electronAPI.writeStorage('setlists', setlists);
    }
  }, [setlists]);

  useEffect(() => {
    localStorage.setItem('stagedeck_shows', JSON.stringify(shows));
    if (window.electronAPI) {
      window.electronAPI.writeStorage('shows', shows);
    }
  }, [shows]);

  // AudioEngine callbacks
  useEffect(() => {
    audioEngine.onTimeUpdate = (time, totalDur) => {
      setCurrentTime(time);
      if (totalDur > 0) setDuration(totalDur);

      // Broadcast to mobile stage client
      broadcastStageState(time, totalDur > 0 ? totalDur : (currentSong?.duration || 180));
    };

    audioEngine.onVuMeterUpdate = (meters) => {
      setVuMeters(meters);
    };

    audioEngine.onPlaybackEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (!autoStopOnSongEnd) {
        // Automatically play next song in setlist
        handleNextSong();
      }
    };
  }, [currentSong, autoStopOnSongEnd]);

  // Broadcast helper
  const broadcastStageState = useCallback((curTime = currentTime, dur = duration, alert = activeAlert) => {
    if (!window.electronAPI) return;

    let nextTitle = 'Fim do setlist';
    if (activeSetlist && currentSong) {
      const idx = activeSetlist.items.findIndex((item) => item.songId === currentSong.id);
      if (idx !== -1 && idx + 1 < activeSetlist.items.length) {
        const nextId = activeSetlist.items[idx + 1].songId;
        const nextSong = songs.find((s) => s.id === nextId);
        if (nextSong) nextTitle = nextSong.title;
      }
    }

    const payload: StageSyncPayload = {
      type: 'SYNC',
      isPlaying: audioEngine.getIsPlaying(),
      currentTime: curTime,
      duration: dur,
      currentSong: currentSong ? {
        id: currentSong.id,
        title: currentSong.title,
        artist: currentSong.artist,
        bpm: currentSong.bpm,
        // Songs saved by older versions may lack parsedLyrics; derive from the
        // canonical LRC so the mobile stage always shows the lyrics.
        parsedLyrics:
          currentSong.parsedLyrics && currentSong.parsedLyrics.length > 0
            ? currentSong.parsedLyrics
            : parseLyricsChordsLrc(currentSong.lyricsChordsLrc || '')
      } : null,
      nextSongTitle: nextTitle,
      alert: alert
    };

    window.electronAPI.broadcastStage(payload);
  }, [currentSong, activeSetlist, songs, activeAlert, currentTime, duration]);

  // Fetch stage QR and IP from Electron
  const refreshStageInfo = useCallback(async () => {
    if (window.electronAPI) {
      try {
        const info = await window.electronAPI.getStageInfo();
        setStageAddresses(info.addresses || []);
        setStageConnectedCount(info.count || 0);
      } catch (e) {
        console.error('Erro ao obter info do palco:', e);
      }
    } else {
      // Browser preview fallback
      setStageAddresses([{
        url: 'http://localhost:5050/stage',
        qrDataUrl: ''
      }]);
    }
  }, []);

  useEffect(() => {
    refreshStageInfo();
    const interval = setInterval(refreshStageInfo, 4000);
    return () => clearInterval(interval);
  }, [refreshStageInfo]);

  // Playback transport controls
  const handlePlay = useCallback(() => {
    audioEngine.play();
    setIsPlaying(true);
    broadcastStageState(currentTime, duration);
  }, [currentTime, duration, broadcastStageState]);

  const handlePause = useCallback(() => {
    audioEngine.pause();
    setIsPlaying(false);
    broadcastStageState(currentTime, duration);
  }, [currentTime, duration, broadcastStageState]);

  const handleStop = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    broadcastStageState(0, duration);
  }, [duration, broadcastStageState]);

  const handleSeek = useCallback((seconds: number) => {
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
    broadcastStageState(seconds, duration);
  }, [duration, broadcastStageState]);

  // Rehydrate audio stems for the currently active song from IndexedDB.
  // Uses a generation token: if another hydrate starts (song switched) or the
  // active song changed while awaiting IndexedDB/decode, this call aborts
  // without touching the audio engine or the UI.
  const hydrateSongAudio = useCallback(async (song: Song | null) => {
    if (!song) return;
    const token = ++hydrateTokenRef.current;

    let maxAudioDur = 0;
    for (const stem of song.stems) {
      if (hydrateTokenRef.current !== token) return;
      try {
        const stored = await audioStorage.getStemAudio(stem.id);
        if (hydrateTokenRef.current !== token) return;
        if (stored && stored.buffer) {
          const trackDur = await audioEngine.loadTrackFile(stem, stored.buffer);
          if (hydrateTokenRef.current !== token) return;
          if (trackDur > maxAudioDur) {
            maxAudioDur = trackDur;
          }
          console.log(`[StageDeck] Stem "${stem.name}" restaurada com sucesso (${trackDur.toFixed(1)}s)`);
        }
      } catch (err) {
        console.warn(`[StageDeck] Falha ao carregar áudio da stem ${stem.id}:`, err);
      }
    }

    if (hydrateTokenRef.current !== token) return;
    if (maxAudioDur > 0) {
      setDuration(maxAudioDur);
      setSongs((prev) => prev.map((s) => s.id === song.id ? { ...s, duration: maxAudioDur } : s));
    } else {
      audioEngine.setSongDuration(song.duration || 180);
    }
  }, []);

  // Hydrate on initial mount or when currentSong changes
  useEffect(() => {
    if (currentSong) {
      hydrateSongAudio(currentSong);
    }
  }, [currentSongId]); // re-run only when changing song ID

  // Setlist & Catalog navigation
  const handleSelectSong = useCallback((songId: string) => {
    handleStop();
    setCurrentSongId(songId);
    const targetSong = songs.find((s) => s.id === songId);
    if (targetSong) {
      const songDur = targetSong.duration || 180;
      setDuration(songDur);
      audioEngine.clearTracks(true);
      audioEngine.setSongDuration(songDur);
      hydrateSongAudio(targetSong);
    }
  }, [songs, handleStop, hydrateSongAudio]);

  const handleNextSong = useCallback(() => {
    if (!currentSong) return;
    // 1. If inside an active setlist, advance along setlist items
    if (activeSetlist && activeSetlist.items.length > 0) {
      const idx = activeSetlist.items.findIndex((item) => item.songId === currentSong.id);
      if (idx !== -1 && idx + 1 < activeSetlist.items.length) {
        const nextId = activeSetlist.items[idx + 1].songId;
        handleSelectSong(nextId);
        return;
      }
    }
    // 2. Fallback: cycle through full repertoire catalog
    const catalogIdx = songs.findIndex((s) => s.id === currentSong.id);
    if (catalogIdx !== -1 && catalogIdx + 1 < songs.length) {
      handleSelectSong(songs[catalogIdx + 1].id);
    } else if (songs.length > 0 && catalogIdx === songs.length - 1) {
      handleSelectSong(songs[0].id); // loop back to first song
    }
  }, [activeSetlist, currentSong, songs, handleSelectSong]);

  const handlePrevSong = useCallback(() => {
    if (!currentSong) return;
    // 1. If inside an active setlist, go back along setlist items
    if (activeSetlist && activeSetlist.items.length > 0) {
      const idx = activeSetlist.items.findIndex((item) => item.songId === currentSong.id);
      if (idx > 0) {
        const prevId = activeSetlist.items[idx - 1].songId;
        handleSelectSong(prevId);
        return;
      }
    }
    // 2. Fallback: cycle back through full repertoire catalog
    const catalogIdx = songs.findIndex((s) => s.id === currentSong.id);
    if (catalogIdx > 0) {
      handleSelectSong(songs[catalogIdx - 1].id);
    } else if (songs.length > 0 && catalogIdx === 0) {
      handleSelectSong(songs[songs.length - 1].id); // wrap to last song
    }
  }, [activeSetlist, currentSong, songs, handleSelectSong]);

  // Stem Controls
  const handleUpdateStem = useCallback((stemId: string, updates: Partial<StemTrack>) => {
    if (!currentSong) return;
    const updatedStems = currentSong.stems.map((st) => {
      if (st.id === stemId) {
        const next = { ...st, ...updates };
        if (updates.panRouting !== undefined) {
          audioEngine.setTrackRouting(stemId, next.panRouting);
        }
        if (updates.volume !== undefined) {
          audioEngine.setTrackVolume(stemId, next.volume);
        }
        if (updates.muted !== undefined) {
          audioEngine.setTrackMute(stemId, next.muted);
        }
        if (updates.solo !== undefined) {
          audioEngine.setTrackSolo(stemId, next.solo);
        }
        return next;
      }
      return st;
    });

    const engineDur = audioEngine.getDuration();
    const maxStemDur = Math.max(0, ...updatedStems.map((s) => s.duration || 0));
    const effectiveDur = engineDur > 0 ? engineDur : (maxStemDur > 0 ? maxStemDur : currentSong.duration);

    if (effectiveDur > 0 && Math.abs(effectiveDur - duration) > 0.5) {
      setDuration(effectiveDur);
    }

    const updatedSong = {
      ...currentSong,
      stems: updatedStems,
      duration: effectiveDur > 0 ? effectiveDur : currentSong.duration,
      updatedAt: Date.now()
    };
    setSongs((prev) => prev.map((s) => (s.id === currentSong.id ? updatedSong : s)));
  }, [currentSong, duration]);

  const handleDeleteStem = useCallback((stemId: string) => {
    if (!currentSong) return;
    audioEngine.removeTrack(stemId);
    audioStorage.deleteStemAudio(stemId);
    const updatedStems = currentSong.stems.filter((st) => st.id !== stemId);

    const engineDur = audioEngine.getDuration();
    const maxStemDur = Math.max(0, ...updatedStems.map((s) => s.duration || 0));
    const effectiveDur = engineDur > 0 ? engineDur : (maxStemDur > 0 ? maxStemDur : (currentSong.duration || 180));
    setDuration(effectiveDur);

    const updatedSong = {
      ...currentSong,
      stems: updatedStems,
      duration: effectiveDur,
      updatedAt: Date.now()
    };
    setSongs((prev) => prev.map((s) => (s.id === currentSong.id ? updatedSong : s)));
  }, [currentSong]);

  // Edit song metadata
  const handleUpdateSong = useCallback((songId: string, updates: Partial<Song>) => {
    setSongs((prev) => prev.map((s) => (s.id === songId ? { ...s, ...updates, updatedAt: Date.now() } : s)));

    // If the edited song is loaded in the console, refresh the transport clock.
    // AudioEngine rule: real loaded audio wins; otherwise the new registered duration applies.
    if (songId === currentSongId && updates.duration !== undefined) {
      audioEngine.setSongDuration(updates.duration);
      const effectiveDur = audioEngine.getDuration();
      if (effectiveDur > 0) setDuration(effectiveDur);
    }
  }, [currentSongId]);

  // Alert system
  const handleSendAlert = useCallback((message: string, type: 'info' | 'warning' | 'urgent' = 'warning') => {
    const alert: StageAlert = {
      id: `alert_${Date.now()}`,
      message,
      type,
      timestamp: Date.now()
    };
    setActiveAlert(alert);
    broadcastStageState(currentTime, duration, alert);

    // Auto-clear after 12 seconds
    setTimeout(() => {
      setActiveAlert(null);
      broadcastStageState(currentTime, duration, null);
    }, 12000);
  }, [broadcastStageState, currentTime, duration]);

  const handleClearAlert = useCallback(() => {
    setActiveAlert(null);
    broadcastStageState(currentTime, duration, null);
  }, [broadcastStageState, currentTime, duration]);

  // Master controls
  const handleMasterVolumeChange = useCallback((vol: number) => {
    setMasterVolume(vol);
    audioEngine.setMasterVolume(isMasterMuted ? 0 : vol);
  }, [isMasterMuted]);

  const handleToggleMasterMute = useCallback(() => {
    const nextMuted = !isMasterMuted;
    setIsMasterMuted(nextMuted);
    audioEngine.setMasterVolume(nextMuted ? 0 : masterVolume);
  }, [isMasterMuted, masterVolume]);

  return {
    songs,
    setSongs,
    currentSong,
    currentSongId,
    setlists,
    setSetlists,
    activeSetlist,
    shows,
    setShows,
    isPlaying,
    currentTime,
    duration,
    masterVolume,
    isMasterMuted,
    autoStopOnSongEnd,
    setAutoStopOnSongEnd,
    activeAlert,
    vuMeters,
    stageAddresses,
    stageConnectedCount,
    handlePlay,
    handlePause,
    handleStop,
    handleSeek,
    handleSelectSong,
    handleNextSong,
    handlePrevSong,
    handleUpdateSong,
    handleUpdateStem,
    handleDeleteStem,
    handleSendAlert,
    handleClearAlert,
    handleMasterVolumeChange,
    handleToggleMasterMute,
    refreshStageInfo
  };
}
