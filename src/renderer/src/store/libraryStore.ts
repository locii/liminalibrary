import { create } from 'zustand'
import type { BreathworkPhase, Catalogue, LibraryFile, MfbMatch, MfbPlaylist, MfbTag, WatchedFolder } from '../types'

function normalizeImportedFile(f: Catalogue['files'][number]): LibraryFile {
  return {
    ...f,
    artist: f.artist ?? '',
    album: f.album ?? '',
    artistPathGuess: f.artistPathGuess ?? '',
    albumPathGuess: f.albumPathGuess ?? '',
    appliedPathGuess: f.appliedPathGuess ?? false,
    trackTitle: f.trackTitle ?? '',
    mfbTrackId: f.mfbTrackId ?? null,
    mfbIndexed: f.mfbIndexed ?? false,
    mfbApplied: f.mfbApplied ?? false,
    audioFeatures: f.audioFeatures ?? null,
  }
}

export interface UserAccount {
  id: number
  name: string
  email: string
}

interface LibraryState {
  watchedFolders: WatchedFolder[]
  files: LibraryFile[]
  removedFiles: LibraryFile[]
  selectedFileId: string | null
  selectedFolderId: string | null  // null = show all
  /** Active tag filters (AND). Empty = no tag filter. */
  selectedTags: string[]
  scanning: boolean
  pendingMatches: Record<string, MfbMatch>
  userAccount: UserAccount | null
  showLoginModal: boolean
  playlists: MfbPlaylist[]
  selectedPlaylistId: number | null
  selectedMissingTrackId: number | null
  playlistSessions: Record<number, string>

  // Actions
  setUserAccount: (user: UserAccount | null) => void
  setShowLoginModal: (show: boolean) => void
  setPlaylists: (playlists: MfbPlaylist[]) => void
  selectPlaylist: (id: number | null) => void
  selectMissingTrack: (id: number | null) => void
  setPlaylistSession: (playlistId: number, filePath: string) => void
  loadCatalogue: (catalogue: Catalogue) => void
  addWatchedFolder: (folder: WatchedFolder) => void
  removeWatchedFolder: (id: string) => void
  addFiles: (files: LibraryFile[]) => void
  updateFile: (id: string, updates: Partial<LibraryFile>) => void
  removeFile: (id: string) => void
  restoreFile: (id: string) => void
  selectFile: (id: string | null) => void
  selectFolder: (id: string | null) => void
  selectTag: (tag: string) => void
  toggleSelectedTag: (tag: string) => void
  clearSelectedTags: () => void
  setScanning: (scanning: boolean) => void
  setPendingMatch: (fileId: string, match: MfbMatch) => void
  applyPendingMatch: (fileId: string) => void
  clearPendingMatch: (fileId: string) => void
  applyAllPendingMatches: () => void
  unlinkMfb: (fileId: string) => void
  resetUnmatchedIndexing: () => void
  resetAllIndexing: () => void
  toCatalogue: () => Catalogue
  unmatchedOnly: boolean
  setUnmatchedOnly: (v: boolean) => void
  loginFlash: boolean
  setLoginFlash: (v: boolean) => void
  previewFileId: string | null
  previewQueue: string[]
  setPreview: (fileId: string | null, queue: string[]) => void
  removeFiles: (ids: string[]) => void
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  watchedFolders: [],
  files: [],
  removedFiles: [],
  selectedFileId: null,
  selectedFolderId: null,
  selectedTags: [],
  scanning: false,
  pendingMatches: {},
  userAccount: null,
  showLoginModal: false,
  playlists: [],
  selectedPlaylistId: null,
  selectedMissingTrackId: null,
  playlistSessions: {},
  unmatchedOnly: false,
  setUnmatchedOnly: (v) => set({ unmatchedOnly: v }),
  loginFlash: false,
  setLoginFlash: (v) => set({ loginFlash: v }),
  previewFileId: null,
  previewQueue: [],

