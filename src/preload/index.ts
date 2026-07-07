import { contextBridge, ipcRenderer } from 'electron'
import type { LibraryAPI } from './index.d'

const api: LibraryAPI = {
  pickFolder: () => ipcRenderer.invoke('library:pickFolder'),
  buildWatchedFolder: (folderPath) => ipcRenderer.invoke('library:buildWatchedFolder', folderPath),
  scanFolder: (folderPath) => ipcRenderer.invoke('library:scanFolder', folderPath),
  findOnDisk: (title, artist) => ipcRenderer.invoke('library:findOnDisk', title, artist),
  scanFile: (filePath) => ipcRenderer.invoke('library:scanFile', filePath),
  pickAudioFile: () => ipcRenderer.invoke('library:pickAudioFile'),

  loadCatalogue: () => ipcRenderer.invoke('catalogue:load'),
  saveCatalogue: (catalogue) => ipcRenderer.invoke('catalogue:save', catalogue),
  listCatalogueBackups: () => ipcRenderer.invoke('catalogue:listBackups'),
  restoreCatalogueBackup: (slot) => ipcRenderer.invoke('catalogue:restoreBackup', slot),

  getWaveformPeaks: (filePath, numPeaks) =>
    ipcRenderer.invoke('audio:getWaveformPeaks', filePath, numPeaks),
  getFileDuration: (filePath) =>
    ipcRenderer.invoke('audio:getFileDuration', filePath),
  analyzeCues: (filePath) =>
    ipcRenderer.invoke('audio:analyzeCues', filePath),
  analyzeFeatures: (filePath, durationSec) =>
    ipcRenderer.invoke('audio:analyzeFeatures', filePath, durationSec),

  getAudioServerPort: () => ipcRenderer.invoke('audio:getServerPort'),

  showInFolder: (filePath) => ipcRenderer.invoke('shell:showInFolder', filePath),
  copyFile: (filePath) => ipcRenderer.invoke('library:copyFile', filePath),
  startDrag: (filePath) => ipcRenderer.sendSync('library:startDrag', filePath),
  setWindowTitle: (title) => ipcRenderer.send('window:setTitle', title),
  setZoom: (factor) => ipcRenderer.send('window:setZoom', factor),

  mfbSearchTracks: (query) => ipcRenderer.invoke('mfb:searchTracks', query),
  mfbGetTrack: (id) => ipcRenderer.invoke('mfb:getTrack', id),
  mfbMatchTracks: (entries) => ipcRenderer.invoke('mfb:matchTracks', entries),
  mfbRankMatches: (entry) => ipcRenderer.invoke('mfb:rankMatches', entry),
  mfbClearCatalogue: () => ipcRenderer.invoke('mfb:clearCatalogue'),
  spotifySearch: (q) => ipcRenderer.invoke('spotify:search', q),
  spotifyImport: (entry) => ipcRenderer.invoke('spotify:import', entry),

  authLogin: (email, password) => ipcRenderer.invoke('auth:login', email, password),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  authMe: () => ipcRenderer.invoke('auth:me'),
  getUserPlaylists: () => ipcRenderer.invoke('auth:getUserPlaylists'),
  getPlaylist: (id) => ipcRenderer.invoke('auth:getPlaylist', id),
  searchPlaylistTracks: (query) => ipcRenderer.invoke('auth:searchPlaylistTracks', query),
  syncLibrary: (trackIds) => ipcRenderer.invoke('auth:syncLibrary', trackIds),

  studioSaveSession: (json, defaultName) => ipcRenderer.invoke('studio:saveSession', json, defaultName),
  studioOpenFile: (filePath) => ipcRenderer.invoke('studio:openFile', filePath),

  // Auto-updater
  quitAndInstall: () => ipcRenderer.send('updater:quitAndInstall'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  simulateUpdate: () => ipcRenderer.send('updater:simulate'),
  onUpdateDownloading: (callback) => {
    const handler = (_: unknown, percent: number): void => callback(percent)
    ipcRenderer.on('updater:downloading', handler)
    return () => ipcRenderer.removeListener('updater:downloading', handler)
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_: unknown, version: string): void => callback(version)
    ipcRenderer.on('updater:downloaded', handler)
    return () => ipcRenderer.removeListener('updater:downloaded', handler)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
