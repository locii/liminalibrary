import type { WatchedFolder, LibraryFile, ScanResult, Catalogue } from '../shared/types'

export interface LibraryAPI {
  // Folder management
  pickFolder: () => Promise<string | null>
  buildWatchedFolder: (folderPath: string) => Promise<WatchedFolder>
  scanFolder: (folderPath: string) => Promise<ScanResult>

  // Catalogue persistence
  loadCatalogue: () => Promise<Catalogue | null>
  saveCatalogue: (catalogue: Catalogue) => Promise<void>

  // Waveform
  getWaveformPeaks: (filePath: string, numPeaks?: number) => Promise<number[]>

  // Audio server
  getAudioServerPort: () => Promise<number>

  // Shell
  showInFolder: (filePath: string) => Promise<void>
  setWindowTitle: (title: string) => void
}

declare global {
  interface Window {
    electronAPI: LibraryAPI
  }
}