  setUserAccount: (user) => set({ userAccount: user }),
  setShowLoginModal: (show) => set({ showLoginModal: show }),
  setPlaylists: (playlists) => set({ playlists }),
  selectPlaylist: (id) => set({ selectedPlaylistId: id, selectedFolderId: null, selectedTags: [], selectedFileId: null, selectedMissingTrackId: null, unmatchedOnly: false }),
  selectMissingTrack: (id) => set({ selectedMissingTrackId: id, selectedFileId: null }),

  setPlaylistSession: (playlistId, filePath) => set((s) => ({
    playlistSessions: { ...s.playlistSessions, [playlistId]: filePath },
  })),

  loadCatalogue: (catalogue) => set({
    watchedFolders: catalogue.watchedFolders,
    files: catalogue.files.map(normalizeImportedFile),
    removedFiles: (catalogue.removedFiles ?? []).map(normalizeImportedFile),
    playlistSessions: catalogue.playlistSessions ?? {},
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
    const removedIds = new Set(s.removedFiles.map((f) => f.id))
    const existing = new Map(s.files.map((f) => [f.id, f]))
    for (const f of incoming) {
      if (removedIds.has(f.id)) continue
      const prev = existing.get(f.id)
      if (!prev) { existing.set(f.id, f); continue }
      const guessesUnchanged =
        prev.artistPathGuess === f.artistPathGuess &&
        prev.albumPathGuess === f.albumPathGuess
      // Update fresh file metadata; preserve all user-curated and MFB data
      existing.set(f.id, {
        ...prev,
        filePath: f.filePath,
        fileName: f.fileName,
        folderPath: f.folderPath,
        duration: f.duration,
        sampleRate: f.sampleRate,
        channels: f.channels,
        format: f.format,
        fileSize: f.fileSize,
        artistPathGuess: f.artistPathGuess,
        albumPathGuess: f.albumPathGuess,
        appliedPathGuess: guessesUnchanged ? prev.appliedPathGuess : false,
      })
    }
    return { files: [...existing.values()] }
  }),

  updateFile: (id, updates) => set((s) => ({
    files: s.files.map((f) => f.id === id ? { ...f, ...updates } : f),
  })),

  removeFile: (id) => set((s) => {
    const file = s.files.find((f) => f.id === id)
    return {
      files: s.files.filter((f) => f.id !== id),
      removedFiles: file ? [...s.removedFiles, file] : s.removedFiles,
      selectedFileId: s.selectedFileId === id ? null : s.selectedFileId,
    }
  }),

  restoreFile: (id) => set((s) => {
    const file = s.removedFiles.find((f) => f.id === id)
    if (!file) return {}
    return {
      removedFiles: s.removedFiles.filter((f) => f.id !== id),
      files: [...s.files, file],
    }
  }),

  selectFile: (id) => set({ selectedFileId: id, selectedMissingTrackId: null }),

  selectFolder: (id) => set({ selectedFolderId: id, selectedTags: [], selectedFileId: null, selectedPlaylistId: null, unmatchedOnly: false }),

  selectTag: (tag) => set((s) => ({
    selectedTags: s.selectedTags.length === 1 && s.selectedTags[0] === tag ? [] : [tag],
    selectedFolderId: null,
    selectedFileId: null,
    selectedPlaylistId: null,
    unmatchedOnly: false,
  })),

  toggleSelectedTag: (tag) => set((s) => {
    const i = s.selectedTags.indexOf(tag)
    const selectedTags = i >= 0
      ? s.selectedTags.filter((t) => t !== tag)
      : [...s.selectedTags, tag]
    return { selectedTags, selectedFolderId: null, selectedFileId: null, selectedPlaylistId: null }
  }),

  clearSelectedTags: () => set({ selectedTags: [] }),

  setScanning: (scanning) => set({ scanning }),

  setPendingMatch: (fileId, match) => set((s) => ({
    pendingMatches: { ...s.pendingMatches, [fileId]: match },
  })),

