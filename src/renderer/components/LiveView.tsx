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
  const [queueViewMode, setQueueViewMode] = React.useState<'setlist' | 'catalog'>('setlist');

  const displayedList = (queueViewMode === 'setlist' && activeSetlist && activeSetlist.items.length > 0)
    ? activeSetlist.items.map((item, idx) => {
        const song = songs.find((s) => s.id === item.songId);
        return song ? { ...song, queueOrder: idx + 1, queueItemId: item.id } : null;
      }).filter(Boolean) as (Song & { queueOrder: number; queueItemId: string })[]
    : songs.map((s, idx) => ({ ...s, queueOrder: idx + 1, queueItemId: s.id }));

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
        {(!currentSong?.stems || currentSong.stems.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stage-muted border border-dashed border-stage-border rounded-xl">
            <p className="text-sm font-semibold text-white mb-1">Nenhuma stem cadastrada nesta música</p>
            <p className="text-xs text-stage-muted">Acesse a aba "Mixer" na barra superior para adicionar backing tracks e canais de retorno.</p>
          </div>
        ) : (
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

            {/* Divider only if both exist */}
            {backingStems.length > 0 && inEarStems.length > 0 && (
              <div className="w-[1px] bg-cyan-900/40 self-stretch my-2" />
            )}

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
        )}
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

        {/* Setlist & Repertoire Queue for Live Controller */}
        <div className="flex-1 bg-stage-panel border border-stage-border rounded-xl p-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stage-border">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Trocar de Música
            </h4>
            <div className="flex items-center gap-1 bg-stage-bg p-0.5 rounded border border-stage-border">
              <button
                onClick={() => setQueueViewMode('setlist')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                  queueViewMode === 'setlist'
                    ? 'bg-stage-amber text-slate-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Visualizar ordem do Setlist"
              >
                Setlist ({activeSetlist?.items.length || 0})
              </button>
              <button
                onClick={() => setQueueViewMode('catalog')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                  queueViewMode === 'catalog'
                    ? 'bg-stage-amber text-slate-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Visualizar todo o repertório cadastrado"
              >
                Todas ({songs.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {displayedList.length === 0 ? (
              <div className="p-4 text-center text-xs text-stage-muted">
                Nenhuma música nesta lista
              </div>
            ) : (
              displayedList.map((song) => {
                const isCurrent = song.id === currentSong?.id;

                return (
                  <div
                    key={song.queueItemId}
                    onClick={() => onSelectSong(song.id)}
                    className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between border transition-all ${
                      isCurrent
                        ? 'bg-stage-card border-stage-amber text-white shadow-sm ring-1 ring-amber-500/30'
                        : 'bg-stage-panel/60 border-transparent text-stage-muted hover:text-white hover:bg-stage-surface'
                    }`}
                    title={`Selecionar "${song.title}"`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="font-mono text-xs font-bold text-stage-amber w-5">
                        {song.queueOrder}.
                      </span>
                      <div className="truncate">
                        <div className="text-xs font-bold truncate text-white">{song.title}</div>
                        <div className="text-[10px] text-stage-muted truncate">{song.artist}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-mono font-bold text-stage-chord bg-stage-bg px-1.5 py-0.5 rounded border border-stage-border">
                        {song.currentKey}
                      </span>
                      {isCurrent && <ChevronRight size={14} className="text-stage-amber" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
