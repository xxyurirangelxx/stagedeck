// Utilitários de duração para os campos do cadastro de música (mm:ss).

export function formatDurationInput(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function parseDurationInput(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 180;
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  }
  const sec = parseInt(trimmed, 10);
  return isNaN(sec) || sec <= 0 ? 180 : sec;
}
