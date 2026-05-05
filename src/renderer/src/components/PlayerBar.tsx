import { useEffect, useRef, useState, useCallback } from 'react'
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

export function PlayerBar(): JSX.Element | null {
  const previewFileId = useLibraryStore((s) => s.previewFileId)
  const previewQueue = useLibraryStore((s) => s.previewQueue)
  const setPreview = useLibraryStore((s) => s.setPreview)
  const files = useLibraryStore((s) => s.files)
  const updateFile = useLibraryStore((s) => s.updateFile)

  const file = files.find((f) => f.id === previewFileId) ?? null

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [port, setPort] = useState<number | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(0)
  const [loadingPeaks, setLoadingPeaks] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const shuffleRef = useRef(false)
  shuffleRef.current = shuffle

  useEffect(() => {
    window.electronAPI.getAudioServerPort().then(setPort)
  }, [])

  // Track canvas width for redraw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => setCanvasWidth(canvas.offsetWidth))
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // Replace audio when file or port changes
  useEffect(() => {
    if (!file || port === null) return
    audioRef.current?.pause()
    const audio = new Audio(`http://127.0.0.1:${port}${encodeURI(file.filePath)}`)
    audioRef.current = audio
    setCurrentTime(0)
    audio.addEventListener('ended', () => {
      setPlaying(false)
      setCurrentTime(0)
      if (shuffleRef.current) {
        const others = previewQueue.filter((id) => id !== file.id)
        if (others.length > 0) setPreview(others[Math.floor(Math.random() * others.length)], previewQueue)
      } else {
        const idx = previewQueue.indexOf(file.id)
        if (idx !== -1 && idx < previewQueue.length - 1) setPreview(previewQueue[idx + 1], previewQueue)
      }
    })
    audio.play().then(() => {
      setPlaying(true)
      window.dispatchEvent(new CustomEvent('app:audio-start', { detail: 'player' }))
    }).catch(console.error)
    return () => { audio.pause() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id, port])

  // Load peaks if missing
  useEffect(() => {
    if (!file || file.peaks.length > 0 || loadingPeaks) return
    setLoadingPeaks(true)
    window.electronAPI.getWaveformPeaks(file.filePath, 800)
      .then((p) => updateFile(file.id, { peaks: p }))
      .catch(console.error)
      .finally(() => setLoadingPeaks(false))
  }, [file?.id, file?.peaks.length, loadingPeaks, updateFile])

  // RAF loop for playhead
  useEffect(() => {
    if (!playing) return
    const tick = (): void => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [playing])

  // Stop when another audio source starts
  useEffect(() => {
    const handler = (e: Event): void => {
      if ((e as CustomEvent).detail !== 'player' && playing) {
        audioRef.current?.pause()
        setPlaying(false)
      }
    }
    window.addEventListener('app:audio-start', handler)
    return () => window.removeEventListener('app:audio-start', handler)
  }, [playing])

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
      ctx.globalAlpha = x < splitX ? 1 : 0.25
      ctx.fillRect(x, mid - barH / 2, Math.max(0.5, barW - 0.5), barH)
    }
    ctx.globalAlpha = 1
    if (splitX > 0) {
      ctx.fillStyle = colorHead
      ctx.fillRect(Math.round(splitX) - 0.5, 0, 1, h)
    }
  }, [file?.peaks, file?.peaks.length, currentTime, file?.duration, file?.id, canvasWidth])

  const togglePlay = useCallback((): void => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => {
        setPlaying(true)
        window.dispatchEvent(new CustomEvent('app:audio-start', { detail: 'player' }))
      }).catch(console.error)
    }
  }, [playing])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current
    const audio = audioRef.current
    if (!canvas || !audio || !file || file.duration === 0) return
    const rect = canvas.getBoundingClientRect()
    const t = ((e.clientX - rect.left) / rect.width) * file.duration
    audio.currentTime = t
    setCurrentTime(t)
  }, [file?.duration])

  const navigate = useCallback((dir: -1 | 1): void => {
    if (!file) return
    if (dir === 1 && shuffleRef.current) {
      const others = previewQueue.filter((id) => id !== file.id)
      if (others.length > 0) setPreview(others[Math.floor(Math.random() * others.length)], previewQueue)
      return
    }
    const idx = previewQueue.indexOf(file.id)
    const next = previewQueue[idx + dir]
    if (next !== undefined) setPreview(next, previewQueue)
  }, [file?.id, previewQueue, setPreview])

  const close = useCallback((): void => {
    audioRef.current?.pause()
    audioRef.current = null
    setPreview(null, [])
  }, [setPreview])

  if (!file) return null

  const queueIdx = previewQueue.indexOf(file.id)
  const hasPrev = queueIdx > 0
  const hasNext = queueIdx !== -1 && queueIdx < previewQueue.length - 1

  return (
    <div className="flex gap-3 items-center px-4 h-16 border-t shrink-0 border-surface-border bg-surface-panel">
      {/* Transport controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={!hasPrev}
          title="Previous"
          className="flex justify-center items-center w-6 h-6 text-gray-500 rounded transition-colors hover:text-gray-200 disabled:opacity-25"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 2h1.5v8H2zM10.5 2L4.5 6l6 4V2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={togglePlay}
          title={playing ? 'Pause' : 'Play'}
          className="flex items-center justify-center w-7 h-7 rounded-full border border-surface-border bg-surface-hover text-gray-300 hover:text-white hover:bg-accent/20 hover:border-accent/50 transition-colors mx-0.5"
        >
          {playing ? (
            <svg className="w-3 h-3" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
              <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
            </svg>
          ) : (
            <svg className="w-3 h-3" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          disabled={!hasNext && !shuffle}
          title="Next"
          className="flex justify-center items-center w-6 h-6 text-gray-500 rounded transition-colors hover:text-gray-200 disabled:opacity-25"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10 2h-1.5v8H10zM1.5 2l6 4-6 4V2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setShuffle((v) => !v)}
          title={shuffle ? 'Shuffle on' : 'Shuffle off'}
          className={`flex justify-center items-center w-6 h-6 rounded transition-colors ml-0.5 ${
            shuffle ? 'text-accent' : 'text-gray-600 hover:text-gray-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4h2.5a4 4 0 013.2 1.6L8 7l1.3 1.7A4 4 0 0012.5 10H14M14 10l-2-2M14 10l-2 2" />
            <path d="M1 10h2.5a4 4 0 002.8-1.2M14 4h-1.5a4 4 0 00-3.2 1.6M14 4l-2-2M14 4l-2 2" />
          </svg>
        </button>
      </div>

      {/* Track info */}
      <div className="flex flex-col justify-center w-36 min-w-0 shrink-0">
        <span className="text-[11px] text-gray-200 truncate leading-tight">{file.trackTitle || file.fileName}</span>
        {file.artist && <span className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">{file.artist}</span>}
      </div>

      {/* Waveform */}
      <canvas
        ref={canvasRef}
        className="flex-1 min-w-0 h-8 rounded cursor-pointer"
        onClick={handleSeek}
        title="Click to seek"
      />

      {/* Time */}
      <span className="font-mono text-[10px] tabular-nums text-gray-600 shrink-0 text-right w-20">
        {formatTime(currentTime)}
        <span className="mx-0.5 text-gray-700">/</span>
        {formatTime(file.duration)}
      </span>

      {/* Close */}
      <button
        type="button"
        onClick={close}
        title="Close player"
        className="flex justify-center items-center w-5 h-5 text-gray-600 rounded transition-colors shrink-0 hover:text-gray-300"
      >
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 2l8 8M10 2l-8 8" />
        </svg>
      </button>
    </div>
  )
}
