import { useEffect, useRef, useState, useCallback } from 'react'
import { LibraryFile, BREATHWORK_PHASES, PHASE_COLORS, mfbTrackUrl } from '../types'
import { useLibraryStore } from '../store/libraryStore'

const WAVEFORM_COLORS: [string, string][] = [
  ['#6366f1', '#818cf8'],
  ['#a855f7', '#c084fc'],
  ['#ec4899', '#f472b6'],
  ['#f43f5e', '#fb7185'],
  ['#f97316', '#fb923c'],
  ['#f59e0b', '#fbbf24'],
  ['#22c55e', '#4ade80'],
  ['#14b8a6', '#2dd4bf'],
  ['#06b6d4', '#22d3ee'],
  ['#0ea5e9', '#38bdf8'],
]

function pickColor(fileId: string): [string, string] {
  const hash = fileId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return WAVEFORM_COLORS[hash % WAVEFORM_COLORS.length]
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

interface Props {
  file: LibraryFile
  albumImageUrl: string | null | undefined
  playing: boolean
  currentTime: number
  hasPrev: boolean
  hasNext: boolean
  onTogglePlay: () => void
  onNavigate: (dir: -1 | 1) => void
  onSeek: (t: number) => void
  onClose: () => void
}

export function NowPlayingOverlay({
  file,
  albumImageUrl,
  playing,
  currentTime,
  hasPrev,
  hasNext,
  onTogglePlay,
  onNavigate,
  onSeek,
  onClose,
}: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)

  // Reset image loaded state when track changes
  useEffect(() => { setImgLoaded(false) }, [file.id])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => setCanvasWidth(canvas.offsetWidth))
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !file) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    if (w === 0 || h === 0) return
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    if (file.peaks.length === 0) {
      ctx.fillStyle = '#2a2a3a'
      ctx.fillRect(0, h / 2 - 0.5, w, 1)
      return
    }

    const [colorPlayed, colorHead] = pickColor(file.id)
    const barW = w / file.peaks.length
    const mid = h / 2
    const splitX = file.duration > 0 ? (currentTime / file.duration) * w : 0

    ctx.fillStyle = colorPlayed
    for (let i = 0; i < file.peaks.length; i++) {
      const x = i * barW
      const barH = Math.max(1, file.peaks[i] * h * 0.85)
      ctx.globalAlpha = x < splitX ? 1 : 0.3
      ctx.fillRect(x, mid - barH / 2, Math.max(0.5, barW - 0.5), barH)
    }
    ctx.globalAlpha = 1
    if (splitX > 0) {
      ctx.fillStyle = colorHead
      ctx.fillRect(Math.round(splitX) - 0.5, 0, 1, h)
    }
  }, [file?.peaks, file?.peaks.length, currentTime, file?.duration, file?.id, canvasWidth])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current
    if (!canvas || file.duration === 0) return
    const rect = canvas.getBoundingClientRect()
    onSeek(((e.clientX - rect.left) / rect.width) * file.duration)
  }, [file.duration, onSeek])

  const selectTag = useLibraryStore((s) => s.selectTag)

  const handleTagClick = useCallback((tag: string): void => {
    selectTag(tag)
    onClose()
  }, [selectTag, onClose])

  const phase = file.breathworkPhase
  const phaseLabel = phase ? (BREATHWORK_PHASES.find((p) => p.value === phase)?.label ?? null) : null
  const phaseColor = phase ? PHASE_COLORS[phase] : null
  const [waveColor] = pickColor(file.id)

  const progress = file.duration > 0 ? currentTime / file.duration : 0

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md select-none overflow-hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        title="Close (Esc)"
        className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 2l8 8M10 2l-8 8" />
        </svg>
      </button>

      {/* Full-screen background underlay */}
      {albumImageUrl && (
        <img
          src={albumImageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.1 }}
        />
      )}

      <div className="relative flex flex-col items-center w-full max-w-lg px-8 gap-6">
        {/* Album art */}
        <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-2xl">
          {albumImageUrl ? (
            <img
              key={file.id}
              src={albumImageUrl}
              alt=""
              onLoad={() => setImgLoaded(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : null}
          {/* Placeholder shown when no art or before image loads */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${albumImageUrl && imgLoaded ? 'opacity-0' : 'opacity-100'}`}
            style={{ background: `linear-gradient(135deg, ${waveColor}33, ${waveColor}11)` }}
          >
            <svg className="w-16 h-16 opacity-20" viewBox="0 0 24 24" fill="currentColor" style={{ color: waveColor }}>
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
            </svg>
          </div>
        </div>

        {/* Track info */}
        <div className="flex flex-col items-center gap-1.5 text-center w-full">
          <span className="flex items-center gap-1.5 text-white text-lg font-medium leading-tight">
            {file.trackTitle || file.fileName}
            {file.mfbTrackId != null && (
              <a
                href={mfbTrackUrl(file.mfbTrackId, file.trackTitle || file.fileName)}
                target="_blank"
                rel="noreferrer"
                title="View on Music for Breathwork"
                className="text-gray-500 hover:text-gray-200 transition-colors shrink-0 mt-0.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7" />
                  <path d="M8 1h3v3M11 1L5.5 6.5" />
                </svg>
              </a>
            )}
          </span>
          {file.artist && (
            <span className="text-gray-400 text-sm">{file.artist}</span>
          )}

          {/* Phase + tags */}
          {(phaseLabel || file.tags.length > 0) && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
              {phaseLabel && phaseColor && (
                <button
                  type="button"
                  onClick={() => handleTagClick(phaseLabel)}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: `${phaseColor}22`, color: phaseColor, border: `1px solid ${phaseColor}44` }}
                >
                  {phaseLabel}
                </button>
              )}
              {file.tags.slice(0, 6).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10 cursor-pointer transition-colors hover:bg-white/10 hover:text-gray-200"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Waveform + time */}
        <div className="w-full flex flex-col gap-1">
          <canvas
            ref={canvasRef}
            className="w-full h-10 rounded cursor-pointer"
            onClick={handleCanvasClick}
            title="Click to seek"
          />
          <div className="flex justify-between text-[10px] font-mono tabular-nums text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(file.duration)}</span>
          </div>
          {/* Progress bar (thin, under waveform for mobile clarity) */}
          <div className="w-full h-px bg-white/10 rounded-full overflow-hidden -mt-1">
            <div
              className="h-full rounded-full transition-none"
              style={{ width: `${progress * 100}%`, background: waveColor }}
            />
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate(-1)}
            disabled={!hasPrev}
            title="Previous"
            className="flex items-center justify-center w-8 h-8 text-gray-500 rounded-full transition-colors hover:text-gray-200 disabled:opacity-25"
          >
            <svg className="w-4 h-4" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 2h1.5v8H2zM10.5 2L4.5 6l6 4V2z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            title={playing ? 'Pause' : 'Play'}
            className="flex items-center justify-center w-14 h-14 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 transition-colors"
          >
            {playing ? (
              <svg className="w-5 h-5" viewBox="0 0 10 10" fill="currentColor">
                <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
                <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate(1)}
            disabled={!hasNext}
            title="Next"
            className="flex items-center justify-center w-8 h-8 text-gray-500 rounded-full transition-colors hover:text-gray-200 disabled:opacity-25"
          >
            <svg className="w-4 h-4" viewBox="0 0 12 12" fill="currentColor">
              <path d="M10 2h-1.5v8H10zM1.5 2l6 4-6 4V2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
