import { LyricLine } from '../../shared/types';

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

export function parseTTML(raw: string): LyricLine[] {
  if (!raw || !raw.trim()) return [];

  const doc = new DOMParser().parseFromString(raw, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return [];

  // Chord spans are the ones the app itself exports: tts:color / tts:fontWeight attrs.
  const isChordSpan = (el: Element) =>
    el.getAttribute('tts:color') !== null || el.getAttribute('tts:fontWeight') !== null;

  // Walk children accumulating text (text nodes) and capturing the first chord
  // span. Elements other than span (br, metadata...) are ignored.
  const collect = (node: Node, out: { text: string; chords: string | null }): void => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        // Node.TEXT_NODE
        out.text += child.nodeValue || '';
      } else if (child.nodeType === 1 && (child as Element).localName === 'span') {
        const el = child as Element;
        if (isChordSpan(el)) {
          if (out.chords === null) out.chords = (el.textContent || '').trim();
        } else {
          collect(el, out);
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

    const out = { text: '', chords: null as string | null };
    collect(p, out);
    const text = out.text.replace(/\s+/g, ' ').trim();

    if (!text && !out.chords) return;
    result.push({
      id: `line_${i}`,
      time,
      chords: out.chords || '',
      text
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
      const totalMs = Math.round(l.time * 1000);
      const mm = Math.floor(totalMs / 60000);
      const ss = Math.floor((totalMs % 60000) / 1000);
      const ms = totalMs % 1000;
      const begin = `00:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
      const chordsXml = l.chords ? `<span tts:fontWeight="bold" tts:color="#FBBF24">${escapeXml(l.chords)}</span><br/>` : '';
      return `      <p begin="${begin}">${chordsXml}${escapeXml(l.text || '')}</p>`;
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
