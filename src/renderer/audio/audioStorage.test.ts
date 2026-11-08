import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { delete window.electronAPI; vi.unstubAllGlobals(); vi.resetModules(); });

describe('native audio storage', () => {
  it('saves exact bytes through Electron and propagates disk errors', async () => {
    const saveAudio = vi.fn(async () => {});
    window.electronAPI = { saveAudio } as unknown as NonNullable<Window['electronAPI']>;
    const { audioStorage } = await import('./audioStorage');
    const bytes = new Uint8Array([1, 255, 0]).buffer;
    await audioStorage.saveStemAudio('stem', 'original.wav', bytes);
    expect(saveAudio).toHaveBeenCalledWith('stem', bytes);
    saveAudio.mockRejectedValueOnce(new Error('Disk full'));
    await expect(audioStorage.saveStemAudio('stem', 'replacement.wav', bytes)).rejects.toThrow('Disk full');
  });

  it('reads the managed copy without depending on IndexedDB or the original path', async () => {
    const record = { stemId: 'stem', fileName: '', buffer: new ArrayBuffer(4), timestamp: 0 };
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open });
    window.electronAPI = { getAudio: vi.fn(async () => record) } as unknown as NonNullable<Window['electronAPI']>;
    const { audioStorage } = await import('./audioStorage');
    expect(await audioStorage.getStemAudio('stem')).toEqual(record);
    expect(open).not.toHaveBeenCalled();
  });

  it('copies legacy IndexedDB audio into managed storage on the first read', async () => {
    const record = { stemId: 'old', fileName: 'original.wav', buffer: new ArrayBuffer(4), timestamp: 1 };
    const saveAudio = vi.fn(async () => {});
    vi.stubGlobal('indexedDB', { open: () => {
      const request: any = {};
      queueMicrotask(() => {
        request.result = { transaction: () => ({ objectStore: () => ({ get: () => {
          const getRequest: any = { result: record };
          queueMicrotask(() => getRequest.onsuccess());
          return getRequest;
        } }) }) };
        request.onsuccess();
      });
      return request;
    } });
    window.electronAPI = { getAudio: vi.fn(async () => null), saveAudio } as unknown as NonNullable<Window['electronAPI']>;
    const { audioStorage } = await import('./audioStorage');
    expect(await audioStorage.getStemAudio('old')).toEqual(record);
    expect(saveAudio).toHaveBeenCalledWith('old', record.buffer);
  });
});
