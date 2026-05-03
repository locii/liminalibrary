import { useLibraryStore } from '../store/libraryStore'

interface Props {
  onAddFolder: () => void
}

function formatCount(n: number): string {
  return `${n} file${n === 1 ? '' : 's'}`
}

export function FolderPanel({ onAddFolder }: Props): JSX.Element {
  const watchedFolders = useLibraryStore((s) => s.watchedFolders)
  const selectedFolderId = useLibraryStore((s) => s.selectedFolderId)
  const selectFolder = useLibraryStore((s) => s.selectFolder)
  const removeWatchedFolder = useLibraryStore((s) => s.removeWatchedFolder)
  const files = useLibraryStore((s) => s.files)
  const scanning = useLibraryStore((s) => s.scanning)

  const totalFiles = files.length

  return (
    <div className="flex flex-col w-52 shrink-0 border-r border-surface-border bg-surface-panel">
      {/* All files */}
      <button
        onClick={() => selectFolder(null)}
        className={`flex items-center justify-between px-3 py-2 text-left transition-colors ${
          selectedFolderId === null
            ? 'bg-accent/15 text-gray-200'
            : 'text-gray-400 hover:bg-surface-hover hover:text-gray-200'
        }`}
      >
        <span className="text-[11px] font-medium">All Files</span>
        <span className="text-[10px] text-gray-600 tabular-nums">{totalFiles}</span>
      </button>

      <div className="h-px bg-surface-border mx-2 my-1" />

      {/* Watched folders */}
      <div className="flex-1 overflow-y-auto">
        {watchedFolders.map((folder) => {
          const folderFiles = files.filter((f) => f.filePath.startsWith(folder.path))
          return (
            <div key={folder.id} className="group relative">
              <button
                onClick={() => selectFolder(folder.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                  selectedFolderId === folder.id
                    ? 'bg-accent/15 text-gray-200'
                    : 'text-gray-400 hover:bg-surface-hover hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-3 h-3 shrink-0 text-gray-600" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M1 3.5A1.5 1.5 0 012.5 2h2l1.5 1.5H9.5A1.5 1.5 0 0111 5v4A1.5 1.5 0 019.5 10.5h-7A1.5 1.5 0 011 9V3.5z" />
                  </svg>
                  <span className="text-[11px] truncate">{folder.label}</span>
                </div>
                <span className="text-[10px] text-gray-600 tabular-nums shrink-0 ml-1">
                  {folderFiles.length}
                </span>
              </button>
              {/* Remove button — visible on hover */}
              <button
                onClick={(e) => { e.stopPropagation(); removeWatchedFolder(folder.id) }}
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-gray-600 hover:text-red-400 transition-all"
                title="Remove folder"
              >
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-surface-border p-2">
        <button
          onClick={onAddFolder}
          disabled={scanning}
          className="w-full flex items-center justify-center gap-1.5 h-6 text-[11px] text-gray-500 hover:text-gray-300 transition-colors rounded hover:bg-surface-hover"
        >
          {scanning ? (
            <span className="text-accent">Scanning…</span>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 2v8M2 6h8" />
              </svg>
              Add Folder
            </>
          )}
        </button>
        {totalFiles > 0 && (
          <p className="text-center text-[10px] text-gray-700 mt-1">
            {formatCount(totalFiles)} total
          </p>
        )}
      </div>
    </div>
  )
}
