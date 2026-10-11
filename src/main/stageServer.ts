import http from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';
import { StageSyncPayload } from '../shared/types.js';

export class StageLocalServer {
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private port: number = 5050;
  private lastPayload: StageSyncPayload | null = null;

  constructor(port = 5050) {
    this.port = port;
  }

  public getLocalIpAddresses(): string[] {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];

    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;

      for (const net of netList) {
        // Skip over non-IPv4 and internal/loopback
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }

    return ips.length > 0 ? ips : ['127.0.0.1'];
  }

  public async getStageUrlAndQr(): Promise<{ url: string; qrDataUrl: string }[]> {
    const ips = this.getLocalIpAddresses();
    const results: { url: string; qrDataUrl: string }[] = [];

    for (const ip of ips) {
      const url = `http://${ip}:${this.port}/stage`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        margin: 2,
        color: {
          dark: '#0A0C0F',
          light: '#F8FAFC'
        },
        width: 256
      });
      results.push({ url, qrDataUrl });
    }

    return results;
  }

  public start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const reqUrl = req.url || '/';

        // Stage Web App routes
        if (reqUrl === '/stage' || reqUrl === '/stage/' || reqUrl === '/') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(this.getStageHtml());
          return;
        }

        if (reqUrl === '/stage/stage.js') {
          res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
          res.end(this.getStageJs());
          return;
        }

        if (reqUrl === '/stage/stage.css') {
          res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
          res.end(this.getStageCss());
          return;
        }

        if (reqUrl === '/api/status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ activeClients: this.clients.size, port: this.port }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      });

      this.wss = new WebSocketServer({ server: this.server });

      this.wss.on('connection', (ws) => {
        this.clients.add(ws);

        // Send current state immediately on connection
        if (this.lastPayload) {
          ws.send(JSON.stringify(this.lastPayload));
        }

        ws.on('close', () => {
          this.clients.delete(ws);
        });

        ws.on('error', () => {
          this.clients.delete(ws);
        });
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        resolve(this.port);
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  public broadcast(payload: StageSyncPayload) {
    this.lastPayload = payload;
    const msg = JSON.stringify(payload);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  public getConnectedCount(): number {
    return this.clients.size;
  }

  public stop() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.clients.clear();
  }

  private getStageHtml(): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>StageDeck — Visor de Palco</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap">
  <link rel="stylesheet" href="/stage/stage.css">
  <meta name="theme-color" content="#ffffff">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
</head>
<body class="stage-body">
  <div id="alert-banner" class="alert-banner hidden">
    <div class="alert-icon">⚠</div>
    <div id="alert-text" class="alert-text">ALERTA DE PALCO</div>
  </div>

  <header class="stage-header">
    <div class="header-left">
      <div id="song-title" class="title">Aguardando início...</div>
      <div id="song-artist" class="artist">StageDeck Live</div>
    </div>
    <div class="header-right">
      <div class="badge-item"><span class="badge-label">BPM</span><span id="song-bpm" class="badge-val">--</span></div>
      <div class="badge-item"><span class="badge-label">TEMPO</span><span id="time-display" class="badge-val mono">00:00</span></div>
    </div>
  </header>

  <div class="progress-bar-container">
    <div id="progress-bar" class="progress-bar"></div>
  </div>

  <main id="lyrics-container" class="lyrics-container">
    <div class="lyrics-placeholder">
      <div class="pulse-dot"></div>
      <p>Conectado ao som da banda.<br>Letras, cifras e karaokê sincronizados aparecem aqui ao dar play.</p>
    </div>
  </main>

  <footer class="stage-footer">
    <div class="next-song-box">
      <span class="next-label">A SEGUIR</span>
      <span id="next-song-text" class="next-title">Fim do setlist</span>
    </div>
    <div id="conn-status" class="status-indicator online">AO VIVO</div>
  </footer>

  <script src="/stage/stage.js"></script>
</body>
</html>`;
  }

  private getStageCss(): string {
    return `
/* StageDeck stage display — Apple-light identity (matches the desktop app) */
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

body {
  background-color: #F5F5F7;
  color: #1D1D1F;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

/* ---- Alert banner ---- */
.alert-banner {
  background: #DC2626;
  color: #FFFFFF;
  padding: 14px 18px;
  font-size: 1.5rem;
  font-weight: 800;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 100;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 18px rgba(220, 38, 38, 0.35);
  animation: pulseAlert 0.8s infinite alternate;
}
.alert-banner.hidden { display: none; }

@keyframes pulseAlert {
  from { background-color: #DC2626; }
  to { background-color: #B91C1C; }
}

/* ---- Header ---- */
.stage-header {
  background: #FFFFFF;
  border-bottom: 1px solid #D2D2D7;
  padding: 14px 18px calc(14px + env(safe-area-inset-top, 0px) * 0);
  padding-top: max(14px, env(safe-area-inset-top, 0px));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1D1D1F;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

.artist {
  font-size: 0.95rem;
  color: #6E6E73;
  margin-top: 3px;
  font-weight: 500;
}

.header-right {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.badge-item {
  background: #F5F5F7;
  border: 1px solid #D2D2D7;
  border-radius: 14px;
  padding: 5px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 58px;
}

.badge-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: #6E6E73;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.badge-val {
  font-size: 1.1rem;
  font-weight: 800;
  color: #155BD0;
  line-height: 1.2;
}

.badge-val.mono {
  font-family: "JetBrains Mono", ui-monospace, Consolas, monospace;
  color: #0E7490;
}

/* ---- Progress ---- */
.progress-bar-container {
  height: 3px;
  background: #E9E9EE;
  width: 100%;
}
.progress-bar {
  height: 100%;
  width: 0%;
  background: #155BD0;
  transition: width 0.2s linear;
}

/* ---- Lyrics ---- */
.lyrics-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px 90px 16px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.lyrics-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #6E6E73;
  gap: 16px;
  font-size: 1.05rem;
  line-height: 1.5;
}

.pulse-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #16A34A;
  box-shadow: 0 0 12px rgba(22, 163, 74, 0.6);
  animation: pulseDot 2s infinite;
}

@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
}

.lyric-item {
  padding: 14px 16px;
  margin-bottom: 10px;
  border-radius: 18px;
  background: #FFFFFF;
  border: 1px solid #D2D2D7;
  transition: background-color 0.25s ease, border-color 0.25s ease, opacity 0.25s ease, transform 0.25s ease;
}

.lyric-item.past {
  opacity: 0.45;
  border-color: transparent;
}

.lyric-item.current {
  opacity: 1;
  background: #EAF1FC;
  border: 2px solid #155BD0;
  padding: 13px 15px;
  box-shadow: 0 6px 22px rgba(21, 91, 208, 0.14);
  transform: scale(1.015);
}

.lyric-item.future {
  opacity: 0.8;
}

.chord-row {
  font-family: "JetBrains Mono", ui-monospace, Consolas, monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: #B45309;
  letter-spacing: 0.4px;
  margin-bottom: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}

.lyric-item.current .chord-row {
  font-size: 1.35rem;
}

.text-row {
  font-size: 1.35rem;
  font-weight: 600;
  color: #1D1D1F;
  line-height: 1.4;
  letter-spacing: 0.1px;
}

.lyric-item.current .text-row {
  font-size: 1.5rem;
  font-weight: 700;
}

/* ---- Line karaoke (fallback: songs without word timing) ----
   The active line "lights up" left-to-right following the transport clock,
   using a text-clipped gradient. Songs WITH word spans use the word highlight
   above instead. Past/future lines keep the solid text color. */
.lyric-item.current .text-row.karaoke-line {
  background-image: linear-gradient(90deg, #155BD0 0%, #155BD0 var(--fill, 0%), #8E8E93 var(--fill, 0%));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* ---- Karaoke words ---- */
.word {
  color: #8E8E93;
  transition: color 0.12s ease;
}

.word.done {
  color: #1D1D1F;
}

.word.active {
  color: #155BD0;
  font-weight: 800;
  text-decoration: underline;
  text-decoration-thickness: 3px;
  text-underline-offset: 5px;
  text-decoration-color: rgba(21, 91, 208, 0.45);
}

.lyric-item.current .word.done {
  color: #1D1D1F;
}

/* ---- Footer ---- */
.stage-footer {
  background: #FFFFFF;
  border-top: 1px solid #D2D2D7;
  padding: 12px 18px;
  padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.next-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: #6E6E73;
  margin-right: 8px;
  letter-spacing: 0.8px;
}
.next-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1D1D1F;
}

.status-indicator {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 5px 10px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}
.status-indicator.online {
  background: rgba(22, 163, 74, 0.12);
  color: #16A34A;
}
.status-indicator.offline {
  background: rgba(220, 38, 38, 0.12);
  color: #DC2626;
}
`;
  }

  private getStageJs(): string {
    return `
let ws = null;
let currentLyrics = [];
let currentSongId = null;
let activeAlertTimer = null;
let lastActiveIdx = -1;
let lastWordKey = '';

// Request Screen Wake Lock
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      const lock = await navigator.wakeLock.request('screen');
      console.log('WakeLock ativado: tela do palco não apagará');
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
          await navigator.wakeLock.request('screen');
        }
      });
    }
  } catch (err) {
    console.warn('WakeLock não suportado ou negado:', err);
  }
}
requestWakeLock();

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = protocol + '//' + window.location.host;
  const statusEl = document.getElementById('conn-status');

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    if (statusEl) {
      statusEl.textContent = 'AO VIVO';
      statusEl.className = 'status-indicator online';
    }
  };

  ws.onclose = () => {
    if (statusEl) {
      statusEl.textContent = 'RECONECTANDO';
      statusEl.className = 'status-indicator offline';
    }
    setTimeout(connectWebSocket, 1500);
  };

  ws.onerror = () => {
    ws.close();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch (e) {
      console.error(e);
    }
  };
}

