import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, ChevronDown, Search, Music, Disc3, Check } from 'lucide-react';
import { Song } from '../../shared/types';

interface TransportBarProps {
  currentSong: Song | null;
  songs?: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  autoStopOnSongEnd: boolean;
  setAutoStopOnSongEnd: (val: boolean) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (sec: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectSong?: (songId: string) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  currentSong,
  songs = [],
  isPlaying,
  currentTime,
  duration,
  autoStopOnSongEnd,
  setAutoStopOnSongEnd,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onPrev,
  onNext,
  onSelectSong
}) => {
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsSongPickerOpen(false);
      }
    }
    if (isSongPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSongPickerOpen]);

  const currentIndex = currentSong ? songs.findIndex((s) => s.id === currentSong.id) : -1;

  const filteredSongs = songs.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border-b border-stage-border p-3 select-none flex flex-col gap-2 relative">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Current Song Info & Interactive Quick-Switcher Popover */}
        <div className="flex items-center gap-4 min-w-[320px] relative" ref={pickerRef}>
          {/* Song Switcher Button */}
          <button
            onClick={() => setIsSongPickerOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 -ml-1 rounded-full hover:bg-stage-panel border border-transparent hover:border-stage-border transition-colors text-left group"
            title="Clique para trocar de música rapidamente"
          >
            <div className="w-8 h-8 rounded-full bg-stage-panel border border-stage-border flex items-center justify-center text-stage-accent flex-shrink-0">
              <Disc3 size={18} className={isPlaying ? 'animate-spin' : ''} />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-stage-text truncate max-w-[200px]">
                  {currentSong ? currentSong.title : 'Selecione uma música'}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isPlaying
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-stage-surface text-stage-muted border border-stage-border'
                  }`}
                >
                  {isPlaying ? 'Tocando' : 'Parado'}
                </span>
                <ChevronDown size={14} className="text-stage-faint" />
              </div>

              <div className="flex items-center gap-2 text-xs text-stage-muted">
                <span className="truncate max-w-[140px]">{currentSong ? currentSong.artist : 'Repertório'}</span>
                {currentIndex !== -1 && (
                  <span className="text-[11px] text-stage-faint tabular-nums">
                    ({currentIndex + 1} de {songs.length})
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Song Quick Switcher Dropdown Popover */}
          {isSongPickerOpen && onSelectSong && (
            <div className="absolute top-12 left-0 w-80 bg-white border border-stage-border rounded-stage shadow-xl z-50 overflow-hidden flex flex-col">
              <div className="p-2.5 border-b border-stage-border flex items-center gap-2">
                <Search size={14} className="text-stage-muted" />
                <input
                  type="text"
                  placeholder="Pesquisar música pelo nome ou artista..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="bg-transparent text-[13px] text-stage-text placeholder-stage-faint outline-none w-full"
                />
              </div>

              <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                {filteredSongs.length === 0 ? (
                  <div className="p-3 text-center text-[13px] text-stage-muted">Nenhuma música encontrada</div>
                ) : (
                  filteredSongs.map((s, idx) => {
                    const isSelected = s.id === currentSong?.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          onSelectSong(s.id);
                          setIsSongPickerOpen(false);
                        }}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between border transition-colors ${
                          isSelected
                            ? 'bg-stage-accent text-white'
                            : 'border-transparent text-stage-text hover:bg-stage-accentTint'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-[11px] font-semibold w-4 tabular-nums ${isSelected ? 'text-white/70' : 'text-stage-faint'}`}>
                            {idx + 1}.
                          </span>
                          <div className="truncate">
                            <div className="text-[13px] font-medium truncate">{s.title}</div>
                            <div className={`text-[11px] truncate ${isSelected ? 'text-white/80' : 'text-stage-muted'}`}>{s.artist}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[11px] tabular-nums ${isSelected ? 'text-white/70' : 'text-stage-faint'}`}>
                            {formatTime(s.duration || 180)}
                          </span>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* BPM Badge */}
          {currentSong && (
            <div className="flex items-center gap-2 pl-4 border-l border-stage-border">
              <div className="bg-white border border-stage-border px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="text-[11px] font-medium text-stage-muted">BPM:</span>
                <span className="text-[13px] font-semibold text-stage-accent tabular-nums">{currentSong.bpm}</span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Transport Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            aria-label="Música anterior"
            className="p-2 rounded-full bg-white hover:bg-stage-panel border border-stage-border text-stage-text transition-colors"
            title="Música Anterior (Voltar)"
          >
            <SkipBack size={16} />
          </button>

          {isPlaying ? (
            <button
              onClick={onPause}
              className="px-5 py-2 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white font-semibold flex items-center gap-2 transition-colors"
              title="Pausar Reprodução"
            >
              <Pause size={18} />
              <span className="text-[13px]">Pausar</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="px-5 py-2 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white font-semibold flex items-center gap-2 transition-colors"
              title="Iniciar Reprodução"
            >
              <Play size={18} fill="currentColor" />
              <span className="text-[13px]">Tocar</span>
            </button>
          )}

          <button
            onClick={onStop}
            aria-label="Parar e voltar ao início"
            className="p-2 rounded-full bg-white hover:bg-red-50 hover:border-red-300 border border-stage-border text-stage-red transition-colors"
            title="Parar e Voltar ao Início"
          >
            <Square size={16} fill="currentColor" />
          </button>

          <button
            onClick={onNext}
            aria-label="Próxima música"
            className="p-2 rounded-full bg-white hover:bg-stage-panel border border-stage-border text-stage-text transition-colors"
            title="Próxima Música (Avançar)"
          >
            <SkipForward size={16} />
          </button>

          {/* Quick Track Jump Select Dropdown for Sound Controller */}
          {songs.length > 0 && onSelectSong && (
            <select
              value={currentSong?.id || ''}
              onChange={(e) => onSelectSong(e.target.value)}
              className="bg-white text-[13px] font-medium text-stage-text border border-stage-border rounded-full px-3 py-1.5 outline-none hover:border-stage-borderLight cursor-pointer ml-1 max-w-[160px] truncate"
              title="Selecionar qualquer música diretamente"
              aria-label="Selecionar música diretamente"
            >
              {songs.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  {idx + 1}. {s.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Time Display & Auto-stop Mode */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-[13px] text-stage-muted cursor-pointer hover:text-stage-text">
            <input
              type="checkbox"
              checked={autoStopOnSongEnd}
              onChange={(e) => setAutoStopOnSongEnd(e.target.checked)}
              className="rounded border-stage-border"
            />
            <span>Auto-parar no fim</span>
          </label>

          <div className="bg-stage-panel border border-stage-border px-3 py-1 rounded-full text-[13px] flex items-center gap-1.5 tabular-nums">
            <span className="text-stage-text font-semibold">{formatTime(currentTime)}</span>
            <span className="text-stage-faint">/</span>
            <span className="text-stage-muted">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Scrubber / Progress Bar */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full fader-slider h-2"
          aria-label="Posição da música"
          title={`Buscar: ${formatTime(currentTime)}`}
        />
      </div>
    </div>
  );
};
