import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Music, ListMusic, Clock, Play, Pencil } from 'lucide-react';
import { Song, Setlist, SetlistItem } from '../../shared/types';
import { parseLyricsChordsLrc } from '../utils/lyricsParser';
import { formatDurationInput, parseDurationInput } from '../utils/time';
import { ConfirmDialog } from './ConfirmDialog';

interface SetlistsViewProps {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  currentSongId: string;
  onSelectSong: (songId: string) => void;
  onUpdateSong: (songId: string, updates: Partial<Song>) => void;
  setlists: Setlist[];
  setSetlists: React.Dispatch<React.SetStateAction<Setlist[]>>;
  activeSetlist: Setlist | null;
}

export const SetlistsView: React.FC<SetlistsViewProps> = ({
  songs,
  setSongs,
  currentSongId,
  onSelectSong,
  onUpdateSong,
  setlists,
  setSetlists,
  activeSetlist
}) => {
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newBpm, setNewBpm] = useState(120);
  const [newDurationStr, setNewDurationStr] = useState('03:00');
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);

  const handleOpenNewSong = () => {
    setEditingSong(null);
    setNewTitle('');
    setNewArtist('');
    setNewBpm(120);
    setNewDurationStr('03:00');
    setShowNewSongModal(true);
  };

  const handleOpenEditSong = (song: Song) => {
    setEditingSong(song);
    setNewTitle(song.title);
    setNewArtist(song.artist);
    setNewBpm(song.bpm);
    setNewDurationStr(formatDurationInput(song.duration || 180));
    setShowNewSongModal(false);
  };

  const handleCloseSongModal = () => {
    setShowNewSongModal(false);
    setEditingSong(null);
  };

  const handleSaveSongForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const parsedDur = parseDurationInput(newDurationStr);

    if (editingSong) {
      onUpdateSong(editingSong.id, {
        title: newTitle.trim(),
        artist: newArtist.trim() || 'Artista',
        bpm: newBpm,
        duration: parsedDur
      });
      handleCloseSongModal();
      return;
    }

    const newSong: Song = {
      id: `song_${Date.now()}`,
      title: newTitle.trim(),
      artist: newArtist.trim() || 'Artista',
      bpm: newBpm,
      timeSignature: '4/4',
      duration: parsedDur,
      stems: [],
      lyricsChordsLrc: `[00:04.00] | [Introdução da música]
[00:10.00] | Primeira estrofe...`,
      parsedLyrics: parseLyricsChordsLrc(`[00:04.00] | [Introdução da música]\n[00:10.00] | Primeira estrofe...`),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setSongs((prev) => [...prev, newSong]);
    onSelectSong(newSong.id);
    handleCloseSongModal();
    setNewTitle('');
    setNewArtist('');
    setNewDurationStr('03:00');
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

  const handleConfirmDeleteSong = () => {
    if (!songToDelete) return;
    setSongs((prev) => prev.filter((s) => s.id !== songToDelete.id));
    setSongToDelete(null);
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
      <div className="flex-1 bg-stage-panel border border-stage-border rounded-stage p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stage-border">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-stage-accent" />
            <h3 className="text-[15px] font-semibold text-stage-text">
              Catálogo de Músicas <span className="text-stage-muted font-normal tabular-nums">({songs.length})</span>
            </h3>
          </div>
          <button
            onClick={handleOpenNewSong}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white font-semibold text-[13px] transition-colors"
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
                className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-stage-accent text-white border-stage-accent'
                    : 'bg-white border-stage-border text-stage-text hover:border-stage-borderLight'
                }`}
              >
                <div>
                  <div className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-stage-text'}`}>{song.title}</div>
                  <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-stage-muted'}`}>{song.artist}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs tabular-nums ${
                    isSelected
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'bg-stage-panel border-stage-border'
                  }`}>
                    <span className={isSelected ? 'text-white/70' : 'text-stage-muted'}>BPM:</span>
                    <span className={`font-semibold ${isSelected ? 'text-white' : 'text-stage-accent'}`}>{song.bpm}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs tabular-nums ${isSelected ? 'text-white/80' : 'text-stage-muted'}`}>
                    <span>{song.stems.length} stems</span>
                    <span className="opacity-50">•</span>
                    <span className={`font-semibold ${isSelected ? 'text-white' : 'text-stage-text'}`}>
                      {Math.floor((song.duration || 180) / 60)}:{String(Math.floor((song.duration || 180) % 60)).padStart(2, '0')}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenEditSong(song); }}
                    aria-label={`Editar música ${song.title}`}
                    className={`p-1.5 rounded-full transition-colors ${
                      isSelected
                        ? 'text-white/70 hover:text-white hover:bg-white/20'
                        : 'text-stage-muted hover:text-stage-accent hover:bg-stage-accentTint'
                    }`}
                    title="Editar dados da música"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddSongToSetlist(song.id); }}
                    className={`p-1 rounded-full border text-xs font-medium px-2 py-1 transition-colors ${
                      isSelected
                        ? 'border-white/40 bg-white/10 text-white hover:bg-white/20'
                        : 'bg-white hover:bg-stage-accentTint border-stage-border hover:border-stage-accent text-stage-accent'
                    }`}
                    title="Adicionar ao Setlist Ativo"
                  >
                    + Setlist
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSongToDelete(song);
                    }}
                    aria-label={`Excluir música ${song.title}`}
                    className={`p-1.5 rounded-full transition-colors ${
                      isSelected
                        ? 'text-white/70 hover:text-white hover:bg-white/20'
                        : 'text-stage-muted hover:text-stage-red hover:bg-red-50'
                    }`}
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
      <div className="w-[480px] bg-stage-panel border border-stage-border rounded-stage p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stage-border">
          <div>
            <div className="flex items-center gap-2">
              <ListMusic size={18} className="text-stage-accent" />
              <h3 className="text-[15px] font-semibold text-stage-text">
                {activeSetlist?.title || 'Setlist Ativo'}
              </h3>
            </div>
            <div className="text-xs text-stage-muted flex items-center gap-2 mt-1">
              <Clock size={12} />
              <span className="tabular-nums">Duração estimada total: <strong className="text-stage-accent">{formatMinSec(totalSetlistDuration)}</strong></span>
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
              const isCurrent = song.id === currentSongId;

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-2xl border flex items-center justify-between transition-colors ${
                    isCurrent
                      ? 'bg-stage-accentTint border-stage-accent'
                      : 'bg-white border-stage-border'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-sm font-semibold text-stage-accent w-6 text-center tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-xs text-stage-text truncate">{song.title}</div>
                      <div className="text-[11px] text-stage-muted truncate tabular-nums">
                        BPM: {song.bpm}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectSong(song.id)}
                      aria-label={`Carregar ${song.title} no console`}
                      className="p-1 rounded-full text-stage-green hover:bg-green-50"
                      title="Carregar agora no console"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveSetlistItem(idx, 'up')}
                      disabled={idx === 0}
                      aria-label="Subir posição"
                      className="p-1 rounded-full text-stage-muted hover:text-stage-text disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Subir posição"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveSetlistItem(idx, 'down')}
                      disabled={idx === activeSetlist.items.length - 1}
                      aria-label="Descer posição"
                      className="p-1 rounded-full text-stage-muted hover:text-stage-text disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Descer posição"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveFromSetlist(item.id)}
                      aria-label={`Remover ${song.title} do setlist`}
                      className="p-1 rounded-full text-stage-muted hover:text-stage-red hover:bg-red-50"
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

      {/* New / Edit Song Modal */}
      {(showNewSongModal || editingSong) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveSongForm}
            className="bg-white border border-stage-border rounded-stage p-6 w-full max-w-md shadow-2xl flex flex-col gap-4"
          >
            <h3 className="text-[15px] font-semibold text-stage-text">
              {editingSong ? 'Editar Música' : 'Cadastrar Nova Música'}
            </h3>

            <div>
              <label className="text-xs font-medium text-stage-muted block mb-1">Título da Música</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Tempo Perdido"
                className="w-full bg-white border border-stage-border focus:border-stage-accent rounded-2xl px-3 py-2 text-sm text-stage-text outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-stage-muted block mb-1">Artista / Banda</label>
              <input
                type="text"
                value={newArtist}
                onChange={(e) => setNewArtist(e.target.value)}
                placeholder="Ex: Legião Urbana"
                className="w-full bg-white border border-stage-border focus:border-stage-accent rounded-2xl px-3 py-2 text-sm text-stage-text outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stage-muted block mb-1">BPM (Andamento)</label>
                <input
                  type="number"
                  value={newBpm}
                  onChange={(e) => setNewBpm(parseInt(e.target.value) || 120)}
                  placeholder="Ex: 120"
                  className="w-full bg-white border border-stage-border focus:border-stage-accent rounded-2xl px-3 py-2 text-sm font-semibold text-stage-accent outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stage-muted block mb-1">Duração (mm:ss)</label>
                <input
                  type="text"
                  value={newDurationStr}
                  onChange={(e) => setNewDurationStr(e.target.value)}
                  placeholder="Ex: 03:30"
                  className="w-full bg-white border border-stage-border focus:border-stage-accent rounded-2xl px-3 py-2 text-sm text-stage-text outline-none tabular-nums"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseSongModal}
                className="px-4 py-2 rounded-full bg-white hover:bg-stage-panel border border-stage-border text-[13px] font-medium text-stage-text transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white text-[13px] font-semibold transition-colors"
              >
                {editingSong ? 'Salvar Alterações' : 'Cadastrar Música'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Song Confirmation (AlertDialog) */}
      <ConfirmDialog
        isOpen={songToDelete !== null}
        title={`Excluir "${songToDelete?.title || ''}"?`}
        message="A música será removida do repertório, dos setlists e do console. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onCancel={() => setSongToDelete(null)}
        onConfirm={handleConfirmDeleteSong}
      />
    </div>
  );
};
