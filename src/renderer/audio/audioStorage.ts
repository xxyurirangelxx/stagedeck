/**
 * Electron stores original audio bytes in the app's data directory.
 * IndexedDB remains the web-preview fallback and migration source.
 */

const DB_NAME = 'stagedeck_audio_db';
const STORE_NAME = 'stem_audio_buffers';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'stemId' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[AudioStorage] Erro ao abrir IndexedDB:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

export interface StoredStemAudio {
  stemId: string;
  fileName: string;
  buffer: ArrayBuffer;
  timestamp: number;
}

export const audioStorage = {
  /**
   * Save the original stem audio permanently.
   */
  async saveStemAudio(stemId: string, fileName: string, buffer: ArrayBuffer): Promise<void> {
    if (window.electronAPI?.saveAudio) {
      await window.electronAPI.saveAudio(stemId, buffer);
      return;
    }
    try {
      const db = await getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const record: StoredStemAudio = {
          stemId,
          fileName,
          buffer,
          timestamp: Date.now()
        };

        const req = store.put(record);
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`[AudioStorage] Falha ao salvar áudio da stem ${stemId}:`, err);
      throw err;
    }
  },

  /**
   * Read native audio, migrating legacy IndexedDB records when needed.
   */
  async getStemAudio(stemId: string): Promise<StoredStemAudio | null> {
    if (window.electronAPI?.getAudio) {
      const native = await window.electronAPI.getAudio(stemId);
      if (native) return native;
    }
    try {
      const db = await getDb();
      const stored = await new Promise<StoredStemAudio | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(stemId);

        req.onsuccess = () => {
          resolve(req.result ? (req.result as StoredStemAudio) : null);
        };
        req.onerror = () => reject(req.error);
      });
      if (stored && window.electronAPI?.saveAudio) {
        await window.electronAPI.saveAudio(stemId, stored.buffer);
      }
      return stored;
    } catch (err) {
      console.error(`[AudioStorage] Falha ao recuperar áudio da stem ${stemId}:`, err);
      return null;
    }
  },

  /**
   * Remove stem audio from IndexedDB
   */
  async deleteStemAudio(stemId: string): Promise<void> {
    if (window.electronAPI?.deleteAudio) await window.electronAPI.deleteAudio(stemId);
    try {
      const db = await getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(stemId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`[AudioStorage] Falha ao apagar áudio da stem ${stemId}:`, err);
    }
  }
};
