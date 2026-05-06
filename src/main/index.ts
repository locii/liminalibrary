import { app, shell, BrowserWindow, ipcMain, nativeImage, clipboard, Notification } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { createServer } from 'http'
import { spawn } from 'child_process'
import type { AddressInfo } from 'net'
import ffmpegPath from 'ffmpeg-static'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { registerScanHandlers } from './ipc/scanHandlers'
import { registerCatalogueHandlers } from './ipc/catalogueHandlers'
import { registerAudioHandlers } from './ipc/audioHandlers'
import { registerMfbHandlers } from './ipc/mfbHandlers'
import { registerAuthHandlers } from './ipc/authHandlers'
import { registerStudioHandlers } from './ipc/studioHandlers'

function initAutoUpdater(): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-downloaded', (info) => {
    new Notification({
      title: 'Limina Library update ready',
      body: `v${info.version} downloaded — will install on next launch`,
    }).show()
  })
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10_000)
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1_000)
}


function createDragIcon(): Electron.NativeImage {
  const size = 32
  const buf = Buffer.alloc(size * size * 4)
  const bars = [4, 7, 10, 13, 16, 19, 22, 25, 28]
  const heights = [10, 18, 24, 20, 28, 22, 16, 12, 8]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      buf[i] = 26; buf[i + 1] = 26; buf[i + 2] = 26; buf[i + 3] = 220
      for (let b = 0; b < bars.length; b++) {
        if (x === bars[b] || x === bars[b] + 1) {
          const top = Math.round(16 - heights[b] / 2)
          const bot = Math.round(16 + heights[b] / 2)
          if (y >= top && y <= bot) {
            buf[i] = 99; buf[i + 1] = 102; buf[i + 2] = 241; buf[i + 3] = 255
          }
        }
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

let audioServerPort = 0

function startAudioServer(): void {
  const ffmpeg = (ffmpegPath as string).replace('app.asar', 'app.asar.unpacked')

  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    const url = new URL('http://x' + (req.url ?? ''))
    const filePath = decodeURIComponent(url.pathname)
    try {
      await fs.stat(filePath)
    } catch {
      res.writeHead(404); res.end(); return
    }

    // Convert to WAV for browser compatibility. Only resample to 48kHz when the
    // source is >48kHz (e.g. 96kHz AIFF/FLAC), which would play at 2x otherwise.
    const sr = parseInt(url.searchParams.get('sr') ?? '0') || 0
    const ffArgs = [
      '-i', filePath,
      '-vn', '-ac', '2',
      ...(sr > 48000 ? ['-ar', '48000'] : []),
      '-f', 'wav', 'pipe:1',
    ]

    res.writeHead(200, { 'Content-Type': 'audio/wav' })
    const ff = spawn(ffmpeg, ffArgs)
    ff.stdout.pipe(res)
    ff.stderr.resume()
    req.on('close', () => ff.kill())
    ff.on('error', () => { res.end() })
  })
  server.listen(0, '127.0.0.1', () => {
    audioServerPort = (server.address() as AddressInfo).port
  })
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'hiddenInset',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    mainWindow!.setTitle('Limina Library')
    mainWindow!.webContents.setVisualZoomLevelLimits(1, 1)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.limina.library')

  if (!is.dev) initAutoUpdater()

  startAudioServer()
  ipcMain.handle('audio:getServerPort', () => audioServerPort)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerScanHandlers()
  registerCatalogueHandlers()
  registerAudioHandlers()
  registerMfbHandlers()
  registerAuthHandlers()
  registerStudioHandlers()

  ipcMain.on('window:setTitle', (_, title: string) => {
    mainWindow?.setTitle(title)
  })

  ipcMain.on('window:setZoom', (_, factor: number) => {
    mainWindow?.webContents.setZoomFactor(factor)
  })

  ipcMain.handle('shell:showInFolder', (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('library:copyFile', (_, filePath: string) => {
    clipboard.writeText(filePath)
  })

  ipcMain.on('library:startDrag', (event, filePath: string) => {
    event.sender.startDrag({ file: filePath, icon: createDragIcon() })
    event.returnValue = null  // required for sendSync
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
