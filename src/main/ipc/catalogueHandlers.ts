import { ipcMain, app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { Catalogue } from '../../shared/types'

const BACKUP_COUNT = 5

function cataloguePath(): string {
  return join(app.getPath('userData'), 'catalogue.json')
}

function backupPath(n: number): string {
  return join(app.getPath('userData'), `catalogue.${n}.json`)
}

async function rotateBackups(current: string): Promise<void> {
  // Shift older backups down: 4→5, 3→4, 2→3, 1→2
  for (let i = BACKUP_COUNT - 1; i >= 1; i--) {
    try {
      await fs.copyFile(backupPath(i), backupPath(i + 1))
    } catch {
      // older slot may not exist yet — that's fine
    }
  }
  // current → 1
  try {
    await fs.copyFile(current, backupPath(1))
  } catch {
    // current may not exist on first run
  }
}

export function registerCatalogueHandlers(): void {
  ipcMain.handle('catalogue:load', async (): Promise<Catalogue | null> => {
    const path = cataloguePath()
    try {
      const json = await fs.readFile(path, 'utf-8')
      const catalogue = JSON.parse(json) as Catalogue
      // Back up only when the file has real content
      if (catalogue.watchedFolders?.length > 0 || catalogue.files?.length > 0) {
        rotateBackups(path).catch(() => {})
      }
      return catalogue
    } catch {
      return null
    }
  })

  ipcMain.handle('catalogue:save', async (_, catalogue: Catalogue): Promise<void> => {
    const path = cataloguePath()
    await fs.mkdir(join(path, '..'), { recursive: true })
    await fs.writeFile(path, JSON.stringify(catalogue, null, 2), 'utf-8')
  })

  ipcMain.handle('catalogue:listBackups', async (): Promise<{ slot: number; mtime: string; size: number }[]> => {
    const results: { slot: number; mtime: string; size: number }[] = []
    for (let i = 1; i <= BACKUP_COUNT; i++) {
      try {
        const stat = await fs.stat(backupPath(i))
        results.push({ slot: i, mtime: stat.mtime.toISOString(), size: stat.size })
      } catch { /* slot missing */ }
    }
    return results
  })

  ipcMain.handle('catalogue:restoreBackup', async (_, slot: number): Promise<Catalogue | null> => {
    try {
      const json = await fs.readFile(backupPath(slot), 'utf-8')
      return JSON.parse(json) as Catalogue
    } catch {
      return null
    }
  })
}
