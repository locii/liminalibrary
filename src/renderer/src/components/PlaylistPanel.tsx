import React, { useEffect, useState } from 'react'
import { useLibraryStore } from '../store/libraryStore'
import type { LibraryFile, MfbPlaylistDetail, MfbPlaylistTrack } from '../types'

const SEGMENT_COLORS = [
  '#6366f1', '#3b82f6', '#14b8a6', '#22c55e',
  '#f59e0b', '#ef4444', '#a855f7', '#ec4899',
]

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const ANALYSIS_WINDOW_S = 0.5
const FADE_OUT_THRESHOLD = 0.025  // ~-32 dBFS: below = silence tail
const LOUD_IN_THRESHOLD = 0.1     // ~-20 dBFS: above on first window = "bang" start
const MAX_FADEOUT_S = 20
const MAX_FADEIN_S = 10
const MIN_FADE_S = 0.5
const ANALYZE_TIMEOUT_MS = 15_000

function windowRMS(data: Float32Array, startSample: number, windowSamples: number): number {
  let sum = 0
  const end = Math.min(startSample + windowSamples, data.length)
  for (let i = startSample; i < end; i++) sum += data[i] * data[i]
  return Math.sqrt(sum / (end - startSample))
}

async function analyzeTransitions(filePath: string): Promise<{ fadeIn: number; fadeOut: number }> {
  const defaults = { fadeIn: 3, fadeOut: 8 }
  const work = async (): Promise<{ fadeIn: number; fadeOut: number }> => {
    const res = await fetch(`file://${filePath}`)
    const arrayBuffer = await res.arrayBuffer()
    const ctx = new AudioContext()
    const audio = await ctx.decodeAudioData(arrayBuffer)
    ctx.close()

    const sr = audio.sampleRate
    const winSamples = Math.floor(ANALYSIS_WINDOW_S * sr)

    // Mix to mono
    const mono = new Float32Array(audio.length)
    for (let ch = 0; ch < audio.numberOfChannels; ch++) {
      const chData = audio.getChannelData(ch)
      for (let i = 0; i < audio.length; i++) mono[i] += chData[i] / audio.numberOfChannels
    }

    // Scan from end backwards — find last window with signal above threshold
    let fadeOut = MAX_FADEOUT_S
    const outScanStart = Math.max(0, mono.length - Math.floor(MAX_FADEOUT_S * sr))
    for (let i = mono.length - winSamples; i >= outScanStart; i -= winSamples) {
      if (windowRMS(mono, i, winSamples) > FADE_OUT_THRESHOLD) {
        fadeOut = (mono.length - i) / sr
        break
      }
    }

    // Check first window for "bang" start; else scan forward for first loud window
    let fadeIn: number
    if (windowRMS(mono, 0, winSamples) > LOUD_IN_THRESHOLD) {
      fadeIn = MIN_FADE_S
    } else {
      fadeIn = MAX_FADEIN_S
      const inScanEnd = Math.min(mono.length, Math.floor(MAX_FADEIN_S * sr))
      for (let i = winSamples; i < inScanEnd; i += winSamples) {
        if (windowRMS(mono, i, winSamples) > LOUD_IN_THRESHOLD) {
          fadeIn = i / sr
          break
        }
      }
    }

    return { fadeIn, fadeOut }
  }

  const timeout = new Promise<{ fadeIn: number; fadeOut: number }>((resolve) =>
    setTimeout(() => resolve(defaults), ANALYZE_TIMEOUT_MS)
  )
  return Promise.race([work().catch(() => defaults), timeout])
}

