import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Clock, Plus, Trash2, Download, Upload, Edit3, Code, Sparkles, FileText, Music2 } from 'lucide-react';
import { Song, LyricLine } from '../../shared/types';
import { parseLyricsChordsLrc, serializeLyricsToLrc, exportToTTML, formatTimeLrc } from '../utils/lyricsParser';

interface LyricsChordsEditorProps {
  currentSong: Song | null;
  currentTime: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSaveLyrics: (lrcString: string, parsedLines: LyricLine[]) => void;
}

export const LyricsChordsEditor: React.FC<LyricsChordsEditorProps> = ({
  currentSong,
  currentTime,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onSaveLyrics
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

  if (!currentSong) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-stage-muted p-8">
        <Edit3 size={48} className="text-stage-borderLight mb-3" />
        <p className="text-base font-semibold text-stage-text">Nenhuma música selecionada</p>
        <p className="text-xs mt-1">Selecione uma faixa no repertório para abrir o editor.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-stage-bg overflow-hidden select-none">
      {/* Top Header / Action Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-stage-border gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-stage-text">
            Cifras & Letras <span className="text-stage-muted font-normal">— {currentSong.title}</span>
          </h2>

          <div className="flex items-center bg-stage-panel rounded-full p-0.5 border border-stage-border">
            <button
              onClick={() => setMode('visual')}
              aria-pressed={mode === 'visual'}
              className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium rounded-full transition-colors ${
                mode === 'visual'
                  ? 'bg-white text-stage-text shadow-sm'
                  : 'text-stage-muted hover:text-stage-text'
              }`}
            >
              <Sparkles size={13} className={mode === 'visual' ? 'text-stage-accent' : 'text-stage-faint'} />
              <span>Modo Visual (Tap to Sync)</span>
            </button>
            <button
              onClick={() => setMode('raw')}
              aria-pressed={mode === 'raw'}
              className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium rounded-full transition-colors ${
                mode === 'raw'
                  ? 'bg-white text-stage-text shadow-sm'
                  : 'text-stage-muted hover:text-stage-text'
              }`}
            >
              <Code size={13} className={mode === 'raw' ? 'text-stage-cyan' : 'text-stage-faint'} />
              <span>Texto Puro (LRC)</span>
            </button>
          </div>
        </div>

        {/* Action Buttons: Add Line, Import/Export LRC */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddLine()}
            className="flex items-center gap-1 text-[13px] font-medium px-2.5 py-1.5 rounded-full bg-white hover:bg-stage-accentTint border border-stage-border hover:border-stage-accent text-stage-text transition-colors"
            title="Adicionar nova linha no final"
          >
            <Plus size={13} />
            <span>+ Nova Linha</span>
          </button>

          <input
            ref={importFileRef}
            type="file"
            accept=".lrc,.txt"
            onChange={handleImportLRC}
            className="hidden"
          />

          <button
            onClick={() => importFileRef.current?.click()}
            className="flex items-center gap-1 text-[13px] font-medium px-2.5 py-1.5 rounded-full bg-white hover:bg-stage-panel border border-stage-border text-stage-text transition-colors"
            title="Importar arquivo .LRC ou .TXT externo"
          >
            <Upload size={13} className="text-stage-muted" />
            <span>Importar LRC</span>
          </button>

          <button
            onClick={handleExportLRC}
            className="flex items-center gap-1 text-[13px] font-medium px-2.5 py-1.5 rounded-full bg-white hover:bg-stage-panel border border-stage-border text-stage-text transition-colors"
            title="Exportar arquivo .LRC sincronizado"
          >
            <Download size={13} className="text-stage-muted" />
            <span>Exportar LRC</span>
          </button>

          <button
            onClick={handleExportTTML}
            className="flex items-center gap-1 text-[13px] font-medium px-2.5 py-1.5 rounded-full bg-white hover:bg-stage-panel border border-stage-border text-stage-text transition-colors"
            title="Exportar no padrão broadcast TTML"
          >
            <Download size={13} className="text-stage-muted" />
            <span>Exportar TTML</span>
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div className="flex-1 flex flex-col overflow-hidden pt-3 gap-3">
          {/* Quick "Tap to Sync" bar */}
          <div className="bg-white border border-stage-border rounded-stage p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={isPlaying ? onPause : onPlay}
                className={`p-2 rounded-full font-semibold flex items-center gap-1.5 text-[13px] transition-colors ${
                  isPlaying
                    ? 'bg-stage-panel border border-stage-border text-stage-text hover:bg-stage-surface'
                    : 'bg-stage-accent hover:bg-stage-accentHover text-white'
                }`}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                <span>{isPlaying ? 'Pausar Áudio' : 'Ouvir e Sincronizar'}</span>
              </button>

              <div className="text-[13px] text-stage-muted tabular-nums">
                Tempo do áudio: <span className="text-stage-accent font-semibold">{currentTime.toFixed(2)}s</span>
              </div>
            </div>

            <button
              onClick={handleStampCurrentTime}
              disabled={lines.length === 0}
              className="flex items-center gap-2 bg-stage-accent hover:bg-stage-accentHover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full font-semibold text-[13px] transition-colors"
              title="Gravar o tempo do áudio atual na linha selecionada e avançar para a próxima"
            >
              <Clock size={16} />
              <span>Marcar Tempo Nessa Linha (Tap to Sync)</span>
            </button>
          </div>

          {/* Empty State when no lines exist */}
          {lines.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-stage-panel/40 border border-dashed border-stage-border rounded-stage text-center">
              <Music2 size={40} className="text-stage-accent mb-3" />
              <h3 className="text-base font-semibold text-stage-text mb-1">
                Nenhuma letra ou cifra cadastrada ainda
              </h3>
              <p className="text-[13px] text-stage-muted max-w-md mb-6 leading-relaxed">
                Você pode adicionar linhas manualmente com cifras e tempos, colar a letra inteira de uma vez, ou importar um arquivo LRC pronto.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAddLine()}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white font-semibold text-[13px] transition-colors"
                >
                  <Plus size={14} />
                  <span>+ Adicionar Primeira Linha</span>
                </button>
                <button
                  onClick={() => setMode('raw')}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-stage-panel border border-stage-border text-stage-text font-medium text-[13px] transition-colors"
                >
                  <FileText size={14} className="text-stage-cyan" />
                  <span>Colar Texto Completo</span>
                </button>
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-stage-panel border border-stage-border text-stage-text font-medium text-[13px] transition-colors"
                >
                  <Upload size={14} className="text-stage-muted" />
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
                    className={`p-3 rounded-2xl border transition-colors flex flex-col gap-1.5 cursor-pointer ${
                      isCurrent
                        ? 'bg-stage-accentTint border-stage-accent'
                        : isSelected
                        ? 'bg-stage-panel border-stage-borderLight'
                        : 'bg-white border-stage-border hover:border-stage-borderLight'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Timestamp & Nudge */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSeek(line.time); }}
                          className="tabular-nums text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-stage-border hover:border-stage-accent text-stage-accent flex items-center gap-1"
                          title="Tocar áudio a partir deste tempo"
                        >
                          <Play size={10} fill="currentColor" />
                          <span>{formatTimeLrc(line.time)}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleNudgeTime(idx, -0.1); }}
                            className="px-1.5 py-0.5 text-[11px] tabular-nums rounded-full bg-white border border-stage-border text-stage-muted hover:text-stage-text"
                            title="Voltar 0.1s"
                          >
                            -0.1s
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleNudgeTime(idx, 0.1); }}
                            className="px-1.5 py-0.5 text-[11px] tabular-nums rounded-full bg-white border border-stage-border text-stage-muted hover:text-stage-text"
                            title="Avançar 0.1s"
                          >
                            +0.1s
                          </button>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-semibold text-stage-accent bg-stage-accentTint border border-blue-200 px-2 py-0.2 rounded-full">
                            Selecionada para sync
                          </span>
                        )}

                        {isCurrent && (
                          <span className="text-[10px] font-semibold uppercase text-stage-accent">
                            ▶ Tocando agora
                          </span>
                        )}
                      </div>

                      {/* Line Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddLine(idx); }}
                          aria-label="Adicionar nova linha abaixo"
                          className="p-1 rounded-full text-stage-muted hover:text-stage-green hover:bg-green-50"
                          title="Adicionar nova linha abaixo"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveLine(idx); }}
                          aria-label="Remover esta linha"
                          className="p-1 rounded-full text-stage-muted hover:text-stage-red hover:bg-red-50"
                          title="Remover esta linha"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Chord Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-stage-muted w-12">Cifra:</span>
                      <input
                        type="text"
                        value={line.chords}
                        onChange={(e) => handleUpdateLine(idx, { chords: e.target.value })}
                        placeholder="Ex: G   D/F#   Em7   C9"
                        className="flex-1 bg-white border border-stage-border focus:border-stage-chord rounded-xl px-2.5 py-1 text-sm font-mono font-semibold text-stage-chord placeholder-amber-700/30 outline-none"
                      />
                    </div>

                    {/* Lyric Text Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-stage-muted w-12">Letra:</span>
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
                        className="flex-1 bg-white border border-stage-border focus:border-stage-accent rounded-xl px-2.5 py-1 text-sm text-stage-text placeholder-stage-faint outline-none"
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
          <p className="text-[13px] text-stage-muted">
            Cole ou edite diretamente as tags de tempo e acordes no formato padrão LRC (ex: <code className="text-stage-chord">[00:15.50] G D/F# | Letra da música</code>).
          </p>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="flex-1 bg-white border border-stage-border focus:border-stage-accent rounded-stage p-4 font-mono text-sm text-stage-text outline-none resize-none leading-relaxed"
            placeholder="[00:04.00] C   Am7 | [Contagem na guia: 1, 2, 3, 4]&#10;[00:08.50] C   Am7 | Todos os dias quando acordo..."
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleApplyRawText}
              className="px-4 py-2 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white font-semibold text-[13px] transition-colors"
            >
              Aplicar e Voltar ao Modo Visual
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
