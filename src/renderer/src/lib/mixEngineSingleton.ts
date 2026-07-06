import { MixEngine } from './mixEngine'
import { useLibraryStore } from '../store/libraryStore'
import { makeMixProvider, activeGroupTimerElapsed } from './mixSelection'

// A single persistent Auto-Mix engine for the whole app, so playback survives
// the MixPanel unmounting (i.e. closing the Auto-Mix section). Its live state is
// pushed into the store (`mixPlayback`) so any component — the panel or the
// navbar mini-player — can read it reactively.
let engine: MixEngine | null = null

export function peekMixEngine(): MixEngine | null {
  return engine
}

export function getMixEngine(): MixEngine {
  if (engine) return engine
  const e = new MixEngine()
  engine = e
  e.setQueueProvider(makeMixProvider())
  e.setGroupTimerCheck(activeGroupTimerElapsed)
  // Start at the track's clip-start cue if set, else its Auto-Mix fade-in point.
  e.setStartResolver((f) => f.clipStartMs ?? useLibraryStore.getState().mixFadeIns[f.id] ?? 0)
  e.xfadeMs = useLibraryStore.getState().mixFadeMs
  e.subscribe((s) => useLibraryStore.getState().setMixPlayback(s))
  window.electronAPI.getAudioServerPort().then((p) => e.setPort(p))
  return e
}
