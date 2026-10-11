import { LyricLine, LyricWord } from '../../shared/types';

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
  // matches [h:mm:ss.mmm], [mm:ss.xx], mm:ss.xx, mm:ss
  const clean = timeStr.replace(/[\[\]]/g, '');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return 0;
}

// --- Word-level (karaoke) helpers -----------------------------------------

const WORD_TAG_REGEX = /<(\d{1,2}:\d{2}(?:[.,]\d{1,3})?)>/g;

/** Word tags are only kept when they still match the (possibly edited) line text. */
function wordsAreConsistent(line: LyricLine): boolean {
  if (!line.words || line.words.length === 0) return false;
  const fromWords = line.words.map((w) => w.text).join(' ').replace(/\s+/g, ' ').trim();
  const fromText = (line.text || '').replace(/\s+/g, ' ').trim();
  return fromWords.length > 0 && fromWords === fromText;
}

function formatWordTag(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const mm = Math.floor(totalMs / 60000);
  const ss = Math.floor((totalMs % 60000) / 1000);
  const cs = Math.floor((totalMs % 1000) / 10);
  return `<${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}>`;
}

function formatTtmlTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const mm = Math.floor(totalMs / 60000);
  const ss = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `00:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/** Extract enhanced-LRC word tags (e.g. "<00:12.82>What's <00:13.42>the") from a text chunk. */
function extractWordTiming(textLine: string): { text: string; words?: LyricWord[] } {
  WORD_TAG_REGEX.lastIndex = 0;
  if (!WORD_TAG_REGEX.test(textLine)) return { text: textLine };

  const re = /<(\d{1,2}:\d{2}(?:[.,]\d{1,3})?)>([^<]*)/g;
  const words: LyricWord[] = [];
  let wMatch: RegExpExecArray | null;
  while ((wMatch = re.exec(textLine)) !== null) {
    const wText = wMatch[2].replace(/\s+/g, ' ').trim();
    if (wText) {
      words.push({ text: wText, time: parseTimeToSeconds(wMatch[1]), end: 0 });
    }
  }
  for (let wi = 0; wi < words.length; wi++) {
    words[wi].end = wi + 1 < words.length ? words[wi + 1].time : words[wi].time + 2;
  }
  const cleanText = textLine.replace(/<\d{1,2}:\d{2}(?:[.,]\d{1,3})?>/g, '').replace(/\s+/g, ' ').trim();
  return { text: cleanText, words: words.length > 0 ? words : undefined };
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

      // Enhanced LRC: word tags like <00:12.82>Word (karaoke)
      const timing = extractWordTiming(textLine);
      textLine = timing.text;

      result.push({
        id: `line_${i}`,
        time: timeSec,
        chords: chordLine,
        text: textLine,
        raw: line,
        ...(timing.words ? { words: timing.words } : {})
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

      if (wordsAreConsistent(l)) {
        const wordPart = l.words!.map((w) => `${formatWordTag(w.time)}${w.text}`).join(' ');
        if (l.chords) return `${timeTag} ${l.chords} | ${wordPart}`;
        return `${timeTag} ${wordPart}`;
      }

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

export function parseTTML(raw: string): LyricLine[] {
  if (!raw || !raw.trim()) return [];

  const doc = new DOMParser().parseFromString(raw, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return [];

  // Chord spans are the ones the app itself exports: tts:color / tts:fontWeight attrs.
  const isChordSpan = (el: Element) =>
    el.getAttribute('tts:color') !== null || el.getAttribute('tts:fontWeight') !== null;

  // Walk children accumulating text (text nodes), capturing the first chord span
  // and building word-level timing. Word spans with `begin` (optionally `end`)
  // that appear with NO text between them form a single word (syllable groups);
  // whitespace between spans closes the current word.
  const collect = (
    node: Node,
    out: {
      text: string;
      chords: string | null;
      words: LyricWord[];
      current: { text: string; time: number; end: number } | null;
    }
  ): void => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        // Node.TEXT_NODE
        const raw = child.nodeValue || '';
        if (/\S/.test(raw)) {
          // Visible text between spans glues onto the current word (if any)
          if (out.current) {
            out.current.text += raw.replace(/\s+/g, ' ');
          }
        } else if (out.current) {
          // Whitespace between spans = word boundary
          out.words.push({
            text: out.current.text.replace(/\s+/g, ' ').trim(),
            time: out.current.time,
            end: out.current.end
          });
          out.current = null;
        }
        out.text += raw;
      } else if (child.nodeType === 1 && (child as Element).localName === 'span') {
        const el = child as Element;
        if (isChordSpan(el)) {
          if (out.chords === null) out.chords = (el.textContent || '').trim();
        } else {
          const begin = el.getAttribute('begin');
          const end = el.getAttribute('end');
          const content = el.textContent || '';
          if (begin !== null) {
            const beginSec = parseTimeToSeconds(begin);
            const endSec = end !== null ? parseTimeToSeconds(end) : beginSec;
            if (out.current) {
              // Adjacent span without text between = same word (syllable)
              out.current.text += content;
              out.current.end = endSec;
            } else {
              out.current = { text: content, time: beginSec, end: endSec };
            }
            out.text += content;
          } else {
            // Span without timing: treat as plain inline text
            if (out.current) {
              out.current.text += content;
            }
            out.text += content;
          }
        }
      }
    });
  };

  const result: LyricLine[] = [];
  const paragraphs = Array.from(doc.getElementsByTagName('p'));

  paragraphs.forEach((p, i) => {
    const firstSpan = p.getElementsByTagName('span')[0];
    const beginAttr = p.getAttribute('begin') || (firstSpan ? firstSpan.getAttribute('begin') : null) || '';
    const time = parseTimeToSeconds(beginAttr);

    const out = { text: '', chords: null as string | null, words: [] as LyricWord[], current: null as { text: string; time: number; end: number } | null };
    collect(p, out);
    if (out.current) {
      out.words.push({
        text: out.current.text.replace(/\s+/g, ' ').trim(),
        time: out.current.time,
        end: out.current.end
      });
      out.current = null;
    }
    const text = out.text.replace(/\s+/g, ' ').trim();

    if (!text && !out.chords) return;
    result.push({
      id: `line_${i}`,
      time,
      chords: out.chords || '',
      text,
      ...(out.words.length > 0 ? { words: out.words } : {})
    });
  });

  // Sort by time
  return result.sort((a, b) => a.time - b.time);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportToTTML(title: string, lines: LyricLine[]): string {
  const bodyParas = lines
    .map((l) => {
      const begin = formatTtmlTime(l.time);

      const chordsXml = l.chords ? `<span tts:fontWeight="bold" tts:color="#FBBF24">${escapeXml(l.chords)}</span><br/>` : '';

      let contentXml: string;
      if (wordsAreConsistent(l)) {
        contentXml = l.words!
          .map((w) => `<span begin="${formatTtmlTime(w.time)}" end="${formatTtmlTime(w.end)}">${escapeXml(w.text)}</span>`)
          .join(' ');
      } else {
        contentXml = escapeXml(l.text || '');
      }

      const endAttr =
        wordsAreConsistent(l) && l.words!.length > 0
          ? ` end="${formatTtmlTime(l.words![l.words!.length - 1].end)}"`
          : '';
      return `      <p begin="${begin}"${endAttr}>${chordsXml}${contentXml}</p>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<tt xml:lang="pt-BR" xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <head>
    <metadata>
      <title>${escapeXml(title)}</title>
    </metadata>
  </head>
  <body>
    <div>
${bodyParas}
    </div>
  </body>
</tt>`;
}