  applyPendingMatch: (fileId) => set((s) => {
    const match = s.pendingMatches[fileId]
    if (!match) return {}
    const { [fileId]: _, ...rest } = s.pendingMatches
    const artist = match.artists.map((a: { name: string }) => a.name).join(', ')
    const allTags: MfbTag[] = ([] as MfbTag[]).concat(...Object.values(match.tags))
    const tags = allTags.map((t) => t.name)
    const hourTag = match.tags['Hour']?.[0]
    return {
      pendingMatches: rest,
      files: s.files.map((f) =>
        f.id === fileId
          ? { ...f, artist, album: match.album.title, tags, notes: match.description ?? '',
              trackTitle: match.title,
              mfbTrackId: match.id,
              mfbApplied: true,
              appliedPathGuess: true,
              audioFeatures: match.audio_features ?? null,
              ...(hourTag ? { breathworkPhase: hourTag.slug.en as BreathworkPhase } : {}) }
          : f
      ),
    }
  }),

  clearPendingMatch: (fileId) => set((s) => {
    const { [fileId]: _, ...rest } = s.pendingMatches
    return { pendingMatches: rest }
  }),

  applyAllPendingMatches: () => set((s) => {
    const entries = Object.entries(s.pendingMatches)
    if (entries.length === 0) return {}
    const updatedFiles = s.files.map((f) => {
      const match = s.pendingMatches[f.id]
      if (!match) return f
      const artist = match.artists.map((a: { name: string }) => a.name).join(', ')
      const allTags: MfbTag[] = ([] as MfbTag[]).concat(...Object.values(match.tags))
      const tags = allTags.map((t) => t.name)
      const hourTag = match.tags['Hour']?.[0]
      return {
        ...f, artist, album: match.album.title, tags, notes: match.description ?? '',
        trackTitle: match.title, mfbTrackId: match.id, mfbApplied: true, appliedPathGuess: true,
        audioFeatures: match.audio_features ?? null,
        ...(hourTag ? { breathworkPhase: hourTag.slug.en as BreathworkPhase } : {}),
      }
    })
    return { files: updatedFiles, pendingMatches: {} }
  }),

  unlinkMfb: (fileId) => set((s) => ({
    files: s.files.map((f) =>
      f.id === fileId
        ? {
            ...f,
            mfbTrackId: null,
            mfbApplied: false,
            mfbIndexed: false,
            trackTitle: '',
            breathworkPhase: null,
            tags: [],
            audioFeatures: null,
            notes: '',
          }
        : f
    ),
  })),

  resetUnmatchedIndexing: () => set((s) => ({
    files: s.files.map((f) =>
      !f.mfbTrackId && !s.pendingMatches[f.id] ? { ...f, mfbIndexed: false } : f
    ),
  })),

  resetAllIndexing: () => set((s) => ({
    pendingMatches: {},
    files: s.files.map((f) => ({
      ...f,
      mfbTrackId: null,
      mfbApplied: false,
      mfbIndexed: false,
      trackTitle: '',
      breathworkPhase: null,
      tags: [],
      audioFeatures: null,
      notes: '',
    })),
  })),

  toCatalogue: () => ({
    version: '0.1.0',
    watchedFolders: get().watchedFolders,
    files: get().files.map((f) => ({ ...f, peaks: [] })),
    removedFiles: get().removedFiles.map((f) => ({ ...f, peaks: [] })),
    playlistSessions: get().playlistSessions,
  }),

  setPreview: (fileId, queue) => set({ previewFileId: fileId, previewQueue: fileId === null ? [] : queue }),

  removeFiles: (ids) => set((s) => {
    const idSet = new Set(ids)
    const removed = s.files.filter((f) => idSet.has(f.id))
    return {
      files: s.files.filter((f) => !idSet.has(f.id)),
      removedFiles: [...s.removedFiles, ...removed],
      selectedFileId: idSet.has(s.selectedFileId ?? '') ? null : s.selectedFileId,
    }
  }),
}))
