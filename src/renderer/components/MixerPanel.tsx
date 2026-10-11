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
        <p className="text-base font-semibold text-stage-text">Nenhuma música ativa para mixagem</p>
        <p className="text-xs mt-1">Selecione uma faixa no repertório para abrir os faders.</p>
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
            <h2 className="text-[15px] font-semibold text-stage-text">
              Mixer de Stems <span className="text-stage-muted font-normal">— {currentSong.title}</span>
            </h2>
            <span className="text-[11px] text-stage-muted bg-stage-panel px-2 py-0.5 rounded-full border border-stage-border tabular-nums">
              0 faixas carregadas
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddStem('backing')}
              className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-full bg-white hover:bg-stage-accentTint border border-stage-border hover:border-stage-accent text-stage-text transition-colors"
              title="Adicionar faixa de backing track"
            >
              <Plus size={14} className="text-stage-accent" />
              <span>+ Backing Track</span>
            </button>
            <button
              onClick={() => onAddStem('in_ear')}
              className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-full bg-white hover:bg-cyan-50 border border-stage-border hover:border-cyan-400 text-stage-text transition-colors"
              title="Adicionar faixa de retorno in-ear"
            >
              <Plus size={14} className="text-stage-cyan" />
              <span>+ In-Ear Track</span>
            </button>
          </div>
        </div>

        {/* Empty state container */}
        <div className="flex-1 border border-dashed border-stage-border rounded-stage bg-stage-panel/40 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-stage bg-white border border-stage-border flex items-center justify-center text-stage-accent mb-4 shadow-sm">
            <Sliders size={30} />
          </div>
          <h3 className="text-base font-semibold text-stage-text mb-1">
            Nenhuma stem adicionada para "{currentSong.title}"
          </h3>
          <p className="text-[13px] text-stage-muted max-w-md mb-6 leading-relaxed">
            Monte a mesa de som da sua música adicionando faixas de playback (bateria, baixo, guitarras, teclados) e canais exclusivos de retorno in-ear (click/metrônomo e guia de voz).
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onAddStem('backing')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white font-semibold text-[13px] transition-colors"
            >
              <Plus size={16} />
              <span>+ Backing Track (Canal L)</span>
            </button>
            <button
              onClick={() => onAddStem('in_ear')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-cyan-50 border border-stage-border hover:border-cyan-400 text-stage-text font-semibold text-[13px] transition-colors"
            >
              <Plus size={16} className="text-stage-cyan" />
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
          <h2 className="text-[15px] font-semibold text-stage-text">
            Mixer de Stems <span className="text-stage-muted font-normal">— {currentSong.title}</span>
          </h2>
          <span className="text-[11px] text-stage-muted bg-stage-panel px-2 py-0.5 rounded-full border border-stage-border tabular-nums">
            {backingStems.length} Backing + {inEarStems.length} In-Ear
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddStem('backing')}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-full bg-white hover:bg-stage-accentTint border border-stage-border hover:border-stage-accent text-stage-text transition-colors"
            title="Adicionar mais uma faixa de backing track"
          >
            <Plus size={13} className="text-stage-accent" />
            <span>+ Backing Track</span>
          </button>
          <button
            onClick={() => onAddStem('in_ear')}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-full bg-white hover:bg-cyan-50 border border-stage-border hover:border-cyan-400 text-stage-text transition-colors"
            title="Adicionar faixa de retorno in-ear"
          >
            <Plus size={13} className="text-stage-cyan" />
            <span>+ In-Ear Track</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Console Rack */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 pt-1 items-start">
        {/* Backing Tracks Section (Only rendered if > 0) */}
        {backingStems.length > 0 && (
          <div className="flex flex-col gap-2 p-2.5 rounded-stage bg-stage-panel border border-stage-border">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-stage-accent">
                <Disc3 size={13} />
                <span className="text-[11px] font-semibold uppercase">
                  Backing Tracks ({backingStems.length})
                </span>
              </div>
              <button
                onClick={() => onAddStem('backing')}
                className="text-[11px] font-medium text-stage-muted hover:text-stage-text flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-stage-border transition-colors"
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
          <div className="flex flex-col gap-2 p-2.5 rounded-stage bg-cyan-50/50 border border-cyan-200">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-stage-cyan">
                <Headphones size={13} />
                <span className="text-[11px] font-semibold uppercase">
                  Retorno In-Ear ({inEarStems.length})
                </span>
              </div>
              <button
                onClick={() => onAddStem('in_ear')}
                className="text-[11px] font-medium text-stage-cyan hover:text-cyan-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-cyan-200 transition-colors"
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
