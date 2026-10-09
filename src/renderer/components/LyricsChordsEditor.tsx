import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Clock, Plus, Trash2, Download, Upload, Edit3, Code, Sparkles, FileText, Music2 } from 'lucide-react';
import { Song, LyricLine } from '../../shared/types';
import { parseLyricsChordsLrc, serializeLyricsToLrc, exportToTTML, formatTimeLrc, transposeChordLine } from '../utils/lyricsParser';

interface LyricsChordsEditorProps {
  currentSong: Song | null;
  currentTime: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSaveLyrics: (lrcString: string, parsedLines: LyricLine[]) => void;
  onTranspose: (semitones: number) => void;
}

export const LyricsChordsEditor: React.FC<LyricsChordsEditorProps> = ({
  currentSong,
  currentTime,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onSaveLyrics,
  onTranspose
}) => {
  const [mode, setMode] = useState<'visual' | 'raw'>('visual');
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [selectedLineIdx, setSelectedLineIdx] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const lastSongIdRef = useRef<string | null>(null);

  // Sync only when switching songs (preserves local edits and cursor focus while on same song)
  useEffect(() => {
    if (currentSong && currentSong.id !== lastSongIdRef.current) {
      lastSongIdRef.current = currentSong.id;
      const parsed = currentSong.parsedLyrics && currentSong.parsedLyrics.length > 0
        ? currentSong.parsedLyrics
        : parseLyricsChordsLrc(currentSong.lyricsChordsLrc || '');
      setLines(parsed);
      setRawText(currentSong.lyricsChordsLrc || '');
      setSelectedLineIdx(0);
    }
  }, [currentSong]);

  // Find active line based on playback currentTime
  let activeIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (currentTime >= lines[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Auto-scroll active line in visual mode if playing
  useEffect(() => {
    if (isPlaying && scrollContainerRef.current) {
      const activeEl = document.getElementById(`editor-line-${activeIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeIndex, isPlaying]);

  const handleImportLRC = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      const parsed = parseLyricsChordsLrc(content);
      setLines(parsed);
      setRawText(content);
      onSaveLyrics(content, parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // "Tap to Sync": stamp current playback time on the selected line and advance
  const handleStampCurrentTime = () => {
    if (!currentSong || lines.length === 0) return;
    const idx = selectedLineIdx >= 0 && selectedLineIdx < lines.length ? selectedLineIdx : activeIndex;

    const updated = lines.map((l, i) => {
      if (i === idx) {
        return {
          ...l,
          time: Math.round(currentTime * 100) / 100
        };
      }
      return l;
    });

    const newLrc = serializeLyricsToLrc(updated);
    setLines(updated);
    setRawText(newLrc);
    onSaveLyrics(newLrc, updated);

    // Advance selection to next line
    if (idx + 1 < updated.length) {
      setSelectedLineIdx(idx + 1);
    }
  };

  const handleNudgeTime = (idx: number, delta: number) => {
    const updated = lines.map((l, i) => {
      if (i === idx) {
        return {
          ...l,
          time: Math.max(0, Math.round((l.time + delta) * 100) / 100)
        };
      }
      return l;
    });

    const newLrc = serializeLyricsToLrc(updated);
    setLines(updated);
    setRawText(newLrc);
    onSaveLyrics(newLrc, updated);
  };

  const handleUpdateLine = (idx: number, updates: Partial<LyricLine>) => {
    const updated = lines.map((l, i) => (i === idx ? { ...l, ...updates } : l));
    const newLrc = serializeLyricsToLrc(updated);
    setLines(updated);
    setRawText(newLrc);
    onSaveLyrics(newLrc, updated);
  };

  const handleAddLine = (afterIdx?: number) => {
    let insertIndex = lines.length;
    let prevTime = currentTime;

    if (typeof afterIdx === 'number' && lines[afterIdx]) {
      insertIndex = afterIdx + 1;
      prevTime = lines[afterIdx].time + 2.0;
    } else if (lines.length > 0) {
      prevTime = lines[lines.length - 1].time + 2.0;
    }

    const newLine: LyricLine = {
      id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: Math.round(prevTime * 100) / 100,
      chords: '',
      text: ''
    };

    const updated = [
      ...lines.slice(0, insertIndex),
      newLine,
      ...lines.slice(insertIndex)
    ];

    const newLrc = serializeLyricsToLrc(updated);
    setLines(updated);
    setRawText(newLrc);
    onSaveLyrics(newLrc, updated);
    setSelectedLineIdx(insertIndex);
  };

  const handleRemoveLine = (idx: number) => {
    const updated = lines.filter((_, i) => i !== idx);
    const newLrc = serializeLyricsToLrc(updated);
    setLines(updated);
    setRawText(newLrc);
    onSaveLyrics(newLrc, updated);
    if (selectedLineIdx >= updated.length) {
      setSelectedLineIdx(Math.max(0, updated.length - 1));
    }
  };

  const handleApplyRawText = () => {
    const parsed = parseLyricsChordsLrc(rawText);
    setLines(parsed);
    onSaveLyrics(rawText, parsed);
    setMode('visual');
  };

  const handleExportLRC = () => {
    const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSong?.title || 'musica'}.lrc`;
    a.click();
  };

  const handleExportTTML = () => {
    const xml = exportToTTML(currentSong?.title || 'musica', lines);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSong?.title || 'musica'}.ttml`;
    a.click();
  };

  const handleLocalTranspose = (semitones: number) => {
    onTranspose(semitones);
    const updated = lines.map((l) => ({
      ...l,
      chords: transposeChordLine(l.chords, semitones)
    }));
    const newLrc = serializeLyricsToLrc(updated);
    setLines(updated);
    setRawText(newLrc);
  };

  if (!currentSong) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-stage-muted p-8">
        <Edit3 size={48} className="text-stage-borderLight mb-3" />
        <p className="text-base font-semibold">Nenhuma música selecionada</p>
        <p className="text-xs text-stage-muted mt-1">Selecione uma faixa no repertório para abrir o editor.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-stage-bg overflow-hidden select-none">
      {/* Top Header / Action Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-stage-border gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
            Editor de Cifras e Letras — <span className="text-stage-amber">{currentSong.title}</span>
          </h2>

          <div className="flex items-center bg-stage-panel rounded-lg p-0.5 border border-stage-border">
            <button
              onClick={() => setMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                mode === 'visual'
                  ? 'bg-stage-surface text-white shadow-sm'
                  : 'text-stage-muted hover:text-white'
              }`}
            >
              <Sparkles size={13} className="text-stage-amber" />
              <span>Modo Visual (Tap to Sync)</span>
            </button>
            <button
              onClick={() => setMode('raw')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                mode === 'raw'
                  ? 'bg-stage-surface text-white shadow-sm'
                  : 'text-stage-muted hover:text-white'
              }`}
            >
              <Code size={13} className="text-cyan-400" />
              <span>Texto Puro (LRC)</span>
            </button>
          </div>
        </div>

        {/* Action Buttons: Add Line, Transpose, Import/Export LRC */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddLine()}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-stage-card hover:bg-stage-surface border border-stage-border text-emerald-300 hover:text-emerald-200 transition-all"
            title="Adicionar nova linha no final"
          >
            <Plus size={13} />
            <span>+ Nova Linha</span>
          </button>

          {/* Quick Transpose in editor */}
          <div className="flex items-center gap-1 bg-stage-panel border border-stage-border px-2 py-1 rounded-md">
            <span className="text-[10px] font-bold text-stage-muted">TOM ({currentSong.currentKey}):</span>
            <button
              onClick={() => handleLocalTranspose(-1)}
              className="text-xs px-1.5 py-0.5 rounded hover:bg-stage-surface text-stage-amber font-mono font-bold"
              title="Transpor -1 semitom"
            >
              -1
            </button>
            <button
              onClick={() => handleLocalTranspose(1)}
              className="text-xs px-1.5 py-0.5 rounded hover:bg-stage-surface text-stage-amber font-mono font-bold"
              title="Transpor +1 semitom"
            >
              +1
            </button>
          </div>

          <input
            ref={importFileRef}
            type="file"
            accept=".lrc,.txt"
            onChange={handleImportLRC}
            className="hidden"
          />

          <button
            onClick={() => importFileRef.current?.click()}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-stage-card hover:bg-stage-surface border border-stage-border text-white transition-all"
            title="Importar arquivo .LRC ou .TXT externo"
          >
            <Upload size={13} className="text-emerald-400" />
            <span>Importar LRC</span>
          </button>

          <button
            onClick={handleExportLRC}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-stage-card hover:bg-stage-surface border border-stage-border text-white transition-all"
            title="Exportar arquivo .LRC sincronizado"
          >
            <Download size={13} className="text-stage-amber" />
            <span>Exportar LRC</span>
          </button>

          <button
            onClick={handleExportTTML}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-stage-card hover:bg-stage-surface border border-stage-border text-white transition-all"
            title="Exportar no padrão broadcast TTML"
          >
            <Download size={13} className="text-cyan-400" />
            <span>Exportar TTML</span>
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div className="flex-1 flex flex-col overflow-hidden pt-3 gap-3">
          {/* Quick "Tap to Sync" bar */}
          <div className="bg-stage-panel border border-stage-border rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={isPlaying ? onPause : onPlay}
                className={`p-2 rounded-lg font-bold flex items-center gap-1.5 text-xs ${
                  isPlaying
                    ? 'bg-stage-amber text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                <span>{isPlaying ? 'Pausar Áudio' : 'Ouvir e Sincronizar'}</span>
              </button>

              <div className="font-mono text-xs text-stage-muted">
                Tempo do áudio: <span className="text-stage-amber font-bold">{currentTime.toFixed(2)}s</span>
              </div>
            </div>

            <button
              onClick={handleStampCurrentTime}
              disabled={lines.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 px-4 py-2 rounded-lg font-extrabold text-xs tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              title="Gravar o tempo do áudio atual na linha selecionada e avançar para a próxima"
            >
              <Clock size={16} />
              <span>MARCAR TEMPO NESSA LINHA (TAP TO SYNC)</span>
            </button>
          </div>

          {/* Empty State when no lines exist */}
          {lines.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-stage-panel/40 border border-dashed border-stage-border rounded-xl text-center">
              <Music2 size={40} className="text-stage-amber mb-3 opacity-80" />
              <h3 className="text-base font-bold text-white mb-1">
                Nenhuma letra ou cifra cadastrada ainda
              </h3>
              <p className="text-xs text-stage-muted max-w-md mb-6 leading-relaxed">
                Você pode adicionar linhas manualmente com cifras e tempos, colar a letra inteira de uma vez, ou importar um arquivo LRC pronto.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAddLine()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stage-amber hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  <Plus size={14} />
                  <span>+ Adicionar Primeira Linha</span>
                </button>
                <button
                  onClick={() => setMode('raw')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stage-card hover:bg-stage-surface border border-stage-border text-white font-bold text-xs"
                >
                  <FileText size={14} className="text-cyan-400" />
                  <span>Colar Texto Completo</span>
                </button>
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stage-card hover:bg-stage-surface border border-stage-border text-white font-bold text-xs"
                >
                  <Upload size={14} className="text-emerald-400" />
                  <span>Importar Arquivo .LRC</span>
                </button>
              </div>
            </div>
          ) : (
            /* Lines List */
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto space-y-2 pr-2"
            >
              {lines.map((line, idx) => {
                const isCurrent = idx === activeIndex;
                const isSelected = idx === selectedLineIdx;

                return (
                  <div
                    key={line.id || `line_${idx}`}
                    id={`editor-line-${idx}`}
                    onClick={() => setSelectedLineIdx(idx)}
                    className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                      isCurrent
                        ? 'bg-stage-panel border-stage-amber shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : isSelected
                        ? 'bg-stage-card border-stage-borderLight'
                        : 'bg-stage-panel/60 border-stage-border hover:border-stage-borderLight'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Timestamp & Nudge */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSeek(line.time); }}
                          className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stage-bg border border-stage-border hover:border-stage-amber text-stage-amber flex items-center gap-1"
                          title="Tocar áudio a partir deste tempo"
                        >
                          <Play size={10} fill="currentColor" />
                          <span>{formatTimeLrc(line.time)}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleNudgeTime(idx, -0.1); }}
                            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-stage-card border border-stage-border text-stage-muted hover:text-white"
                            title="Voltar 0.1s"
                          >
                            -0.1s
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleNudgeTime(idx, 0.1); }}
                            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-stage-card border border-stage-border text-stage-muted hover:text-white"
                            title="Avançar 0.1s"
                          >
                            +0.1s
                          </button>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.2 rounded font-mono">
                            SELECIONADA PARA SYNC
                          </span>
                        )}

                        {isCurrent && (
                          <span className="text-[10px] font-black uppercase text-stage-amber tracking-wider font-mono">
                            ▶ TOCANDO AGORA
                          </span>
                        )}
                      </div>

                      {/* Line Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddLine(idx); }}
                          className="p-1 rounded text-stage-muted hover:text-emerald-400 hover:bg-stage-card"
                          title="Adicionar nova linha abaixo"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveLine(idx); }}
                          className="p-1 rounded text-stage-muted hover:text-red-400 hover:bg-stage-card"
                          title="Remover esta linha"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Chord Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-stage-chord w-12 font-mono">CIFRA:</span>
                      <input
                        type="text"
                        value={line.chords}
                        onChange={(e) => handleUpdateLine(idx, { chords: e.target.value })}
                        placeholder="Ex: G   D/F#   Em7   C9"
                        className="flex-1 bg-stage-bg border border-stage-border focus:border-stage-chord rounded px-2.5 py-1 text-sm font-mono font-bold text-stage-chord placeholder-amber-900/40 outline-none"
                      />
                    </div>

                    {/* Lyric Text Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-stage-muted w-12 font-mono">LETRA:</span>
                      <input
                        type="text"
                        value={line.text}
                        onChange={(e) => handleUpdateLine(idx, { text: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddLine(idx);
                          }
                        }}
                        placeholder="Letra correspondente ao tempo... (Pressione Enter para nova linha)"
                        className="flex-1 bg-stage-bg border border-stage-border focus:border-stage-borderLight rounded px-2.5 py-1 text-sm font-medium text-white placeholder-zinc-700 outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Raw Text / LRC mode */
        <div className="flex-1 flex flex-col pt-3 gap-3">
          <p className="text-xs text-stage-muted">
            Cole ou edite diretamente as tags de tempo e acordes no formato padrão LRC (ex: <code className="text-stage-amber">[00:15.50] G D/F# | Letra da música</code>).
          </p>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="flex-1 bg-stage-panel border border-stage-border focus:border-stage-amber rounded-xl p-4 font-mono text-sm text-stage-text outline-none resize-none leading-relaxed"
            placeholder="[00:04.00] C   Am7 | [Contagem na guia: 1, 2, 3, 4]&#10;[00:08.50] C   Am7 | Todos os dias quando acordo..."
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleApplyRawText}
              className="px-4 py-2 rounded-lg bg-stage-amber hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Aplicar e Voltar ao Modo Visual
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
