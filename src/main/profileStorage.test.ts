// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import yazl from 'yazl';
import { audioPath, saveAudio, exportProfile, importProfile, validateProfile } from './profileStorage';
import type { Profile } from '../shared/types';

const folders: string[] = [];
async function temporary() {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'stagedeck-test-'));
  folders.push(folder);
  return folder;
}
afterEach(async () => { await Promise.all(folders.splice(0).map(folder => fs.rm(folder, { recursive: true, force: true }))); });
async function audioFiles(root: string) {
  try {
    return await fs.readdir(path.join(root, 'audio'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
function profile(): Profile {
  return { format: 'stagedeck-profile', version: 1, songs: [{
    id: 'song', title: 'Song', artist: 'Band', bpm: 120, timeSignature: '4/4', duration: 5,
    lyricsChordsLrc: '[00:01] C | Test', createdAt: 1, updatedAt: 1,
    stems: [{ id: '../stem', name: 'Track', type: 'backing', fileName: 'same.wav', filePath: 'C:/old/file.wav', volume: 1, panRouting: 'L', muted: false, solo: false }]
  }], setlists: [{ id: 'set', title: 'Set', items: [{ id: 'item', songId: 'song', order: 0 }], createdAt: 1, updatedAt: 1 }] };
}
async function writeZip(destination: string, entries: { name: string; data: Buffer }[]) {
  const zip = new yazl.ZipFile();
  for (const entry of entries) zip.addBuffer(entry.data, entry.name);
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(destination);
    output.on('close', resolve);
    output.on('error', reject);
    zip.outputStream.on('error', reject).pipe(output);
    zip.end();
  });
}

describe('portable profiles', () => {
  it('exports a single zip and imports its metadata and original audio bytes with fresh stem ids', async () => {
    const source = await temporary();
    const destination = await temporary();
    const bytes = new Uint8Array([0, 255, 42]).buffer;
    await saveAudio(source, '../stem', bytes);
    const zipPath = path.join(destination, 'StageDeck-backup.zip');

    await exportProfile(source, zipPath, profile());

    const stat = await fs.stat(zipPath);
    const archive = await fs.readFile(zipPath);
    expect(stat.isFile()).toBe(true);
    expect(archive.subarray(0, 2).toString()).toBe('PK');

    await saveAudio(destination, '../stem', new Uint8Array([9]).buffer);
    const result = await importProfile(destination, zipPath);
    const stem = result.songs[0].stems[0];
    expect(stem.id).not.toBe('../stem');
    expect(stem.filePath).toBeUndefined();
    expect(await fs.readFile(audioPath(destination, stem.id))).toEqual(Buffer.from(bytes));
    expect(await fs.readFile(audioPath(destination, '../stem'))).toEqual(Buffer.from([9]));
    expect(result.songs[0].lyricsChordsLrc).toBe(profile().songs[0].lyricsChordsLrc);
    expect(result.setlists).toEqual(profile().setlists);
  });

  it('rejects corrupt archives and invalid profiles without replacing existing data', async () => {
    expect(() => validateProfile({ version: 99 })).toThrow();
    const invalid = profile();
    invalid.setlists[0].items[0].order = NaN;
    expect(() => validateProfile(invalid)).toThrow();

    const destination = await temporary();
    const corrupt = await temporary();
    const notZip = path.join(corrupt, 'not-a-zip.zip');
    await fs.writeFile(notZip, 'definitely not a zip');
    await expect(importProfile(destination, notZip)).rejects.toThrow();

    const invalidZip = path.join(corrupt, 'invalid.zip');
    await writeZip(invalidZip, [{ name: 'profile.json', data: Buffer.from(JSON.stringify(invalid)) }]);
    await expect(importProfile(destination, invalidZip)).rejects.toThrow();
    expect(await audioFiles(destination)).toEqual([]);
  });

  it('rejects a profile whose audio is missing from the archive without leaving copied files', async () => {
    const source = await temporary();
    const destination = await temporary();
    const zipPath = path.join(source, 'missing-audio.zip');
    await writeZip(zipPath, [{ name: 'profile.json', data: Buffer.from(JSON.stringify(profile())) }]);

    await expect(importProfile(destination, zipPath)).rejects.toThrow();
    expect(await audioFiles(destination)).toEqual([]);
  });

  it('fails export when a referenced audio file is missing and leaves no partial archive', async () => {
    const source = await temporary();
    const destination = await temporary();
    const zipPath = path.join(destination, 'backup.zip');

    await expect(exportProfile(source, zipPath, profile())).rejects.toThrow();
    await expect(fs.stat(zipPath)).rejects.toThrow();
  });

  it('ignores unrelated entries in the archive', async () => {
    const source = await temporary();
    const destination = await temporary();
    const zipPath = path.join(source, 'with-extras.zip');
    const bytes = new Uint8Array([7, 8, 9]);
    await writeZip(zipPath, [
      { name: 'profile.json', data: Buffer.from(JSON.stringify(profile())) },
      { name: 'audio/' + path.basename(audioPath('', '../stem')), data: Buffer.from(bytes) },
      { name: '__MACOSX/._profile.json', data: Buffer.from('junk') },
    ]);

    const result = await importProfile(destination, zipPath);
    expect(await fs.readFile(audioPath(destination, result.songs[0].stems[0].id))).toEqual(Buffer.from(bytes));
  });

  it('accepts an empty profile', () => {
    expect(validateProfile({ format: 'stagedeck-profile', version: 1, songs: [], setlists: [] }).songs).toEqual([]);
  });
});
