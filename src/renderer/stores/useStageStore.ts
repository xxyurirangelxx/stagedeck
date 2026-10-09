import { useState, useEffect, useCallback, useRef } from 'react';
import { Song, StemTrack, Setlist, Show, StageAlert, StageSyncPayload, AudioRouting } from '../../shared/types';
import { audioEngine } from '../audio/AudioEngine';
import { INITIAL_DEMO_SONGS, INITIAL_DEMO_SETLISTS, INITIAL_DEMO_SHOWS } from '../mockData';
import { parseLyricsChordsLrc, transposeChordLine, serializeLyricsToLrc } from '../utils/lyricsParser';

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
        currentKey: currentSong.currentKey,
        bpm: currentSong.bpm,
        parsedLyrics: currentSong.parsedLyrics || []
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

  // Setlist navigation
  const handleSelectSong = useCallback((songId: string) => {
    handleStop();
    setCurrentSongId(songId);
    const targetSong = songs.find((s) => s.id === songId);
    if (targetSong) {
      setDuration(targetSong.duration || 180);
    }
  }, [songs, handleStop]);

  const handleNextSong = useCallback(() => {
    if (!activeSetlist || !currentSong) return;
    const idx = activeSetlist.items.findIndex((item) => item.songId === currentSong.id);
    if (idx !== -1 && idx + 1 < activeSetlist.items.length) {
      const nextId = activeSetlist.items[idx + 1].songId;
      handleSelectSong(nextId);
    }
  }, [activeSetlist, currentSong, handleSelectSong]);

  const handlePrevSong = useCallback(() => {
    if (!activeSetlist || !currentSong) return;
    const idx = activeSetlist.items.findIndex((item) => item.songId === currentSong.id);
    if (idx > 0) {
      const prevId = activeSetlist.items[idx - 1].songId;
      handleSelectSong(prevId);
    }
  }, [activeSetlist, currentSong, handleSelectSong]);

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

    const updatedSong = { ...currentSong, stems: updatedStems, updatedAt: Date.now() };
    setSongs((prev) => prev.map((s) => (s.id === currentSong.id ? updatedSong : s)));
  }, [currentSong]);

  const handleDeleteStem = useCallback((stemId: string) => {
    if (!currentSong) return;
    audioEngine.removeTrack(stemId);
    const updatedStems = currentSong.stems.filter((st) => st.id !== stemId);
    const updatedSong = { ...currentSong, stems: updatedStems, updatedAt: Date.now() };
    setSongs((prev) => prev.map((s) => (s.id === currentSong.id ? updatedSong : s)));
  }, [currentSong]);

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

  // Transpose song
  const handleTranspose = useCallback((semitones: number) => {
    if (!currentSong) return;
    const parsed = currentSong.parsedLyrics || [];
    const transposedLines = parsed.map((l) => ({
      ...l,
      chords: transposeChordLine(l.chords, semitones)
    }));
    const newLrc = serializeLyricsToLrc(transposedLines);

    const updatedSong: Song = {
      ...currentSong,
      lyricsChordsLrc: newLrc,
      parsedLyrics: transposedLines,
      currentKey: transposeChordLine(currentSong.currentKey, semitones),
      updatedAt: Date.now()
    };

    setSongs((prev) => prev.map((s) => (s.id === currentSong.id ? updatedSong : s)));
    broadcastStageState(currentTime, duration);
  }, [currentSong, broadcastStageState, currentTime, duration]);

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
    handleUpdateStem,
    handleDeleteStem,
    handleSendAlert,
    handleClearAlert,
    handleTranspose,
    handleMasterVolumeChange,
    handleToggleMasterMute,
    refreshStageInfo
  };
}
