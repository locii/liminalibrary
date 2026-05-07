import { app, shell, BrowserWindow, ipcMain, nativeImage, clipboard, Notification } from 'electron'
import { join } from 'path'
import { promises as fs, createReadStream } from 'fs'
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
  autoUpdater.on('checking-for-update', () => console.log('[updater] checking'))
  autoUpdater.on('update-not-available', () => console.log('[updater] up to date'))
  autoUpdater.on('error', (e) => console.log('[updater] error', e.message))
  autoUpdater.on('update-available', (info) => {
    console.log('[updater] update available', info.version)
    mainWindow?.webContents.send('updater:downloading', 0)
  })
  autoUpdater.on('download-progress', (p) => {
    const pct = Math.round(p.percent)
    console.log('[updater] progress', pct + '%')
    mainWindow?.webContents.send('updater:downloading', pct)
  })
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] downloaded', info.version)
    mainWindow?.webContents.send('updater:downloaded', info.version)
  })
  ipcMain.on('updater:quitAndInstall', () => autoUpdater.quitAndInstall())
  setTimeout(() => autoUpdater.checkForUpdates().catch((e) => console.log('[updater] check failed', e.message)), 10_000)
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

function mimeForAudioExt(ext: string): string {
  switch (ext) {
    case 'mp3': return 'audio/mpeg'
    case 'm4a':
    case 'mp4':
    case 'aac': return 'audio/mp4'
    case 'ogg':
    case 'oga': return 'audio/ogg'
    case 'opus': return 'audio/opus'
    case 'webm': return 'audio/webm'
    case 'wav': return 'audio/wav'
    case 'flac': return 'audio/flac'
    default: return 'application/octet-stream'
  }
}

// Chromium's HTMLAudioElement WAV decoder reliably plays only 16-bit integer PCM.
// Float32 / 24-bit / WAVE_FORMAT_EXTENSIBLE files fall back to the device output
// rate (48kHz on macOS), causing 44.1kHz files to play ~9% fast. Peek the RIFF
// header so we can route those through ffmpeg→FLAC instead of serving raw.
async function inspectWavFormat(filePath: string): Promise<{ formatCode: number; bitsPerSample: number } | null> {
  let fd: import('fs').promises.FileHandle | undefined
  try {
    fd = await fs.open(filePath, 'r')
    const buf = Buffer.alloc(65536)
    const { bytesRead } = await fd.read(buf, 0, 65536, 0)
    if (bytesRead < 12) return null
    const riff = buf.toString('ascii', 0, 4)
    const wave = buf.toString('ascii', 8, 12)
    if ((riff !== 'RIFF' && riff !== 'RF64' && riff !== 'BW64') || wave !== 'WAVE') return null
    let pos = 12
    while (pos + 8 <= bytesRead) {
      const chunkId = buf.toString('ascii', pos, pos + 4)
      const chunkSize = buf.readUInt32LE(pos + 4)
      if (chunkId === 'fmt ' && pos + 8 + 16 <= bytesRead) {
        const formatCode = buf.readUInt16LE(pos + 8)
        const bitsPerSample = buf.readUInt16LE(pos + 8 + 14)
        // WAVE_FORMAT_EXTENSIBLE stores the real format code in the sub-format GUID.
        if (formatCode === 0xfffe && chunkSize >= 40 && pos + 8 + 26 <= bytesRead) {
          return { formatCode: buf.readUInt16LE(pos + 8 + 24), bitsPerSample }
        }
        return { formatCode, bitsPerSample }
      }
      pos += 8 + chunkSize + (chunkSize & 1)
    }
    return null
  } catch {
    return null
  } finally {
    await fd?.close()
  }
}

function startAudioServer(): void {
  const ffmpeg = (ffmpegPath as string).replace('app.asar', 'app.asar.unpacked')

  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    const url = new URL('http://x' + (req.url ?? ''))
    const filePath = decodeURIComponent(url.pathname)
    let stat
    try {
      stat = await fs.stat(filePath)
    } catch {
      res.writeHead(404); res.end(); return
    }

    // Direct-stream formats Chromium decodes reliably; transcode the rest.
    // WAV is a special case: only 16-bit PCM int is reliable — float/24-bit get
    // misdecoded at the device output rate, so route those through ffmpeg→FLAC.
    const sr = parseInt(url.searchParams.get('sr') ?? '0') || 0
    const ext = (filePath.split('.').pop() ?? '').toLowerCase()
    const browserNative = new Set(['mp3', 'm4a', 'mp4', 'aac', 'ogg', 'oga', 'opus', 'webm', 'flac'])
    const needsResample = sr > 48000
    let wavSafe = false
    if (ext === 'wav') {
      const fmt = await inspectWavFormat(filePath)
      wavSafe = !!(fmt && fmt.formatCode === 1 && fmt.bitsPerSample === 16)
    }
    const needsTranscode = needsResample || !(browserNative.has(ext) || (ext === 'wav' && wavSafe))

    if (!needsTranscode) {
      const total = stat.size
      const range = req.headers.range
      const m = range ? /^bytes=(\d+)-(\d*)/.exec(range) : null
      const contentType = mimeForAudioExt(ext)
      if (m) {
        const start = parseInt(m[1], 10)
        const end = m[2] ? parseInt(m[2], 10) : total - 1
        res.writeHead(206, {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Content-Length': end - start + 1,
        })
        createReadStream(filePath, { start, end }).pipe(res)
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Content-Length': total,
        })
        createReadStream(filePath).pipe(res)
      }
      return
    }

    // Transcode to FLAC — its framed bitstream streams cleanly without the
    // WAV-header placeholder size that subtly skews Chromium playback speed.
    // Resample to 48kHz only when the source exceeds it (Chromium misdecodes >48kHz).
    const ffArgs = [
      '-i', filePath,
      '-vn', '-ac', '2',
      ...(needsResample ? ['-ar', '48000'] : []),
      '-f', 'flac', '-compression_level', '0', 'pipe:1',
    ]
    res.writeHead(200, { 'Content-Type': 'audio/flac' })
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

  if (is.dev) {
    ipcMain.on('updater:simulate', () => {
      let pct = 0
      const tick = setInterval(() => {
        pct = Math.min(100, pct + 10)
        mainWindow?.webContents.send('updater:downloading', pct)
        if (pct >= 100) {
          clearInterval(tick)
          setTimeout(() => mainWindow?.webContents.send('updater:downloaded', '9.9.9'), 300)
        }
      }, 300)
    })
  }

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
