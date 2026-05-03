import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron'
import { join } from 'path'
import { createReadStream } from 'fs'
import { promises as fs } from 'fs'
import { extname } from 'path'
import { createServer } from 'http'
import type { AddressInfo } from 'net'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerScanHandlers } from './ipc/scanHandlers'
import { registerCatalogueHandlers } from './ipc/catalogueHandlers'
import { registerAudioHandlers } from './ipc/audioHandlers'

function audioMime(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return (({
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac',
    '.aiff': 'audio/aiff', '.aif': 'audio/aiff', '.m4a': 'audio/mp4',
  }) as Record<string, string>)[ext] ?? 'audio/mpeg'
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
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Accept-Ranges', 'bytes')
    const filePath = decodeURIComponent(new URL('http://x' + (req.url ?? '')).pathname)
    try {
      const { size } = await fs.stat(filePath)
      const mime = audioMime(filePath)
      const rangeHeader = req.headers['range']
      if (rangeHeader) {
        const m = rangeHeader.match(/bytes=(\d+)-(\d*)/)
        if (!m) { res.writeHead(416); res.end(); return }
        const start = parseInt(m[1], 10)
        const end = m[2] ? parseInt(m[2], 10) : size - 1
        res.writeHead(206, {
          'Content-Type': mime,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(end - start + 1),
        })
        createReadStream(filePath, { start, end }).pipe(res)
      } else {
        res.writeHead(200, { 'Content-Type': mime, 'Content-Length': String(size) })
        createReadStream(filePath).pipe(res)
      }
    } catch {
      res.writeHead(404); res.end()
    }
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

  startAudioServer()
  ipcMain.handle('audio:getServerPort', () => audioServerPort)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerScanHandlers()
  registerCatalogueHandlers()
  registerAudioHandlers()

  ipcMain.on('window:setTitle', (_, title: string) => {
    mainWindow?.setTitle(title)
  })

  ipcMain.handle('shell:showInFolder', (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.on('library:startDrag', (event, filePath: string) => {
    event.sender.startDrag({ file: filePath, icon: createDragIcon() })
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
