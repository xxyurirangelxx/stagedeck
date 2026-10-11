import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { StageLocalServer } from './stageServer.js';
import type { LyricLine } from '../shared/types';

/**
 * Executes the real mobile stage page (HTML + CSS + stage.js served by
 * StageLocalServer) inside jsdom with a mocked WebSocket, feeds it the same
 * SYNC payloads the desktop broadcasts and asserts the word-by-word karaoke
 * rendering on the actual DOM.
 */

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: string[] = [];

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {}
}

const WORDS_LINE: LyricLine = {
  id: 'line_0',
  time: 12.816,
  chords: 'G',
  text: "What's the matter",
  words: [
    { text: "What's", time: 12.816, end: 13.415 },
    { text: 'the', time: 13.415, end: 13.718 },
    { text: 'matter', time: 13.718, end: 14.275 }
  ]
};

const PLAIN_LINE: LyricLine = {
  id: 'line_1',
  time: 20,
  chords: '',
  text: 'Linha sem timing por palavra'
};

function buildSyncPayload(currentTime: number, lines: LyricLine[]) {
  return JSON.stringify({
    type: 'SYNC',
    isPlaying: true,
    currentTime,
    duration: 200,
    currentSong: {
      id: 'song-1',
      title: 'Música Karaokê',
      artist: 'Banda',
      bpm: 120,
      parsedLyrics: lines
    },
    nextSongTitle: 'Próxima',
    alert: null
  });
}

describe('Visor de palco móvel — karaokê palavra a palavra (DOM real)', () => {
  let server: StageLocalServer;
  let dom: JSDOM;

  beforeAll(async () => {
    server = new StageLocalServer(5099);
    await server.start();

    const html = server['getStageHtml']();
    dom = new JSDOM(html, { url: 'http://127.0.0.1:5099/stage', runScripts: 'outside-only' });
    (dom.window as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
    // jsdom não implementa scrollIntoView (usado no auto-scroll da linha ativa)
    dom.window.Element.prototype.scrollIntoView = () => {};

    const js = server['getStageJs']();
    dom.window.eval(js);

    // The stage script connects immediately: simulate an established connection
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    ws.onopen?.();
  });

  afterAll(() => {
    server.stop();
  });

  function feed(payload: string) {
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    ws.onmessage?.({ data: payload });
  }

  it('renderiza cada palavra como um span .word com os tempos no data-attribute', () => {
    feed(buildSyncPayload(0, [WORDS_LINE, PLAIN_LINE]));

    const doc = dom.window.document;
    const words = doc.querySelectorAll('#lyric-0 .word');
    expect(words.length).toBe(3);
    expect(words[0].textContent).toBe("What's");
    expect(words[0].getAttribute('data-time')).toBe('12.816');
    expect(words[0].getAttribute('data-end')).toBe('13.415');
    // Linha sem words continua como texto simples
    expect(doc.querySelector('#lyric-1 .word')).toBeNull();
    expect(doc.querySelector('#lyric-1 .text-row')!.textContent).toContain('Linha sem timing');
  });

  it('destaca a palavra ativa (.word.active), marca passadas (.done) e mantém futuras apagadas', () => {
    feed(buildSyncPayload(0, [WORDS_LINE, PLAIN_LINE]));

    const doc = dom.window.document;

    // 13.5s: "What's" (12.816–13.415) e "the" (13.415–13.718) já começaram;
    // "matter" (13.718) ainda não.
    feed(buildSyncPayload(13.5, [WORDS_LINE, PLAIN_LINE]));

    const words = doc.querySelectorAll('#lyric-0 .word');
    expect(words[0].className).toBe('word done');
    expect(words[1].className).toBe('word active');
    expect(words[2].className).toBe('word');

    // A linha em si está ativa e rola para o centro
    expect(doc.getElementById('lyric-0')!.className).toBe('lyric-item current');
  });

  it('avança o highlight palavra a palavra conforme o tempo passa', () => {
    feed(buildSyncPayload(0, [WORDS_LINE, PLAIN_LINE]));
    const doc = dom.window.document;

    feed(buildSyncPayload(14.0, [WORDS_LINE, PLAIN_LINE]));
    let words = doc.querySelectorAll('#lyric-0 .word');
    expect(words[2].className).toBe('word active');

    feed(buildSyncPayload(12.0, [WORDS_LINE, PLAIN_LINE]));
    // 12.0 < 12.816: nenh palavra iniciou, todas futuras
    words = doc.querySelectorAll('#lyric-0 .word');
    expect(words[0].className).toBe('word');
    expect(words[1].className).toBe('word');
    expect(words[2].className).toBe('word');
  });

  it('linhas sem word timing recebem karaokê de linha (preenchimento progressivo)', () => {
    feed(buildSyncPayload(0, [WORDS_LINE, PLAIN_LINE]));
    const doc = dom.window.document;

    // Linha 1 (sem words): começa em 20s e termina em 32s (12s de janela)
    const textRow = doc.querySelector('#lyric-1 .text-row')!;
    expect(textRow.className).toContain('karaoke-line');
    expect(textRow.getAttribute('data-start')).toBe('20');
    expect(textRow.getAttribute('data-end')).toBe('32');

    // 23s = 25% da linha
    feed(buildSyncPayload(23, [WORDS_LINE, PLAIN_LINE]));
    expect(textRow.style.getPropertyValue('--fill')).toBe('25.0%');

    // 26s = 50% da linha
    feed(buildSyncPayload(26, [WORDS_LINE, PLAIN_LINE]));
    expect(textRow.style.getPropertyValue('--fill')).toBe('50.0%');

    // A linha com words NÃO usa preenchimento de linha (usa spans por palavra)
    expect(doc.querySelector('#lyric-0 .text-row')!.className).not.toContain('karaoke-line');
  });
});
