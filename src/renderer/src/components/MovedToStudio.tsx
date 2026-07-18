import { useState } from 'react'

// Limina Library has been folded into Limina Studio. This final "graduation"
// release surfaces a one-time modal + a persistent banner pointing users there.
// Studio imports the Limina Library catalogue automatically on first launch.
const STUDIO_URL = 'https://www.getliminastudio.com'
const DOWNLOAD_URL = 'https://www.getliminastudio.com/download'
const MODAL_SEEN_KEY = 'limina-moved-to-studio-seen'

/** True on the first launch of this build (before the modal has been dismissed). */
export function movedModalPending(): boolean {
  try { return !localStorage.getItem(MODAL_SEEN_KEY) } catch { return false }
}

/** Slim, always-present banner beneath the title bar. Dismissible per session; returns next launch. */
export function MovedBanner(): JSX.Element | null {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-accent/15 border-b border-accent/30 text-[11px] text-accent shrink-0">
      <span className="truncate">
        Limina Library has moved to <span className="font-semibold">Limina Studio</span> — library, live sessions &amp; mixing in one app.
      </span>
      <button
        type="button"
        onClick={() => window.open(DOWNLOAD_URL, '_blank')}
        className="shrink-0 px-2 py-0.5 rounded bg-accent text-white font-medium hover:bg-accent/80 transition-colors"
      >
        Download →
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 2l6 6M8 2l-6 6" />
        </svg>
      </button>
    </div>
  )
}

/** One-time launch modal explaining the move. Self-manages its seen state. */
export function MovedModal(): JSX.Element | null {
  const [open, setOpen] = useState(() => movedModalPending())
  if (!open) return null

  const close = (): void => {
    setOpen(false)
    try { localStorage.setItem(MODAL_SEEN_KEY, '1') } catch { /* noop */ }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70">
      <div className="w-full max-w-md flex flex-col gap-5 p-6 border rounded-xl shadow-2xl border-surface-border bg-surface-panel">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-accent">Limina Library has moved</span>
          <h2 className="text-lg font-semibold text-gray-100">Limina Library is now Limina Studio</h2>
        </div>
        <p className="text-[13px] leading-relaxed text-gray-400">
          Everything you use in Limina Library — plus live, tag-driven sessions and multitrack
          mixing — is now in a single app. Your library, catalogue matches, and playlists carry
          over automatically the first time you open Limina Studio.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => { window.open(DOWNLOAD_URL, '_blank'); close() }}
            className="flex-1 px-4 py-2.5 text-[13px] font-medium text-white rounded-lg bg-accent hover:bg-accent/80 transition-colors"
          >
            Download Limina Studio
          </button>
          <button
            type="button"
            onClick={close}
            className="px-4 py-2.5 text-[13px] text-gray-400 rounded-lg border border-surface-border hover:bg-surface-hover hover:text-gray-200 transition-colors"
          >
            Later
          </button>
        </div>
        <button
          type="button"
          onClick={() => window.open(STUDIO_URL, '_blank')}
          className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors self-start"
        >
          Learn more about Limina Studio →
        </button>
      </div>
    </div>
  )
}
