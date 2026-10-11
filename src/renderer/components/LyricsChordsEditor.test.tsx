import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LyricsChordsEditor } from './LyricsChordsEditor';
import { Song, LyricLine } from '../../shared/types';
import { parseLyricsChordsLrc } from '../utils/lyricsParser';

const sampleLrc = `[00:04.00] C     Am7 | [Contagem]
[00:08.50] C            Am7 | Todos os dias quando acordo`;

const song: Song = {
  id: 'song-1',
  title: 'Tempo Perdido',
  artist: 'Banda',
  bpm: 128,
  timeSignature: '4/4',
  duration: 180,
  stems: [],
  lyricsChordsLrc: sampleLrc,
  parsedLyrics: parseLyricsChordsLrc(sampleLrc),
  createdAt: 1,
  updatedAt: 1
};

const makeProps = () => ({
  currentSong: song,
  currentTime: 0,
  isPlaying: false,
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onSeek: vi.fn(),
  onSaveLyrics: vi.fn()
});

const ttmlFile = (content: string) =>
  new File([content], 'musica.ttml', { type: 'application/xml' });

const getTtmlInput = (container: HTMLElement) =>
  container.querySelector('input[accept=".ttml,.xml"]') as HTMLInputElement;

describe('LyricsChordsEditor — importar TTML', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('exibe o botão "Importar TTML"', () => {
    render(<LyricsChordsEditor {...makeProps()} />);
    expect(screen.getByRole('button', { name: /Importar TTML/i })).toBeInTheDocument();
  });

  it('importa TTML por palavra, salva como LRC e substitui as linhas atuais', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const { container } = render(<LyricsChordsEditor {...props} />);

    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:lrc="http://lrc.red/lyric-ttml-internal" lrc:timing="Word">
  <body><div>
    <p begin="0:10.275" end="0:11.476"><span begin="0:10.275" end="0:11.444">Hail</span> <span begin="0:11.444" end="0:11.476">(hail)</span></p>
    <p begin="0:12.816" end="0:16.255"><span begin="0:12.816" end="0:13.415">What's</span> <span begin="0:13.415" end="0:13.718">the</span> <span begin="0:13.718" end="0:13.775">mat</span><span begin="0:13.775" end="0:14.275">ter</span> <span begin="0:14.275" end="0:14.561">with</span> <span begin="0:14.561" end="0:14.856">your</span> <span begin="0:14.856" end="0:16.211">head?</span></p>
  </div></body>
</tt>`;

    await user.upload(getTtmlInput(container), ttmlFile(ttml));

    await waitFor(() => expect(props.onSaveLyrics).toHaveBeenCalledTimes(1));
    const [lrcArg, linesArg] = props.onSaveLyrics.mock.calls[0] as [string, LyricLine[]];
    // Import de TTML por palavra preserva o timing no LRC enhanced (karaokê)
    expect(lrcArg).toContain('[00:10.27] <00:10.27>Hail <00:11.44>(hail)');
    expect(linesArg).toHaveLength(2);
    expect(linesArg[1].text).toBe("What's the matter with your head?");
    expect(linesArg[1].words!.map((w) => w.text)).toEqual(["What's", 'the', 'matter', 'with', 'your', 'head?']);
    expect(linesArg[0].chords).toBe('');
  });

  it('importa TTML que já tem acordes embutidos (round-trip do app)', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const { container } = render(<LyricsChordsEditor {...props} />);

    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <body>
    <p begin="0:05.000"><span tts:fontWeight="bold" tts:color="#FBBF24">G     D/F#</span><br/>Letra com acorde</p>
  </body>
</tt>`;

    await user.upload(getTtmlInput(container), ttmlFile(ttml));

    await waitFor(() => expect(props.onSaveLyrics).toHaveBeenCalledTimes(1));
    const [, linesArg] = props.onSaveLyrics.mock.calls[0] as [string, LyricLine[]];
    expect(linesArg[0].chords).toBe('G     D/F#');
    expect(linesArg[0].text).toBe('Letra com acorde');
  });

  it('não altera a letra atual quando o arquivo não é um TTML válido', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const { container } = render(<LyricsChordsEditor {...props} />);

    await user.upload(getTtmlInput(container), ttmlFile('isto não é xml <<<'));

    // Aguarda os macrotasks do FileReader para não falso-passar antes do onload
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(props.onSaveLyrics).not.toHaveBeenCalled();
  });

  it('botão Importar TTML dispara o seletor de arquivos', async () => {
    const user = userEvent.setup();
    const { container } = render(<LyricsChordsEditor {...makeProps()} />);
    const input = getTtmlInput(container);
    const clickSpy = vi.fn();
    input.click = clickSpy;

    await user.click(screen.getByRole('button', { name: /Importar TTML/i }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
