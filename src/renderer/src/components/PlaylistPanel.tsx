import React from 'react'
import { useLibraryStore } from '../store/libraryStore'
import type { LibraryFile, MfbPlaylist } from '../types'

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function buildLiminaSession(playlist: MfbPlaylist, files: LibraryFile[]): object {
  const fileByMfbId = new Map(
    files.filter((f) => f.mfbTrackId !== null).map((f) => [f.mfbTrackId!, f])
  )

  const trackAId = crypto.randomUUID()
  const trackBId = crypto.randomUUID()

  const tracks = [
    { id: trackAId, name: 'Track A', color: '#75f264', volume: 1, muted: false, solo: false, order: 0 },
    { id: trackBId, name: 'Track B', color: '#4946ec', volume: 1, muted: false, solo: false, order: 1 },
  ]

  let clipIndex = 0
  let cursor = 0
  const clips: object[] = []

  for (const track of playlist.tracks) {
    const file = fileByMfbId.get(track.id)
    if (!file) continue
    clips.push({
      id: crypto.randomUUID(),
      trackId: clipIndex % 2 === 0 ? trackAId : trackBId,
      filePath: file.filePath,
      fileName: file.fileName.replace(/\.[^.]+$/, ''),
      startTime: cursor,
      duration: file.duration,
      trimStart: 0,
      trimEnd: 0,
      fadeIn: 0,
      fadeOut: 0,
      fadeInCurve: 0.5,
      fadeOutCurve: 0.5,
      crossfadeIn: 0,
      crossfadeOut: 0,
      volume: 1,
      automation: [],
    })
    cursor += file.duration
    clipIndex++
  }

  return { tracks, clips, markers: [], sessionLabel: '', trackHeights: {}, laneHeights: {} }
}