function handleMessage(data) {
  // 1. Alert banner: any payload without an active alert clears the banner
  if (data.alert && data.alert.message) {
    showAlert(data.alert.message);
  } else {
    hideAlert();
  }

  // 2. Song Details
  if (data.currentSong) {
    const s = data.currentSong;
    document.getElementById('song-title').textContent = s.title || 'Sem título';
    document.getElementById('song-artist').textContent = s.artist || '';
    document.getElementById('song-bpm').textContent = s.bpm ? String(s.bpm) : '--';

    const lyrics = s.parsedLyrics || [];
    if (currentSongId !== s.id || currentLyrics.length !== lyrics.length) {
      currentSongId = s.id;
      currentLyrics = lyrics;
      lastActiveIdx = -1;
      lastWordKey = '';
      renderLyrics(currentLyrics);
    }
  }

  // 3. Next Song
  if (data.nextSongTitle) {
    document.getElementById('next-song-text').textContent = data.nextSongTitle;
  }

  // 4. Time and Progress
  if (typeof data.currentTime === 'number') {
    document.getElementById('time-display').textContent = formatTime(data.currentTime);
    if (data.duration > 0) {
      const pct = (data.currentTime / data.duration) * 100;
      document.getElementById('progress-bar').style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
    updateActiveLyric(data.currentTime);
  }
}

function showAlert(message) {
  const banner = document.getElementById('alert-banner');
  const text = document.getElementById('alert-text');
  text.textContent = message;
  banner.classList.remove('hidden');

  if (activeAlertTimer) clearTimeout(activeAlertTimer);
  activeAlertTimer = setTimeout(() => {
    hideAlert();
  }, 12000);
}

function hideAlert() {
  const banner = document.getElementById('alert-banner');
  if (activeAlertTimer) { clearTimeout(activeAlertTimer); activeAlertTimer = null; }
  banner.classList.add('hidden');
}

function renderLyrics(lines) {
  const container = document.getElementById('lyrics-container');
  if (!lines || lines.length === 0) {
    container.innerHTML = '<div class="lyrics-placeholder"><div class="pulse-dot"></div><p>Sem letra ou cifra cadastrada para esta música.</p></div>';
    return;
  }

  // End of each line (for the line-level karaoke fill): the next line's start,
  // or a sensible window for the last line.
  const ends = lines.map((l, i) => (i + 1 < lines.length ? lines[i + 1].time : l.time + 12));

  container.innerHTML = lines.map((l, idx) => {
    const hasWords = l.words && l.words.length > 0;
    let textHtml;
    if (hasWords) {
      // Karaoke: one span per word; whitespace between spans separates words
      textHtml = l.words.map((w) =>
        '<span class="word" data-time="' + w.time + '" data-end="' + (w.end || w.time) + '">' + escapeHtml(w.text) + '</span>'
      ).join(' ');
    } else {
      textHtml = escapeHtml(l.text || (l.chords ? '' : '...'));
    }
    const textClass = hasWords ? 'text-row' : 'text-row karaoke-line';
    return '<div class="lyric-item future" id="lyric-' + idx + '" data-time="' + l.time + '">' +
      (l.chords ? '<div class="chord-row">' + escapeHtml(l.chords) + '</div>' : '') +
      '<div class="' + textClass + '" data-start="' + l.time + '" data-end="' + ends[idx] + '">' + textHtml + '</div>' +
      '</div>';
  }).join('');
}

function escapeHtml(text) {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updateActiveLyric(currentTime) {
  if (!currentLyrics || currentLyrics.length === 0) return;

  let activeIdx = 0;
  for (let i = 0; i < currentLyrics.length; i++) {
    if (currentTime >= currentLyrics[i].time) {
      activeIdx = i;
    } else {
      break;
    }
  }

  if (activeIdx !== lastActiveIdx) {
    lastActiveIdx = activeIdx;

    const items = document.querySelectorAll('.lyric-item');
    items.forEach((item, idx) => {
      if (idx < activeIdx) {
        item.className = 'lyric-item past';
      } else if (idx === activeIdx) {
        item.className = 'lyric-item current';
        // Auto-scroll to center
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        item.className = 'lyric-item future';
      }
    });
    lastWordKey = '';
  }

  updateActiveWord(activeIdx, currentTime);
}

function updateActiveWord(lineIdx, currentTime) {
  const line = currentLyrics[lineIdx];
  const item = document.getElementById('lyric-' + lineIdx);
  if (!item) return;

  if (line && line.words && line.words.length > 0) {
    // Word-by-word karaoke: active word = last word whose start time passed
    let wordIdx = -1;
    for (let i = 0; i < line.words.length; i++) {
      if (currentTime >= line.words[i].time) {
        wordIdx = i;
      } else {
        break;
      }
    }

    const key = lineIdx + ':' + wordIdx;
    if (key === lastWordKey) return;
    lastWordKey = key;

    const wordEls = item.querySelectorAll('.word');
    wordEls.forEach((el, i) => {
      if (i < wordIdx) {
        el.className = 'word done';
      } else if (i === wordIdx) {
        el.className = 'word active';
      } else {
        el.className = 'word';
      }
    });
    return;
  }

  // Line-level karaoke fill (no word timing available)
  if (lastWordKey) {
    clearWordStates();
    lastWordKey = '';
  }
  const tr = item.querySelector('.text-row.karaoke-line');
  if (!tr) return;
  const start = parseFloat(tr.getAttribute('data-start')) || 0;
  const end = parseFloat(tr.getAttribute('data-end')) || start + 1;
  const pct = Math.max(0, Math.min(100, ((currentTime - start) / Math.max(0.001, end - start)) * 100));
  tr.style.setProperty('--fill', pct.toFixed(1) + '%');
}

function clearWordStates() {
  document.querySelectorAll('.word.active, .word.done').forEach((el) => {
    el.className = 'word';
  });
}

connectWebSocket();
`;
  }
}

export const stageServer = new StageLocalServer(5050);
