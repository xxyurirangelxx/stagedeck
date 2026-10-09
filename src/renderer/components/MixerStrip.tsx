import React, { useRef } from 'react';
import { Volume2, VolumeX, Upload, CheckCircle2, Trash2 } from 'lucide-react';
import { StemTrack, AudioRouting } from '../../shared/types';
import { audioEngine } from '../audio/AudioEngine';

interface MixerStripProps {
  stem: StemTrack;
  vuLevel: number; // 0.0 to 1.0
  onUpdateStem: (updates: Partial<StemTrack>) => void;
  onDeleteStem?: () => void;
}

export const MixerStrip: React.FC<MixerStripProps> = ({
  stem,
  vuLevel = 0,
  onUpdateStem,
  onDeleteStem
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const duration = await audioEngine.loadTrackFile(stem, file);
      onUpdateStem({
        fileName: file.name,
        fileUrl: URL.createObjectURL(file)
      });
      console.log(`Faixa carregada com sucesso: ${file.name} (${duration.toFixed(1)}s)`);
    } catch (err) {
      alert(`Erro ao decodificar arquivo de áudio: ${err}`);
    }
  };

  const isInEar = stem.type === 'in_ear';

  // VU meter bar height and color gradient
  const vuPct = Math.min(100, Math.max(0, vuLevel * 100));
  let vuColor = 'bg-emerald-500';
  if (vuPct > 75) vuColor = 'bg-amber-400';
  if (vuPct > 90) vuColor = 'bg-red-500';

  return (
    <div className={`w-32 flex-shrink-0 flex flex-col justify-between p-2.5 rounded-lg border transition-all ${
      isInEar
        ? 'bg-cyan-950/20 border-cyan-800/40 hover:border-cyan-600/60'
        : 'bg-stage-card border-stage-border hover:border-stage-borderLight'
    }`}>
      {/* Top Header: Stem Type & Name */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase font-mono ${
            isInEar
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {isInEar ? 'IN-EAR' : 'BACKING'}
          </span>

          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 px-1 py-0.2 rounded" title="Conversão Mono Obrigatória Ativa">
              MONO
            </span>
            {onDeleteStem && (
              <button
                onClick={() => {
                  if (confirm(`Apagar a faixa "${stem.name}"?`)) {
                    onDeleteStem();
                  }
                }}
                className="text-zinc-500 hover:text-red-400 p-0.5 rounded hover:bg-zinc-800 transition-all"
                title="Apagar esta faixa"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        <input
          type="text"
          value={stem.name}
          onChange={(e) => onUpdateStem({ name: e.target.value })}
          className="bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-stage-borderLight focus:border-stage-amber outline-none py-0.5 truncate"
          title={stem.name}
        />
      </div>

      {/* Routing Selector: L | L+R | R */}
      <div className="my-2 bg-stage-bg p-1 rounded border border-stage-border flex flex-col gap-1">
        <span className="text-[9px] font-bold text-stage-muted text-center tracking-wider">SAÍDA ESTÉREO</span>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => onUpdateStem({ panRouting: 'L' })}
            className={`py-1 text-[10px] font-extrabold rounded font-mono transition-all ${
              stem.panRouting === 'L'
                ? 'bg-stage-amber text-slate-950 shadow-sm'
                : 'text-stage-muted hover:text-white bg-stage-panel'
            }`}
            title="Canal L (Ex: PA / Mesa Principal)"
          >
            L
          </button>
          <button
            onClick={() => onUpdateStem({ panRouting: 'BOTH' })}
            className={`py-1 text-[9px] font-extrabold rounded font-mono transition-all ${
              stem.panRouting === 'BOTH'
                ? 'bg-stage-amber text-slate-950 shadow-sm'
                : 'text-stage-muted hover:text-white bg-stage-panel'
            }`}
            title="Canais L + R (Centro / Ambos)"
          >
            L+R
          </button>
          <button
            onClick={() => onUpdateStem({ panRouting: 'R' })}
            className={`py-1 text-[10px] font-extrabold rounded font-mono transition-all ${
              stem.panRouting === 'R'
                ? 'bg-stage-amber text-slate-950 shadow-sm'
                : 'text-stage-muted hover:text-white bg-stage-panel'
            }`}
            title="Canal R (Ex: Fone In-Ear / Retorno da Banda)"
          >
            R
          </button>
        </div>
      </div>

      {/* Fader & VU Meter Section */}
      <div className="flex justify-center items-center gap-3 py-2 h-44">
        {/* Tactile Vertical Slider Fader */}
        <div className="relative flex flex-col items-center h-full justify-between">
          <span className="text-[9px] font-mono font-bold text-stage-muted">+6dB</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={stem.volume}
            onChange={(e) => onUpdateStem({ volume: parseFloat(e.target.value) })}
            className="fader-vertical h-28 w-6 cursor-grab active:cursor-grabbing"
            title={`Ganho: ${Math.round(stem.volume * 100)}%`}
          />
          <span className="text-[9px] font-mono font-bold text-stage-amber">
            {Math.round(stem.volume * 100)}%
          </span>
        </div>

        {/* Real-time Peak VU Meter */}
        <div className="w-2.5 h-36 bg-zinc-950 rounded border border-stage-border flex flex-col justify-end p-0.5 overflow-hidden">
          <div
            className={`w-full rounded-sm transition-all duration-75 ${vuColor}`}
            style={{ height: `${vuPct}%` }}
          />
        </div>
      </div>

      {/* Mute (M) & Solo (S) Buttons */}
      <div className="grid grid-cols-2 gap-1.5 my-2">
        <button
          onClick={() => onUpdateStem({ muted: !stem.muted })}
          className={`py-1.5 text-xs font-black rounded border font-mono transition-all ${
            stem.muted
              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              : 'bg-stage-panel text-stage-muted border-stage-border hover:text-white hover:border-stage-borderLight'
          }`}
          title="Mute: Mutar faixa"
        >
          M
        </button>
        <button
          onClick={() => onUpdateStem({ solo: !stem.solo })}
          className={`py-1.5 text-xs font-black rounded border font-mono transition-all ${
            stem.solo
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
              : 'bg-stage-panel text-stage-muted border-stage-border hover:text-white hover:border-stage-borderLight'
          }`}
          title="Solo: Isolar faixa"
        >
          S
        </button>
      </div>

      {/* Audio File Loader */}
      <div className="mt-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.flac,.m4a,.aac,.mp3"
          onChange={handleFileUpload}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className={`w-full py-1 px-1.5 rounded text-[10px] font-semibold flex items-center justify-center gap-1 border truncate transition-all ${
            stem.fileName
              ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300'
              : 'bg-stage-panel border-stage-border text-stage-muted hover:text-white hover:bg-stage-surface'
          }`}
          title={stem.fileName ? `Arquivo: ${stem.fileName}` : 'Carregar áudio (WAV, FLAC, M4A)'}
        >
          {stem.fileName ? (
            <>
              <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
              <span className="truncate">{stem.fileName}</span>
            </>
          ) : (
            <>
              <Upload size={11} className="flex-shrink-0" />
              <span>Carregar Áudio</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
