import React from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, ArrowDown, ArrowUp } from 'lucide-react';
import { Song } from '../../shared/types';

interface TransportBarProps {
  currentSong: Song | null;
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
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  currentSong,
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
  onTranspose
}) => {
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-stage-panel border-b border-stage-border p-3 select-none flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Current Song Info & Tom / BPM Badges */}
        <div className="flex items-center gap-4 min-w-[280px]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white truncate max-w-[240px]">
                {currentSong ? currentSong.title : 'Nenhuma música selecionada'}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                isPlaying ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {isPlaying ? 'TOCANDO' : 'PARADO'}
              </span>
            </div>
            <p className="text-xs text-stage-muted truncate max-w-[240px]">
              {currentSong ? currentSong.artist : 'Selecione no repertório'}
            </p>
          </div>

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
            className="p-2 rounded bg-stage-card hover:bg-stage-surface border border-stage-border text-stage-text hover:text-white transition-all"
            title="Música Anterior"
          >
            <SkipBack size={16} />
          </button>

          {isPlaying ? (
            <button
              onClick={onPause}
              className="px-5 py-2 rounded bg-stage-amber hover:bg-amber-400 text-slate-950 font-extrabold flex items-center gap-2 transition-all shadow-[0_0_14px_rgba(245,158,11,0.4)]"
              title="Pausar Reprodução"
            >
              <Pause size={18} />
              <span className="text-xs tracking-wider">PAUSAR</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="px-5 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center gap-2 transition-all shadow-[0_0_14px_rgba(16,185,129,0.4)]"
              title="Iniciar Reprodução"
            >
              <Play size={18} fill="currentColor" />
              <span className="text-xs tracking-wider">PLAY</span>
            </button>
          )}

          <button
            onClick={onStop}
            className="p-2 rounded bg-stage-card hover:bg-stage-surface border border-stage-border text-red-400 hover:text-red-300 transition-all"
            title="Parar e Voltar ao Início"
          >
            <Square size={16} fill="currentColor" />
          </button>

          <button
            onClick={onNext}
            className="p-2 rounded bg-stage-card hover:bg-stage-surface border border-stage-border text-stage-text hover:text-white transition-all"
            title="Próxima Música"
          >
            <SkipForward size={16} />
          </button>
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

          <div className="bg-stage-card border border-stage-border px-3 py-1 rounded font-mono text-sm tracking-wider flex items-center gap-2">
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
