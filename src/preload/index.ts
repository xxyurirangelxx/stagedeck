import { contextBridge, ipcRenderer } from 'electron';
import { StageSyncPayload, Profile } from '../shared/types.js';

export interface ElectronAPI {
  saveAudio: (id: string, buffer: ArrayBuffer) => Promise<void>;
  getAudio: (id: string) => Promise<{ stemId: string; fileName: string; buffer: ArrayBuffer; timestamp: number } | null>;
  deleteAudio: (id: string) => Promise<void>;
  exportBackup: (profile: Profile) => Promise<string | null>;
  importBackup: () => Promise<Profile | null>;
  getStageInfo: () => Promise<{ addresses: { url: string; qrDataUrl: string }[]; count: number }>;
  broadcastStage: (payload: StageSyncPayload) => Promise<boolean>;
  readStorage: <T>(key: string, fallback: T) => Promise<T>;
  writeStorage: <T>(key: string, data: T) => Promise<boolean>;
  openAudioFiles: () => Promise<string[]>;
}

const api: ElectronAPI = {
  saveAudio: (id, buffer) => ipcRenderer.invoke('audio:save', { id, buffer }),
  getAudio: (id) => ipcRenderer.invoke('audio:get', id),
  deleteAudio: (id) => ipcRenderer.invoke('audio:delete', id),
  exportBackup: (profile) => ipcRenderer.invoke('backup:export', profile),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  getStageInfo: () => ipcRenderer.invoke('stage:get-info'),
  broadcastStage: (payload: StageSyncPayload) => ipcRenderer.invoke('stage:broadcast', payload),
  readStorage: (key: string, fallback: any) => ipcRenderer.invoke('storage:read', { key, fallback }),
  writeStorage: (key: string, data: any) => ipcRenderer.invoke('storage:write', { key, data }),
  openAudioFiles: () => ipcRenderer.invoke('dialog:open-audio-files'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