async function buildLiminaSession(detail: MfbPlaylistDetail, files: LibraryFile[]): Promise<object> {
  const fileByMfbId = new Map(
    files.filter((f) => f.mfbTrackId !== null).map((f) => [f.mfbTrackId!, f])
  )

  // Collect matched files in playlist order and analyze all in parallel
  const orderedFiles = detail.segments
    .flatMap((s) => s.tracks)
    .map((t) => fileByMfbId.get(t.id))
    .filter((f): f is LibraryFile => f !== undefined)

  const analyses = await Promise.all(orderedFiles.map((f) => analyzeTransitions(f.filePath)))
  const transitionMap = new Map(orderedFiles.map((f, i) => [f.filePath, analyses[i]]))

  const trackAId = crypto.randomUUID()
  const trackBId = crypto.randomUUID()

  const tracks = [
    { id: trackAId, name: 'Track A', color: '#75f264', volume: 1, muted: false, solo: false, order: 0 },
    { id: trackBId, name: 'Track B', color: '#4946ec', volume: 1, muted: false, solo: false, order: 1 },
  ]

  let clipIndex = 0
  let cursor = 0
  let isFirstClip = true
  let prevFadeOut = 0
  const clips: object[] = []
  const segments: object[] = []

  detail.segments.forEach((segment, segIdx) => {
    const segStart = cursor
    let segLastClipEnd = segStart

    for (const track of segment.tracks) {
      const file = fileByMfbId.get(track.id)
      if (!file) continue
      const analysis = transitionMap.get(file.filePath) ?? { fadeIn: 3, fadeOut: 8 }
      // Cap fadeOut to half the duration; cap fadeIn to the overlap window from prev track
      const fadeOut = Math.min(analysis.fadeOut, file.duration * 0.5)
      const fadeIn = isFirstClip ? 0 : Math.min(analysis.fadeIn, prevFadeOut)
      const startTime = cursor  // cursor is already the overlap point from prev fadeOut

      segLastClipEnd = startTime + file.duration
      clips.push({
        id: crypto.randomUUID(),
        trackId: clipIndex % 2 === 0 ? trackAId : trackBId,
        filePath: file.filePath,
        fileName: file.fileName.replace(/\.[^.]+$/, ''),
        startTime,
        duration: file.duration,
        trimStart: 0,
        trimEnd: 0,
        fadeIn,
        fadeOut,
        fadeInCurve: 0.5,
        fadeOutCurve: 0.5,
        crossfadeIn: 0,
        crossfadeOut: 0,
        volume: 1,
        automation: [],
      })

      // Advance cursor to fadeOut seconds before this clip ends (overlap point for next clip)
      cursor = startTime + file.duration - fadeOut
      prevFadeOut = fadeOut
      isFirstClip = false
      clipIndex++
    }

    if (segLastClipEnd > segStart) {
      segments.push({
        id: crypto.randomUUID(),
        name: segment.name,
        startTime: segStart,
        endTime: segLastClipEnd,
        color: SEGMENT_COLORS[segIdx % SEGMENT_COLORS.length],
      })
    }
  })

  return { tracks, clips, segments, sessionLabel: '', trackHeights: {}, laneHeights: {} }
}

