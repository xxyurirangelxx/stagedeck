import { describe, it, expect } from 'vitest';
import {
  parseTTML,
  exportToTTML,
  parseTimeToSeconds,
  parseLyricsChordsLrc,
  serializeLyricsToLrc
} from './lyricsParser';
import { LyricLine } from '../../shared/types';

// Fixture baseada em TTML real de timing por palavra (lrc:timing="Word"):
// <div> → <p> (linhas) → <span> (palavras/sílabas com tempos), M:SS.mmm.
const WORD_TIMED_TTML = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:lrc="http://lrc.red/lyric-ttml-internal" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" lrc:timing="Word" xml:lang="en">
  <body dur="0:16.255">
    <div begin="0:10.275" end="0:16.255">
      <p begin="0:10.275" end="0:11.476" lrc:key="L1"><span begin="0:10.275" end="0:11.444">Hail</span> <span begin="0:11.444" end="0:11.476">(hail)</span></p>
      <p begin="0:12.816" end="0:16.255" lrc:key="L2"><span begin="0:12.816" end="0:13.415">What's</span> <span begin="0:13.415" end="0:13.718">the</span> <span begin="0:13.718" end="0:13.775">mat</span><span begin="0:13.775" end="0:14.275">ter</span> <span begin="0:14.275" end="0:14.561">with</span> <span begin="0:14.561" end="0:14.856">your</span> <span begin="0:14.856" end="0:16.211">head?</span></p>
    </div>
  </body>
