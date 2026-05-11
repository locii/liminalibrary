export type BreathworkPhase =
  | 'first-hour'
  | 'second-hour'
  | 'third-hour'
  | 'second-hour-transition'
  | 'third-hour-transition'
  | 'breakthrough'
  | 'jumpstart'
  | 'call-to-adventure'
  | 'breakthrough-tension'
  | 'breakthrough-release'

export const BREATHWORK_PHASES: { value: BreathworkPhase; label: string }[] = [
  { value: 'first-hour',               label: 'First Hour'               },
  { value: 'second-hour',              label: 'Second Hour'              },
  { value: 'third-hour',               label: 'Third Hour'               },
  { value: 'second-hour-transition',   label: 'Second Hour Transition'   },
  { value: 'third-hour-transition',    label: 'Third Hour Transition'    },
  { value: 'breakthrough',             label: 'Breakthrough'             },
  { value: 'jumpstart',                label: 'Jumpstart'                },
  { value: 'call-to-adventure',        label: 'Call to Adventure'        },
  { value: 'breakthrough-tension',     label: 'Breakthrough Tension'     },
  { value: 'breakthrough-release',     label: 'Breakthrough Release'     },
]

// Colors follow journey arc: green → amber → orange → red → blue → pale blue
export const PHASE_COLORS: Record<BreathworkPhase, string> = {
  'call-to-adventure':       '#7ac47a',
  'jumpstart':               '#9ec86e',
  'first-hour':              '#b8c46e',
  'second-hour-transition':  '#c8b46e',
  'second-hour':             '#c99a4e',
  'breakthrough-tension':    '#c96a3e',
  'breakthrough':            '#c43838',
  'breakthrough-release':    '#5b8fd4',
  'third-hour-transition':   '#7aaed4',
  'third-hour':              '#9ec8e0',
}

export function phaseColorForTag(tagName: string): string | null {
  const lower = tagName.toLowerCase()
  const phase = BREATHWORK_PHASES.find(
    (p) => p.label.toLowerCase() === lower || p.value === lower
  )
  return phase ? PHASE_COLORS[phase.value] : null
}

export interface WatchedFolder {
  id: string
  path: string
  label: string        // last path component
  fileCount: number
  lastScanned: string | null
}

export interface LibraryFile {
  id: string           // stable hash of filePath
  filePath: string
  fileName: string
  artist: string
  album: string
  /** Inferred from watched-folder path …/Artist/Album/ ; shown italic until Apply */
  artistPathGuess: string
  albumPathGuess: string
  /** Whether folder guesses were written into artist/album (confirmed in track panel). */
  appliedPathGuess: boolean
  folderPath: string
  duration: number     // seconds
  sampleRate: number
  channels: number
  format: string       // 'wav' | 'mp3' | 'flac' | 'aiff' | 'm4a'
  fileSize: number     // bytes
  tags: string[]
  rating: number       // 0–5
  notes: string
  breathworkPhase: BreathworkPhase | null
  dateAdded: string    // ISO
  peaks: number[]      // cached waveform peaks
  trackTitle: string      // MFB track title once applied; empty until then
  mfbTrackId: number | null  // MFB track ID once applied; null until then
  mfbIndexed: boolean  // whether this track has been searched against MFB
  mfbApplied: boolean  // whether an MFB match was applied to this track
  audioFeatures: MfbAudioFeatures | null
  bandcampUrl: string | null
  beatportUrl: string | null
  appleMusicUrl: string | null
}

export interface MfbTag { id: number; name: string; slug: { en: string } }

export interface MfbAudioFeatures {
  intensity: number
  activation_intensity: number
  affective_intensity: number
  tempo: number
  tempo_label: string
  energy: number
  energy_label: string
  valence: number
  valence_label: string
  danceability: number
  danceability_label: string
  spaciousness: number
  tension: number
}

export interface MfbMatch {
  id: number
  title: string
  slug?: string
  artists: { id: number; name: string }[]
  album: { id: number; title: string; image_url: string }
  audio_features?: MfbAudioFeatures
  tags: Record<string, MfbTag[]>
  description: string
  bandcamp_url?: string
  beatport_url?: string
  apple_music_url?: string
}

export function appleMusicDeepLink(url: string): string {
  const lang = (typeof navigator !== 'undefined' ? navigator.language : undefined) || 'en-US'
  const m = lang.match(/[a-z]{2}-([A-Z]{2})/i)
  const country = m ? m[1].toLowerCase() : 'us'
  return url
    .replace(/(music\.apple\.com\/)[a-z]{2}(\/)/, `$1${country}$2`)
    .replace('https://', 'music://')
}

export function mfbTrackUrl(id: number, slugOrTitle: string): string {
  const slug = `${id}-${slugOrTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
  return `https://musicforbreathwork.com/tracks/${slug}`
}

export interface MfbPlaylistTrack {
  id: number
  title: string
  artist: string
  duration: number  // milliseconds
  album_image_url?: string
  bandcamp_url?: string
  beatport_url?: string
  apple_music_url?: string
}

export interface MfbPlaylistSegment {
  id: number
  name: string
  order: number
  duration: number
  tracks: MfbPlaylistTrack[]
}

/** Lightweight list item returned by /user/playlists */
export interface MfbPlaylist {
  id: number
  title: string
  trackIds: number[]
}

/** Full playlist detail returned by /user/playlists/:id */
export interface MfbPlaylistDetail {
  id: number
  title: string
  description?: string
  segments: MfbPlaylistSegment[]
}

export interface Catalogue {
  version: string
  watchedFolders: WatchedFolder[]
  files: LibraryFile[]
  removedFiles?: LibraryFile[]
  /** Maps MFB playlist ID → saved .limina file path */
  playlistSessions?: Record<number, string>
}

export interface ScanResult {
  files: LibraryFile[]
  errors: string[]
}
