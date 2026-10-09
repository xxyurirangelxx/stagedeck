import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Music, ListMusic, Clock, Play } from 'lucide-react';
import { Song, Setlist, SetlistItem } from '../../shared/types';
import { parseLyricsChordsLrc } from '../utils/lyricsParser';

interface SetlistsViewProps {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  currentSongId: string;
  onSelectSong: (songId: string) => void;
  setlists: Setlist[];
  setSetlists: React.Dispatch<React.SetStateAction<Setlist[]>>;
  activeSetlist: Setlist | null;
}

export const SetlistsView: React.FC<SetlistsViewProps> = ({
  songs,
  setSongs,
  currentSongId,
  onSelectSong,
  setlists,
  setSetlists,
  activeSetlist
}) => {
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newKey, setNewKey] = useState('C');
  const [newBpm, setNewBpm] = useState(120);

  const handleCreateSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newSong: Song = {
      id: `song_${Date.now()}`,
      title: newTitle.trim(),
      artist: newArtist.trim() || 'Artista',
      originalKey: newKey,
      currentKey: newKey,
      bpm: newBpm,
      timeSignature: '4/4',
      duration: 180,
      stems: [
        { id: `stem_${Date.now()}_1`, name: 'Bateria', type: 'backing', volume: 0.8, panRouting: 'L', muted: false, solo: false },
        { id: `stem_${Date.now()}_2`, name: 'Baixo', type: 'backing', volume: 0.8, panRouting: 'L', muted: false, solo: false },
        { id: `stem_${Date.now()}_3`, name: 'Guitarras', type: 'backing', volume: 0.8, panRouting: 'L', muted: false, solo: false },
        { id: `stem_${Date.now()}_4`, name: 'Teclados', type: 'backing', volume: 0.75, panRouting: 'L', muted: false, solo: false },
        { id: `stem_${Date.now()}_5`, name: 'Metais / FX', type: 'backing', volume: 0.7, panRouting: 'L', muted: false, solo: false },
        { id: `stem_${Date.now()}_6`, name: 'Backing Vocals', type: 'backing', volume: 0.8, panRouting: 'L', muted: false, solo: false },
        { id: `stem_${Date.now()}_7`, name: 'In-Ear: Click Metrônomo', type: 'in_ear', volume: 0.9, panRouting: 'R', muted: false, solo: false },
        { id: `stem_${Date.now()}_8`, name: 'In-Ear: Guia de Voz', type: 'in_ear', volume: 0.9, panRouting: 'R', muted: false, solo: false },
      ],
      lyricsChordsLrc: `[00:04.00] ${newKey} | [Introdução da música]
[00:10.00] ${newKey} | Primeira estrofe...`,
      parsedLyrics: parseLyricsChordsLrc(`[00:04.00] ${newKey} | [Introdução da música]\n[00:10.00] ${newKey} | Primeira estrofe...`),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setSongs((prev) => [...prev, newSong]);
    onSelectSong(newSong.id);
    setShowNewSongModal(false);
    setNewTitle('');
    setNewArtist('');
  };

  const handleAddSongToSetlist = (songId: string) => {
    if (!activeSetlist) return;
    const newItem: SetlistItem = {
      id: `item_${Date.now()}`,
      songId,
      order: activeSetlist.items.length
    };
    const updated = {
      ...activeSetlist,
      items: [...activeSetlist.items, newItem],
      updatedAt: Date.now()
    };
    setSetlists((prev) => prev.map((sl) => (sl.id === activeSetlist.id ? updated : sl)));
  };

  const handleRemoveFromSetlist = (itemId: string) => {
    if (!activeSetlist) return;
    const updated = {
      ...activeSetlist,
      items: activeSetlist.items.filter((it) => it.id !== itemId),
      updatedAt: Date.now()
    };
    setSetlists((prev) => prev.map((sl) => (sl.id === activeSetlist.id ? updated : sl)));
  };

  const handleMoveSetlistItem = (index: number, direction: 'up' | 'down') => {
    if (!activeSetlist) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeSetlist.items.length) return;

    const newItems = [...activeSetlist.items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    const updated = { ...activeSetlist, items: newItems, updatedAt: Date.now() };
    setSetlists((prev) => prev.map((sl) => (sl.id === activeSetlist.id ? updated : sl)));
  };

  // Calculate total setlist duration
  const totalSetlistDuration = (activeSetlist?.items || []).reduce((acc, item) => {
    const s = songs.find((song) => song.id === item.songId);
    return acc + (s?.duration || 0);
  }, 0);

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m} min ${s > 0 ? `${s}s` : ''}`;
  };

  return (
    <div className="flex-1 flex p-4 gap-4 bg-stage-bg overflow-hidden select-none">
      {/* Left Column: Repertoire Catalog */}
      <div className="flex-1 bg-stage-panel border border-stage-border rounded-xl p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stage-border">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-stage-amber" />
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Catálogo de Músicas da Banda ({songs.length})
            </h3>
          </div>
          <button
            onClick={() => setShowNewSongModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stage-amber hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-sm"
          >
            <Plus size={14} />
            <span>Cadastrar Música</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {songs.map((song) => {
            const isSelected = song.id === currentSongId;
            return (
              <div
                key={song.id}
                onClick={() => onSelectSong(song.id)}
                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-stage-card border-stage-amber text-white shadow-sm'
                    : 'bg-stage-bg border-stage-border text-stage-muted hover:text-white hover:border-stage-borderLight'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-white">{song.title}</div>
                  <div className="text-xs text-stage-muted">{song.artist}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-stage-panel px-2 py-0.5 rounded border border-stage-border text-xs font-mono">
                    <span className="text-stage-muted font-bold">TOM:</span>
                    <span className="text-stage-chord font-bold">{song.currentKey}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-stage-panel px-2 py-0.5 rounded border border-stage-border text-xs font-mono">
                    <span className="text-stage-muted font-bold">BPM:</span>
                    <span className="text-stage-amber font-bold">{song.bpm}</span>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {song.stems.length} stems
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddSongToSetlist(song.id); }}
                    className="p-1 rounded bg-stage-panel hover:bg-stage-surface border border-stage-border text-stage-amber text-xs font-bold px-2 py-1"
                    title="Adicionar ao Setlist Ativo"
                  >
                    + Setlist
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Excluir a música "${song.title}" do repertório?`)) {
                        setSongs((prev) => prev.filter((s) => s.id !== song.id));
                      }
                    }}
                    className="p-1.5 rounded text-stage-muted hover:text-red-400 hover:bg-stage-panel"
                    title="Excluir música do repertório"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Setlist Builder */}
      <div className="w-[480px] bg-stage-panel border border-stage-border rounded-xl p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stage-border">
          <div>
            <div className="flex items-center gap-2">
              <ListMusic size={18} className="text-stage-amber" />
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                {activeSetlist?.title || 'Setlist Ativo'}
              </h3>
            </div>
            <div className="text-xs text-stage-muted flex items-center gap-2 mt-1">
              <Clock size={12} />
              <span>Duração estimada total: <strong className="text-stage-amber">{formatMinSec(totalSetlistDuration)}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {(!activeSetlist || activeSetlist.items.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full text-stage-muted">
              <p className="text-sm">Setlist vazio.</p>
              <p className="text-xs mt-1">Clique em "+ Setlist" nas músicas à esquerda para montar a ordem do show.</p>
            </div>
          ) : (
            activeSetlist.items.map((item, idx) => {
              const song = songs.find((s) => s.id === item.songId);
              if (!song) return null;
              const isPlaying = song.id === currentSongId;

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${
                    isPlaying
                      ? 'bg-stage-card border-stage-amber'
                      : 'bg-stage-bg border-stage-border'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="font-mono text-sm font-black text-stage-amber w-6 text-center">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-xs text-white truncate">{song.title}</div>
                      <div className="text-[10px] text-stage-muted truncate">
                        Tom: <span className="text-stage-chord">{song.currentKey}</span> | BPM: {song.bpm}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectSong(song.id)}
                      className="p-1 rounded text-emerald-400 hover:bg-stage-panel"
                      title="Carregar agora no console"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveSetlistItem(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-stage-muted hover:text-white disabled:opacity-20"
                      title="Subir posição"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveSetlistItem(idx, 'down')}
                      disabled={idx === activeSetlist.items.length - 1}
                      className="p-1 rounded text-stage-muted hover:text-white disabled:opacity-20"
                      title="Descer posição"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveFromSetlist(item.id)}
                      className="p-1 rounded text-stage-muted hover:text-red-400"
                      title="Remover do setlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Song Modal */}
      {showNewSongModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateSong}
            className="bg-stage-panel border border-stage-border rounded-xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4"
          >
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Cadastrar Nova Música
            </h3>

            <div>
              <label className="text-xs font-bold text-stage-muted block mb-1">Título da Música</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Tempo Perdido"
                className="w-full bg-stage-bg border border-stage-border focus:border-stage-amber rounded-lg px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stage-muted block mb-1">Artista / Banda</label>
              <input
                type="text"
                value={newArtist}
                onChange={(e) => setNewArtist(e.target.value)}
                placeholder="Ex: Legião Urbana"
                className="w-full bg-stage-bg border border-stage-border focus:border-stage-amber rounded-lg px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stage-muted block mb-1">Tom Original</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  placeholder="Ex: C, G, Am"
                  className="w-full bg-stage-bg border border-stage-border focus:border-stage-amber rounded-lg px-3 py-2 text-sm font-mono font-bold text-stage-chord outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stage-muted block mb-1">BPM (Andamento)</label>
                <input
                  type="number"
                  value={newBpm}
                  onChange={(e) => setNewBpm(parseInt(e.target.value) || 120)}
                  placeholder="Ex: 120"
                  className="w-full bg-stage-bg border border-stage-border focus:border-stage-amber rounded-lg px-3 py-2 text-sm font-mono font-bold text-stage-amber outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewSongModal(false)}
                className="px-4 py-2 rounded-lg bg-stage-card hover:bg-stage-surface border border-stage-border text-xs font-bold text-stage-muted hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-stage-amber hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                Criar Música e Stems
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
