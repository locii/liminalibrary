import { useLibraryStore } from '../store/libraryStore'

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`
  return `${bytes} B`
}

export function FileList(): JSX.Element {
  const allFiles = useLibraryStore((s) => s.files)
  const watchedFolders = useLibraryStore((s) => s.watchedFolders)
  const selectedFolderId = useLibraryStore((s) => s.selectedFolderId)
  const selectedFileId = useLibraryStore((s) => s.selectedFileId)
  const selectFile = useLibraryStore((s) => s.selectFile)
  const scanning = useLibraryStore((s) => s.scanning)

  const files = selectedFolderId === null
    ? allFiles
    : allFiles.filter((f) => {
        const folder = watchedFolders.find((w) => w.id === selectedFolderId)
        return folder ? f.filePath.startsWith(folder.path) : false
      })

  if (scanning && files.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-gray-600">
        Scanning…
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-gray-600">
        No files
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Column headers */}
      <div className="flex items-center px-3 h-7 border-b border-surface-border bg-surface-panel shrink-0 gap-3 text-[10px] text-gray-600 uppercase tracking-wider select-none">
        <span className="flex-1 min-w-0">Name</span>
        <span className="w-12 text-right shrink-0">Duration</span>
        <span className="w-10 text-right shrink-0">Format</span>
        <span className="w-14 text-right shrink-0">Size</span>
      </div>

      {/* File rows */}
      <div className="flex-1 overflow-y-auto">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => selectFile(file.id)}
            onDoubleClick={() => window.electronAPI.showInFolder(file.filePath)}
            className={`w-full flex items-center px-3 py-1.5 gap-3 text-left transition-colors border-b border-surface-border/50 ${
              selectedFileId === file.id
                ? 'bg-accent/15 text-gray-200'
                : 'hover:bg-surface-hover text-gray-400'
            }`}
            title={file.filePath}
          >
            <span className="flex-1 text-[11px] truncate min-w-0">{file.fileName}</span>
            <span className="w-12 text-[11px] text-right shrink-0 tabular-nums">
              {formatDuration(file.duration)}
            </span>
            <span className="w-10 text-[10px] text-right shrink-0 uppercase text-gray-600">
              {file.format}
            </span>
            <span className="w-14 text-[11px] text-right shrink-0 tabular-nums text-gray-600">
              {formatSize(file.fileSize)}
            </span>
          </button>
        ))}
      </div>

      {/* Footer count */}
      <div className="h-6 shrink-0 flex items-center px-3 border-t border-surface-border text-[10px] text-gray-700 select-none">
        {files.length} file{files.length === 1 ? '' : 's'}
        {scanning && <span className="ml-2 text-accent">Scanning…</span>}
      </div>
    </div>
  )
}
