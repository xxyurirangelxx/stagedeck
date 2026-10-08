import { contextBridge, ipcRenderer } from 'electron';
import { StageSyncPayload } from '../shared/types.js';

export interface ElectronAPI {
  getStageInfo: () => Promise<{ addresses: { url: string; qrDataUrl: string }[]; count: number }>;
  broadcastStage: (payload: StageSyncPayload) => Promise<boolean>;
  readStorage: <T>(key: string, fallback: T) => Promise<T>;
  writeStorage: <T>(key: string, data: T) => Promise<boolean>;
  openAudioFiles: () => Promise<string[]>;
}

const api: ElectronAPI = {
  getStageInfo: () => ipcRenderer.invoke('stage:get-info'),
  broadcastStage: (payload: StageSyncPayload) => ipcRenderer.invoke('stage:broadcast', payload),
  readStorage: (key: string, fallback: any) => ipcRenderer.invoke('storage:read', { key, fallback }),
  writeStorage: (key: string, data: any) => ipcRenderer.invoke('storage:write', { key, data }),
  openAudioFiles: () => ipcRenderer.invoke('dialog:open-audio-files'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
