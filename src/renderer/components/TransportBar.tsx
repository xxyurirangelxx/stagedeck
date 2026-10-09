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
  onTranspose: (semitones: number) => void;
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
  onTranspose,
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
    s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.currentKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-stage-panel border-b border-stage-border p-3 select-none flex flex-col gap-2 relative">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Current Song Info & Interactive Quick-Switcher Popover */}
        <div className="flex items-center gap-4 min-w-[320px] relative" ref={pickerRef}>
          {/* Song Switcher Button */}
          <button
            onClick={() => setIsSongPickerOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 -ml-1 rounded-lg hover:bg-stage-card border border-transparent hover:border-stage-border transition-all text-left group"
            title="Clique para trocar de música rapidamente"
          >
            <div className="w-8 h-8 rounded-lg bg-stage-bg border border-stage-border flex items-center justify-center text-stage-amber group-hover:border-stage-amber transition-colors flex-shrink-0">
              <Disc3 size={18} className={isPlaying ? 'animate-spin' : ''} />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white truncate max-w-[200px] group-hover:text-stage-amber transition-colors">
                  {currentSong ? currentSong.title : 'Selecione uma música'}
                </span>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.2 rounded font-mono ${
                    isPlaying
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isPlaying ? 'TOCANDO' : 'PARADO'}
                </span>
                <ChevronDown size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
              </div>

              <div className="flex items-center gap-2 text-xs text-stage-muted">
                <span className="truncate max-w-[140px]">{currentSong ? currentSong.artist : 'Repertório'}</span>
                {currentIndex !== -1 && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ({currentIndex + 1} de {songs.length})
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Song Quick Switcher Dropdown Popover */}
          {isSongPickerOpen && onSelectSong && (
            <div className="absolute top-12 left-0 w-80 bg-slate-950 border border-stage-borderLight rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2 border-b border-stage-border bg-stage-panel/80 flex items-center gap-2">
                <Search size={14} className="text-stage-muted" />
                <input
                  type="text"
                  placeholder="Pesquisar música pelo nome ou tom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="bg-transparent text-xs text-white placeholder-zinc-500 outline-none w-full"
                />
              </div>

              <div className="max-h-64 overflow-y-auto p-1 space-y-1">
                {filteredSongs.length === 0 ? (
                  <div className="p-3 text-center text-xs text-stage-muted">Nenhuma música encontrada</div>
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
                        className={`w-full p-2 rounded-lg text-left flex items-center justify-between border transition-all ${
                          isSelected
                            ? 'bg-stage-card border-stage-amber text-white'
                            : 'bg-stage-panel/40 border-transparent text-zinc-300 hover:text-white hover:bg-stage-card'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] font-mono font-bold text-zinc-500 w-4">
                            {idx + 1}.
                          </span>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate text-white">{s.title}</div>
                            <div className="text-[10px] text-zinc-400 truncate">{s.artist}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-mono font-bold text-stage-chord bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                            {s.currentKey}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {formatTime(s.duration || 180)}
                          </span>
                          {isSelected && <Check size={14} className="text-stage-amber" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Key & BPM Badges */}
          {currentSong && (
            <div className="flex items-center gap-2 pl-3 border-l border-stage-border">
              {/* Key & Transpose */}
              <div className="bg-stage-card border border-stage-border px-2 py-1 rounded flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-stage-muted">TOM:</span>
                <span className="text-xs font-mono font-bold text-stage-chord">{currentSong.currentKey}</span>
                <div className="flex flex-col ml-1">
                  <button
                    onClick={() => onTranspose(1)}
                    className="text-[9px] hover:text-stage-amber text-stage-muted leading-none p-0.5"
                    title="Subir 1 semitom (+1)"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onTranspose(-1)}
                    className="text-[9px] hover:text-stage-amber text-stage-muted leading-none p-0.5"
                    title="Descer 1 semitom (-1)"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {/* BPM */}
              <div className="bg-stage-card border border-stage-border px-2 py-1 rounded flex items-center gap-1">
                <span className="text-[10px] font-bold text-stage-muted">BPM:</span>
                <span className="text-xs font-mono font-bold text-stage-amber">{currentSong.bpm}</span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Transport Controls (Big Tactile Buttons) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="p-2 rounded-lg bg-stage-card hover:bg-stage-surface border border-stage-border text-stage-text hover:text-white transition-all shadow-sm"
            title="Música Anterior (Voltar)"
          >
            <SkipBack size={16} />
          </button>

          {isPlaying ? (
            <button
              onClick={onPause}
              className="px-5 py-2 rounded-lg bg-stage-amber hover:bg-amber-400 text-slate-950 font-black flex items-center gap-2 transition-all shadow-[0_0_14px_rgba(245,158,11,0.4)]"
              title="Pausar Reprodução"
            >
              <Pause size={18} />
              <span className="text-xs tracking-wider">PAUSAR</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black flex items-center gap-2 transition-all shadow-[0_0_14px_rgba(16,185,129,0.4)]"
              title="Iniciar Reprodução"
            >
              <Play size={18} fill="currentColor" />
              <span className="text-xs tracking-wider">PLAY</span>
            </button>
          )}

          <button
            onClick={onStop}
            className="p-2 rounded-lg bg-stage-card hover:bg-stage-surface border border-stage-border text-red-400 hover:text-red-300 transition-all shadow-sm"
            title="Parar e Voltar ao Início"
          >
            <Square size={16} fill="currentColor" />
          </button>

          <button
            onClick={onNext}
            className="p-2 rounded-lg bg-stage-card hover:bg-stage-surface border border-stage-border text-stage-text hover:text-white transition-all shadow-sm"
            title="Próxima Música (Avançar)"
          >
            <SkipForward size={16} />
          </button>

          {/* Quick Track Jump Select Dropdown for Sound Controller */}
          {songs.length > 0 && onSelectSong && (
            <select
              value={currentSong?.id || ''}
              onChange={(e) => onSelectSong(e.target.value)}
              className="bg-stage-card text-xs font-bold text-stage-amber border border-stage-border rounded-lg px-2.5 py-1.5 outline-none hover:border-stage-borderLight cursor-pointer ml-1 max-w-[160px] truncate"
              title="Selecionar qualquer música diretamente"
            >
              {songs.map((s, idx) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {idx + 1}. {s.title} ({s.currentKey})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Time Display & Auto-stop Mode */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs text-stage-muted cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={autoStopOnSongEnd}
              onChange={(e) => setAutoStopOnSongEnd(e.target.checked)}
              className="rounded bg-stage-card border-stage-border text-stage-amber focus:ring-0"
            />
            <span>Auto-parar no fim</span>
          </label>

          <div className="bg-stage-card border border-stage-border px-3 py-1 rounded-lg font-mono text-sm tracking-wider flex items-center gap-2">
            <span className="text-white font-bold">{formatTime(currentTime)}</span>
            <span className="text-stage-borderLight">/</span>
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
          title={`Buscar: ${formatTime(currentTime)}`}
        />
      </div>
    </div>
  );
};
