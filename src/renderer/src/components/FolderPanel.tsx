import { useEffect, useState } from 'react'
import { useLibraryStore } from '../store/libraryStore'
import { phaseColorForTag } from '../types'

interface Props {
  onAddFolder: (folderPath?: string) => void
}

type PanelMode = 'folders' | 'tags' | 'playlists'

/** Story-structure hour tags shown in sidebar order; counts come from library files */
const PRESET_HOUR_TAGS = [
  'Call to adventure',
  'Jumpstart',
  'First Hour',
  'Second Hour Transition',
  'Second Hour',
  'Breakthrough Tension',
  'Breakthrough',
  'Breakthrough Release',
  'Third Hour Transition',
  'Third Hour',
] as const

function buildSidebarTags(files: { tags: readonly string[] }[]): [string, number][] {
  // Count case-insensitively; preserve original casing from first occurrence in files
  const counts = new Map<string, number>()
  const display = new Map<string, string>() // lower → display label

  for (const f of files) {
    for (const t of f.tags) {
      const lower = t.toLowerCase()
      counts.set(lower, (counts.get(lower) ?? 0) + 1)
      if (!display.has(lower)) display.set(lower, t)
    }
  }

  const presetLower = new Set(PRESET_HOUR_TAGS.map((t) => t.toLowerCase()))
  const ordered: [string, number][] = PRESET_HOUR_TAGS.map((tag) => {
    const lower = tag.toLowerCase()
    return [display.get(lower) ?? tag, counts.get(lower) ?? 0]
  })

  const extras = Array.from(counts.keys())
    .filter((lower) => !presetLower.has(lower))
    .sort((a, b) => a.localeCompare(b))
    .map((lower): [string, number] => [display.get(lower)!, counts.get(lower)!])

  return [...ordered, ...extras]
}

