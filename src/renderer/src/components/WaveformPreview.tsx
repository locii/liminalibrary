import { useEffect, useRef, useState, useCallback } from 'react'
import { useLibraryStore } from '../store/libraryStore'

interface Props {
  fileId: string
  filePath: string
  duration: number
  peaks: number[]
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function WaveformPreview({ fileId, filePath, duration, peaks }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const updateFile = useLibraryStore((s) => s.updateFile)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [port, setPort] = useState<number | null>(null)
  const [loadingPeaks, setLoadingPeaks] = useState(false)

  // Get audio server port once
  useEffect(() => {
    window.electronAPI.getAudioServerPort().then(setPort)
  }, [])

  // Fetch waveform peaks if not cached
  useEffect(() => {
    if (peaks.length > 0 || loadingPeaks) return
    setLoadingPeaks(true)
    window.electronAPI
      .getWaveformPeaks(filePath, 800)
      .then((p) => updateFile(fileId, { peaks: p }))
      .catch(console.error)
      .finally(() => setLoadingPeaks(false))
  }, [fileId, filePath, peaks.length, loadingPeaks, updateFile])

  // Create audio element; replace when file changes
  useEffect(() => {
    if (port === null) return
    const audio = new Audio(`http://127.0.0.1:${port}${encodeURI(filePath)}`)
    audioRef.current = audio
    audio.addEventListener('ended', () => { setPlaying(false); setCurrentTime(0) })
    return () => {
      audio.pause()
      audioRef.current = null
      setPlaying(false)
      setCurrentTime(0)
    }
  }, [filePath, port])

  // RAF loop for playhead position
  useEffect(() => {
    if (!playing) return
    const tick = (): void => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [playing])

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
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

    if (peaks.length === 0) {
      // Empty state — draw a flat line
      ctx.fillStyle = '#2a2a3a'
      ctx.fillRect(0, h / 2 - 0.5, w, 1)
      return
    }

    const barW = w / peaks.length
    const mid = h / 2
    const splitX = duration > 0 ? (currentTime / duration) * w : 0

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barW
      const barH = Math.max(1, peaks[i] * h * 0.85)
      ctx.fillStyle = x < splitX ? '#6366f1' : '#2a2a3a'
      ctx.fillRect(x, mid - barH / 2, Math.max(0.5, barW - 0.5), barH)
    }

    // Playhead
    if (splitX > 0) {
      ctx.fillStyle = '#818cf8'
      ctx.fillRect(Math.round(splitX) - 0.5, 0, 1, h)
    }
  }, [peaks, currentTime, duration])

  const togglePlay = useCallback((): void => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => setPlaying(true)).catch(console.error)
    }
  }, [playing])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current
    const audio = audioRef.current
    if (!canvas || !audio || duration === 0) return
    const rect = canvas.getBoundingClientRect()
    const seekTime = ((e.clientX - rect.left) / rect.width) * duration
    audio.currentTime = seekTime
    setCurrentTime(seekTime)
  }, [duration])

  return (
    <div className="p-3 border-b border-surface-border flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className="w-full h-14 rounded cursor-pointer"
        onClick={handleCanvasClick}
        title="Click to seek"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          disabled={port === null}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-hover hover:bg-accent/20 border border-surface-border text-gray-400 hover:text-accent transition-colors shrink-0 disabled:opacity-40"
        >
          {playing ? (
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
        <span className="font-mono text-[10px] tabular-nums text-gray-600">
          {formatTime(currentTime)}
          <span className="mx-1 text-gray-700">/</span>
          {formatTime(duration)}
        </span>
        {loadingPeaks && (
          <span className="ml-auto text-[10px] text-gray-700">Loading waveform…</span>
        )}
      </div>
    </div>
  )
}
