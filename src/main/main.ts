import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { stageServer } from './stageServer.js';
import { storage } from './storage.js';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0A0C0F',
    title: 'StageDeck - Console de Som & Palco',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allows loading local audio files seamlessly
    },
    autoHideMenuBar: true
  });

  const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[StageDeck] Erro ao carregar index.html:', err);
      // Fallback relative to __dirname
      mainWindow?.loadFile(path.join(__dirname, '../../dist/index.html'));
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Start local stage server
  try {
    const port = await stageServer.start();
    console.log(`[StageDeck] Servidor de Palco rodando na porta ${port}`);
  } catch (err) {
    console.error('[StageDeck] Erro ao iniciar servidor de palco:', err);
  }

  // Setup IPC handlers
  ipcMain.handle('stage:get-info', async () => {
    const addresses = await stageServer.getStageUrlAndQr();
    const count = stageServer.getConnectedCount();
    return { addresses, count };
  });

  ipcMain.handle('stage:broadcast', (_event, payload) => {
    stageServer.broadcast(payload);
    return true;
  });

  ipcMain.handle('storage:read', (_event, { key, fallback }) => {
    return storage.read(key, fallback);
  });

  ipcMain.handle('storage:write', (_event, { key, data }) => {
    return storage.write(key, data);
  });

  ipcMain.handle('dialog:open-audio-files', async () => {
    if (!mainWindow) return [];
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecione as faixas de áudio (Stems)',
      filters: [
        { name: 'Áudio Suportado (WAV, FLAC, M4A)', extensions: ['wav', 'flac', 'm4a', 'aac', 'mp3'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    if (result.canceled) return [];
    return result.filePaths;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stageServer.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
