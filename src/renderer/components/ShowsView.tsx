import React, { useState } from 'react';
import { Calendar, Plus, MapPin, CheckCircle, Clock, FileText } from 'lucide-react';
import { Show, Setlist } from '../../shared/types';

interface ShowsViewProps {
  shows: Show[];
  setShows: React.Dispatch<React.SetStateAction<Show[]>>;
  setlists: Setlist[];
}

export const ShowsView: React.FC<ShowsViewProps> = ({
  shows,
  setShows,
  setlists
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'show' | 'rehearsal'>('show');
  const [location, setLocation] = useState('');
  const [selectedSetlistId, setSelectedSetlistId] = useState(setlists[0]?.id || '');
  const [notes, setNotes] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newShow: Show = {
      id: `show_${Date.now()}`,
      title: title.trim(),
      date: date || new Date().toISOString().split('T')[0],
      type,
      location: location.trim(),
      setlistId: selectedSetlistId,
      notes: notes.trim(),
      completed: false
    };

    setShows((prev) => [newShow, ...prev]);
    setShowModal(false);
    setTitle('');
    setLocation('');
    setNotes('');
  };

  const handleToggleComplete = (id: string) => {
    setShows((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  return (
    <div className="flex-1 flex flex-col p-4 bg-stage-bg overflow-hidden select-none">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-stage-border">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-stage-accent" />
          <h2 className="text-[15px] font-semibold text-stage-text">
            Agenda <span className="text-stage-muted font-normal">— Shows & Ensaios</span>
          </h2>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white font-semibold text-[13px] transition-colors"
        >
          <Plus size={14} />
          <span>Novo Evento / Show</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-1">
        {shows.map((show) => {
          const linkedSetlist = setlists.find((sl) => sl.id === show.setlistId);
          const isShow = show.type === 'show';

          return (
            <div
              key={show.id}
              className={`p-4 rounded-stage border flex flex-col justify-between transition-colors ${
                show.completed
                  ? 'bg-stage-panel border-stage-border opacity-60'
                  : 'bg-white border-stage-border hover:border-stage-borderLight shadow-sm'
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                    isShow
                      ? 'bg-stage-accentTint text-stage-accent border border-blue-200'
                      : 'bg-cyan-50 text-stage-cyan border border-cyan-200'
                  }`}>
                    {isShow ? 'Apresentação / Show' : 'Ensaio Geral'}
                  </span>
                  <button
                    onClick={() => handleToggleComplete(show.id)}
                    className="flex items-center gap-1 text-[11px] text-stage-muted hover:text-stage-text transition-colors"
                  >
                    <CheckCircle
                      size={15}
                      className={show.completed ? 'text-stage-green' : 'text-stage-borderLight'}
                    />
                    <span>{show.completed ? 'Concluído' : 'Pendente'}</span>
                  </button>
                </div>

                <h3 className="text-base font-semibold text-stage-text mt-1">{show.title}</h3>

                <div className="text-xs text-stage-muted flex items-center gap-1.5 tabular-nums">
                  <Clock size={13} className="text-stage-accent" />
                  <span>{show.date}</span>
                </div>

                {show.location && (
                  <div className="text-xs text-stage-muted flex items-center gap-1.5">
                    <MapPin size={13} className="text-stage-cyan" />
                    <span>{show.location}</span>
                  </div>
                )}

                {linkedSetlist && (
                  <div className="text-xs text-stage-muted flex items-center gap-1.5 bg-stage-panel p-2 rounded-xl border border-stage-border mt-1">
                    <FileText size={13} className="text-stage-accent" />
                    <span>Setlist: <strong className="text-stage-text">{linkedSetlist.title}</strong></span>
                  </div>
                )}

                {show.notes && (
                  <p className="text-xs text-stage-muted bg-stage-panel/60 p-2 rounded-xl border border-stage-border mt-1">
                    "{show.notes}"
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreate}
            className="bg-white border border-stage-border rounded-stage p-6 w-full max-w-md shadow-2xl flex flex-col gap-4"
          >
            <h3 className="text-[15px] font-semibold text-stage-text">
              Adicionar Show ou Ensaio
            </h3>

            <div>
              <label className="text-xs font-medium text-stage-muted block mb-1">Título do Evento</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Show no Teatro Municipal"
                className="w-full bg-white border border-stage-border focus:border-stage-accent rounded-2xl px-3 py-2 text-sm text-stage-text outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stage-muted block mb-1">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'show' | 'rehearsal')}
                  className="w-full bg-white border border-stage-border focus:border-stage-accent rounded-2xl px-3 py-2 text-sm text-stage-text outline-none"
                >
                  <option value="show">Apresentação / Show</option>
                  <option value="rehearsal">Ensaio de Banda</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-stage-muted block mb-1">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-stage-border focus:border-stage-accent rounded-2xl px-3 py-2 text-sm text-stage-text outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-stage-muted block mb-1">Local / Estúdio</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Bar do Rock, Estúdio Central"
                className="w-full bg-white border border-stage-border focus:border-stage-accent rounded-2xl px-3 py-2 text-sm text-stage-text outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-stage-muted block mb-1">Setlist Vinculado</label>
              <select
                value={selectedSetlistId}
                onChange={(e) => setSelectedSetlistId(e.target.value)}
                className="w-full bg-white border border-stage-border focus:border-stage-accent rounded-2xl px-3 py-2 text-sm text-stage-text outline-none"
              >
                {setlists.map((sl) => (
                  <option key={sl.id} value={sl.id}>{sl.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-stage-muted block mb-1">Anotações / Passagem de Som</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex: Levar cabos extras, passagem às 18h..."
                className="w-full bg-white border border-stage-border focus:border-stage-accent rounded-2xl px-3 py-2 text-sm text-stage-text outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-full bg-white hover:bg-stage-panel border border-stage-border text-[13px] font-medium text-stage-text transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white text-[13px] font-semibold transition-colors"
              >
                Salvar Evento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
