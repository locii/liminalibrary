import { create } from 'zustand'
import type { WatchedFolder, LibraryFile, Catalogue } from '../types'

interface LibraryState {
  watchedFolders: WatchedFolder[]
  files: LibraryFile[]
  selectedFileId: string | null
  selectedFolderId: string | null  // null = show all
  scanning: boolean

  // Actions
  loadCatalogue: (catalogue: Catalogue) => void
  addWatchedFolder: (folder: WatchedFolder) => void
  removeWatchedFolder: (id: string) => void
  addFiles: (files: LibraryFile[]) => void
  updateFile: (id: string, updates: Partial<LibraryFile>) => void
  selectFile: (id: string | null) => void
  selectFolder: (id: string | null) => void
  setScanning: (scanning: boolean) => void
  toCatalogue: () => Catalogue
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  watchedFolders: [],
  files: [],
  selectedFileId: null,
  selectedFolderId: null,
  scanning: false,

  loadCatalogue: (catalogue) => set({
    watchedFolders: catalogue.watchedFolders,
    files: catalogue.files,
  }),

  addWatchedFolder: (folder) => set((s) => ({
    watchedFolders: [...s.watchedFolders.filter((f) => f.id !== folder.id), folder],
  })),

  removeWatchedFolder: (id) => set((s) => ({
    watchedFolders: s.watchedFolders.filter((f) => f.id !== id),
    files: s.files.filter((f) => {
      const folder = s.watchedFolders.find((w) => w.id === id)
      return !folder || !f.filePath.startsWith(folder.path)
    }),
    selectedFolderId: s.selectedFolderId === id ? null : s.selectedFolderId,
  })),

  addFiles: (incoming) => set((s) => {
    const existing = new Map(s.files.map((f) => [f.id, f]))
    for (const f of incoming) existing.set(f.id, f)
    return { files: [...existing.values()] }
  }),

  updateFile: (id, updates) => set((s) => ({
    files: s.files.map((f) => f.id === id ? { ...f, ...updates } : f),
  })),

  selectFile: (id) => set({ selectedFileId: id }),

  selectFolder: (id) => set({ selectedFolderId: id, selectedFileId: null }),

  setScanning: (scanning) => set({ scanning }),

  toCatalogue: () => ({
    version: '0.1.0',
    watchedFolders: get().watchedFolders,
    files: get().files,
  }),
}))
