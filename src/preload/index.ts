import { contextBridge, ipcRenderer } from 'electron'
import type { LibraryAPI } from './index.d'

const api: LibraryAPI = {
  pickFolder: () => ipcRenderer.invoke('library:pickFolder'),
  buildWatchedFolder: (folderPath) => ipcRenderer.invoke('library:buildWatchedFolder', folderPath),
  scanFolder: (folderPath) => ipcRenderer.invoke('library:scanFolder', folderPath),

  loadCatalogue: () => ipcRenderer.invoke('catalogue:load'),
  saveCatalogue: (catalogue) => ipcRenderer.invoke('catalogue:save', catalogue),

  getWaveformPeaks: (filePath, numPeaks) =>
    ipcRenderer.invoke('audio:getWaveformPeaks', filePath, numPeaks),

  getAudioServerPort: () => ipcRenderer.invoke('audio:getServerPort'),

  showInFolder: (filePath) => ipcRenderer.invoke('shell:showInFolder', filePath),
  startDrag: (filePath) => ipcRenderer.send('library:startDrag', filePath),
  setWindowTitle: (title) => ipcRenderer.send('window:setTitle', title),
}

contextBridge.exposeInMainWorld('electronAPI', api)
