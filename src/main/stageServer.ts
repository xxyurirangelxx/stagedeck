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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>StageDeck - Visor de Palco</title>
  <link rel="stylesheet" href="/stage/stage.css">
  <meta name="theme-color" content="#0a0c0f">
  <meta name="apple-mobile-web-app-capable" content="yes">
</head>
<body class="stage-body">
  <div id="alert-banner" class="alert-banner hidden">
    <div class="alert-icon">⚠️</div>
    <div id="alert-text" class="alert-text">ALERTA DE PALCO</div>
  </div>

  <header class="stage-header">
    <div class="header-left">
      <div id="song-title" class="title">Aguardando início...</div>
      <div id="song-artist" class="artist">StageDeck Live</div>
    </div>
    <div class="header-right">
      <div class="badge-item"><span class="badge-label">TOM</span><span id="song-key" class="badge-val">--</span></div>
      <div class="badge-item"><span class="badge-label">BPM</span><span id="song-bpm" class="badge-val">--</span></div>
      <div class="badge-item clock"><span class="badge-label">TEMPO</span><span id="time-display" class="badge-val">00:00</span></div>
    </div>
  </header>

  <div class="progress-bar-container">
    <div id="progress-bar" class="progress-bar" style="width: 0%;"></div>
  </div>

  <main id="lyrics-container" class="lyrics-container">
    <div class="lyrics-placeholder">
      <div class="pulse-dot"></div>
      <p>Conectado ao som da banda. As letras e cifras sincronizadas aparecerão aqui ao dar play.</p>
    </div>
  </main>

  <footer class="stage-footer">
    <div class="next-song-box">
      <span class="next-label">A SEGUIR:</span>
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
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background-color: #0A0C0F;
  color: #F8FAFC;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.alert-banner {
  background: #EF4444;
  color: #FFFFFF;
  padding: 14px 18px;
  font-size: 1.6rem;
  font-weight: 900;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.6);
  animation: pulseAlert 0.8s infinite alternate;
  z-index: 100;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.alert-banner.hidden { display: none; }

@keyframes pulseAlert {
  from { background-color: #EF4444; }
  to { background-color: #B91C1C; }
}

.stage-header {
  background: #12151B;
  border-bottom: 2px solid #2A3240;
  padding: 12px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 1.45rem;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.2;
}

.artist {
  font-size: 0.95rem;
  color: #94A3B8;
  margin-top: 3px;
}

.header-right {
  display: flex;
  gap: 12px;
}

.badge-item {
  background: #181D24;
  border: 1px solid #2A3240;
  border-radius: 6px;
  padding: 4px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 52px;
}

.badge-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #64748B;
  letter-spacing: 0.5px;
}

.badge-val {
  font-size: 1.15rem;
  font-weight: 800;
  color: #F59E0B;
  font-family: monospace;
}

.clock .badge-val {
  color: #38BDF8;
}

.progress-bar-container {
  height: 4px;
  background: #181D24;
  width: 100%;
}
.progress-bar {
  height: 100%;
  background: #F59E0B;
  transition: width 0.2s linear;
}

.lyrics-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px 18px 80px 18px;
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
  color: #64748B;
  gap: 16px;
  font-size: 1.1rem;
}

.pulse-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 12px #10B981;
  animation: pulseDot 2s infinite;
}

@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
}

.lyric-item {
  padding: 14px 16px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: transparent;
  transition: all 0.25s ease;
  border-left: 4px solid transparent;
}

.lyric-item.past {
  opacity: 0.35;
}

.lyric-item.current {
  opacity: 1;
  background: #181D24;
  border-left: 5px solid #F59E0B;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
  transform: scale(1.02);
}

.lyric-item.future {
  opacity: 0.75;
}

.chord-row {
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 1.45rem;
  font-weight: 700;
  color: #FBBF24;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-row {
  font-size: 1.4rem;
  font-weight: 600;
  color: #F8FAFC;
  line-height: 1.35;
  letter-spacing: 0.2px;
}

.lyric-item.current .text-row {
  color: #FFFFFF;
  font-size: 1.55rem;
  font-weight: 700;
}

.stage-footer {
  background: #12151B;
  border-top: 2px solid #2A3240;
  padding: 10px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.next-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: #64748B;
  margin-right: 6px;
}
.next-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #94A3B8;
}

.status-indicator {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 4px;
}
.status-indicator.online {
  background: rgba(16, 185, 129, 0.2);
  color: #10B981;
}
.status-indicator.offline {
  background: rgba(239, 68, 68, 0.2);
  color: #EF4444;
}
`;
  }

  private getStageJs(): string {
    return `
let ws = null;
let currentLyrics = [];
let currentSongId = null;
let activeAlertTimer = null;

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
      statusEl.textContent = 'DESCONECTADO';
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
  // 1. Alert Banner
  if (data.alert) {
    showAlert(data.alert.message);
  } else if (data.type === 'ALERT' && data.alert === null) {
    hideAlert();
  }

  // 2. Song Details
  if (data.currentSong) {
    const s = data.currentSong;
    document.getElementById('song-title').textContent = s.title || 'Sem título';
    document.getElementById('song-artist').textContent = s.artist || '';
    document.getElementById('song-key').textContent = s.currentKey || '--';
    document.getElementById('song-bpm').textContent = s.bpm ? String(s.bpm) : '--';

    if (currentSongId !== s.id || currentLyrics.length !== (s.parsedLyrics || []).length) {
      currentSongId = s.id;
      currentLyrics = s.parsedLyrics || [];
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
  }, 10000);
}

function hideAlert() {
  const banner = document.getElementById('alert-banner');
  banner.classList.add('hidden');
}

function renderLyrics(lines) {
  const container = document.getElementById('lyrics-container');
  if (!lines || lines.length === 0) {
    container.innerHTML = '<div class="lyrics-placeholder"><div class="pulse-dot"></div><p>Sem letra ou cifra cadastrada para esta música.</p></div>';
    return;
  }

  container.innerHTML = lines.map((l, idx) => {
    return '<div class="lyric-item future" id="lyric-' + idx + '" data-time="' + l.time + '">' +
      (l.chords ? '<div class="chord-row">' + escapeHtml(l.chords) + '</div>' : '') +
      '<div class="text-row">' + escapeHtml(l.text || (l.chords ? '' : '...')) + '</div>' +
      '</div>';
  }).join('');
}

function escapeHtml(text) {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let lastActiveIdx = -1;
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

  if (activeIdx === lastActiveIdx) return;
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
}

connectWebSocket();
`;
  }
}

export const stageServer = new StageLocalServer(5050);
