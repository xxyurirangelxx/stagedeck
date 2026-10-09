/**
 * Audio Storage Manager using native browser/Electron IndexedDB.
 * Allows audio stems (WAV, FLAC, MP3, M4A) to persist permanently
 * across application restarts, reboots, and window reloads.
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
   * Save stem audio ArrayBuffer permanently to IndexedDB
   */
  async saveStemAudio(stemId: string, fileName: string, buffer: ArrayBuffer): Promise<void> {
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
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`[AudioStorage] Falha ao salvar áudio da stem ${stemId}:`, err);
    }
  },

  /**
   * Retrieve stem audio ArrayBuffer from IndexedDB
   */
  async getStemAudio(stemId: string): Promise<StoredStemAudio | null> {
    try {
      const db = await getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(stemId);

        req.onsuccess = () => {
          resolve(req.result ? (req.result as StoredStemAudio) : null);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`[AudioStorage] Falha ao recuperar áudio da stem ${stemId}:`, err);
      return null;
    }
  },

  /**
   * Remove stem audio from IndexedDB
   */
  async deleteStemAudio(stemId: string): Promise<void> {
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
