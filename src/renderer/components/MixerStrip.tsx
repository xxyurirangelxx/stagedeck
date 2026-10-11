import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, Trash2, RotateCcw } from 'lucide-react';
import { StemTrack } from '../../shared/types';
import { audioEngine } from '../audio/AudioEngine';
import { audioStorage } from '../audio/audioStorage';
import { ConfirmDialog } from './ConfirmDialog';

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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
      className={`w-36 flex-shrink-0 flex flex-col justify-between p-2 rounded-stage border select-none transition-colors bg-white ${
        isInEar
          ? 'border-cyan-200 hover:border-cyan-400 shadow-sm'
          : 'border-stage-border hover:border-stage-borderLight shadow-sm'
      }`}
    >
      {/* 1. Console Channel Header & Scribble Strip */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between pb-1 border-b border-stage-border">
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-wide uppercase ${
              isInEar
                ? 'bg-cyan-50 text-stage-cyan border border-cyan-200'
                : 'bg-stage-accentTint text-stage-accent border border-blue-200'
            }`}
          >
            {isInEar ? 'In-Ear' : 'Backing'}
          </span>

          <div className="flex items-center gap-1">
            <span
              className="text-[8px] font-semibold text-stage-muted bg-stage-panel px-1 py-0.5 rounded-md border border-stage-border"
              title="Conversão Mono Estrita Ativa"
            >
              MONO
            </span>
            {onDeleteStem && (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                aria-label={`Apagar faixa ${stem.name}`}
                className="text-stage-faint hover:text-stage-red p-0.5 rounded-md hover:bg-red-50 transition-colors"
                title="Apagar esta faixa"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Scribble Strip Channel Name */}
        <div className="bg-stage-panel px-1.5 py-1 rounded-xl border border-stage-border flex flex-col">
          <input
            type="text"
            value={stem.name}
            onChange={(e) => onUpdateStem({ name: e.target.value })}
            className="bg-transparent text-[11px] font-medium text-stage-text outline-none w-full truncate border-b border-transparent focus:border-stage-accent"
            title={stem.name}
            aria-label={`Nome do canal ${stem.name}`}
          />
        </div>
      </div>

      {/* 2. Routing Selector: L | L+R | R (Bus switches) */}
      <div className="my-1.5 bg-stage-panel p-1 rounded-xl border border-stage-border flex flex-col gap-0.5">
        <span className="text-[8px] font-semibold text-stage-muted text-center uppercase">
          Roteamento Stereo
        </span>
        <div className="grid grid-cols-3 gap-1">
          {(['L', 'BOTH', 'R'] as const).map((route) => {
            const isActive = stem.panRouting === route;
            return (
              <button
                key={route}
                onClick={() => onUpdateStem({ panRouting: route })}
                className={`py-1 text-[10px] font-semibold rounded-md transition-colors border ${
                  isActive
                    ? 'bg-stage-accent text-white border-stage-accent'
                    : 'text-stage-muted bg-white border-stage-border hover:text-stage-text hover:border-stage-borderLight'
                }`}
                title={
                  route === 'L'
                    ? 'Canal L (Ex: PA / Mesa Principal)'
                    : route === 'BOTH'
                    ? 'Canais L + R (Centro / Ambos)'
                    : 'Canal R (Ex: Retorno In-Ear / Fone)'
                }
              >
                {route === 'BOTH' ? 'L+R' : route}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Gain/dB Readout and Reset to Unity Button */}
      <div className="flex items-center justify-between px-1.5 py-1 bg-white rounded-xl border border-stage-border">
        <button
          onClick={() => onUpdateStem({ volume: 1.0 })}
          className={`flex items-center gap-1 text-[9px] font-semibold tabular-nums transition-colors ${
            isUnity ? 'text-stage-green hover:text-green-700' : 'text-stage-accent hover:text-stage-accentHover'
          }`}
          title="Clique para resetar para 100% (0 dB Unity Gain)"
        >
          <RotateCcw size={9} />
          <span>{formatVolumeDb(currentVolume)}</span>
        </button>
        <span className="text-[9px] font-semibold text-stage-text tabular-nums">
          {Math.round(currentVolume * 100)}%
        </span>
      </div>

      {/* 4. Fader & Multi-Segment LED Ladder */}
      <div className="flex items-stretch justify-center gap-2 py-2 h-44 bg-stage-panel rounded-xl border border-stage-border p-1.5 my-1.5">
        {/* Decibel markings beside fader */}
        <div className="flex flex-col justify-between text-[8px] text-stage-faint py-0.5 select-none text-right tabular-nums">
          <span className="text-stage-red font-semibold">+3.5</span>
          <span className={`font-semibold ${isUnity ? 'text-stage-accent' : 'text-stage-muted'}`}>0dB</span>
          <span>-6</span>
          <span>-12</span>
          <span>-24</span>
          <span>-∞</span>
        </div>

        {/* Fader Track & Thumb */}
        <div className="relative flex flex-col items-center h-full justify-center w-8">
          {/* Subtle Unity Notch indicator line at volume = 1.0 (which is 1.0 / 1.5 = ~66.7% from bottom) */}
          <div
            className="absolute right-0 w-2 h-[2px] bg-stage-accent/60 z-0 pointer-events-none"
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
            aria-label={`Volume da faixa ${stem.name}`}
          />
        </div>

        {/* Console LED Ladder VU Meter */}
        <div className="w-3.5 h-full bg-white rounded-md border border-stage-border p-0.5 flex flex-col justify-between gap-[2px]">
          {LED_METER_SEGMENTS.map((seg, idx) => {
            const isLit = vuLevel >= seg.threshold;
            let ledClass = 'bg-stage-surface';

            if (seg.type === 'red') {
              ledClass = isLit
                ? 'bg-rose-500'
                : 'bg-rose-100';
            } else if (seg.type === 'amber') {
              ledClass = isLit
                ? 'bg-amber-500'
                : 'bg-amber-100';
            } else if (seg.type === 'yellow') {
              ledClass = isLit
                ? 'bg-yellow-400'
                : 'bg-yellow-100';
            } else {
              ledClass = isLit
                ? 'bg-emerald-500'
                : 'bg-emerald-100';
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

      {/* 5. MUTE & SOLO Console Switches */}
      <div className="grid grid-cols-2 gap-1.5 my-1">
        <button
          onClick={() => onUpdateStem({ muted: !stem.muted })}
          aria-pressed={stem.muted}
          className={`py-1 text-[11px] font-semibold rounded-full border transition-colors ${
            stem.muted
              ? 'bg-stage-red text-white border-stage-red'
              : 'bg-white text-stage-muted border-stage-border hover:text-stage-text hover:bg-stage-panel'
          }`}
          title="MUTE (Silenciar faixa)"
        >
          Mute
        </button>
        <button
          onClick={() => onUpdateStem({ solo: !stem.solo })}
          aria-pressed={stem.solo}
          className={`py-1 text-[11px] font-semibold rounded-full border transition-colors ${
            stem.solo
              ? 'bg-stage-accent text-white border-stage-accent'
              : 'bg-white text-stage-muted border-stage-border hover:text-stage-text hover:bg-stage-panel'
          }`}
          title="SOLO (Isolar faixa no monitor)"
        >
          Solo
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
          className={`w-full py-1 px-1.5 rounded-full text-[10px] font-medium flex items-center justify-center gap-1 border truncate transition-colors ${
            stem.fileName
              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              : 'bg-white border-stage-border text-stage-muted hover:text-stage-text hover:bg-stage-panel'
          }`}
          title={stem.fileName ? `Arquivo: ${stem.fileName}` : 'Carregar áudio (WAV, FLAC, M4A, MP3)'}
        >
          {stem.fileName ? (
            <>
              <CheckCircle2 size={11} className="text-stage-green flex-shrink-0" />
              <span className="truncate flex-1 text-left">{stem.fileName}</span>
              {stem.duration !== undefined && stem.duration > 0 && (
                <span className="text-[8px] font-semibold tabular-nums px-1 py-0.2 rounded-md bg-white border border-green-200 flex-shrink-0">
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

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title={`Remover "${stem.name}"?`}
        message="A faixa será removida do mixer desta música. O arquivo de áudio carregado também deixará de ser usado."
        confirmLabel="Remover"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          onDeleteStem?.();
        }}
      />
    </div>
  );
};
