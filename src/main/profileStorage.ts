import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import yazl from 'yazl';
import yauzl from 'yauzl';
import type { Profile } from '../shared/types.js';

const PROFILE_ENTRY = 'profile.json';
const MAX_PROFILE_BYTES = 64 * 1024 * 1024;

export function audioPath(root: string, id: string) {
  if (typeof id !== 'string' || !id || id.length > 120) throw new Error('ID de stem inválido');
  return path.join(root, 'audio', `${Buffer.from(id).toString('hex')}.audio`);
}

function audioEntry(id: string) {
  return `audio/${Buffer.from(id).toString('hex')}.audio`;
}

export async function saveAudio(root: string, id: string, buffer: ArrayBuffer) {
  const target = audioPath(root, id);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, Buffer.from(buffer));
    await fs.rename(temporary, target);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

export function validateProfile(value: unknown): Profile {
  const p = value as Profile;
  if (!p || p.format !== 'stagedeck-profile' || p.version !== 1 || !Array.isArray(p.songs) || !Array.isArray(p.setlists)) {
    throw new Error('Perfil inválido ou versão não suportada');
  }
  const ids = new Set<string>();
  const stemIds = new Set<string>();
  for (const song of p.songs) {
    if (!song || typeof song.id !== 'string' || ids.has(song.id) ||
        typeof song.title !== 'string' || typeof song.artist !== 'string' ||
        typeof song.lyricsChordsLrc !== 'string' || !Number.isFinite(song.duration) ||
        !Number.isFinite(song.bpm) || !Array.isArray(song.stems)) {
      throw new Error('Música inválida no perfil');
    }
    ids.add(song.id);
    // Lyrics are parsed again on the receiving computer.
    delete song.parsedLyrics;
    for (const stem of song.stems) {
      if (!stem || typeof stem.name !== 'string' || !['backing', 'in_ear'].includes(stem.type) ||
          !['L', 'R', 'BOTH'].includes(stem.panRouting) || !Number.isFinite(stem.volume) ||
          stem.volume < 0 || stem.volume > 1.5 || typeof stem.muted !== 'boolean' ||
          typeof stem.solo !== 'boolean' || (stem.fileName !== undefined && typeof stem.fileName !== 'string') ||
          stemIds.has(stem.id)) {
        throw new Error('Stem inválida no perfil');
      }
      audioPath('', stem.id);
      stemIds.add(stem.id);
      delete stem.filePath;
      delete stem.fileUrl;
    }
  }
  const setlistIds = new Set<string>();
  for (const setlist of p.setlists) {
    if (!setlist || typeof setlist.id !== 'string' || setlistIds.has(setlist.id) ||
        typeof setlist.title !== 'string' || !Array.isArray(setlist.items) ||
        setlist.items.some(item => !item || typeof item.id !== 'string' ||
          typeof item.songId !== 'string' || !Number.isFinite(item.order))) {
      throw new Error('Setlist inválida no perfil');
    }
    setlistIds.add(setlist.id);
  }
  return p;
}

export async function exportProfile(root: string, destination: string, data: Profile) {
  const profile = validateProfile(structuredClone(data));
  const files: { source: string; entry: string }[] = [];
  for (const song of profile.songs) {
    for (const stem of song.stems) {
      if (!stem.fileName) continue;
      const source = audioPath(root, stem.id);
      const stat = await fs.stat(source).catch(() => null);
      if (!stat?.isFile()) throw new Error(`Áudio não encontrado: ${stem.fileName}`);
      files.push({ source, entry: audioEntry(stem.id) });
    }
  }

  const zip = new yazl.ZipFile();
  for (const file of files) zip.addFile(file.source, file.entry);
  zip.addBuffer(Buffer.from(JSON.stringify(profile, null, 2)), PROFILE_ENTRY);

  // Write beside the destination and rename on success so a failed export never
  // destroys an archive the user already had.
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const output = createWriteStream(temporary);
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        output.destroy();
        reject(error);
      };
      output.on('error', fail);
      zip.outputStream.on('error', fail);
      output.on('close', () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      zip.outputStream.pipe(output);
      zip.end();
    });
    await fs.rename(temporary, destination);
    return destination;
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

function readEntry(stream: Readable, limit = Infinity): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    stream.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        stream.destroy();
        reject(new Error('Backup inválido: profile.json muito grande'));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/** Reads the manifest and lists entries without trusting or extracting anything. */
