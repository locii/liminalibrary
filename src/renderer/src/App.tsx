import { useEffect, useCallback } from 'react'
import { useLibraryStore } from './store/libraryStore'
import { FolderPanel } from './components/FolderPanel'
import { FileList } from './components/FileList'
import { PropertiesPanel } from './components/PropertiesPanel'

export default function App(): JSX.Element {
  const watchedFolders = useLibraryStore((s) => s.watchedFolders)
  const loadCatalogue = useLibraryStore((s) => s.loadCatalogue)
  const addWatchedFolder = useLibraryStore((s) => s.addWatchedFolder)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const setScanning = useLibraryStore((s) => s.setScanning)
  const toCatalogue = useLibraryStore((s) => s.toCatalogue)

  // Load catalogue on mount
  useEffect(() => {
    window.electronAPI.loadCatalogue().then((catalogue) => {
      if (catalogue) loadCatalogue(catalogue)
    })
  }, [loadCatalogue])

  // Persist catalogue whenever state changes
  useEffect(() => {
    return useLibraryStore.subscribe(() => {
      window.electronAPI.saveCatalogue(useLibraryStore.getState().toCatalogue())
    })
  }, [])

  const handleAddFolder = useCallback(async () => {
    const folderPath = await window.electronAPI.pickFolder()
    if (!folderPath) return

    setScanning(true)
    try {
      const [folder, result] = await Promise.all([
        window.electronAPI.buildWatchedFolder(folderPath),
        window.electronAPI.scanFolder(folderPath),
      ])
      addWatchedFolder(folder)
      addFiles(result.files)
    } finally {
      setScanning(false)
    }
  }, [addWatchedFolder, addFiles, setScanning])

  const hasContent = watchedFolders.length > 0

  return (
    <div className="flex flex-col h-full text-gray-200 bg-surface-base">
      {/* macOS traffic-light drag region */}
      <div
        className="h-7 shrink-0 bg-surface-panel"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-10 shrink-0 bg-surface-panel border-b border-surface-border">
        <span className="text-xs font-semibold tracking-widest uppercase text-gray-300 select-none">
          Limina Library
        </span>
        <button
          onClick={handleAddFolder}
          className="flex items-center gap-1.5 h-6 px-3 text-[11px] text-gray-300 bg-surface-hover hover:bg-surface-border border border-surface-border rounded transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 2v8M2 6h8" />
          </svg>
          Add Folder
        </button>
      </div>

      {hasContent ? (
        <div className="flex flex-1 min-h-0">
          <FolderPanel onAddFolder={handleAddFolder} />
          <FileList />
          <PropertiesPanel />
        </div>
      ) : (
        <WelcomeScreen onAddFolder={handleAddFolder} />
      )}
    </div>
  )
}

function WelcomeScreen({ onAddFolder }: { onAddFolder: () => void }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center px-8">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-panel border border-surface-border">
        <svg className="w-8 h-8 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 012-2h3l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          <path d="M12 11v4M10 13h4" />
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-sm font-semibold text-gray-200 tracking-wide">No folders yet</h1>
        <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
          Add a folder containing your audio files and Limina Library will scan and catalogue them.
        </p>
      </div>
      <button
        onClick={onAddFolder}
        className="flex items-center gap-2 px-4 py-2 text-xs text-white bg-accent hover:bg-accent/80 rounded transition-colors"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 2v8M2 6h8" />
        </svg>
        Add Folder
      </button>
    </div>
  )
}
