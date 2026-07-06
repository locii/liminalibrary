import { ipcMain } from 'electron'
import { spawn } from 'child_process'
import ffmpegPath from 'ffmpeg-static'

export function registerAudioHandlers(): void {
  ipcMain.handle(
    'audio:getWaveformPeaks',
    async (_, filePath: string, numPeaks = 800): Promise<number[]> => {
      return extractPeaks(filePath, numPeaks)
    }
  )

  ipcMain.handle(
    'audio:analyzeCues',
    async (_, filePath: string): Promise<CueAnalysis> => {
      return analyzeCues(filePath)
    }
  )

  ipcMain.handle('audio:getFileDuration', async (_, filePath: string): Promise<number> => {
    return new Promise((resolve) => {
      const bin = (ffmpegPath as string).replace('app.asar', 'app.asar.unpacked')
      if (!bin) { resolve(0); return }
      // Resample to 8kHz mono and count raw output bytes — bypasses any WAV header size bugs.
      // Duration = (16-bit samples at 8000 Hz) = byteCount / 2 / 8000
      const proc = spawn(bin, [
        '-v', 'quiet', '-i', filePath,
        '-ac', '1', '-filter:a', 'aresample=8000',
        '-map', '0:a', '-c:a', 'pcm_s16le', '-f', 's16le', 'pipe:1',
      ])
      let byteCount = 0
      proc.stdout.on('data', (c: Buffer) => { byteCount += c.byteLength })
      proc.stderr.on('data', () => {})
      proc.on('error', () => resolve(0))
      proc.on('close', () => resolve(byteCount / 2 / 8000))
    })
  })
}

export interface CueAnalysis {
  introEndMs: number | null    // where the intro builds to full level; null = no long intro
  outroStartMs: number | null  // where the outro/tail begins; null = plays to the end
}

/**
 * Decode a file to 8kHz mono PCM and derive intro/outro cue points from its
 * energy envelope, so Auto-Mix can crossfade at musically sensible moments.
 *
 * Heuristic: compute RMS over ~100ms windows, take a high percentile as the
 * "full level" reference, then mark a window "active" when it exceeds a
 * fraction of that. The intro ends at the first sustained-active window; the
 * outro begins after the last active window. When the audio is active from the
 * very start / all the way to the end, the corresponding cue is left null and
 * the engine's default fade window applies.
 */
function analyzeCues(filePath: string): Promise<CueAnalysis> {
  return new Promise((resolve) => {
    const bin = (ffmpegPath as string).replace('app.asar', 'app.asar.unpacked')
    if (!bin) { resolve({ introEndMs: null, outroStartMs: null }); return }

    const SR = 8000
    const proc = spawn(bin, [
      '-v', 'quiet', '-i', filePath,
      '-ac', '1', '-filter:a', `aresample=${SR}`,
      '-map', '0:a', '-c:a', 'pcm_s16le', '-f', 's16le', 'pipe:1',
    ])
    const chunks: Buffer[] = []
    proc.stdout.on('data', (c: Buffer) => chunks.push(c))
    proc.stderr.on('data', () => {})
    proc.on('error', () => resolve({ introEndMs: null, outroStartMs: null }))
    proc.on('close', () => {
      const raw = Buffer.concat(chunks)
      if (raw.byteLength < 4) { resolve({ introEndMs: null, outroStartMs: null }); return }
      const samples = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 2))

      const WIN = Math.round(SR * 0.1) // 100ms windows
      const winMs = 100
      const rms: number[] = []
      for (let start = 0; start < samples.length; start += WIN) {
        const end = Math.min(start + WIN, samples.length)
        let sum = 0
        for (let j = start; j < end; j++) { const v = samples[j] / 32768; sum += v * v }
        rms.push(Math.sqrt(sum / Math.max(1, end - start)))
      }
      if (rms.length < 3) { resolve({ introEndMs: null, outroStartMs: null }); return }

      // Reference level = 85th percentile of windowed RMS.
      const sorted = [...rms].sort((a, b) => a - b)
      const ref = sorted[Math.floor(sorted.length * 0.85)] || 0
      if (ref <= 0) { resolve({ introEndMs: null, outroStartMs: null }); return }
      const thresh = Math.max(0.02, ref * 0.35)

      const active = (i: number): boolean => rms[i] >= thresh
      const n = rms.length

      // First sustained-active window (3 consecutive) = end of intro build.
      let firstActive = -1
      for (let i = 0; i < n; i++) {
        if (active(i) && active(Math.min(i + 1, n - 1)) && active(Math.min(i + 2, n - 1))) { firstActive = i; break }
      }
      // Last active window = start of outro/tail.
      let lastActive = -1
      for (let i = n - 1; i >= 0; i--) { if (active(i)) { lastActive = i; break } }

      const introEndMs = firstActive > 1 ? firstActive * winMs : null
      const outroStartMs = (lastActive >= 0 && lastActive < n - 2) ? (lastActive + 1) * winMs : null
      resolve({ introEndMs, outroStartMs })
    })
  })
}

function extractPeaks(filePath: string, numPeaks: number): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const bin = (ffmpegPath as string).replace('app.asar', 'app.asar.unpacked')
    if (!bin) { reject(new Error('ffmpeg not found')); return }

    const args = [
      '-v', 'quiet', '-i', filePath,
      '-ac', '1', '-filter:a', 'aresample=8000',
      '-map', '0:a', '-c:a', 'pcm_s16le', '-f', 's16le', 'pipe:1',
    ]
    const proc = spawn(bin, args)
    const chunks: Buffer[] = []
    proc.stdout.on('data', (c: Buffer) => chunks.push(c))
    proc.stderr.on('data', () => {})
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0 && chunks.length === 0) { reject(new Error(`ffmpeg exited ${code}`)); return }
      const raw = Buffer.concat(chunks)
      const samples = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2)
      const spp = Math.max(1, Math.floor(samples.length / numPeaks))
      const peaks: number[] = []
      for (let i = 0; i < numPeaks; i++) {
        let max = 0
        const start = i * spp
        const end = Math.min(start + spp, samples.length)
        for (let j = start; j < end; j++) {
          const abs = Math.abs(samples[j]) / 32768
          if (abs > max) max = abs
        }
        peaks.push(max)
      }
      resolve(peaks)
    })
  })
}
