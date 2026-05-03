import { ipcMain, dialog } from 'electron'
import { promises as fs } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { parseFile } from 'music-metadata'
import { createHash } from 'crypto'
import type { LibraryFile, ScanResult, WatchedFolder } from '../../shared/types'

const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.flac', '.aiff', '.aif', '.m4a'])

function fileId(filePath: string): string {
  return createHash('sha1').update(filePath).digest('hex').slice(0, 16)
}

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = []
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...await walkDir(full))
    } else if (entry.isFile() && AUDIO_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      results.push(full)
    }
  }
  return results
}

export function registerScanHandlers(): void {
  ipcMain.handle('library:pickFolder', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Add folder to library',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('library:scanFolder', async (_, folderPath: string): Promise<ScanResult> => {
    const files: LibraryFile[] = []
    const errors: string[] = []
    const paths = await walkDir(folderPath)

    await Promise.all(
      paths.map(async (filePath) => {
        try {
          const stat = await fs.stat(filePath)
          const meta = await parseFile(filePath, { skipCovers: true, duration: true })
          files.push({
            id: fileId(filePath),
            filePath,
            fileName: basename(filePath),
            folderPath: dirname(filePath),
            duration: meta.format.duration ?? 0,
            sampleRate: meta.format.sampleRate ?? 0,
            channels: meta.format.numberOfChannels ?? 0,
            format: extname(filePath).replace('.', '').toLowerCase(),
            fileSize: stat.size,
            tags: [],
            rating: 0,
            notes: '',
            breathworkPhase: null,
            dateAdded: new Date().toISOString(),
            peaks: [],
          })
        } catch (e) {
          errors.push(`${filePath}: ${e}`)
        }
      })
    )

    return { files, errors }
  })

  ipcMain.handle('library:buildWatchedFolder', async (_, folderPath: string): Promise<WatchedFolder> => {
    const paths = await walkDir(folderPath)
    return {
      id: fileId(folderPath),
      path: folderPath,
      label: basename(folderPath),
      fileCount: paths.length,
      lastScanned: new Date().toISOString(),
    }
  })
}