function flatTracks(detail: MfbPlaylistDetail): MfbPlaylistTrack[] {
  return detail.segments.flatMap((s) => s.tracks)
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

  const setPlaylistDetail = useLibraryStore((s) => s.setPlaylistDetail)
  const detail = useLibraryStore((s) => s.selectedPlaylistDetail)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)

  const playlist = selectedPlaylistId !== null
    ? playlists.find((p) => p.id === selectedPlaylistId) ?? null
    : null

  useEffect(() => {
    if (selectedPlaylistId === null) { setPlaylistDetail(null); return }
    setPlaylistDetail(null)
    setLoadingDetail(true)
    window.electronAPI.getPlaylist(selectedPlaylistId)
      .then((d) => setPlaylistDetail(d))
      .finally(() => setLoadingDetail(false))
  }, [selectedPlaylistId])

  if (!playlist) return <></>

  if (loadingDetail) {
    return (
      <div className="flex flex-1 items-center justify-center text-[11px] text-gray-600">
        Loading…
      </div>
    )
  }

  if (!detail) return <></>

  const allTracks = flatTracks(detail)
  const fileByMfbId = new Map(
    allFiles.filter((f) => f.mfbTrackId !== null).map((f) => [f.mfbTrackId!, f])
  )

  const matchedCount = allTracks.filter((t) => fileByMfbId.has(t.id)).length
  const missingCount = allTracks.length - matchedCount
  const totalDuration = allTracks.reduce((sum, t) => sum + (fileByMfbId.get(t.id)?.duration ?? 0), 0)

  const matchedQueue = allTracks
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
    setSaving(true)
    try {
      const session = await buildLiminaSession(detail!, allFiles)
      const path = await window.electronAPI.studioSaveSession(
        JSON.stringify(session, null, 2),
        detail!.title,
      )
      if (path) setPlaylistSession(detail!.id, path)
    } finally {
      setSaving(false)
    }
  }

  let trackIndex = 0

  return (
    <div className="flex overflow-hidden flex-col flex-1 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-1 px-4 py-3 border-b shrink-0 border-surface-border bg-surface-panel">
        <div className="flex gap-2 items-center">
          <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 3h8M1 6h6M1 9h4" />
          </svg>
          <h2 className="text-[12px] font-semibold text-gray-200 truncate flex-1 min-w-0">{detail.title}</h2>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={matchedCount === 0 || saving}
              onClick={handleCreateSession}
              className="px-2 py-0.5 text-[10px] rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {saving ? 'Creating…' : 'Create in Limina Mix'}
            </button>
            {savedPath && (
              <button
                type="button"
                onClick={() => window.electronAPI.studioOpenFile(savedPath)}
                className="px-2 py-0.5 text-[10px] rounded border border-surface-border text-gray-400 hover:text-gray-200 hover:bg-surface-hover transition-colors"
              >
                Open
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-3 items-center pl-5">
          <span className="text-[10px] text-gray-500 tabular-nums">
            {matchedCount}/{allTracks.length} tracks
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
      </div>

      {/* Track list with segments */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {detail.segments.map((segment) => (
          <div key={segment.id}>
            {/* Segment header */}
            <div className="flex gap-2 items-center px-3 h-6 border-b select-none bg-surface-panel/60 border-surface-border/50">
              <span className="text-[9px] uppercase tracking-widest text-gray-600 truncate">{segment.name}</span>
            </div>

            {segment.tracks.map((track) => {
              const i = trackIndex++
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
                  <span className="w-5 shrink-0 text-center text-[10px] text-gray-600 tabular-nums">{i + 1}</span>

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

                  <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
                    <span className={`text-[11px] truncate shrink min-w-0 ${isSelected ? 'text-gray-100' : file ? 'text-gray-300' : 'text-gray-500'}`}>
                      {file?.trackTitle || track.title}
                    </span>
                    {!file && track.bandcamp_url && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); window.open(track.bandcamp_url!) }}
                        className="shrink-0 px-1.5 py-px text-[9px] font-medium rounded border transition-colors text-[#1da0c3] border-[#1da0c3]/40 bg-[#1da0c3]/10 hover:bg-[#1da0c3]/20 leading-tight"
                      >
                        Buy at Bandcamp
                      </button>
                    )}
                    {!file && track.beatport_url && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); window.open(track.beatport_url!) }}
                        className="shrink-0 px-1.5 py-px text-[9px] font-medium rounded border transition-colors text-[#97f04f] border-[#97f04f]/40 bg-[#97f04f]/10 hover:bg-[#97f04f]/20 leading-tight"
                      >
                        Buy at Beatport
                      </button>
                    )}
                  </div>

                  <span className={`w-28 shrink-0 text-[10px] truncate hidden sm:block ${isSelected ? 'text-gray-400' : 'text-gray-600'}`}>
                    {file?.artist || track.artist}
                  </span>

                  <span className="w-10 shrink-0 text-right text-[10px] text-gray-600 tabular-nums">
                    {file ? formatDuration(file.duration) : track.duration ? formatDuration(track.duration / 1000) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {missingCount > 0 && (
        <div className="px-3 py-2 border-t shrink-0 border-surface-border bg-surface-panel">
          <p className="text-[10px] text-gray-600">
            {missingCount} track{missingCount === 1 ? '' : 's'} not in library will be skipped.
          </p>
        </div>
      )}
    </div>
  )
}
