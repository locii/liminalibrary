import { useState, useEffect, useRef } from 'react'
import { useLibraryStore } from '../store/libraryStore'

export function AccountButton(): JSX.Element {
  const userAccount = useLibraryStore((s) => s.userAccount)
  const setUserAccount = useLibraryStore((s) => s.setUserAccount)
  const showModal = useLibraryStore((s) => s.showLoginModal)
  const setShowModal = useLibraryStore((s) => s.setShowLoginModal)
  const [showMenu, setShowMenu] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Restore session on mount
  useEffect(() => {
    window.electronAPI.authMe().then((user) => {
      if (user) setUserAccount(user)
    })
  }, [setUserAccount])

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return
    function onDown(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [showMenu])

  async function handleLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await window.electronAPI.authLogin(email, password)
      setUserAccount(user)
      setShowModal(false)
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout(): Promise<void> {
    setShowMenu(false)
    await window.electronAPI.authLogout()
    setUserAccount(null)
  }

  if (userAccount) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-1.5 h-6 px-2.5 text-[11px] text-gray-400 hover:text-gray-200 bg-surface-hover border border-surface-border rounded transition-colors"
        >
          <span className="w-4 h-4 rounded-full bg-accent/30 text-accent text-[9px] font-semibold flex items-center justify-center shrink-0">
            {userAccount.name.charAt(0).toUpperCase()}
          </span>
          <span className="max-w-[100px] truncate">{userAccount.name}</span>
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 z-50 min-w-[160px] rounded border border-surface-border bg-surface-panel shadow-lg py-1 text-[11px]">
            <div className="px-3 py-2 border-b border-surface-border">
              <p className="font-medium text-gray-300 truncate">{userAccount.name}</p>
              <p className="text-gray-600 truncate">{userAccount.email}</p>
            </div>
            <button
              type="button"
              onClick={() => window.open('https://musicforbreathwork.com/dashboard', '_blank')}
              className="w-full text-left px-3 py-1.5 text-gray-400 hover:bg-surface-hover hover:text-gray-200 transition-colors"
            >
              Account settings ↗
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-3 py-1.5 text-gray-400 hover:bg-surface-hover hover:text-gray-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 h-6 px-3 text-[11px] text-gray-500 hover:text-gray-300 bg-surface-hover border border-surface-border rounded transition-colors"
      >
        Sign in
      </button>

      {showModal && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black/70 backdrop-blur-sm">
          <div className="flex w-[480px] rounded-xl border shadow-2xl border-surface-border bg-surface-panel overflow-hidden">

            {/* Left — benefits panel */}
            <div className="flex flex-col gap-4 p-6 w-48 shrink-0 bg-surface-base border-r border-surface-border">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-gray-600">Unlock with</span>
                <span className="text-[11px] font-semibold text-gray-300 leading-snug">Music for Breathwork</span>
              </div>
              <div className="flex flex-col gap-3 mt-1">
                {[
                  { icon: '◎', label: 'Catalogue matching' },
                  { icon: '◈', label: 'Phase tags & colour coding' },
                  { icon: '◇', label: 'Audio features & intensity scores' },
                  { icon: '◉', label: 'Playlist sync' },
                ].map((b) => (
                  <div key={b.label} className="flex items-start gap-2">
                    <span className="text-accent text-[11px] mt-px shrink-0">{b.icon}</span>
                    <span className="text-[10px] text-gray-500 leading-snug">{b.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 border-t border-surface-border">
                <span className="text-[10px] text-gray-600 leading-snug block">No account?</span>
                <button
                  type="button"
                  onClick={() => window.open('https://musicforbreathwork.com', '_blank')}
                  className="text-[10px] text-accent hover:text-accent/80 transition-colors underline underline-offset-2 mt-0.5"
                >
                  musicforbreathwork.com ↗
                </button>
              </div>
            </div>

            {/* Right — form */}
            <div className="flex flex-col flex-1 p-6 gap-5">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-gray-100">Sign in</span>
                  <span className="text-[10px] text-gray-600">Connect your Music for Breathwork account</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError('') }}
                  className="text-gray-600 transition-colors hover:text-gray-400 mt-0.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-8 px-2.5 text-[11px] text-gray-300 bg-surface-hover border border-surface-border rounded outline-none focus:border-accent/50 placeholder-gray-700"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-8 px-2.5 text-[11px] text-gray-300 bg-surface-hover border border-surface-border rounded outline-none focus:border-accent/50"
                  />
                </div>
                {error && (
                  <p className="text-[10px] text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-9 mt-1 text-[11px] font-medium text-white bg-accent hover:bg-accent/80 rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="text-[10px] text-gray-700 leading-relaxed">
                Your Music for Breathwork account gives Library access to the catalogue — phase tags,
                audio features, and playlist data are all pulled from your account.
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
