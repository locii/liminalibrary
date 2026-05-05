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

  authLogin: (email, password) => ipcRenderer.invoke('auth:login', email, password),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  authMe: () => ipcRenderer.invoke('auth:me'),
  getUserPlaylists: () => ipcRenderer.invoke('auth:getUserPlaylists'),

  studioSaveSession: (json, defaultName) => ipcRenderer.invoke('studio:saveSession', json, defaultName),
  studioOpenFile: (filePath) => ipcRenderer.invoke('studio:openFile', filePath),
}

contextBridge.exposeInMainWorld('electronAPI', api)
