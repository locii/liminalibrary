import { ipcMain } from 'electron'
import { get } from 'https'

const BASE = 'https://musicforbreathwork.com/api'

interface CatalogueTrack {
  id: number
  title: string
  artist: string
  album: string
  slug?: string
}

let catalogueCache: CatalogueTrack[] | null = null

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'LiminaLibrary/1.0' } }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')) as T) }
        catch (e) { reject(new Error(`JSON parse error: ${e}`)) }
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function getCatalogue(): Promise<CatalogueTrack[]> {
  if (catalogueCache) return catalogueCache
  console.log('[mfb] fetching catalogue...')
  catalogueCache = await fetchJson<CatalogueTrack[]>(`${BASE}/tracks`)
  console.log('[mfb] catalogue loaded:', catalogueCache.length, 'tracks')
  return catalogueCache
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with'])

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.[^.]+$/, '')        // strip file extension
    .replace(/^\d+[\s._-]+/, '')    // strip leading track numbers
    .replace(/[^a-z0-9\s]/g, ' ')  // punctuation → space
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(s: string): Set<string> {
  return new Set(
    normalize(s)
      .split(' ')
      .filter((t) => t.length > 1 && !STOP.has(t))
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const t of a) if (b.has(t)) intersection++
  return intersection / (a.size + b.size - intersection)
}

interface MatchEntry {
  id: string
  filename: string
  artist: string
  folder_artist: string
  folder_album: string
}

function scoreMatch(entry: MatchEntry, track: CatalogueTrack): number {
  const fileParts = normalize(entry.filename).split(/\s+-\s+/)
  const fileTokens = tokenize(entry.filename)
  // If filename has "Artist - Title" pattern, try the second part as pure title tokens
  const titleOnlyTokens = fileParts.length >= 2 ? tokenize(fileParts[fileParts.length - 1]) : fileTokens
  const trackTitleTokens = tokenize(track.title)
  const trackArtistTokens = tokenize(track.artist)
  const trackAlbumTokens = tokenize(track.album)

  const titleScore = Math.max(jaccard(fileTokens, trackTitleTokens), jaccard(titleOnlyTokens, trackTitleTokens))

  const artistSources = [entry.artist, entry.folder_artist].filter(Boolean)
  const hasArtistContext = artistSources.length > 0
  const artistScore = hasArtistContext
    ? Math.max(...artistSources.map((a) => jaccard(tokenize(a), trackArtistTokens)))
    : 0

  // Hard reject: title must match something, and artist context must match if present
  if (titleScore === 0) return 0
  if (hasArtistContext && artistScore === 0) return 0

  const albumScore = entry.folder_album ? jaccard(tokenize(entry.folder_album), trackAlbumTokens) : 0

  // When we have artist context, weight it heavily — title alone isn't enough
  if (hasArtistContext) {
    return titleScore * 0.45 + artistScore * 0.45 + albumScore * 0.1
  }
  return titleScore * 0.7 + artistScore * 0.2 + albumScore * 0.1
}

export function registerMfbHandlers(): void {
  ipcMain.handle('mfb:searchTracks', async (_, query: string) => {
    return fetchJson(`${BASE}/tracks/search?q=${encodeURIComponent(query)}&limit=20`)
  })

  ipcMain.handle('mfb:getTrack', async (_, id: number) => {
    return fetchJson(`${BASE}/tracks/${id}`)
  })

  ipcMain.handle('mfb:matchTracks', async (_, entries: MatchEntry[]) => {
    const catalogue = await getCatalogue()
    const THRESHOLD = 0.25

    return Promise.all(entries.map(async (entry) => {
      let bestScore = 0
      let bestTrack: CatalogueTrack | null = null
      for (const track of catalogue) {
        const score = scoreMatch(entry, track)
        if (score > bestScore) { bestScore = score; bestTrack = track }
      }
      console.log(
        '[mfb:match]',
        entry.filename,
        bestTrack && bestScore >= THRESHOLD ? `→ "${bestTrack.title}" (${bestScore.toFixed(2)})` : `no match (best: ${bestScore.toFixed(2)})`
      )
      if (bestScore < THRESHOLD || !bestTrack) return { id: entry.id, track: null, confidence: bestScore }

      try {
        const full = await fetchJson<{
          id: number; title: string; description: string; slug?: string
          artists: { id: number; name: string }[]
          album: { id: number; title: string; image_url: string }
          tags: Record<string, { id: number; name: string; slug: { en: string } }[]>
          audio_features?: Record<string, unknown>
        }>(`${BASE}/tracks/${bestTrack.id}`)
        return {
          id: entry.id,
          track: {
            id: full.id,
            title: full.title,
            slug: full.slug ?? bestTrack.slug ?? '',
            artists: full.artists,
            album: full.album,
            tags: full.tags,
            description: full.description ?? '',
            audio_features: full.audio_features,
          },
          confidence: bestScore,
        }
      } catch {
        return {
          id: entry.id,
          track: {
            id: bestTrack.id,
            title: bestTrack.title,
            slug: bestTrack.slug ?? '',
            artists: [{ id: 0, name: bestTrack.artist }],
            album: { id: 0, title: bestTrack.album, image_url: '' },
            tags: {},
            description: '',
          },
          confidence: bestScore,
        }
      }
    }))
  })

  ipcMain.handle('mfb:rankMatches', async (_, entry: MatchEntry) => {
    const catalogue = await getCatalogue()
    return catalogue
      .map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        score: scoreMatch(entry, track),
      }))
      .filter((r) => r.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  })

  ipcMain.handle('mfb:clearCatalogue', () => {
    catalogueCache = null
  })
}
