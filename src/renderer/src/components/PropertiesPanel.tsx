import { useState, useRef, useEffect } from 'react'
import { pathGuessUpdatesForApply } from '../lib/libraryTrackDisplay'
import { useLibraryStore } from '../store/libraryStore'
import { mfbTrackUrl } from '../types'
import type { MfbAudioFeatures } from '../types'
import { WaveformPreview } from './WaveformPreview'
import { TrackLookup } from './TrackLookup'

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
  return `${(bytes / 1_000).toFixed(0)} KB`
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex gap-2 justify-between items-baseline">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-[11px] text-gray-200 text-right truncate">{value}</span>
    </div>
  )
}

function EditableRow({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  function commit(): void {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  return (
    <div className="flex gap-2 justify-between items-baseline">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider shrink-0">{label}</span>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
          className="flex-1 min-w-0 text-right text-[11px] text-gray-200 bg-transparent border-b border-accent/50 outline-none"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(value); setEditing(true) }}
          className="text-[11px] text-gray-200 text-right truncate hover:text-white min-w-0 max-w-[180px]"
          title="Click to edit"
        >
          {value.trim() || <span className="text-gray-600">—</span>}
        </button>
      )}
    </div>
  )
}

export function PropertiesPanel(): JSX.Element {
  const files = useLibraryStore((s) => s.files)
  const selectedFileId = useLibraryStore((s) => s.selectedFileId)
  const updateFile = useLibraryStore((s) => s.updateFile)
  const selectFile = useLibraryStore((s) => s.selectFile)
  const removeFile = useLibraryStore((s) => s.removeFile)
  const unlinkMfb = useLibraryStore((s) => s.unlinkMfb)
  const pendingMatches = useLibraryStore((s) => s.pendingMatches)
  const applyPendingMatch = useLibraryStore((s) => s.applyPendingMatch)
  const clearPendingMatch = useLibraryStore((s) => s.clearPendingMatch)

  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [rescanning, setRescanning] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const m4bAudioRef = useRef<HTMLAudioElement | null>(null)
  const [m4bPreviewPlaying, setM4bPreviewPlaying] = useState(false)
  const [m4bPreviewLoading, setM4bPreviewLoading] = useState(false)

  const file = files.find((f) => f.id === selectedFileId)
  const pendingMatch = file ? pendingMatches[file.id] : undefined
  const pendingMatchLinkedCount = pendingMatch ? files.filter((f) => f.mfbTrackId === pendingMatch.id).length : 0
  const duplicates = file?.mfbTrackId !== null && file?.mfbTrackId !== undefined
    ? files.filter((f) => f.id !== file.id && f.mfbTrackId === file.mfbTrackId)
    : []

  useEffect(() => {
    setConfirmDelete(false)
    setConfirmUnlink(false)
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    m4bAudioRef.current?.pause()
    m4bAudioRef.current = null
    setM4bPreviewPlaying(false)
    setM4bPreviewLoading(false)
  }, [selectedFileId])

  async function toggleM4bPreview(): Promise<void> {
    if (m4bPreviewPlaying || m4bAudioRef.current) {
      m4bAudioRef.current?.pause()
      m4bAudioRef.current = null
      setM4bPreviewPlaying(false)
      return
    }
    if (m4bPreviewLoading || !pendingMatch) return
    setM4bPreviewLoading(true)
    try {
      const data = await window.electronAPI.mfbGetTrack(pendingMatch.id) as { preview_url?: string | null }
      if (!data.preview_url) return
      const audio = new Audio(data.preview_url)
      m4bAudioRef.current = audio
      audio.addEventListener('ended', () => { m4bAudioRef.current = null; setM4bPreviewPlaying(false) })
      await audio.play()
      window.dispatchEvent(new CustomEvent('app:audio-start', { detail: 'm4b-preview' }))
      setM4bPreviewPlaying(true)
    } catch { /* ignore */ } finally {
      setM4bPreviewLoading(false)
    }
  }

  function armConfirmDelete(): void {
    setConfirmDelete(true)
    setConfirmUnlink(false)
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    confirmTimerRef.current = setTimeout(() => setConfirmDelete(false), 5000)
  }

  function armConfirmUnlink(): void {
    setConfirmUnlink(true)
    setConfirmDelete(false)
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    confirmTimerRef.current = setTimeout(() => setConfirmUnlink(false), 5000)
  }

  function cancelConfirm(): void {
    setConfirmDelete(false)
    setConfirmUnlink(false)
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
  }

  if (!file) {
    return (
      <div className="flex justify-center items-center border-l shrink-0">
        <p className="text-[11px] text-gray-400 text-center px-4">
          Select a file to see its properties
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full border-l border-surface-border bg-surface-panel">

      {/* Pending match banner */}
      {pendingMatch && (
        <div className="mx-3 mt-3 mb-0 rounded border border-accent/30 bg-accent/8 p-2.5 flex flex-col gap-1.5 shrink-0">
          <div className="flex gap-2 justify-between items-center">
            <span className="text-[10px] text-accent uppercase tracking-wider font-medium">Pending Match</span>
            <button
              type="button"
              onClick={() => clearPendingMatch(file.id)}
              title="Dismiss pending match"
              className="text-gray-500 transition-colors hover:text-gray-400"
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-gray-200 truncate">{pendingMatch.title}</p>
          <p className="text-[10px] text-gray-300 truncate">
            {pendingMatch.artists.map((a) => a.name).join(', ')} · {pendingMatch.album.title}
          </p>
          {pendingMatchLinkedCount > 0 && (
            <p className="text-[10px] text-gray-500">
              {pendingMatchLinkedCount} file{pendingMatchLinkedCount === 1 ? '' : 's'} already linked to this track
            </p>
          )}
          <div className="flex gap-2 mt-0.5">
            <button
              type="button"
              onClick={() => applyPendingMatch(file.id)}
              className="flex-1 py-1 text-[11px] rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              Apply to Track
            </button>
            <button
              type="button"
              onClick={toggleM4bPreview}
              disabled={m4bPreviewLoading}
              title={m4bPreviewPlaying ? 'Stop preview' : 'Preview track'}
              className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
                m4bPreviewPlaying
                  ? 'border-accent text-accent'
                  : 'border-gray-600 text-gray-600 hover:border-accent hover:text-accent'
              }`}
            >
              {m4bPreviewLoading ? (
                <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 1v2M6 9v2M1 6h2M9 6h2" strokeLinecap="round" />
                </svg>
              ) : m4bPreviewPlaying ? (
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
                  <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
                </svg>
              ) : (
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => window.open(mfbTrackUrl(pendingMatch.id, pendingMatch.title))}
              title="View on Music for Breathwork"
              className="px-2.5 py-1 text-[11px] rounded border border-surface-border text-gray-400 hover:text-gray-200 hover:bg-surface-hover transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8A1.5 1.5 0 0 0 13 12.5V9M9.5 2H14v4.5M14 2L7.5 8.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Track header: name + action icons */}
      <div className="flex gap-1 items-center px-3 py-2 min-w-0 border-b border-surface-border shrink-0">
        <p className="text-[11px] text-gray-200 font-medium truncate flex-1 min-w-0" title={file.filePath}>
          {file.trackTitle || file.fileName}
        </p>

        {/* Copy file */}
        <button
          type="button"
          onClick={async () => {
            await window.electronAPI.copyFile(file.filePath)
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
            setCopied(true)
            copyTimerRef.current = setTimeout(() => setCopied(false), 3000)
          }}
          title="Copy file to clipboard"
          className="flex justify-center items-center w-6 h-6 text-gray-500 rounded transition-colors shrink-0 hover:text-gray-300 hover:bg-surface-hover"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.5" />
            <path d="M10.5 5.5V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5V9A1.5 1.5 0 0 0 3.5 10.5H5.5" />
          </svg>
        </button>

        {/* Remove from library — requires confirm */}
        {confirmDelete ? (
          <div className="flex items-center gap-0.5 shrink-0">
            <span className="text-[10px] text-red-400 mr-0.5">Remove?</span>
            <button
              type="button"
              onClick={() => removeFile(file.id)}
              title="Confirm removal"
              className="px-1.5 h-5 text-[10px] font-medium text-red-400 hover:text-red-300 rounded hover:bg-red-500/15 transition-colors"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={cancelConfirm}
              title="Cancel"
              className="px-1.5 h-5 text-[10px] text-gray-400 hover:text-gray-300 rounded hover:bg-surface-hover transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={armConfirmDelete}
            title="Remove from library"
            className="flex justify-center items-center w-6 h-6 text-gray-500 rounded transition-colors shrink-0 hover:text-red-400 hover:bg-surface-hover"
          >
            <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5h10M6 5V3.5h4V5M5 5v7.5h6V5H5zM7 8v2.5M9 8v2.5" />
            </svg>
          </button>
        )}

        {file.mfbTrackId && (
          <>
            {/* Re-fetch from MFB */}
            <button
              type="button"
              disabled={rescanning}
              onClick={async () => {
                if (!file.mfbTrackId) return
                setRescanning(true)
                try {
                  const data = (await window.electronAPI.mfbGetTrack(file.mfbTrackId)) as {
                    id: number; title: string; description: string
                    artists: { id: number; name: string }[]
                    album: { id: number; title: string; image_url: string }
                    tags: Record<string, { id: number; name: string; slug: { en: string } }[]>
                    audio_features?: MfbAudioFeatures
                    bandcamp_url?: string
                    beatport_url?: string
                  }
                  const artist = data.artists.map((a) => a.name).join(', ')
                  const tags = Object.values(data.tags).flat().map((t) => t.name)
                  const hourSlug = data.tags['Hour']?.[0]?.slug?.en
                  updateFile(file.id, {
                    artist, album: data.album.title, tags,
                    notes: data.description ?? '',
                    trackTitle: data.title,
                    mfbApplied: true,
                    appliedPathGuess: true,
                    audioFeatures: data.audio_features ?? null,
                    bandcampUrl: data.bandcamp_url ?? null,
                    beatportUrl: data.beatport_url ?? null,
                    ...(hourSlug ? { breathworkPhase: hourSlug as import('../types').BreathworkPhase } : {}),
                  })
                  if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
                  setRefreshed(true)
                  refreshTimerRef.current = setTimeout(() => setRefreshed(false), 3000)
                } catch { /* ignore */ } finally {
                  setRescanning(false)
                }
              }}
              title="Re-fetch data from Music for Breathwork"
              className="flex justify-center items-center w-6 h-6 text-gray-500 rounded transition-colors shrink-0 hover:text-accent hover:bg-surface-hover disabled:opacity-40"
            >
              <svg className={`w-3.5 h-3.5 ${rescanning ? 'animate-spin' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
                <path d="M8 2.5l3-1.5M8 2.5l1.5 3" />
              </svg>
            </button>

            {/* Open on MFB site */}
            <button
              type="button"
              onClick={() => window.open(mfbTrackUrl(file.mfbTrackId!, file.trackTitle || String(file.mfbTrackId)))}
              title="View on Music for Breathwork website"
              className="flex justify-center items-center w-6 h-6 text-gray-500 rounded transition-colors shrink-0 hover:text-accent hover:bg-surface-hover"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8A1.5 1.5 0 0 0 13 12.5V9M9.5 2H14v4.5M14 2L7.5 8.5" />
              </svg>
            </button>

            {/* Unlink MFB match — requires confirm */}
            {confirmUnlink ? (
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="text-[10px] text-orange-400 mr-0.5">Unlink?</span>
                <button
                  type="button"
                  onClick={() => { unlinkMfb(file.id); cancelConfirm() }}
                  title="Confirm unlink"
                  className="px-1.5 h-5 text-[10px] font-medium text-orange-400 hover:text-orange-300 rounded hover:bg-orange-500/15 transition-colors"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={cancelConfirm}
                  title="Cancel"
                  className="px-1.5 h-5 text-[10px] text-gray-400 hover:text-gray-300 rounded hover:bg-surface-hover transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={armConfirmUnlink}
                title="Unlink Music for Breathwork match (wrong match)"
                className="flex justify-center items-center w-6 h-6 text-gray-500 rounded transition-colors shrink-0 hover:text-red-400 hover:bg-surface-hover"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 9.5l-2 2a2.12 2.12 0 0 0 3 3l2-2M9.5 6.5l2-2a2.12 2.12 0 0 0-3-3l-2 2M5.5 10.5l5-5M2 2l12 12" />
                </svg>
              </button>
            )}
          </>
        )}

        {/* Close panel */}
        <button
          type="button"
          onClick={() => selectFile(null)}
          title="Close panel"
          className="flex justify-center items-center w-6 h-6 text-gray-500 rounded transition-colors shrink-0 hover:text-gray-400 hover:bg-surface-hover"
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>

      {/* Toast notifications */}
      {copied && (
        <div className="mx-3 mt-2 px-2.5 py-1.5 rounded border border-accent/30 bg-accent/8 flex items-center gap-1.5 shrink-0">
          <svg className="w-3 h-3 text-accent shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6l3 3 5-5" />
          </svg>
          <span className="text-[10px] text-accent">File copied to clipboard</span>
        </div>
      )}
      {refreshed && (
        <div className="mx-3 mt-2 px-2.5 py-1.5 rounded border border-accent/30 bg-accent/8 flex items-center gap-1.5 shrink-0">
          <svg className="w-3 h-3 text-accent shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6l3 3 5-5" />
          </svg>
          <span className="text-[10px] text-accent">Track data updated from Music for Breathwork</span>
        </div>
      )}

      {/* Waveform */}
      <div className="shrink-0">
        <WaveformPreview
          key={file.id}
          fileId={file.id}
          filePath={file.filePath}
          duration={file.duration}
          peaks={file.peaks}
          sampleRate={file.sampleRate}
        />
      </div>

      {/* Scrollable metadata */}
      <div className="overflow-y-auto flex-1">

      {file.trackTitle && (
        <div className="flex gap-2 justify-between items-baseline px-3 py-2 border-b border-surface-border">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider shrink-0">File</span>
          <span className="text-[11px] text-gray-300 truncate" title={file.fileName}>{file.fileName}</span>
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-col gap-2 p-3 border-b border-surface-border">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Info</span>
        <EditableRow label="Artist" value={file.artist} onSave={(v) => updateFile(file.id, { artist: v })} />
        <EditableRow label="Album" value={file.album} onSave={(v) => updateFile(file.id, { album: v })} />
        <Row label="Duration" value={formatDuration(file.duration)} />
        <Row label="Format" value={file.format.toUpperCase()} />
        <Row label="Sample rate" value={`${(file.sampleRate / 1000).toFixed(1)} kHz`} />
        <Row label="Channels" value={file.channels === 2 ? 'Stereo' : file.channels === 1 ? 'Mono' : String(file.channels)} />
        <Row label="File size" value={formatSize(file.fileSize)} />
      </div>

      {!file.appliedPathGuess && (file.artistPathGuess.trim() || file.albumPathGuess.trim()) && (
        <div className="flex flex-col gap-2 p-3 border-b border-surface-border">
          {/* Header + swap button */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">From folder layout</span>
            {file.artistPathGuess.trim() && file.albumPathGuess.trim() && !file.appliedPathGuess && (
              <button
                type="button"
                onClick={() => updateFile(file.id, {
                  artistPathGuess: file.albumPathGuess,
                  albumPathGuess: file.artistPathGuess,
                })}
                title="Swap artist / album"
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4h10M8 1l3 3-3 3M11 8H1M4 5l-3 3 3 3" />
                </svg>
                Swap
              </button>
            )}
          </div>

          {/* Folder names */}
          <div className="flex flex-col gap-1">
            {file.artistPathGuess.trim() && (
              <div className="flex gap-2 justify-between items-baseline">
                <span className="text-[10px] text-gray-400 uppercase shrink-0 tracking-wider">Artist</span>
                <span className={`text-[11px] text-gray-200 truncate ${!file.appliedPathGuess ? 'italic' : ''}`} title={file.artistPathGuess}>
                  {file.artistPathGuess.trim()}
                </span>
              </div>
            )}
            {file.albumPathGuess.trim() && (
              <div className="flex gap-2 justify-between items-baseline">
                <span className="text-[10px] text-gray-400 uppercase shrink-0 tracking-wider">Album</span>
                <span className={`text-[11px] text-gray-200 truncate ${!file.appliedPathGuess ? 'italic' : ''}`} title={file.albumPathGuess}>
                  {file.albumPathGuess.trim()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {!file.appliedPathGuess && (
            file.artistPathGuess.trim() && file.albumPathGuess.trim() ? (
              /* Both present — single apply */
              <button
                type="button"
                onClick={() => updateFile(file.id, pathGuessUpdatesForApply(file))}
                className="w-full py-1.5 text-[11px] rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                Apply folder names to track
              </button>
            ) : (
              /* Only one folder — let user decide which field it maps to */
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => updateFile(file.id, {
                    artist: file.artistPathGuess.trim() || file.albumPathGuess.trim(),
                    appliedPathGuess: true,
                  })}
                  className="flex-1 py-1.5 text-[11px] rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  Use as Artist
                </button>
                <button
                  type="button"
                  onClick={() => updateFile(file.id, {
                    album: file.artistPathGuess.trim() || file.albumPathGuess.trim(),
                    appliedPathGuess: true,
                  })}
                  className="flex-1 py-1.5 text-[11px] rounded border border-surface-border text-gray-300 hover:bg-surface-hover transition-colors"
                >
                  Use as Album
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-col gap-2 p-3 border-b border-surface-border">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Tags</span>
        <div className="flex flex-wrap gap-1">
          {file.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-surface-hover border border-surface-border text-gray-200"
            >
              {tag}
              <button
                onClick={() => updateFile(file.id, { tags: file.tags.filter((t) => t !== tag) })}
                title={`Remove tag "${tag}"`}
                className="text-gray-500 hover:text-gray-300"
              >×</button>
            </span>
          ))}
          <TagInput onAdd={(tag) => {
            if (!file.tags.includes(tag)) updateFile(file.id, { tags: [...file.tags, tag] })
          }} />
        </div>
      </div>

      {/* Audio features */}
      {file.audioFeatures && (
        <div className="flex flex-col gap-2 p-3 border-b border-surface-border">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Audio Features</span>
          <div className="flex flex-col gap-1.5">
            <AudioFeatureBar label="Intensity" value={file.audioFeatures.intensity} />
            <AudioFeatureBar label="Activation" value={file.audioFeatures.activation_intensity} />
            <AudioFeatureBar label="Affective" value={file.audioFeatures.affective_intensity} />
            <AudioFeatureBar label="Spaciousness" value={Number(file.audioFeatures.spaciousness)} />
            <AudioFeatureBar label="Tension" value={Number(file.audioFeatures.tension)} />
            <AudioFeatureLabelRow label="Energy" text={file.audioFeatures.energy_label} value={file.audioFeatures.energy} />
            <AudioFeatureLabelRow label="Valence" text={file.audioFeatures.valence_label} value={file.audioFeatures.valence} />
            <AudioFeatureLabelRow label="Danceability" text={file.audioFeatures.danceability_label} value={file.audioFeatures.danceability} />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 w-20 shrink-0">Tempo</span>
              <span className="text-[10px] text-gray-200">{file.audioFeatures.tempo_label}</span>
              <span className="text-[10px] text-gray-400 tabular-nums">{file.audioFeatures.tempo.toFixed(0)} BPM</span>
            </div>
          </div>
        </div>
      )}

      {(file.bandcampUrl || file.beatportUrl) && (
        <div className="flex flex-col gap-2 p-3 border-b border-surface-border">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Buy</span>
          <div className="flex gap-2">
            {file.bandcampUrl && (
              <button
                type="button"
                onClick={() => window.open(file.bandcampUrl!)}
                className="px-2.5 py-1 text-[10px] rounded border border-surface-border text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
              >
                Bandcamp
              </button>
            )}
            {file.beatportUrl && (
              <button
                type="button"
                onClick={() => window.open(file.beatportUrl!)}
                className="px-2.5 py-1 text-[10px] rounded border border-surface-border text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
              >
                Beatport
              </button>
            )}
          </div>
        </div>
      )}

      {/* Duplicate MFB match */}
      {duplicates.length > 0 && (
        <div className="flex flex-col gap-2 p-3 border-b border-surface-border">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-yellow-500/80 uppercase tracking-wider">Duplicate Match</span>
            <span className="text-[10px] text-gray-500">({duplicates.length + 1} files)</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            {duplicates.length} other {duplicates.length === 1 ? 'file is' : 'files are'} linked to the same Music for Breathwork track listing.
            Only one file per track is used when building sessions — unlink the duplicates to resolve.
          </p>

          {/* Current file */}
          <DupeRow
            id={file.id}
            fileName={file.fileName}
            folderPath={file.folderPath}
            format={file.format}
            sampleRate={file.sampleRate}
            fileSize={file.fileSize}
            isCurrent
            onUnlink={() => unlinkMfb(file.id)}
          />

          {/* Other files */}
          {duplicates.map((d) => (
            <DupeRow
              key={d.id}
              id={d.id}
              fileName={d.fileName}
              folderPath={d.folderPath}
              format={d.format}
              sampleRate={d.sampleRate}
              fileSize={d.fileSize}
              onPrefer={() => {
                unlinkMfb(file.id)
                for (const other of duplicates) { if (other.id !== d.id) unlinkMfb(other.id) }
                selectFile(d.id)
              }}
              onUnlink={() => unlinkMfb(d.id)}
              onRemove={() => removeFile(d.id)}
            />
          ))}

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => { for (const d of duplicates) unlinkMfb(d.id) }}
              className="flex-1 py-1.5 text-[11px] rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              Unlink the other{duplicates.length > 1 ? ` ${duplicates.length}` : ''}
            </button>
            <button
              type="button"
              onClick={() => { for (const d of duplicates) removeFile(d.id) }}
              className="flex-1 py-1.5 text-[11px] rounded border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-colors"
            >
              Remove the other{duplicates.length > 1 ? ` ${duplicates.length}` : ''}
            </button>
          </div>
        </div>
      )}

      {/* Lookup track data from musicforbreathwork.com */}
      <TrackLookup
        key={file.id}
        fileId={file.id}
        fileName={file.fileName}
        artist={file.artist}
        folderArtist={file.artistPathGuess}
        folderAlbum={file.albumPathGuess}
        alreadyMatched={file.mfbTrackId !== null && file.mfbTrackId !== undefined}
      />

      {/* Notes */}
      <div className="flex flex-col gap-2 p-3">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Notes</span>
        <textarea
          value={file.notes}
          onChange={(e) => updateFile(file.id, { notes: e.target.value })}
          placeholder="Add notes…"
          rows={4}
          className="w-full text-[11px] text-gray-200 bg-surface-hover border border-surface-border rounded px-2 py-1.5 resize-none outline-none focus:border-accent/50 placeholder-gray-700 leading-relaxed"
        />
      </div>

      </div>{/* end scrollable metadata */}
    </div>
  )
}

function DupeRow({
  id, fileName, folderPath, format, sampleRate, fileSize, isCurrent, onPrefer, onUnlink, onRemove,
}: {
  id: string
  fileName: string
  folderPath: string
  format: string
  sampleRate: number
  fileSize: number
  isCurrent?: boolean
  onPrefer?: () => void
  onUnlink?: () => void
  onRemove?: () => void
}): JSX.Element {
  const previewFileId = useLibraryStore((s) => s.previewFileId)
  const setPreview = useLibraryStore((s) => s.setPreview)
  const isPlaying = previewFileId === id
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  return (
    <div className={`flex flex-col gap-1 px-2 py-1.5 rounded border ${isCurrent ? 'border-accent/30 bg-accent/8' : 'border-surface-border bg-surface-hover'}`}>
      <div
        className="flex items-center gap-1.5 min-w-0"
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setTooltipPos({ x: rect.left, y: rect.top })
        }}
        onMouseLeave={() => setTooltipPos(null)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (isPlaying) setPreview(null, [])
            else setPreview(id, [id])
          }}
          className={`shrink-0 w-4 h-4 flex items-center justify-center rounded-full border transition-colors ${
            isPlaying
              ? 'border-accent text-accent'
              : 'border-gray-600 text-gray-600 hover:border-accent hover:text-accent'
          }`}
          title={isPlaying ? 'Stop preview' : 'Preview'}
        >
          {isPlaying ? (
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
              <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
            </svg>
          )}
        </button>
        {isCurrent && <span className="text-[9px] text-accent uppercase tracking-wider shrink-0">current</span>}
        <span className="text-[11px] text-gray-200 truncate flex-1 min-w-0">{fileName}</span>
        {tooltipPos && (
          <div
            className="fixed z-[999] bg-black rounded p-2 text-[10px] text-gray-200 shadow-lg pointer-events-none border border-white/10 max-w-xs"
            style={{ left: tooltipPos.x, top: tooltipPos.y - 8, transform: 'translateY(-100%)' }}
          >
            <div className="font-medium break-all">{fileName}</div>
            <div className="text-gray-400 mt-0.5 break-all">{folderPath}</div>
            <div className="text-gray-500 mt-0.5 uppercase">{format} · {(sampleRate / 1000).toFixed(0)} kHz · {formatSize(fileSize)}</div>
          </div>
        )}
      </div>
      <span className="text-[10px] text-gray-500 truncate" title={folderPath}>{folderPath}</span>
      <div className="flex gap-2 items-center">
        <span className="text-[10px] text-gray-500 uppercase">{format}</span>
        <span className="text-[10px] text-gray-500">{(sampleRate / 1000).toFixed(0)} kHz</span>
        <span className="text-[10px] text-gray-500">{formatSize(fileSize)}</span>
        {(onPrefer || onUnlink || onRemove) && (
          <div className="flex gap-2 ml-auto shrink-0">
            {!isCurrent && onPrefer && (
              <button type="button" onClick={onPrefer}
                className="text-[10px] text-accent hover:text-white transition-colors font-medium">
                Use this file
              </button>
            )}
            {onUnlink && (
              <button type="button" onClick={onUnlink}
                className="text-[10px] text-gray-500 hover:text-gray-200 transition-colors">
                Unlink
              </button>
            )}
            {!isCurrent && onRemove && (
              <button type="button" onClick={onRemove}
                className="text-[10px] text-gray-500 hover:text-red-400 transition-colors">
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TagInput({ onAdd }: { onAdd: (tag: string) => void }): JSX.Element {
  return (
    <input
      type="text"
      placeholder="+ tag"
      className="w-16 text-[10px] bg-transparent text-gray-400 placeholder-gray-700 outline-none"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault()
          const val = (e.target as HTMLInputElement).value.trim()
          if (val) { onAdd(val); (e.target as HTMLInputElement).value = '' }
        }
      }}
    />
  )
}

function AudioFeatureBar({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-[10px] text-gray-400 w-20 shrink-0">{label}</span>
      <div className="overflow-hidden flex-1 h-1 rounded-full bg-surface-hover">
        <div className="h-full rounded-full bg-accent/50" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="text-[10px] text-gray-300 tabular-nums w-8 text-right">{value.toFixed(2)}</span>
    </div>
  )
}

function AudioFeatureLabelRow({ label, text, value }: { label: string; text: string; value: number }): JSX.Element {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-[10px] text-gray-400 w-20 shrink-0">{label}</span>
      <div className="overflow-hidden flex-1 h-1 rounded-full bg-surface-hover">
        <div className="h-full rounded-full bg-accent/50" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="text-[10px] text-gray-200 text-right truncate max-w-[90px]">{text}</span>
    </div>
  )
}