function readBackup(source: string): Promise<{ profile: Profile; entries: Set<string> }> {
  return new Promise((resolve, reject) => {
    yauzl.open(source, { lazyEntries: true }, (openError, zipfile) => {
      if (openError || !zipfile) {
        reject(openError ?? new Error('Backup inválido'));
        return;
      }
      let settled = false;
      let manifest: Buffer | null = null;
      const entries = new Set<string>();
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        zipfile.close();
        reject(error);
      };
      zipfile.on('error', fail);
      zipfile.on('entry', (entry) => {
        if (entries.has(entry.fileName)) {
          fail(new Error(`Backup inválido: entrada duplicada ${entry.fileName}`));
          return;
        }
        entries.add(entry.fileName);
        if (entry.fileName !== PROFILE_ENTRY) {
          zipfile.readEntry();
          return;
        }
        zipfile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            fail(streamError ?? new Error('Backup inválido'));
            return;
          }
          readEntry(stream, MAX_PROFILE_BYTES).then(buffer => {
            manifest = buffer;
            zipfile.readEntry();
          }, fail);
        });
      });
      zipfile.on('end', () => {
        if (settled) return;
        if (!manifest) {
          fail(new Error(`Backup inválido: ${PROFILE_ENTRY} ausente`));
          return;
        }
        try {
          const profile = validateProfile(JSON.parse(manifest.toString('utf8')));
          settled = true;
          resolve({ profile, entries });
        } catch (error) {
          fail(error);
        }
      });
      zipfile.readEntry();
    });
  });
}

/** Extracts only the whitelisted audio entries, each at a validated destination. */
function extractAudio(source: string, wanted: Map<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(source, { lazyEntries: true }, (openError, zipfile) => {
      if (openError || !zipfile) {
        reject(openError ?? new Error('Backup inválido'));
        return;
      }
      let settled = false;
      const extracted = new Set<string>();
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        zipfile.close();
        reject(error);
      };
      zipfile.on('error', fail);
      zipfile.on('entry', (entry) => {
        const target = wanted.get(entry.fileName);
        if (!target) {
          zipfile.readEntry();
          return;
        }
        if (extracted.has(entry.fileName)) {
          fail(new Error(`Backup inválido: entrada duplicada ${entry.fileName}`));
          return;
        }
        extracted.add(entry.fileName);
        zipfile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            fail(streamError ?? new Error('Backup inválido'));
            return;
          }
          fs.mkdir(path.dirname(target), { recursive: true })
            .then(() => pipeline(stream, createWriteStream(target, { flags: 'wx' })))
            .then(() => zipfile.readEntry(), fail);
        });
      });
      zipfile.on('end', () => {
        if (settled) return;
        if (extracted.size !== wanted.size) {
          fail(new Error('Backup incompleto: áudio ausente no arquivo'));
          return;
        }
        settled = true;
        resolve();
      });
      zipfile.readEntry();
    });
  });
}

/** Copies an extracted backup into the app data directory, regenerating stem ids. */
async function importFolder(root: string, source: string, profile: Profile): Promise<Profile> {
  const copied: string[] = [];
  await fs.mkdir(path.join(root, 'audio'), { recursive: true });
  try {
    for (const song of profile.songs) {
      for (const stem of song.stems) {
        const previousId = stem.id;
        stem.id = randomUUID();
        if (stem.fileName) {
          const target = audioPath(root, stem.id);
          await fs.copyFile(audioPath(source, previousId), target, fs.constants.COPYFILE_EXCL);
          copied.push(target);
        }
      }
    }
    return profile;
  } catch (error) {
    await Promise.all(copied.map(file => fs.rm(file, { force: true })));
    throw error;
  }
}

export async function importProfile(root: string, source: string): Promise<Profile> {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'stagedeck-backup-'));
  try {
    const { profile, entries } = await readBackup(source);
    const wanted = new Map<string, string>();
    const missing: string[] = [];
    for (const song of profile.songs) {
      for (const stem of song.stems) {
        if (!stem.fileName) continue;
        const entry = audioEntry(stem.id);
        if (!entries.has(entry)) missing.push(stem.fileName);
        else wanted.set(entry, audioPath(temporary, stem.id));
      }
    }
    if (missing.length) throw new Error(`Backup incompleto: áudio ausente (${missing.join(', ')})`);
    await extractAudio(source, wanted);
    return await importFolder(root, temporary, profile);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}
