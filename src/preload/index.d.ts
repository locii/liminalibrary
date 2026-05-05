import type { WatchedFolder, LibraryFile, ScanResult, Catalogue, MfbMatch, MfbPlaylist } from '../shared/types'

export interface MfbMatchEntry {
  id: string
  filename: string
  artist: string
  folder_artist: string
  folder_album: string
}

export interface MfbMatchResult {
  id: string
  track: MfbMatch | null
  confidence: number
}

export interface MfbRankResult {
  id: number
  title: string
  artist: string
  album: string
  score: number
}

export interface LibraryAPI {
  // Folder management
  pickFolder: () => Promise<string | null>
  buildWatchedFolder: (folderPath: string) => Promise<WatchedFolder>
  scanFolder: (folderPath: string) => Promise<ScanResult>
  findOnDisk: (title: string, artist: string) => Promise<string[]>
  scanFile: (filePath: string) => Promise<LibraryFile | null>
  pickAudioFile: () => Promise<string | null>

  // Catalogue persistence
  loadCatalogue: () => Promise<Catalogue | null>
  saveCatalogue: (catalogue: Catalogue) => Promise<void>
  listCatalogueBackups: () => Promise<{ slot: number; mtime: string; size: number }[]>
  restoreCatalogueBackup: (slot: number) => Promise<Catalogue | null>

  // Waveform
  getWaveformPeaks: (filePath: string, numPeaks?: number) => Promise<number[]>

  // Audio server
  getAudioServerPort: () => Promise<number>

  // Shell
  showInFolder: (filePath: string) => Promise<void>
  copyFile: (filePath: string) => Promise<void>
  startDrag: (filePath: string) => void
  setWindowTitle: (title: string) => void
  setZoom: (factor: number) => void

  // MusicForBreathwork API
  mfbSearchTracks: (query: string) => Promise<unknown>
  mfbGetTrack: (id: number) => Promise<unknown>
  mfbMatchTracks: (entries: MfbMatchEntry[]) => Promise<MfbMatchResult[]>
  mfbRankMatches: (entry: MfbMatchEntry) => Promise<MfbRankResult[]>
  mfbClearCatalogue: () => Promise<void>

  authLogin: (email: string, password: string) => Promise<{ id: number; name: string; email: string }>
  authLogout: () => Promise<void>
  authMe: () => Promise<{ id: number; name: string; email: string } | null>
  getUserPlaylists: () => Promise<MfbPlaylist[]>

  // Limina Studio
  studioSaveSession: (json: string, defaultName: string) => Promise<string | null>
  studioOpenFile: (filePath: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: LibraryAPI
  }
}
