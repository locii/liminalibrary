import type { WatchedFolder, LibraryFile, ScanResult, Catalogue, MfbMatch, MfbPlaylist, MfbPlaylistDetail, PlaylistTrackSearchResult, MfbAudioFeatures, SpotifySearchCandidate, SessionPresetDTO, SessionPresetPayload } from '../shared/types'

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

export interface SpotifyImportEntry {
  /** Pick an exact track (from spotifySearch); when set, title/duration are ignored. */
  spotify_id?: string
  title?: string
  artist?: string
  album?: string
  duration?: number
}

export interface SpotifyImportResult {
  id: number | null
  spotify_id?: string
  enriching?: boolean
  reason?: 'no_spotify_match' | 'exists_private'
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
  loadCatalogue: () => Promise<{ data: Catalogue | null; restoredFromBackup: boolean }>
  saveCatalogue: (catalogue: Catalogue) => Promise<void>
  listCatalogueBackups: () => Promise<{ slot: number; mtime: string; size: number }[]>
  restoreCatalogueBackup: (slot: number) => Promise<Catalogue | null>

  // Waveform
  getWaveformPeaks: (filePath: string, numPeaks?: number) => Promise<number[]>
  getFileDuration: (filePath: string) => Promise<number>
  analyzeCues: (filePath: string) => Promise<{ introEndMs: number | null; outroStartMs: number | null }>
  analyzeFeatures: (filePath: string, durationSec: number) => Promise<{ features: MfbAudioFeatures | null; retriable: boolean }>

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
  mfbGetUpdatedMap: () => Promise<Record<number, string>>
  spotifySearch: (q: string) => Promise<{ candidates: SpotifySearchCandidate[]; error?: string }>
  spotifyImport: (entry: SpotifyImportEntry) => Promise<SpotifyImportResult>
  listSystemPresets: () => Promise<SessionPresetDTO[]>
  saveSystemPreset: (preset: { name: string; payload: SessionPresetPayload; sort_order?: number }) => Promise<SessionPresetDTO>
  deleteSystemPreset: (id: number) => Promise<{ deleted: boolean }>

  authLogin: (email: string, password: string) => Promise<{ id: number; name: string; email: string }>
  authLogout: () => Promise<void>
  authMe: () => Promise<{ id: number; name: string; email: string } | null>
  getUserPlaylists: () => Promise<MfbPlaylist[]>
  getPlaylist: (id: number) => Promise<MfbPlaylistDetail | null>
  searchPlaylistTracks: (query: string) => Promise<PlaylistTrackSearchResult[]>
  syncLibrary: (trackIds: number[]) => Promise<{ synced: boolean; count: number }>

  // Limina Studio
  studioSaveSession: (json: string, defaultName: string) => Promise<string | null>
  studioOpenFile: (filePath: string) => Promise<void>

  // Auto-updater
  quitAndInstall: () => void
  checkForUpdates: () => Promise<{ hasUpdate: boolean; version: string | null }>
  simulateUpdate: () => void
  onUpdateDownloading: (callback: (percent: number) => void) => () => void
  onUpdateDownloaded: (callback: (version: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: LibraryAPI
  }
}
