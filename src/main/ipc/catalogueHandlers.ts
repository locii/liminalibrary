import { ipcMain, app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { Catalogue } from '../../shared/types'

function cataloguePath(): string {
  return join(app.getPath('userData'), 'catalogue.json')
}

export function registerCatalogueHandlers(): void {
  ipcMain.handle('catalogue:load', async (): Promise<Catalogue | null> => {
    try {
      const json = await fs.readFile(cataloguePath(), 'utf-8')
      return JSON.parse(json) as Catalogue
    } catch {
      return null
    }
  })

  ipcMain.handle('catalogue:save', async (_, catalogue: Catalogue): Promise<void> => {
    const path = cataloguePath()
    await fs.mkdir(join(path, '..'), { recursive: true })
    await fs.writeFile(path, JSON.stringify(catalogue, null, 2), 'utf-8')
  })
}
