import { useLibraryStore } from '../store/libraryStore'
import { BREATHWORK_PHASES } from '../types'
import type { BreathworkPhase } from '../types'

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
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] text-gray-600 uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-[11px] text-gray-400 text-right truncate">{value}</span>
    </div>
  )
}

export function PropertiesPanel(): JSX.Element {
  const files = useLibraryStore((s) => s.files)
  const selectedFileId = useLibraryStore((s) => s.selectedFileId)
  const updateFile = useLibraryStore((s) => s.updateFile)

  const file = files.find((f) => f.id === selectedFileId)

  if (!file) {
    return (
      <div className="flex w-64 shrink-0 border-l border-surface-border bg-surface-panel items-center justify-center">
        <p className="text-[11px] text-gray-700 text-center px-4">
          Select a file to see its properties
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-64 shrink-0 border-l border-surface-border bg-surface-panel overflow-y-auto">

      {/* File info */}
      <div className="p-3 border-b border-surface-border flex flex-col gap-2">
        <p className="text-[11px] text-gray-300 font-medium truncate" title={file.fileName}>
          {file.fileName}
        </p>
        <p className="text-[10px] text-gray-600 break-all leading-relaxed">{file.filePath}</p>
      </div>

      {/* Metadata */}
      <div className="p-3 border-b border-surface-border flex flex-col gap-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Info</span>
        <Row label="Duration" value={formatDuration(file.duration)} />
        <Row label="Format" value={file.format.toUpperCase()} />
        <Row label="Sample rate" value={`${(file.sampleRate / 1000).toFixed(1)} kHz`} />
        <Row label="Channels" value={file.channels === 2 ? 'Stereo' : file.channels === 1 ? 'Mono' : String(file.channels)} />
        <Row label="File size" value={formatSize(file.fileSize)} />
      </div>

      {/* Breathwork phase */}
      <div className="p-3 border-b border-surface-border flex flex-col gap-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Phase</span>
        <div className="flex flex-wrap gap-1">
          {BREATHWORK_PHASES.map((phase) => (
            <button
              key={phase.value}
              onClick={() => updateFile(file.id, {
                breathworkPhase: file.breathworkPhase === phase.value ? null : phase.value as BreathworkPhase,
              })}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                file.breathworkPhase === phase.value
                  ? 'bg-accent/20 border-accent/50 text-accent'
                  : 'bg-surface-hover border-surface-border text-gray-500 hover:text-gray-300'
              }`}
            >
              {phase.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="p-3 border-b border-surface-border flex flex-col gap-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Rating</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => updateFile(file.id, { rating: file.rating === star ? 0 : star })}
              className={`text-base transition-colors ${
                star <= file.rating ? 'text-accent' : 'text-gray-700 hover:text-gray-500'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="p-3 border-b border-surface-border flex flex-col gap-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Tags</span>
        <div className="flex flex-wrap gap-1">
          {file.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-surface-hover border border-surface-border text-gray-400"
            >
              {tag}
              <button
                onClick={() => updateFile(file.id, { tags: file.tags.filter((t) => t !== tag) })}
                className="text-gray-600 hover:text-gray-300"
              >×</button>
            </span>
          ))}
          <TagInput onAdd={(tag) => {
            if (!file.tags.includes(tag)) updateFile(file.id, { tags: [...file.tags, tag] })
          }} />
        </div>
      </div>

      {/* Notes */}
      <div className="p-3 flex flex-col gap-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Notes</span>
        <textarea
          value={file.notes}
          onChange={(e) => updateFile(file.id, { notes: e.target.value })}
          placeholder="Add notes…"
          rows={4}
          className="w-full text-[11px] text-gray-300 bg-surface-hover border border-surface-border rounded px-2 py-1.5 resize-none outline-none focus:border-accent/50 placeholder-gray-700 leading-relaxed"
        />
      </div>

    </div>
  )
}

function TagInput({ onAdd }: { onAdd: (tag: string) => void }): JSX.Element {
  return (
    <input
      type="text"
      placeholder="+ tag"
      className="w-16 text-[10px] bg-transparent text-gray-500 placeholder-gray-700 outline-none"
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
