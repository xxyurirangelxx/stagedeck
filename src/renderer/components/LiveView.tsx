import React from 'react';
import { Song, StemTrack, StageAlert, Setlist } from '../../shared/types';
import { MixerStrip } from './MixerStrip';
import { StageAlertsPanel } from './StageAlertsPanel';
import { ChevronRight, Radio } from 'lucide-react';

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
  onDeleteStem?: (stemId: string) => void;
  onSelectSong: (songId: string) => void;
  onSendAlert: (msg: string, type?: 'info' | 'warning' | 'urgent') => void;
  onClearAlert: () => void;
}

export const LiveView: React.FC<LiveViewProps> = ({
  currentSong,
  activeSetlist,
  songs,
  vuMeters,
  activeAlert,
  stageConnectedCount,
  onUpdateStem,
  onDeleteStem,
  onSelectSong,
  onSendAlert,
  onClearAlert
}) => {
  const backingStems = currentSong?.stems.filter((s) => s.type === 'backing') || [];
  const inEarStems = currentSong?.stems.filter((s) => s.type === 'in_ear') || [];

  return (
    <div className="flex-1 flex overflow-hidden bg-stage-bg select-none">
      {/* Left/Center: Multitrack Live Mixer */}
      <div className="flex-1 border-r border-stage-border flex flex-col p-4 bg-stage-panel/40 overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stage-border">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-stage-amber animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Mixer de Palco (Faders & Roteamento L/R)
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-stage-chord">
              MÚSICA: <span className="text-white">{currentSong?.title || '--'}</span> | TOM: {currentSong?.currentKey || '--'}
            </span>
            <span className="text-[11px] text-zinc-400 bg-stage-card px-2.5 py-0.5 rounded border border-stage-border font-mono">
              {backingStems.length} Backing | {inEarStems.length} In-Ear
            </span>
          </div>
        </div>

        {/* Horizontal scroll of live strips */}
        <div className="flex-1 flex gap-3 overflow-x-auto pb-3 items-stretch">
          {backingStems.map((stem) => (
            <MixerStrip
              key={stem.id}
              stem={stem}
              vuLevel={vuMeters[stem.id] || 0}
              onUpdateStem={(updates) => onUpdateStem(stem.id, updates)}
              onDeleteStem={onDeleteStem ? () => onDeleteStem(stem.id) : undefined}
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
              onDeleteStem={onDeleteStem ? () => onDeleteStem(stem.id) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Right: Stage Alerts & Setlist Queue */}
      <div className="w-[360px] flex flex-col p-4 gap-4 bg-stage-panel/30 border-l border-stage-border/50">
        {/* Instant Stage Alerts */}
        <StageAlertsPanel
          activeAlert={activeAlert}
          stageConnectedCount={stageConnectedCount}
          onSendAlert={onSendAlert}
          onClearAlert={onClearAlert}
        />

        {/* Setlist Queue */}
        <div className="flex-1 bg-stage-panel border border-stage-border rounded-xl p-3.5 flex flex-col overflow-hidden">
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
                  className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between border transition-all ${
                    isCurrent
                      ? 'bg-stage-card border-stage-amber text-white shadow-sm'
                      : 'bg-stage-panel/60 border-transparent text-stage-muted hover:text-white hover:bg-stage-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
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
