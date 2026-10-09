import React, { useState } from 'react';
import { useStageState } from './stores/useStageStore';
import { Navbar } from './components/Navbar';
import { TransportBar } from './components/TransportBar';
import { LiveView } from './components/LiveView';
import { MixerPanel } from './components/MixerPanel';
import { LyricsChordsEditor } from './components/LyricsChordsEditor';
import { SetlistsView } from './components/SetlistsView';
import { ShowsView } from './components/ShowsView';
import { QrModal } from './components/QrModal';
import { StemTrack, Song, LyricLine } from '../shared/types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('live');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  const {
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
    handleToggleMasterMute
  } = useStageState();

  const handleAddStem = (type: 'backing' | 'in_ear') => {
    if (!currentSong) return;
    const newStem: StemTrack = {
      id: `stem_${Date.now()}`,
      name: type === 'backing' ? `Backing Track ${currentSong.stems.length + 1}` : 'In-Ear Monitor Extra',
      type,
      volume: 1.0,
      panRouting: type === 'backing' ? 'L' : 'R',
      muted: false,
      solo: false
    };

    const updatedSong: Song = {
      ...currentSong,
      stems: [...currentSong.stems, newStem],
      updatedAt: Date.now()
    };

    setSongs((prev) => prev.map((s) => (s.id === currentSong.id ? updatedSong : s)));
  };

  const handleSaveLyrics = (lrcString: string, parsedLines: LyricLine[]) => {
    if (!currentSong) return;
    const updatedSong: Song = {
      ...currentSong,
      lyricsChordsLrc: lrcString,
      parsedLyrics: parsedLines,
      updatedAt: Date.now()
    };
    setSongs((prev) => prev.map((s) => (s.id === currentSong.id ? updatedSong : s)));
  };

  // Stage Keyboard Shortcuts (Space = Play/Pause, Right/Left = Next/Prev Song)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger transport if actively typing inside an input or textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          handlePause();
        } else {
          handlePlay();
        }
      } else if (e.code === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleNextSong();
      } else if (e.code === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePrevSong();
      } else if (e.code === 'Escape') {
        handleStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handlePlay, handlePause, handleStop, handleNextSong, handlePrevSong]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stage-bg text-stage-text font-sans">
      {/* 1. Global Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        masterVolume={masterVolume}
        isMasterMuted={isMasterMuted}
        onMasterVolumeChange={handleMasterVolumeChange}
        onToggleMasterMute={handleToggleMasterMute}
        stageConnectedCount={stageConnectedCount}
        onOpenQrModal={() => setIsQrModalOpen(true)}
      />

      {/* 2. Global Audio Transport Bar (Always accessible for live sound tech) */}
      <TransportBar
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        autoStopOnSongEnd={autoStopOnSongEnd}
        setAutoStopOnSongEnd={setAutoStopOnSongEnd}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleSeek}
        onPrev={handlePrevSong}
        onNext={handleNextSong}
        onTranspose={handleTranspose}
      />

      {/* 3. Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {currentTab === 'live' && (
          <LiveView
            currentSong={currentSong}
            activeSetlist={activeSetlist}
            songs={songs}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            vuMeters={vuMeters}
            activeAlert={activeAlert}
            stageConnectedCount={stageConnectedCount}
            onUpdateStem={handleUpdateStem}
            onDeleteStem={handleDeleteStem}
            onSelectSong={handleSelectSong}
            onSendAlert={handleSendAlert}
            onClearAlert={handleClearAlert}
          />
        )}

        {currentTab === 'mixer' && (
          <MixerPanel
            currentSong={currentSong}
            vuMeters={vuMeters}
            onUpdateStem={handleUpdateStem}
            onDeleteStem={handleDeleteStem}
            onAddStem={handleAddStem}
          />
        )}

        {currentTab === 'editor' && (
          <LyricsChordsEditor
            currentSong={currentSong}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onSaveLyrics={handleSaveLyrics}
            onTranspose={handleTranspose}
          />
        )}

        {currentTab === 'setlists' && (
          <SetlistsView
            songs={songs}
            setSongs={setSongs}
            currentSongId={currentSongId}
            onSelectSong={handleSelectSong}
            setlists={setlists}
            setSetlists={setSetlists}
            activeSetlist={activeSetlist}
          />
        )}

        {currentTab === 'shows' && (
          <ShowsView
            shows={shows}
            setShows={setShows}
            setlists={setlists}
          />
        )}
      </main>

      {/* 4. Stage Phone QR Connection Modal */}
      <QrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        addresses={stageAddresses}
        connectedCount={stageConnectedCount}
      />
    </div>
  );
};
