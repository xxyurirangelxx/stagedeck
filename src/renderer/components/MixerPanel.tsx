import React from 'react';
import { Plus, Sliders, Headphones, Disc3 } from 'lucide-react';
import { StemTrack, Song } from '../../shared/types';
import { MixerStrip } from './MixerStrip';

interface MixerPanelProps {
  currentSong: Song | null;
  vuMeters: Record<string, number>;
  onUpdateStem: (stemId: string, updates: Partial<StemTrack>) => void;
  onDeleteStem?: (stemId: string) => void;
  onAddStem: (type: 'backing' | 'in_ear') => void;
}

export const MixerPanel: React.FC<MixerPanelProps> = ({
  currentSong,
  vuMeters,
  onUpdateStem,
  onDeleteStem,
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

  // If song has zero stems, render a prominent, comfortable empty state
  if (currentSong.stems.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-4 overflow-hidden bg-stage-bg select-none">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
              Mixer Multitrack Console — {currentSong.title}
            </h2>
            <span className="text-[11px] text-stage-muted bg-stage-card px-2 py-0.5 rounded border border-stage-border">
              0 Faixas Carregadas
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddStem('backing')}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-stage-card hover:bg-stage-surface border border-stage-border text-stage-amber transition-all shadow-sm"
              title="Adicionar faixa de backing track"
            >
              <Plus size={14} />
              <span>+ Backing Track</span>
            </button>
            <button
              onClick={() => onAddStem('in_ear')}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-stage-card hover:bg-stage-surface border border-cyan-800/60 text-cyan-400 transition-all shadow-sm"
              title="Adicionar faixa de retorno in-ear"
            >
              <Plus size={14} />
              <span>+ In-Ear Track</span>
            </button>
          </div>
        </div>

        {/* Empty state container */}
        <div className="flex-1 border border-dashed border-stage-border rounded-xl bg-stage-panel/30 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stage-card border border-stage-border flex items-center justify-center text-stage-amber mb-4 shadow-inner">
            <Sliders size={32} />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Nenhuma stem adicionada para "{currentSong.title}"
          </h3>
          <p className="text-xs text-stage-muted max-w-md mb-6 leading-relaxed">
            Monte a mesa de som da sua música adicionando faixas de playback (bateria, baixo, guitarras, teclados) e canais exclusivos de retorno in-ear (click/metrônomo e guia de voz).
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onAddStem('backing')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stage-amber hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md"
            >
              <Plus size={16} />
              <span>+ Backing Track (Canal L)</span>
            </button>
            <button
              onClick={() => onAddStem('in_ear')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold text-xs transition-all shadow-md"
            >
              <Plus size={16} />
              <span>+ Retorno In-Ear (Canal R)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden bg-stage-bg select-none">
      {/* Console Top Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
            Mixer Multitrack Console — {currentSong.title}
          </h2>
          <span className="text-[11px] text-stage-muted bg-stage-card px-2 py-0.5 rounded border border-stage-border">
            {backingStems.length} Backing + {inEarStems.length} In-Ear
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddStem('backing')}
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-stage-card hover:bg-stage-surface border border-stage-border text-stage-amber transition-all shadow-sm"
            title="Adicionar mais uma faixa de backing track"
          >
            <Plus size={13} />
            <span>+ Backing Track</span>
          </button>
          <button
            onClick={() => onAddStem('in_ear')}
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-stage-card hover:bg-stage-surface border border-cyan-800/60 text-cyan-400 transition-all shadow-sm"
            title="Adicionar faixa de retorno in-ear"
          >
            <Plus size={13} />
            <span>+ In-Ear Track</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Console Rack */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 pt-1 items-start">
        {/* Backing Tracks Section (Only rendered if > 0) */}
        {backingStems.length > 0 && (
          <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-stage-panel/50 border border-stage-border shadow-md">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-stage-amber">
                <Disc3 size={13} />
                <span className="text-[10px] font-black uppercase font-mono tracking-wider">
                  Backing Tracks ({backingStems.length})
                </span>
              </div>
              <button
                onClick={() => onAddStem('backing')}
                className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800"
              >
                <Plus size={11} />
                <span>Nova</span>
              </button>
            </div>
            <div className="flex gap-2">
              {backingStems.map((stem) => (
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
        )}

        {/* In-Ear Section (Only rendered if > 0) */}
        {inEarStems.length > 0 && (
          <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-cyan-950/20 border border-cyan-800/50 shadow-md">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-cyan-300">
                <Headphones size={13} />
                <span className="text-[10px] font-black uppercase font-mono tracking-wider">
                  Retorno In-Ear ({inEarStems.length})
                </span>
              </div>
              <button
                onClick={() => onAddStem('in_ear')}
                className="text-[10px] font-bold text-cyan-300 hover:text-white flex items-center gap-1 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60"
              >
                <Plus size={11} />
                <span>Nova</span>
              </button>
            </div>
            <div className="flex gap-2">
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
        )}
      </div>
    </div>
  );
};
