import { LyricLine } from '../../shared/types';

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function transposeNote(note: string, semitones: number): string {
  let idx = NOTES_SHARP.indexOf(note);
  let useFlat = false;
  if (idx === -1) {
    idx = NOTES_FLAT.indexOf(note);
    useFlat = true;
  }
  if (idx === -1) return note;

  const newIdx = (idx + semitones + 24) % 12;
  return useFlat ? NOTES_FLAT[newIdx] : NOTES_SHARP[newIdx];
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;

  // Handles chords like G, G#m7, Bb/D, F#m7(b5), Cmaj7/G
  const chordRegex = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;
  const match = chord.trim().match(chordRegex);
  if (!match) return chord;

  const [, root, modifier, bass] = match;
  const newRoot = transposeNote(root, semitones);
  const newBass = bass ? `/${transposeNote(bass, semitones)}` : '';

  return `${newRoot}${modifier}${newBass}`;
}

export function transposeChordLine(chordLine: string, semitones: number): string {
  if (semitones === 0 || !chordLine) return chordLine;

  // Replace each chord token while preserving spacing
  return chordLine.replace(/\b([A-G][#b]?(?:[^\s/]*)(?:\/[A-G][#b]?)?)\b/g, (match) => {
    return transposeChord(match, semitones);
  });
}

export function formatTimeLrc(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const centis = Math.floor((seconds % 1) * 100);

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const xx = String(centis).padStart(2, '0');

  return `[${mm}:${ss}.${xx}]`;
}

export function parseTimeToSeconds(timeStr: string): number {
  // matches [mm:ss.xx] or mm:ss.xx or mm:ss
  const clean = timeStr.replace(/[\[\]]/g, '');
  const parts = clean.split(':');
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return 0;
}

export function parseLyricsChordsLrc(raw: string): LyricLine[] {
  if (!raw || !raw.trim()) return [];

  const lines = raw.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for timestamps
    const match = line.match(/^\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\](.*)$/);
    if (match) {
      const timeSec = parseTimeToSeconds(match[1]);
      let content = match[2].trim();

      // Check if chords are embedded like [G]Letra [D]outra
      let chordLine = '';
      let textLine = '';

      // Pattern: inline chords like [G] or (G)
      const inlineChordRegex = /\[([A-G][#b]?[^\]]*)\]/g;
      if (inlineChordRegex.test(content)) {
        // Extract chords and text
        let lastIdx = 0;
        let cMatch: RegExpExecArray | null;
        const re = /\[([A-G][#b]?[^\]]*)\]/g;
        while ((cMatch = re.exec(content)) !== null) {
          const chord = cMatch[1];
          const textBefore = content.substring(lastIdx, cMatch.index);
          textLine += textBefore;
          while (chordLine.length < textLine.length) {
            chordLine += ' ';
          }
          chordLine += chord;
          lastIdx = re.lastIndex;
        }
        textLine += content.substring(lastIdx);
      } else if (content.includes('|')) {
        // Pipe syntax: Chords | Lyrics, e.g. "G  D  Em | Minha vida é cantar"
        const parts = content.split('|');
        chordLine = parts[0].trim();
        textLine = parts.slice(1).join('|').trim();
      } else {
        // Just text or pure chord line
        // Heuristic: if line looks like all chords (e.g. "G   Em7   C9   D")
        const words = content.split(/\s+/);
        const looksLikeChords = words.every((w) => /^[A-G][#b]?(m|maj|dim|aug|sus|[0-9]|\+|b|#|\/)*$/.test(w));
        if (looksLikeChords) {
          chordLine = content;
          textLine = '';
        } else {
          chordLine = '';
          textLine = content;
        }
      }

      result.push({
        id: `line_${i}`,
        time: timeSec,
        chords: chordLine,
        text: textLine,
        raw: line
      });
    } else {
      // Line without timestamp (append with approx 0 or offset)
      result.push({
        id: `line_${i}`,
        time: result.length > 0 ? result[result.length - 1].time + 3.0 : 0,
        chords: '',
        text: line,
        raw: line
      });
    }
  }

  // Sort by time
  return result.sort((a, b) => a.time - b.time);
}

export function serializeLyricsToLrc(lines: LyricLine[]): string {
  return lines
    .map((l) => {
      const timeTag = formatTimeLrc(l.time);
      if (l.chords && l.text) {
        return `${timeTag} ${l.chords} | ${l.text}`;
      } else if (l.chords) {
        return `${timeTag} ${l.chords}`;
      } else {
        return `${timeTag} ${l.text}`;
      }
    })
    .join('\n');
}

export function exportToTTML(title: string, lines: LyricLine[]): string {
  const bodyParas = lines
    .map((l) => {
      const mm = Math.floor(l.time / 60);
      const ss = Math.floor(l.time % 60);
      const ms = Math.floor((l.time % 1) * 1000);
      const begin = `00:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
      const chordsXml = l.chords ? `<span tts:fontWeight="bold" tts:color="#FBBF24">${l.chords}</span><br/>` : '';
      return `      <p begin="${begin}">${chordsXml}${l.text || ''}</p>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<tt xml:lang="pt-BR" xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <head>
    <metadata>
      <title>${title}</title>
    </metadata>
  </head>
  <body>
    <div>
${bodyParas}
    </div>
  </body>
</tt>`;
}
