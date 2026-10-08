import React from 'react';
import { Plus, Sliders } from 'lucide-react';
import { StemTrack, Song } from '../../shared/types';
import { MixerStrip } from './MixerStrip';

interface MixerPanelProps {
  currentSong: Song | null;
  vuMeters: Record<string, number>;
  onUpdateStem: (stemId: string, updates: Partial<StemTrack>) => void;
  onAddStem: (type: 'backing' | 'in_ear') => void;
}

export const MixerPanel: React.FC<MixerPanelProps> = ({
  currentSong,
  vuMeters,
  onUpdateStem,
  onAddStem
}) => {
  if (!currentSong) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-stage-muted p-8">
        <Sliders size={48} className="text-stage-borderLight mb-3" />
        <p className="text-base font-semibold">Nenhuma música ativa para mixagem</p>
        <p className="text-xs text-stage-muted mt-1">Selecione uma faixa no repertório para abrir os faders.</p>
      </div>
    );
  }

  const backingStems = currentSong.stems.filter((s) => s.type === 'backing');
  const inEarStems = currentSong.stems.filter((s) => s.type === 'in_ear');

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden bg-stage-bg select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
            Mixer Multitrack Console — {currentSong.title}
          </h2>
          <span className="text-[11px] text-stage-muted bg-stage-card px-2 py-0.5 rounded border border-stage-border">
            {backingStems.length} Backing Tracks + {inEarStems.length} In-Ear Returns
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddStem('backing')}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-stage-card hover:bg-stage-surface border border-stage-border text-stage-amber transition-all"
            title="Adicionar mais uma faixa de backing track"
          >
            <Plus size={13} />
            <span>+ Backing Track</span>
          </button>
          <button
            onClick={() => onAddStem('in_ear')}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-stage-card hover:bg-stage-surface border border-stage-border text-cyan-400 transition-all"
            title="Adicionar faixa de retorno in-ear"
          >
            <Plus size={13} />
            <span>+ In-Ear Track</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Console Rack */}
      <div className="flex-1 flex gap-3 overflow-x-auto pb-4 pt-1">
        {/* Backing Tracks Section */}
        <div className="flex gap-2 p-2 rounded-xl bg-stage-panel/60 border border-stage-border">
          {backingStems.map((stem) => (
            <MixerStrip
              key={stem.id}
              stem={stem}
              vuLevel={vuMeters[stem.id] || 0}
              onUpdateStem={(updates) => onUpdateStem(stem.id, updates)}
            />
          ))}
        </div>

        {/* In-Ear Section with distinct separation */}
        <div className="flex gap-2 p-2 rounded-xl bg-cyan-950/10 border border-cyan-800/40">
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
    </div>
  );
};
