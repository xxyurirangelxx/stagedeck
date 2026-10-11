export type AudioRouting = 'L' | 'R' | 'BOTH';

export interface StemTrack {
  id: string;
  name: string;
  type: 'backing' | 'in_ear'; // backing track vs in-ear return (click/guide)
  fileUrl?: string;           // Blob or local file path
  filePath?: string;
  fileName?: string;
  duration?: number;          // Duration of audio stem in seconds
  volume: number;             // 0.0 to 1.5
  panRouting: AudioRouting;   // 'L' = PA, 'R' = In-Ear, 'BOTH' = L+R
  muted: boolean;
  solo: boolean;
}

export interface LyricWord {
  text: string;
  time: number;               // Word start (seconds)
  end: number;                // Word end (seconds)
}

export interface LyricLine {
  id: string;
  time: number;               // Seconds
  chords: string;             // Chord line, e.g. "G      D/F#      Em7"
  text: string;               // Lyric line, e.g. "Luz do sol que clareia o dia"
  raw?: string;
  words?: LyricWord[];        // Word-level timing (karaoke), when available (TTML/enhanced LRC)
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  timeSignature: string;      // e.g. "4/4"
  duration: number;           // in seconds
  stems: StemTrack[];         // up to 8 backing + 2 in-ear
  lyricsChordsLrc: string;    // Synced format string
  parsedLyrics?: LyricLine[];
  createdAt: number;
  updatedAt: number;
}

export interface SetlistItem {
  id: string;
  songId: string;
  order: number;
  customNotes?: string;
}

export interface Setlist {
  id: string;
  title: string;
  description?: string;
  items: SetlistItem[];
  createdAt: number;
  updatedAt: number;
}

export interface Show {
  id: string;
  title: string;
  date: string;
  type: 'show' | 'rehearsal';
  location?: string;
  setlistId?: string;
  notes?: string;
  completed?: boolean;
}

export interface StageAlert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
  timestamp: number;
}

export interface StageSyncPayload {
  type: 'SYNC' | 'ALERT' | 'SONG_CHANGE' | 'PLAY' | 'PAUSE' | 'STOP' | 'SEEK';
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentSong: {
    id: string;
    title: string;
    artist: string;
    bpm: number;
    parsedLyrics: LyricLine[];
  } | null;
  nextSongTitle?: string;
  alert?: StageAlert | null;
}