export function FolderPanel({ onAddFolder }: Props): JSX.Element {
  const [mode, setMode] = useState<PanelMode>('folders')
  const [isDragOver, setIsDragOver] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [dropWarning, setDropWarning] = useState<string | null>(null)

  const watchedFolders = useLibraryStore((s) => s.watchedFolders)
  const selectedFolderId = useLibraryStore((s) => s.selectedFolderId)
  const selectedTags = useLibraryStore((s) => s.selectedTags)
  const selectedPlaylistId = useLibraryStore((s) => s.selectedPlaylistId)
  const selectFolder = useLibraryStore((s) => s.selectFolder)
  const selectTag = useLibraryStore((s) => s.selectTag)
  const toggleSelectedTag = useLibraryStore((s) => s.toggleSelectedTag)
  const clearSelectedTags = useLibraryStore((s) => s.clearSelectedTags)
  const removeWatchedFolder = useLibraryStore((s) => s.removeWatchedFolder)
  const files = useLibraryStore((s) => s.files)
  const scanning = useLibraryStore((s) => s.scanning)
  const userAccount = useLibraryStore((s) => s.userAccount)
  const playlists = useLibraryStore((s) => s.playlists)
  const setPlaylists = useLibraryStore((s) => s.setPlaylists)
  const selectPlaylist = useLibraryStore((s) => s.selectPlaylist)

  const totalFiles = files.length
  const sidebarTags = buildSidebarTags(files)

  // Fetch playlists whenever the user logs in
  useEffect(() => {
    if (!userAccount) {
      setPlaylists([])
      return
    }
    setLoadingPlaylists(true)
    window.electronAPI.getUserPlaylists()
      .then(setPlaylists)
      .finally(() => setLoadingPlaylists(false))
  }, [userAccount, setPlaylists])

  function switchMode(next: PanelMode): void {
    setMode(next)
    if (next === 'folders') {
      clearSelectedTags()
      setTagQuery('')
      selectPlaylist(null)
    } else if (next === 'tags') {
      selectFolder(null)
      selectPlaylist(null)
    } else {
      selectFolder(null)
      clearSelectedTags()
      setTagQuery('')
    }
  }

  const tagFilter = tagQuery.trim().toLowerCase()
  const filteredTags = tagFilter
    ? sidebarTags.filter(([tag]) => tag.toLowerCase().includes(tagFilter))
    : sidebarTags

  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent): void {
    e.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const paths: string[] = []

    // Prefer items (better directory support in Electron)
    if (e.dataTransfer.items?.length > 0) {
      for (const item of Array.from(e.dataTransfer.items)) {
        const file = item.getAsFile()
        const path = (file as unknown as { path: string } | null)?.path
        if (path) paths.push(path)
      }
    }

    // Fallback to files
    if (paths.length === 0) {
      for (const file of Array.from(e.dataTransfer.files)) {
        const path = (file as unknown as { path: string }).path
        if (path) paths.push(path)
      }
    }

    for (const path of paths) {
      const existing = watchedFolders.find((f) => f.path === path)
      if (existing) {
        setDropWarning(`"${existing.label}" is already in your library`)
        setTimeout(() => setDropWarning(null), 3000)
      } else {
        onAddFolder(path)
      }
    }
  }

  return (
    <div
      data-tour="folder-panel"
      className={`relative flex flex-col w-60 shrink-0 border-r border-surface-border bg-surface-panel transition-colors ${isDragOver ? 'bg-accent/10' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dropWarning && (
        <div className="absolute bottom-12 left-2 right-2 z-20 px-2.5 py-2 rounded border border-yellow-600/40 bg-yellow-900/60 text-[10px] text-yellow-300 leading-snug pointer-events-none">
          {dropWarning}
        </div>
      )}

      {isDragOver && (
        <div className="flex absolute inset-0 z-10 flex-col gap-2 justify-center items-center rounded border-2 border-dashed pointer-events-none border-accent/60">
          <svg className="w-6 h-6 text-accent/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 012-2h3l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          <span className="text-[11px] text-accent/70">Drop folder</span>
        </div>
      )}
      {/* Mode toggle */}
      <div className="flex border-b border-surface-border shrink-0">
        {(['folders', 'tags', 'playlists'] as PanelMode[]).map((m) => (
          <button
            key={m}
            data-tour={m === 'playlists' ? 'playlists-tab' : undefined}
            onClick={() => switchMode(m)}
            className={`flex-1 py-2 text-[10px] uppercase tracking-wider transition-colors ${
              mode === m
                ? 'text-gray-200 bg-surface-hover border-b-2 border-accent -mb-px'
                : 'text-gray-200 hover:text-gray-400'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'folders' && (
        <>
          <button
            type="button"
            onClick={() => selectFolder(null)}
            className={`flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
              selectedFolderId === null
                ? 'bg-accent/15 text-gray-200'
                : 'text-gray-400 hover:bg-surface-hover hover:text-gray-200'
            }`}
          >
            <span className="text-[11px] font-medium">All Files</span>
            <span className="text-[10px] text-gray-600 tabular-nums">{totalFiles}</span>
          </button>


        </>
      )}

      <div className="flex flex-col flex-1 min-h-0">
        {mode === 'tags' && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-surface-border shrink-0">
            <svg className="w-3 h-3 text-gray-600 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5" cy="5" r="3.5" />
              <path d="M8 8l2.5 2.5" />
            </svg>
            <input
              type="text"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              placeholder="Filter tags…"
              className="flex-1 min-w-0 bg-transparent text-[11px] text-gray-300 placeholder-gray-700 outline-none"
            />
            {tagQuery ? (
              <button type="button" onClick={() => setTagQuery('')} className="text-gray-600 transition-colors hover:text-gray-400 shrink-0" title="Clear filter">
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            ) : null}
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto flex-1 min-h-0">
        {mode === 'folders' ? (
          watchedFolders.map((folder) => {
            const count = files.filter((f) => f.filePath.startsWith(folder.path)).length
            return (
              <div key={folder.id} className="relative group">
                <button
                  onClick={() => selectFolder(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                    selectedFolderId === folder.id
                      ? 'bg-accent/15 text-gray-200'
                      : 'text-gray-400 hover:bg-surface-hover hover:text-gray-200'
                  }`}
                >
                  <div className="flex gap-2 items-center min-w-0">
                    <svg className="w-3 h-3 text-gray-600 shrink-0" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M1 3.5A1.5 1.5 0 012.5 2h2l1.5 1.5H9.5A1.5 1.5 0 0111 5v4A1.5 1.5 0 019.5 10.5h-7A1.5 1.5 0 011 9V3.5z" />
                    </svg>
                    <span className="text-[11px] truncate">{folder.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-600 tabular-nums shrink-0 ml-1">{count}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeWatchedFolder(folder.id) }}
                  className="flex absolute right-1 top-1/2 justify-center items-center w-4 h-4 text-gray-600 opacity-0 transition-all -translate-y-1/2 group-hover:opacity-100 hover:text-red-400"
                  title="Remove folder"
                >
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              </div>
            )
          })
        ) : mode === 'tags' ? (
          filteredTags.length === 0 ? (
            <p className="px-3 py-3 text-[10px] text-gray-500">No matching tags</p>
          ) : (
            filteredTags.map(([tag, count]) => {
              const isOn = selectedTags.includes(tag)
              const phaseColor = phaseColorForTag(tag)
              return (
              <button
                key={tag}
                type="button"
                aria-pressed={isOn}
                onClick={(e) => e.shiftKey ? toggleSelectedTag(tag) : selectTag(tag)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                  isOn
                    ? 'text-gray-200 bg-accent/15'
                    : 'text-gray-400 hover:bg-surface-hover hover:text-gray-200'
                }`}
              >
                <div className="flex gap-2 items-center min-w-0">
                  <svg
                    className="w-3 h-3 shrink-0"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                    style={{ color: phaseColor ?? '#4b5563' }}
                  >
                    <path d="M1.5 2A1.5 1.5 0 013 .5h3.879a1.5 1.5 0 011.06.44l3.122 3.12a1.5 1.5 0 010 2.122L7.94 9.31a1.5 1.5 0 01-2.122 0L2.44 5.94A1.5 1.5 0 012 4.879V2zM4 3.5a.5.5 0 100 1 .5.5 0 000-1z" />
                  </svg>
                  <span className="text-[11px] truncate">{tag}</span>
                </div>
                <span className="text-[10px] text-gray-600 tabular-nums shrink-0 ml-1">{count}</span>
              </button>
              )
            })
          )
        ) : !userAccount ? (
          <p className="px-3 py-4 text-[11px] text-gray-600 text-center leading-relaxed">
            Sign in to view your MFB playlists
          </p>
        ) : loadingPlaylists ? (
          <p className="px-3 py-3 text-[10px] text-gray-500">Loading…</p>
        ) : playlists.length === 0 ? (
          <p className="px-3 py-3 text-[10px] text-gray-300">No playlists found</p>
        ) : (
          playlists.map((playlist) => {
            const inLibrary = files.filter(
              (f) => f.mfbTrackId !== null && playlist.trackIds.includes(f.mfbTrackId)
            ).length
            const total = playlist.tracks.length
            return (
              <button
                key={playlist.id}
                type="button"
                onClick={() => selectPlaylist(selectedPlaylistId === playlist.id ? null : playlist.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                  selectedPlaylistId === playlist.id
                    ? 'bg-accent/15 text-gray-200'
                    : 'text-gray-400 hover:bg-surface-hover hover:text-gray-200'
                }`}
              >
                <div className="flex gap-2 items-center min-w-0">
                  <svg className="w-3 h-3 text-gray-600 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 3h8M1 6h6M1 9h4" />
                  </svg>
                  <span className="text-[11px] truncate">{playlist.title}</span>
                </div>
                <span className={`text-[10px] tabular-nums shrink-0 ml-1 ${inLibrary > 0 ? 'text-accent' : 'text-gray-300'}`}>
                  {inLibrary}/{total}
                </span>
              </button>
            )
          })
        )}
        </div>
      </div>

      {/* Footer — add folder (folders mode) · clear tags (tags mode, when any selected) · refresh playlists */}
      <div className="flex flex-col gap-1 p-2 border-t border-surface-border shrink-0">
        {mode === 'tags' && selectedTags.length > 0 && (
          <button
            type="button"
            onClick={() => clearSelectedTags()}
            className="w-full flex items-center justify-center gap-1.5 min-h-[1.5rem] px-2 text-[11px] text-gray-500 hover:text-gray-300 transition-colors rounded hover:bg-surface-hover"
            title="Remove all selected tag filters"
          >
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
            Clear tags ({selectedTags.length})
          </button>
        )}
        {mode === 'playlists' && userAccount && (
          <button
            type="button"
            disabled={loadingPlaylists}
            onClick={() => {
              setLoadingPlaylists(true)
              window.electronAPI.getUserPlaylists()
                .then(setPlaylists)
                .finally(() => setLoadingPlaylists(false))
            }}
            className="w-full flex items-center justify-center gap-1.5 h-6 text-[11px] text-gray-500 hover:text-gray-300 transition-colors rounded hover:bg-surface-hover disabled:opacity-40"
          >
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5" />
              <path d="M6 1.5l2.5-1M6 1.5l1 2.5" />
            </svg>
            Refresh
          </button>
        )}
        {mode === 'folders' && (
          <button
            onClick={() => onAddFolder()}
            disabled={scanning}
            className="w-full flex items-center justify-center gap-1.5 h-6 text-[11px] text-gray-300 hover:text-gray-300 transition-colors rounded hover:bg-surface-hover"
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
        )}
        {totalFiles > 0 && (
          <p className="text-center text-[10px] text-gray-400 mt-1">
            {totalFiles} file{totalFiles === 1 ? '' : 's'} total
          </p>
        )}
      </div>
    </div>
  )
}
