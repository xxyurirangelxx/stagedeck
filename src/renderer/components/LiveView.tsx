import React, { useRef, useEffect } from 'react';
import { Song, StemTrack, StageAlert, Setlist } from '../../shared/types';
import { MixerStrip } from './MixerStrip';
import { StageAlertsPanel } from './StageAlertsPanel';
import { ChevronRight, Radio, Eye } from 'lucide-react';

interface LiveViewProps {
  currentSong: Song | null;
  activeSetlist: Setlist | null;
  songs: Song[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  vuMeters: Record<string, number>;
  activeAlert: StageAlert | null;
  stageConnectedCount: number;
  onUpdateStem: (stemId: string, updates: Partial<StemTrack>) => void;
  onSelectSong: (songId: string) => void;
  onSendAlert: (msg: string, type?: 'info' | 'warning' | 'urgent') => void;
  onClearAlert: () => void;
}

export const LiveView: React.FC<LiveViewProps> = ({
  currentSong,
  activeSetlist,
  songs,
  currentTime,
  vuMeters,
  activeAlert,
  stageConnectedCount,
  onUpdateStem,
  onSelectSong,
  onSendAlert,
  onClearAlert
}) => {
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  const lines = currentSong?.parsedLyrics || [];
  let activeIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (currentTime >= lines[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  useEffect(() => {
    if (lyricsContainerRef.current) {
      const activeEl = document.getElementById(`live-line-${activeIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex]);

  const backingStems = currentSong?.stems.filter((s) => s.type === 'backing') || [];
  const inEarStems = currentSong?.stems.filter((s) => s.type === 'in_ear') || [];

  return (
    <div className="flex-1 flex overflow-hidden bg-stage-bg select-none">
      {/* Left: Multitrack Live Mixer */}
      <div className="w-[520px] border-r border-stage-border flex flex-col p-3 bg-stage-panel/40">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stage-border">
          <div className="flex items-center gap-2">
            <Radio size={15} className="text-stage-amber animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Mixer de Palco (Faders & Roteamento L/R)
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400 bg-stage-card px-2 py-0.5 rounded border border-stage-border font-mono">
            {backingStems.length} Backing | {inEarStems.length} In-Ear
          </span>
        </div>

        {/* Horizontal scroll of live strips */}
        <div className="flex-1 flex gap-2.5 overflow-x-auto pb-2">
          {backingStems.map((stem) => (
            <MixerStrip
              key={stem.id}
              stem={stem}
              vuLevel={vuMeters[stem.id] || 0}
              onUpdateStem={(updates) => onUpdateStem(stem.id, updates)}
            />
          ))}

          {/* Divider */}
          <div className="w-[1px] bg-cyan-900/40 self-stretch my-2" />

          {inEarStems.map((stem) => (
            <MixerStrip
              key={stem.id}
              stem={stem}
              vuLevel={vuMeters[stem.id] || 0}
              onUpdateStem={(updates) => onUpdateStem(stem.id, updates)}
            />
          ))}
        </div>
      </div>

      {/* Center: Stage Teleprompter / Live Lyrics & Chords Sync View */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden border-r border-stage-border">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stage-border">
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-stage-amber" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Monitor de Palco em Tempo Real (Espelho do Celular)
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-stage-chord">
            TOM ATUAL: {currentSong?.currentKey || '--'}
          </span>
        </div>

        <div
          ref={lyricsContainerRef}
          className="flex-1 overflow-y-auto space-y-3 pr-2 scroll-smooth"
        >
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stage-muted">
              <p className="text-sm">Sem letra/cifra sincronizada.</p>
              <p className="text-xs mt-1">Abra a aba "Editor de Cifras" para cadastrar e marcar os tempos.</p>
            </div>
          ) : (
            lines.map((line, idx) => {
              const isCurrent = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <div
                  key={line.id}
                  id={`live-line-${idx}`}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-stage-card border-stage-amber shadow-[0_4px_20px_rgba(245,158,11,0.25)] scale-[1.01]'
                      : isPast
                      ? 'bg-stage-panel/30 border-transparent opacity-40'
                      : 'bg-stage-panel/60 border-stage-border/60 opacity-80'
                  }`}
                >
                  {line.chords && (
                    <div className="font-mono text-base font-bold text-stage-chord tracking-wide mb-1">
                      {line.chords}
                    </div>
                  )}
                  <div className={`text-base font-semibold leading-relaxed ${isCurrent ? 'text-white font-bold text-lg' : 'text-slate-200'}`}>
                    {line.text || '...'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Stage Alerts & Setlist Queue */}
      <div className="w-[320px] flex flex-col p-3 gap-3 bg-stage-panel/30">
        {/* Instant Stage Alerts */}
        <StageAlertsPanel
          activeAlert={activeAlert}
          stageConnectedCount={stageConnectedCount}
          onSendAlert={onSendAlert}
          onClearAlert={onClearAlert}
        />

        {/* Setlist Queue */}
        <div className="flex-1 bg-stage-panel border border-stage-border rounded-xl p-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stage-border">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Fila do Show ({activeSetlist?.title || 'Setlist Ativo'})
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {activeSetlist?.items.map((item, idx) => {
              const song = songs.find((s) => s.id === item.songId);
              if (!song) return null;
              const isCurrent = song.id === currentSong?.id;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectSong(song.id)}
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between border transition-all ${
                    isCurrent
                      ? 'bg-stage-card border-stage-amber text-white shadow-sm'
                      : 'bg-stage-panel/60 border-transparent text-stage-muted hover:text-white hover:bg-stage-surface'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-xs font-bold text-stage-amber w-4">
                      {idx + 1}.
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate text-white">{song.title}</div>
                      <div className="text-[10px] text-stage-muted truncate">{song.artist}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono font-bold text-stage-chord">{song.currentKey}</span>
                    {isCurrent && <ChevronRight size={14} className="text-stage-amber" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
