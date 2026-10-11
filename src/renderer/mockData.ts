import { Song, Setlist, Show } from '../shared/types';
import { parseLyricsChordsLrc } from './utils/lyricsParser';

export const INITIAL_DEMO_SONG: Song = {
  id: 'song-demo-1',
  title: 'Tempo Perdido',
  artist: 'Banda StageDeck',
  bpm: 128,
  timeSignature: '4/4',
  duration: 180,
  stems: [
    // 8 Backing Track Stems
    { id: 'stem-1', name: 'Bateria / Percussão', type: 'backing', volume: 0.85, panRouting: 'L', muted: false, solo: false },
    { id: 'stem-2', name: 'Baixo Elétrico', type: 'backing', volume: 0.80, panRouting: 'L', muted: false, solo: false },
    { id: 'stem-3', name: 'Guitarra Base', type: 'backing', volume: 0.75, panRouting: 'L', muted: false, solo: false },
    { id: 'stem-4', name: 'Guitarra Solo', type: 'backing', volume: 0.80, panRouting: 'L', muted: false, solo: false },
    { id: 'stem-5', name: 'Teclados / Pads', type: 'backing', volume: 0.70, panRouting: 'L', muted: false, solo: false },
    { id: 'stem-6', name: 'Sintetizador Lead', type: 'backing', volume: 0.75, panRouting: 'L', muted: false, solo: false },
    { id: 'stem-7', name: 'Metais / FX', type: 'backing', volume: 0.65, panRouting: 'L', muted: false, solo: false },
    { id: 'stem-8', name: 'Backing Vocals', type: 'backing', volume: 0.80, panRouting: 'L', muted: false, solo: false },
    // 2 In-Ear Monitor Stems
    { id: 'stem-9', name: 'In-Ear: Metrônomo / Click', type: 'in_ear', volume: 0.90, panRouting: 'R', muted: false, solo: false },
    { id: 'stem-10', name: 'In-Ear: Guia de Voz / Cues', type: 'in_ear', volume: 0.90, panRouting: 'R', muted: false, solo: false },
  ],
  lyricsChordsLrc: `[00:04.00] C     Am7 | [Contagem na guia: 1, 2, 3, 4]
[00:08.50] C            Am7 | Todos os dias quando acordo
[00:13.20] Em7           F | Não tenho mais o tempo que passou
[00:17.80] C            Am7 | Mas tenho muito tempo
[00:22.00] Em7           F | Temos todo o tempo do mundo
[00:27.00] C            Am7 | Todos os dias antes de dormir
[00:31.50] Em7           F | Lembro e esqueço como foi o dia
[00:36.00] C            Am7 | Sempre em frente
[00:40.20] Em7           F | Não temos tempo a perder
[00:45.00] G             Am | Nosso suor sagrado
[00:49.50] F             G | É bem mais belo que esse sangue amargo
[00:54.00] C             Am7 | E tão sério
[00:58.20] Em7           F | E selvagem...`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

INITIAL_DEMO_SONG.parsedLyrics = parseLyricsChordsLrc(INITIAL_DEMO_SONG.lyricsChordsLrc);

export const INITIAL_DEMO_SONGS: Song[] = [
  INITIAL_DEMO_SONG,
  {
    id: 'song-demo-2',
    title: 'O Segundo Sol',
    artist: 'Banda StageDeck',
    bpm: 110,
    timeSignature: '4/4',
    duration: 210,
    stems: [
      { id: 'stem-2-1', name: 'Bateria', type: 'backing', volume: 0.85, panRouting: 'L', muted: false, solo: false },
      { id: 'stem-2-2', name: 'Baixo', type: 'backing', volume: 0.80, panRouting: 'L', muted: false, solo: false },
      { id: 'stem-2-3', name: 'Violão Aço', type: 'backing', volume: 0.75, panRouting: 'L', muted: false, solo: false },
      { id: 'stem-2-4', name: 'Guitarra', type: 'backing', volume: 0.75, panRouting: 'L', muted: false, solo: false },
      { id: 'stem-2-5', name: 'Hammond Organ', type: 'backing', volume: 0.70, panRouting: 'L', muted: false, solo: false },
      { id: 'stem-2-6', name: 'Cordas / Strings', type: 'backing', volume: 0.65, panRouting: 'L', muted: false, solo: false },
      { id: 'stem-2-7', name: 'Percussão', type: 'backing', volume: 0.60, panRouting: 'L', muted: false, solo: false },
      { id: 'stem-2-8', name: 'Backings', type: 'backing', volume: 0.75, panRouting: 'L', muted: false, solo: false },
      { id: 'stem-2-9', name: 'In-Ear: Click 110 BPM', type: 'in_ear', volume: 0.90, panRouting: 'R', muted: false, solo: false },
      { id: 'stem-2-10', name: 'In-Ear: Guia Vocal e Cues', type: 'in_ear', volume: 0.90, panRouting: 'R', muted: false, solo: false },
    ],
    lyricsChordsLrc: `[00:05.00] G     D/F# | [Introdução com violão]
[00:10.00] Em    C | Quando o segundo sol chegar
[00:15.50] G     D/F# | Para realinhar as órbitas dos planetas
[00:21.00] Em    C | Derrubando com assombro extremo
[00:26.50] Am    D | E o pensamento de todo o mundo...`,
    parsedLyrics: parseLyricsChordsLrc(`[00:05.00] G     D/F# | [Introdução com violão]
[00:10.00] Em    C | Quando o segundo sol chegar
[00:15.50] G     D/F# | Para realinhar as órbitas dos planetas
[00:21.00] Em    C | Derrubando com assombro extremo
[00:26.50] Am    D | E o pensamento de todo o mundo...`),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

export const INITIAL_DEMO_SETLISTS: Setlist[] = [
  {
    id: 'setlist-demo-1',
    title: 'Show Principal - Turnê 2026',
    description: 'Setlist completo para festivais e casas noturnas',
    items: [
      { id: 'item-1', songId: 'song-demo-1', order: 0, customNotes: 'Abrir show com energia alta' },
      { id: 'item-2', songId: 'song-demo-2', order: 1, customNotes: 'Momento acústico' },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

export const INITIAL_DEMO_SHOWS: Show[] = [
  {
    id: 'show-demo-1',
    title: 'Festival Rock na Cidade',
    date: '2026-10-15',
    type: 'show',
    location: 'Palco Arena Central',
    setlistId: 'setlist-demo-1',
    notes: 'Passagem de som às 17h. Início do show pontualmente às 21h30.',
    completed: false
  },
  {
    id: 'show-demo-2',
    title: 'Ensaio Geral Pré-Estreia',
    date: '2026-10-12',
    type: 'rehearsal',
    location: 'Estúdio Som & Arte',
    setlistId: 'setlist-demo-1',
    notes: 'Focar na transição entre músicas e sincronia do in-ear.',
    completed: false
  }
];
