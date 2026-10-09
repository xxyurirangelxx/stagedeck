import React, { useRef } from 'react';
import { Upload, CheckCircle2, Trash2, RotateCcw } from 'lucide-react';
import { StemTrack } from '../../shared/types';
import { audioEngine } from '../audio/AudioEngine';
import { audioStorage } from '../audio/audioStorage';

interface MixerStripProps {
  stem: StemTrack;
  vuLevel: number; // 0.0 to 1.0
  onUpdateStem: (updates: Partial<StemTrack>) => void;
  onDeleteStem?: () => void;
}

// 12-segment console LED meter thresholds & colors
const LED_METER_SEGMENTS = [
  { threshold: 0.92, type: 'red' },    // Clip / +6dB
  { threshold: 0.84, type: 'red' },    // +4dB
  { threshold: 0.75, type: 'amber' },  // +2dB
  { threshold: 0.66, type: 'amber' },  // 0dB Nominal target
  { threshold: 0.57, type: 'yellow' }, // -2dB
  { threshold: 0.48, type: 'yellow' }, // -4dB
  { threshold: 0.40, type: 'green' },  // -6dB
  { threshold: 0.32, type: 'green' },  // -9dB
  { threshold: 0.24, type: 'green' },  // -12dB
  { threshold: 0.16, type: 'green' },  // -18dB
  { threshold: 0.08, type: 'green' },  // -24dB
  { threshold: 0.02, type: 'green' },  // Signal presence
];

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
      const arrayBuffer = await file.arrayBuffer();
      // Permanently store audio in IndexedDB so it persists across app reboots
      await audioStorage.saveStemAudio(stem.id, file.name, arrayBuffer);

      const duration = await audioEngine.loadTrackFile(stem, arrayBuffer);
      onUpdateStem({
        fileName: file.name,
        filePath: (file as unknown as { path?: string }).path || undefined,
        fileUrl: URL.createObjectURL(file),
        duration: duration
      });
      console.log(`Faixa carregada e persistida com sucesso: ${file.name} (${duration.toFixed(1)}s)`);
    } catch (err) {
      alert(`Erro ao decodificar arquivo de áudio: ${err}`);
    }
  };

  const isInEar = stem.type === 'in_ear';
  const currentVolume = stem.volume ?? 1.0;

  const formatVolumeDb = (vol: number) => {
    if (vol <= 0.001) return '-∞ dB';
    const db = 20 * Math.log10(vol);
    const sign = db > 0.05 ? '+' : '';
    return `${sign}${db.toFixed(1)} dB`;
  };

  const isUnity = Math.abs(currentVolume - 1.0) < 0.01;

  return (
    <div
      className={`w-36 flex-shrink-0 flex flex-col justify-between p-2 rounded-xl border select-none transition-all ${
        isInEar
          ? 'bg-gradient-to-b from-cyan-950/30 via-stage-panel to-slate-950 border-cyan-700/50 hover:border-cyan-500/70 shadow-md'
          : 'bg-gradient-to-b from-stage-card via-stage-panel to-slate-950 border-stage-border hover:border-stage-borderLight shadow-md'
      }`}
    >
      {/* 1. Console Channel Header & Scribble Strip */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between pb-1 border-b border-stage-border/60">
          <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase font-mono ${
              isInEar
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {isInEar ? 'IN-EAR' : 'BACKING'}
          </span>

          <div className="flex items-center gap-1">
            <span
              className="text-[8px] font-black text-zinc-400 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-700/60 font-mono"
              title="Conversão Mono Estrita Ativa"
            >
              MONO
            </span>
            {onDeleteStem && (
              <button
                onClick={() => {
                  if (confirm(`Remover faixa "${stem.name}" do mixer?`)) {
                    onDeleteStem();
                  }
                }}
                className="text-zinc-500 hover:text-red-400 p-0.5 rounded hover:bg-zinc-800 transition-all"
                title="Apagar esta faixa"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Scribble Strip Channel Name */}
        <div className="bg-zinc-900/90 px-1.5 py-1 rounded border border-zinc-700/70 shadow-inner flex flex-col">
          <input
            type="text"
            value={stem.name}
            onChange={(e) => onUpdateStem({ name: e.target.value })}
            className="bg-transparent text-[11px] font-bold text-white outline-none w-full truncate border-b border-transparent focus:border-stage-amber"
            title={stem.name}
          />
        </div>
      </div>

      {/* 2. Routing Selector: L | L+R | R (Bus switches) */}
      <div className="my-1.5 bg-zinc-950/80 p-1 rounded-lg border border-stage-border flex flex-col gap-0.5">
        <span className="text-[8px] font-black text-stage-muted text-center tracking-wider font-mono">
          ROTEAMENTO STEREO
        </span>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => onUpdateStem({ panRouting: 'L' })}
            className={`py-1 text-[10px] font-black rounded font-mono transition-all border ${
              stem.panRouting === 'L'
                ? 'bg-stage-amber text-slate-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'text-zinc-400 bg-zinc-900 border-zinc-800 hover:text-white hover:bg-zinc-800'
            }`}
            title="Canal L (Ex: PA / Mesa Principal)"
          >
            L
          </button>
          <button
            onClick={() => onUpdateStem({ panRouting: 'BOTH' })}
            className={`py-1 text-[9px] font-black rounded font-mono transition-all border ${
              stem.panRouting === 'BOTH'
                ? 'bg-stage-amber text-slate-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'text-zinc-400 bg-zinc-900 border-zinc-800 hover:text-white hover:bg-zinc-800'
            }`}
            title="Canais L + R (Centro / Ambos)"
          >
            L+R
          </button>
          <button
            onClick={() => onUpdateStem({ panRouting: 'R' })}
            className={`py-1 text-[10px] font-black rounded font-mono transition-all border ${
              stem.panRouting === 'R'
                ? 'bg-stage-amber text-slate-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'text-zinc-400 bg-zinc-900 border-zinc-800 hover:text-white hover:bg-zinc-800'
            }`}
            title="Canal R (Ex: Retorno In-Ear / Fone)"
          >
            R
          </button>
        </div>
      </div>

      {/* 3. Gain/dB Readout and Reset to Unity Button */}
      <div className="flex items-center justify-between px-1 py-0.5 bg-zinc-950 rounded border border-zinc-800/80">
        <button
          onClick={() => onUpdateStem({ volume: 1.0 })}
          className={`flex items-center gap-1 text-[9px] font-mono font-bold transition-all ${
            isUnity ? 'text-emerald-400 hover:text-emerald-300' : 'text-stage-amber hover:text-amber-300'
          }`}
          title="Clique para resetar para 100% (0 dB Unity Gain)"
        >
          <RotateCcw size={9} />
          <span>{formatVolumeDb(currentVolume)}</span>
        </button>
        <span className="text-[9px] font-mono font-extrabold text-white">
          {Math.round(currentVolume * 100)}%
        </span>
      </div>

      {/* 4. Professional Soundboard Console Fader & Multi-Segment LED Ladder */}
      <div className="flex items-stretch justify-center gap-2 py-2 h-44 bg-zinc-950/70 rounded-lg border border-zinc-900/80 p-1.5 my-1.5">
        {/* Decibel markings beside fader */}
        <div className="flex flex-col justify-between text-[8px] font-mono text-zinc-500 py-0.5 select-none text-right">
          <span className="text-rose-400 font-bold">+3.5</span>
          <span className={`font-bold ${isUnity ? 'text-stage-amber' : 'text-zinc-400'}`}>0dB</span>
          <span>-6</span>
          <span>-12</span>
          <span>-24</span>
          <span>-∞</span>
        </div>

        {/* Fader Track & Thumb */}
        <div className="relative flex flex-col items-center h-full justify-center w-8">
          {/* Subtle Unity Notch indicator line at volume = 1.0 (which is 1.0 / 1.5 = ~66.7% from bottom) */}
          <div
            className="absolute right-0 w-2 h-[2px] bg-amber-500/60 z-0 pointer-events-none"
            style={{ bottom: '66.7%' }}
            title="Marcação de Ganho Unitário (0 dB)"
          />
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.01"
            value={currentVolume}
            onChange={(e) => onUpdateStem({ volume: parseFloat(e.target.value) })}
            onDoubleClick={() => onUpdateStem({ volume: 1.0 })}
            className="fader-vertical h-36 w-7 cursor-grab active:cursor-grabbing z-10"
            title={`Volume: ${Math.round(currentVolume * 100)}% (${formatVolumeDb(currentVolume)}) — Clique duplo para 0dB`}
          />
        </div>

        {/* Console LED Ladder VU Meter */}
        <div className="w-3.5 h-full bg-zinc-950 rounded border border-zinc-800 p-0.5 flex flex-col justify-between gap-[2px]">
          {LED_METER_SEGMENTS.map((seg, idx) => {
            const isLit = vuLevel >= seg.threshold;
            let ledClass = 'bg-zinc-900 border border-zinc-800/60';

            if (seg.type === 'red') {
              ledClass = isLit
                ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.95)] border-rose-400'
                : 'bg-rose-950/40 border border-rose-950/60';
            } else if (seg.type === 'amber') {
              ledClass = isLit
                ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.9)] border-amber-300'
                : 'bg-amber-950/40 border border-amber-950/60';
            } else if (seg.type === 'yellow') {
              ledClass = isLit
                ? 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.9)] border-yellow-300'
                : 'bg-yellow-950/40 border border-yellow-950/60';
            } else {
              ledClass = isLit
                ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.9)] border-emerald-300'
                : 'bg-emerald-950/40 border border-emerald-950/60';
            }

            return (
              <div
                key={idx}
                className={`w-full flex-1 rounded-[1px] transition-colors duration-75 ${ledClass}`}
              />
            );
          })}
        </div>
      </div>

      {/* 5. Illuminated MUTE & SOLO Console Switches */}
      <div className="grid grid-cols-2 gap-1.5 my-1">
        <button
          onClick={() => onUpdateStem({ muted: !stem.muted })}
          className={`py-1 text-xs font-black rounded-lg border font-mono transition-all ${
            stem.muted
              ? 'bg-red-600 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.7)] ring-1 ring-red-400'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
          }`}
          title="MUTE (Silenciar faixa)"
        >
          MUTE
        </button>
        <button
          onClick={() => onUpdateStem({ solo: !stem.solo })}
          className={`py-1 text-xs font-black rounded-lg border font-mono transition-all ${
            stem.solo
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.7)] ring-1 ring-amber-300'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
          }`}
          title="SOLO (Isolar faixa no monitor)"
        >
          SOLO
        </button>
      </div>

      {/* 6. Audio File Loader */}
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
          className={`w-full py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border truncate transition-all ${
            stem.fileName
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:border-emerald-500'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title={stem.fileName ? `Arquivo: ${stem.fileName}` : 'Carregar áudio (WAV, FLAC, M4A, MP3)'}
        >
          {stem.fileName ? (
            <>
              <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{stem.fileName}</span>
              {stem.duration !== undefined && stem.duration > 0 && (
                <span className="text-[8px] font-mono text-emerald-300 bg-emerald-950/90 px-1 py-0.2 rounded border border-emerald-600/40 flex-shrink-0">
                  {Math.floor(stem.duration / 60)}:{String(Math.floor(stem.duration % 60)).padStart(2, '0')}
                </span>
              )}
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