</tt>`;

describe('parseTTML', () => {
  it('converte <p> de TTML por palavra em linhas com tempo e texto (sílabas unidas sem espaço)', () => {
    const parsed = parseTTML(WORD_TIMED_TTML);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].time).toBeCloseTo(10.275, 3);
    expect(parsed[0].text).toBe('Hail (hail)');
    expect(parsed[0].chords).toBe('');
    expect(parsed[1].time).toBeCloseTo(12.816, 3);
    expect(parsed[1].text).toBe("What's the matter with your head?");
  });

  it('aceita tempos em H:MM:SS.mmm (formato exportado pelo app)', () => {
    const ttml = `<tt xmlns="http://www.w3.org/ns/ttml"><body><p begin="00:01:06.335"><span begin="00:01:06.335" end="00:01:07.000">Linha</span></p></body></tt>`;
    const parsed = parseTTML(ttml);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].time).toBeCloseTo(66.335, 3);
  });

  it('recupera acordes embutidos pelo exportador do app (span tts:color) sem misturá-los na letra', () => {
    const ttml = `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling"><body>
      <p begin="0:05.000"><span tts:fontWeight="bold" tts:color="#FBBF24">G     D/F#</span><br/>Letra da linha</p>
    </body></tt>`;
    const parsed = parseTTML(ttml);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].chords).toBe('G     D/F#');
    expect(parsed[0].text).toBe('Letra da linha');
  });

  it('fecha o ciclo: exportToTTML → parseTTML devolve as mesmas linhas (com escape de XML)', () => {
    const lines: LyricLine[] = [
      { id: 'a', time: 15.5, chords: 'G    D/F#', text: 'Rock & Roll <baby>' },
      { id: 'b', time: 66.335, chords: '', text: 'Segunda linha' }
    ];

    const xml = exportToTTML('Minha Música', lines);
    const back = parseTTML(xml);

    expect(back).toHaveLength(2);
    expect(back[0].time).toBeCloseTo(15.5, 3);
    expect(back[0].chords).toBe('G    D/F#');
    expect(back[0].text).toBe('Rock & Roll <baby>');
    expect(back[1].time).toBeCloseTo(66.335, 3);
    expect(back[1].chords).toBe('');
    expect(back[1].text).toBe('Segunda linha');
  });

  it('retorna [] em XML inválido ou vazio', () => {
    expect(parseTTML('isto não é xml <<<')).toEqual([]);
    expect(parseTTML('')).toEqual([]);
  });
});

describe('parseTTML — timing por palavra (karaoke)', () => {
  it('extrai palavras com begin/end agrupando spans contíguos de sílabas (sem espaço entre eles)', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:lrc="http://lrc.red/lyric-ttml-internal" lrc:timing="Word">
  <body><div>
    <p begin="0:12.816" end="0:16.255"><span begin="0:12.816" end="0:13.415">What's</span> <span begin="0:13.415" end="0:13.718">the</span> <span begin="0:13.718" end="0:13.775">mat</span><span begin="0:13.775" end="0:14.275">ter</span> <span begin="0:14.275" end="0:14.561">with</span> <span begin="0:14.561" end="0:14.856">your</span> <span begin="0:14.856" end="0:16.211">head?</span></p>
  </div></body>
</tt>`;

    const lines = parseTTML(ttml);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("What's the matter with your head?");
    expect(lines[0].words).toEqual([
      { text: "What's", time: 12.816, end: 13.415 },
      { text: 'the', time: 13.415, end: 13.718 },
      { text: 'matter', time: 13.718, end: 14.275 },
      { text: 'with', time: 14.275, end: 14.561 },
      { text: 'your', time: 14.561, end: 14.856 },
      { text: 'head?', time: 14.856, end: 16.211 }
    ]);
  });

  it('linha de TTML por linha (sem spans por palavra) fica sem words e continua funcionando', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body><div><p begin="0:05.000">Linha sincronizada sem palavras</p></div></body>
</tt>`;

    const lines = parseTTML(ttml);
    expect(lines[0].text).toBe('Linha sincronizada sem palavras');
    expect(lines[0].words).toBeUndefined();
  });

  it('parseia LRC enhanced (tags <mm:ss.xx> por palavra) preservando acordes e texto', () => {
    const lrc = "[00:12.82] G    D/F# | <00:12.82>What's <00:13.42>the <00:13.72>matter";
    const lines = parseLyricsChordsLrc(lrc);
    expect(lines).toHaveLength(1);
    expect(lines[0].chords).toBe('G    D/F#');
    expect(lines[0].text).toBe("What's the matter");
    expect(lines[0].words).toEqual([
      { text: "What's", time: 12.82, end: 13.42 },
      { text: 'the', time: 13.42, end: 13.72 },
      { text: 'matter', time: 13.72, end: 15.72 }
    ]);
  });

  it('serializa de volta para LRC enhanced quando words são consistentes com o texto', () => {
    const lines: LyricLine[] = [
      {
        id: 'line_0',
        time: 12.82,
        chords: 'G',
        text: "What's the matter",
        words: [
          { text: "What's", time: 12.82, end: 13.42 },
          { text: 'the', time: 13.42, end: 13.72 },
          { text: 'matter', time: 13.72, end: 15.72 }
        ]
      }
    ];
    const lrc = serializeLyricsToLrc(lines);
    expect(lrc).toBe("[00:12.82] G | <00:12.82>What's <00:13.42>the <00:13.72>matter");
  });

  it('descarta word-timing quando o texto da linha foi editado (degrada para linha simples)', () => {
    const lines: LyricLine[] = [
      {
        id: 'line_0',
        time: 12.82,
        chords: '',
        text: 'Texto editado pelo usuário',
        words: [{ text: "What's", time: 12.82, end: 13.42 }]
      }
    ];
    const lrc = serializeLyricsToLrc(lines);
    expect(lrc).toBe('[00:12.82] Texto editado pelo usuário');
    expect(lrc).not.toContain('<00:');
  });

  it('exporta TTML com spans por palavra e reimporta os mesmos tempos (round-trip TTML)', () => {
    const lines: LyricLine[] = [
      {
        id: 'line_0',
        time: 12.816,
        chords: 'G     D/F#',
        text: "What's the matter",
        words: [
          { text: "What's", time: 12.816, end: 13.415 },
          { text: 'the', time: 13.415, end: 13.718 },
          { text: 'matter', time: 13.718, end: 14.275 }
        ]
      }
    ];

    const ttml = exportToTTML('Karaokê', lines);
    const apos = '&' + 'apos;';
    expect(ttml).toContain(`<span begin="00:00:12.816" end="00:00:13.415">What${apos}s</span>`);

    const back = parseTTML(ttml);
    expect(back).toHaveLength(1);
    expect(back[0].chords).toBe('G     D/F#');
    expect(back[0].text).toBe("What's the matter");
    expect(back[0].words).toEqual(lines[0].words);
  });
});

describe('parseTimeToSeconds (timestamps TTML)', () => {
  it('aceita M:SS.mmm, H:MM:SS.mmm e mantém os formatos LRC existentes', () => {
    expect(parseTimeToSeconds('1:06.335')).toBeCloseTo(66.335, 3);
    expect(parseTimeToSeconds('00:01:06.335')).toBeCloseTo(66.335, 3);
    expect(parseTimeToSeconds('[00:15.50]')).toBeCloseTo(15.5, 3);
    expect(parseTimeToSeconds('02:03')).toBe(123);
  });
});
