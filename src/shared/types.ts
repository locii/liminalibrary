export type BreathworkPhase = 'opening' | 'buildup' | 'peak' | 'descent' | 'return'

export const BREATHWORK_PHASES: { value: BreathworkPhase; label: string }[] = [
  { value: 'opening',  label: 'Opening'  },
  { value: 'buildup',  label: 'Build-up' },
  { value: 'peak',     label: 'Peak'     },
  { value: 'descent',  label: 'Descent'  },
  { value: 'return',   label: 'Return'   },
]

export interface WatchedFolder {
  id: string
  path: string
  label: string        // last path component
  fileCount: number
  lastScanned: string | null
}

export interface LibraryFile {
  id: string           // stable hash of filePath
  filePath: string
  fileName: string
  folderPath: string
  duration: number     // seconds
  sampleRate: number
  channels: number
  format: string       // 'wav' | 'mp3' | 'flac' | 'aiff' | 'm4a'
  fileSize: number     // bytes
  tags: string[]
  rating: number       // 0–5
  notes: string
  breathworkPhase: BreathworkPhase | null
  dateAdded: string    // ISO
  peaks: number[]      // cached waveform peaks
}

export interface Catalogue {
  version: string
  watchedFolders: WatchedFolder[]
  files: LibraryFile[]
}

export interface ScanResult {
  files: LibraryFile[]
  errors: string[]
}
