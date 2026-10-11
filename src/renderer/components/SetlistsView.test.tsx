import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetlistsView } from './SetlistsView';
import { Song } from '../../shared/types';

const makeSong = (overrides: Partial<Song> = {}): Song => ({
  id: 's1',
  title: 'Música Um',
  artist: 'Artista Um',
  bpm: 120,
  timeSignature: '4/4',
  duration: 200,
  stems: [],
  lyricsChordsLrc: '',
  createdAt: 1,
  updatedAt: 1,
  ...overrides
});

const songs: Song[] = [
  makeSong(),
  makeSong({ id: 's2', title: 'Música Dois', artist: 'Artista Dois', bpm: 90, duration: 95 })
];

const makeProps = () => ({
  songs,
  setSongs: vi.fn(),
  currentSongId: 's1',
  onSelectSong: vi.fn(),
  onUpdateSong: vi.fn(),
  setlists: [],
  setSetlists: vi.fn(),
  activeSetlist: null
});

describe('SetlistsView — edição de músicas existentes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('o botão de lápis abre o modal em modo edição com os campos pré-preenchidos', async () => {
    const user = userEvent.setup();
    render(<SetlistsView {...makeProps()} />);

    await user.click(screen.getByLabelText('Editar música Música Um'));

    expect(screen.getByRole('heading', { name: 'Editar Música' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Tempo Perdido')).toHaveValue('Música Um');
    expect(screen.getByPlaceholderText('Ex: Legião Urbana')).toHaveValue('Artista Um');
    expect(screen.getByPlaceholderText('Ex: 120')).toHaveValue(120);
    expect(screen.getByPlaceholderText('Ex: 03:30')).toHaveValue('03:20');
    expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeInTheDocument();
  });

  it('salvar chama onUpdateSong com o id e os novos dados, e fecha o modal', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<SetlistsView {...props} />);

    await user.click(screen.getByLabelText('Editar música Música Um'));
    const titleInput = screen.getByPlaceholderText('Ex: Tempo Perdido');
    await user.clear(titleInput);
    await user.type(titleInput, 'Título Novo');
    const bpmInput = screen.getByPlaceholderText('Ex: 120') as HTMLInputElement;
    // jsdom não aplica seleção em input[type=number] para user-event; o contrato
    // sob teste é o onChange do campo, então simulamos a troca de valor direta.
    fireEvent.change(bpmInput, { target: { value: '132' } });
    await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    expect(props.onUpdateSong).toHaveBeenCalledTimes(1);
    expect(props.onUpdateSong).toHaveBeenCalledWith('s1', {
      title: 'Título Novo',
      artist: 'Artista Um',
      bpm: 132,
      duration: 200
    });
    expect(props.onSelectSong).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Editar Música' })).not.toBeInTheDocument();
  });

  it('cancelar fecha o modal sem salvar nada', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<SetlistsView {...props} />);

    await user.click(screen.getByLabelText('Editar música Música Um'));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(props.onUpdateSong).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Editar Música' })).not.toBeInTheDocument();
  });

  it('o cadastro continua funcionando: modal em modo criação e setSongs chamado', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<SetlistsView {...props} />);

    await user.click(screen.getByRole('button', { name: 'Cadastrar Música' }));
    expect(screen.getByRole('heading', { name: 'Cadastrar Nova Música' })).toBeInTheDocument();

    const form = document.querySelector('form')!;
    await user.type(within(form as HTMLElement).getByPlaceholderText('Ex: Tempo Perdido'), 'Música Três');
    await user.click(within(form as HTMLElement).getByRole('button', { name: 'Cadastrar Música' }));

    expect(props.setSongs).toHaveBeenCalledTimes(1);
    const updater = props.setSongs.mock.calls[0][0] as (prev: Song[]) => Song[];
    const created = updater([]);
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe('Música Três');
    expect(created[0].id).toMatch(/^song_/);
    expect(props.onSelectSong).toHaveBeenCalledWith(created[0].id);
  });
});
