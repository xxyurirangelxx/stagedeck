import React, { useState } from 'react';
import type { Profile, Song, Setlist } from '../../shared/types';
import { audioStorage } from '../audio/audioStorage';
import { ConfirmDialog } from './ConfirmDialog';

export function ProfileControls({ songs, setlists, onImport, disabled }: {
  songs: Song[]; setlists: Setlist[]; onImport: (profile: Profile) => void; disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  if (!window.electronAPI) return null;

  const transfer = async (importing: boolean) => {
    setConfirm(false);
    setBusy(true);
    setMessage('');
    try {
      const api = window.electronAPI!;
      if (importing) {
        const profile = await api.importBackup();
        if (profile) {
          onImport(profile);
          setMessage('Backup importado.');
        }
      } else {
        // Migrate older IndexedDB stems before copying the portable backup.
        for (const song of songs) {
          for (const stem of song.stems) {
            if (stem.fileName && !await audioStorage.getStemAudio(stem.id)) throw new Error(`Áudio não encontrado: ${stem.fileName}`);
          }
        }
        const file = await api.exportBackup({ format: 'stagedeck-profile', version: 1, songs, setlists });
        if (file) setMessage(`Backup salvo em ${file}. Copie o arquivo .zip para o outro PC.`);
      }
    } catch (error) {
      setMessage(`Falha na transferência: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return <>
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-stage-border text-xs">
      <span className="font-semibold">Backup</span>
      <button className="px-3 py-1 rounded-full border border-stage-border disabled:opacity-50" disabled={busy || disabled} onClick={() => transfer(false)}>Exportar backup (.zip)</button>
      <button className="px-3 py-1 rounded-full border border-stage-border disabled:opacity-50" disabled={busy || disabled} onClick={() => setConfirm(true)}>Importar backup (.zip)</button>
      <span role="status" className="text-stage-muted break-all">{busy ? 'Transferindo backup…' : message}</span>
    </div>
    <ConfirmDialog isOpen={confirm} title="Importar backup?" message="O repertório e os setlists atuais serão substituídos. Exporte um backup antes se quiser guardá-lo." confirmLabel="Escolher backup" onConfirm={() => transfer(true)} onCancel={() => setConfirm(false)} />
  </>;
}