export function PlaylistPanel(): JSX.Element {
  const playlists = useLibraryStore((s) => s.playlists)
  const selectedPlaylistId = useLibraryStore((s) => s.selectedPlaylistId)
  const allFiles = useLibraryStore((s) => s.files)
  const selectFile = useLibraryStore((s) => s.selectFile)
  const selectMissingTrack = useLibraryStore((s) => s.selectMissingTrack)
  const selectedFileId = useLibraryStore((s) => s.selectedFileId)
  const selectedMissingTrackId = useLibraryStore((s) => s.selectedMissingTrackId)
  const playlistSessions = useLibraryStore((s) => s.playlistSessions)
  const setPlaylistSession = useLibraryStore((s) => s.setPlaylistSession)
  const previewFileId = useLibraryStore((s) => s.previewFileId)
  const setPreview = useLibraryStore((s) => s.setPreview)

  const [saving, setSaving] = React.useState(false)

  const playlist = selectedPlaylistId !== null
    ? playlists.find((p) => p.id === selectedPlaylistId) ?? null
    : null

  if (!playlist) return <></>

  const fileByMfbId = new Map(
    allFiles.filter((f) => f.mfbTrackId !== null).map((f) => [f.mfbTrackId!, f])
  )

  const matchedCount = playlist.tracks.filter((t) => fileByMfbId.has(t.id)).length
  const missingCount = playlist.tracks.length - matchedCount
  const totalDuration = playlist.tracks.reduce((sum, t) => sum + (fileByMfbId.get(t.id)?.duration ?? 0), 0)

  const matchedQueue = playlist.tracks
    .map((t) => fileByMfbId.get(t.id)?.id)
    .filter((id): id is string => id !== undefined)

  function togglePreview(fileId: string, e: React.MouseEvent): void {
    e.stopPropagation()
    if (previewFileId === fileId) {
      setPreview(null, [])
    } else {
      setPreview(fileId, matchedQueue)
    }
  }

  const savedPath = selectedPlaylistId !== null ? (playlistSessions[selectedPlaylistId] ?? null) : null

  async function handleCreateSession(): Promise<void> {
    if (!playlist) return
    setSaving(true)
    try {
      const session = buildLiminaSession(playlist, allFiles)
      const path = await window.electronAPI.studioSaveSession(
        JSON.stringify(session, null, 2),
        playlist.title,
      )
      if (path) setPlaylistSession(playlist.id, path)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex overflow-hidden flex-col flex-1 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-1 px-4 py-3 border-b shrink-0 border-surface-border bg-surface-panel">
        <div className="flex gap-2 items-center">
          <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 3h8M1 6h6M1 9h4" />
          </svg>
          <h2 className="text-[12px] font-semibold text-gray-200 truncate">{playlist.title}</h2>
        </div>
        <div className="flex gap-3 items-center pl-5">
          <span className="text-[10px] text-gray-500 tabular-nums">
            {matchedCount}/{playlist.tracks.length} tracks
          </span>
          {totalDuration > 0 && (
            <span className="text-[10px] text-gray-600 tabular-nums">{formatDuration(totalDuration)}</span>
          )}
          {missingCount > 0 && (
            <span className="text-[10px] text-gray-600 tabular-nums">{missingCount} missing</span>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 h-7 border-b shrink-0 border-surface-border bg-surface-panel text-[10px] uppercase tracking-wider text-gray-300 select-none">
        <span className="w-5 text-center shrink-0">#</span>
        <span className="flex-1 min-w-0">Title</span>
        <span className="hidden w-28 shrink-0 sm:block">Artist</span>
        <span className="w-10 text-right shrink-0">Dur</span>

        <span className="w-5 shrink-0" />
      </div>

      {/* Track list */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {playlist.tracks.map((track, i) => {
          const file = fileByMfbId.get(track.id) ?? null
          const isPlaying = file !== null && previewFileId === file.id
          const isSelected = file
            ? selectedFileId === file.id
            : selectedMissingTrackId === track.id

          function handleRowClick(): void {
            if (file) selectFile(file.id)
            else selectMissingTrack(isSelected ? null : track.id)
          }

          return (
            <div
              key={track.id}
              onClick={handleRowClick}
              className={`group flex items-center gap-2 px-3 border-b border-surface-border/50 transition-colors cursor-pointer select-none ${
                isSelected
                  ? 'bg-accent/15'
                  : file
                  ? 'hover:bg-surface-hover'
                  : 'opacity-50 hover:opacity-75 hover:bg-surface-hover'
              }`}
              style={{ height: 28 }}
            >
              {/* Index */}
              <span className="w-5 shrink-0 text-center text-[10px] text-gray-600 tabular-nums">{i + 1}</span>

              {/* Preview button — only for matched tracks */}
              <button
                type="button"
                disabled={!file}
                onClick={(e) => file && togglePreview(file.id, e)}
                className={`shrink-0 w-4 h-4 flex items-center justify-center rounded-full border transition-colors ${
                  isPlaying
                    ? 'border-accent text-accent'
                    : 'text-gray-600 border-gray-700 opacity-0 hover:border-accent hover:text-accent group-hover:opacity-100'
                } ${!file ? 'invisible pointer-events-none' : ''}`}
              >
                {isPlaying ? (
                  <svg className="w-2 h-2" viewBox="0 0 8 8" fill="currentColor">
                    <rect x="0.5" y="0" width="2.5" height="8" rx="0.5" />
                    <rect x="5" y="0" width="2.5" height="8" rx="0.5" />
                  </svg>
                ) : (
                  <svg className="w-2 h-2" viewBox="0 0 8 8" fill="currentColor">
                    <path d="M1.5 1l5.5 3-5.5 3V1z" />
                  </svg>
                )}
              </button>

              {/* Title */}
              <span className={`flex-1 min-w-0 text-[11px] truncate ${isSelected ? 'text-gray-100' : file ? 'text-gray-300' : 'text-gray-500'}`}>
                {file?.trackTitle || track.title}
              </span>

              {/* Artist */}
              <span className={`w-28 shrink-0 text-[10px] truncate hidden sm:block ${isSelected ? 'text-gray-400' : 'text-gray-600'}`}>
                {file?.artist || track.artist}
              </span>

              {/* Duration */}
              <span className="w-10 shrink-0 text-right text-[10px] text-gray-600 tabular-nums">
                {file ? formatDuration(file.duration) : '—'}
              </span>

              {/* Link indicator for missing tracks */}
              <div className="flex justify-center w-5 shrink-0">
                {!file && (
                  <svg className="w-3 h-3 text-gray-700 opacity-0 transition-opacity group-hover:opacity-100" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 7.5a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5L5.5 3" />
                    <path d="M7.5 4.5a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5L6.5 9" />
                  </svg>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer — session export */}
      <div className="flex flex-col gap-2 p-3 border-t shrink-0 border-surface-border bg-surface-panel">
        {missingCount > 0 && (
          <p className="text-[10px] text-gray-600">
            {missingCount} track{missingCount === 1 ? '' : 's'} not in library will be skipped.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={matchedCount === 0 || saving}
            onClick={handleCreateSession}
            className="flex-1 py-1.5 text-[11px] font-medium rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {saving ? 'Saving…' : 'Create in Limina Studio'}
          </button>
          {savedPath && (
            <button
              type="button"
              onClick={() => window.electronAPI.studioOpenFile(savedPath)}
              className="px-3 py-1.5 text-[11px] rounded border border-surface-border text-gray-400 hover:text-gray-200 hover:bg-surface-hover transition-colors shrink-0"
              title={savedPath}
            >
              Open
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
