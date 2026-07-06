# Limina Library — CLAUDE.md

## What this is

Electron/React desktop app (Mac + Windows) for breathwork facilitators. It's a local music library that scans audio files, matches them against the **Music for Breathwork (MFB)** catalogue via API, and integrates with **Limina Studio** (a separate DAW app, `.limina` file format).

Stack: Electron 31, React 18, Zustand, Tailwind, TypeScript, electron-vite, electron-builder, ffmpeg-static.

---

## Dev commands

```sh
npm run dev          # electron-vite dev server + Electron window
npm run build        # compile renderer + main + preload to out/
npm run package      # build + electron-builder (local, no publish)
npm run publish      # build + electron-builder --publish always (triggers GH release)

npm run typecheck:node   # tsc for main/preload
npm run typecheck:web    # tsc for renderer
```

No test suite — verify changes by running the app.

---

## Code map

Full IPC, module, and store reference: **`docs/CODEMAP.html`** (browse) and **`docs/CODEMAP.yaml`** (agents / grep).

## Architecture

```
src/
  main/         Node/Electron process
    index.ts    App bootstrap, audio HTTP server, IPC registration
    ipc/        IPC handler modules (one file per domain)
  preload/      contextBridge — exposes window.electronAPI to renderer
  renderer/     React app (Vite)
    src/
      App.tsx             Root layout, panel routing
      store/
        libraryStore.ts   Single Zustand store — all UI state
      types/index.ts      Shared types (re-exported from src/shared/types.ts)
      components/         One file per UI panel
      lib/                Pure helpers
  shared/
    types.ts    Type definitions shared between main and renderer
```

All renderer↔main communication goes through `window.electronAPI` (defined in `preload/index.ts`). Never use Node APIs directly in the renderer.

---

## IPC surface

| Channel | Direction | Handler file | Purpose |
|---|---|---|---|
| `library:pickFolder` | R→M | scanHandlers | Open folder picker |
| `library:buildWatchedFolder` | R→M | scanHandlers | Build WatchedFolder metadata |
| `library:scanFolder` | R→M | scanHandlers | Scan folder, return LibraryFile[] |
| `library:scanFile` | R→M | scanHandlers | Scan single file |
| `library:findOnDisk` | R→M | scanHandlers | Search for a file by title/artist |
| `library:pickAudioFile` | R→M | scanHandlers | Open audio file picker |
| `catalogue:load` | R→M | catalogueHandlers | Load catalogue JSON from disk |
| `catalogue:save` | R→M | catalogueHandlers | Persist catalogue JSON |
| `catalogue:listBackups` | R→M | catalogueHandlers | List backup slots |
| `catalogue:restoreBackup` | R→M | catalogueHandlers | Restore a backup slot |
| `audio:getWaveformPeaks` | R→M | audioHandlers | ffmpeg peak extraction |
| `audio:getServerPort` | R→M | index.ts | Port for local audio HTTP server |
| `mfb:searchTracks` | R→M | mfbHandlers | Text search against MFB API |
| `mfb:getTrack` | R→M | mfbHandlers | Fetch single MFB track |
| `mfb:matchTracks` | R→M | mfbHandlers | Batch audio fingerprint matching |
| `mfb:rankMatches` | R→M | mfbHandlers | Rank candidates for one file |
| `mfb:clearCatalogue` | R→M | mfbHandlers | Reset MFB index state |
| `auth:login` | R→M | authHandlers | MFB user login |
| `auth:logout` | R→M | authHandlers | MFB user logout |
| `auth:me` | R→M | authHandlers | Fetch current user |
| `auth:getUserPlaylists` | R→M | authHandlers | Fetch MFB playlists for user |
| `auth:getPlaylist` | R→M | authHandlers | Fetch full playlist detail |
| `studio:saveSession` | R→M | studioHandlers | Write `.limina` JSON to disk |
| `studio:openFile` | R→M | studioHandlers | `shell.openPath` a `.limina` file |
| `shell:showInFolder` | R→M | index.ts | Reveal file in Finder |
| `library:copyFile` | R→M | index.ts | Copy file path to clipboard |
| `library:startDrag` | R→M | index.ts | Native drag from app (sendSync) |
| `window:setTitle` | R→M | index.ts | Set BrowserWindow title |
| `window:setZoom` | R→M | index.ts | Set renderer zoom factor |
| `updater:check` | R→M | index.ts | Check for updates |
| `updater:quitAndInstall` | R→M | index.ts | Apply downloaded update |
| `updater:downloading` | M→R | index.ts | Download progress (0–100) |
| `updater:downloaded` | M→R | index.ts | Update ready, carries version string |

---

## Audio server (critical constraints)

`startAudioServer()` in `src/main/index.ts` runs a local HTTP server on a random port for all audio playback. The routing logic exists to work around three confirmed Chromium decoder bugs:

**Bug 1 — >48kHz files play at 2× speed.** Chromium misinterprets sample rates above 48kHz. Fix: resample to 48kHz via ffmpeg when `sr > 48000`.

**Bug 2 — ffmpeg WAV pipe plays ~9% fast.** A WAV pipe header has a placeholder size that Chromium's WAV decoder mis-clocks. Fix: always use `ffmpeg→FLAC` (not WAV) for transcoded output. FLAC is a framed bitstream with no header-size issue.

**Bug 3 — non-16-bit-PCM WAVs play ~9% fast via direct streaming.** Chromium's WAV decoder only handles 16-bit PCM int reliably. Float32/24-bit/WAVE_FORMAT_EXTENSIBLE WAVs fall back to the device output rate (48kHz on macOS). Fix: `inspectWavFormat()` peeks the RIFF `fmt ` chunk; only 16-bit int PCM WAVs take the direct path. Everything else goes through `ffmpeg→FLAC`.

**Rule:** Never (a) route transcoded audio through a WAV pipe, (b) skip the 48kHz cap for high-rate sources, or (c) send non-16-bit-PCM WAVs through the direct path.

---

## Data model highlights

- **`LibraryFile`** — one entry per audio file. Has both raw file metadata (path, format, duration, sampleRate) and MFB-applied data (trackTitle, mfbTrackId, tags, breathworkPhase, audioFeatures, buy URLs). MFB data starts null/empty and is written when a match is applied.
- **`Catalogue`** — the persisted JSON: `watchedFolders`, `files`, `removedFiles`, `playlistSessions` (playlist ID → saved `.limina` path). Peaks are stripped on save (re-generated on demand).
- **`BreathworkPhase`** — enum mapped to journey arc colors in `PHASE_COLORS`. Phase tags come from MFB's `Hour` tag category.
- **`MfbPlaylistDetail`** — full playlist, segmented. Segments contain `MfbPlaylistTrack[]`. The renderer matches playlist tracks to library files by `mfbTrackId`.
- **`WatchedFolder`** — a folder the user added; scanning walks it recursively.

All state lives in a single `useLibraryStore` (Zustand). No separate server state library.

---

## MFB API — catalogue visibility & matching

The MFB API lives in `../music-for-breathwork-2`. Key points for this integration:

**Track visibility** — `Track` model has a `trackReviewFilter` global scope. Public (unauthenticated) requests only see `track_review = 0 AND catalog_visible = true`. The four track endpoints (`GET /tracks`, `GET /tracks/search`, `POST /tracks/match`, `GET /tracks/{id}`) have **no `auth:sanctum` middleware** — they always run as unauthenticated, so only public catalogue tracks are visible. Private/under-review tracks are intentionally excluded from Library, even for admins. Admins can see private tracks on the website but Library is a user-facing tool and should only surface the public catalogue. If a file can't be matched it's because the MFB track isn't public yet.

**Local catalogue cache** (`mfbHandlers.ts`) — `getCatalogue()` fetches `GET /api/tracks` once per hour and caches it in-memory. The cache is keyed on auth state; logging in or out busts it. `mfb:clearCatalogue` resets it immediately (called at the end of each indexing run in `App.tsx`). If a newly added track isn't appearing in search, clear the catalogue cache.

**Matching** — `mfb:matchTracks` POSTs batches of file entries to `POST /api/tracks/match`, which runs server-side DB LIKE + `similar_text()` scoring. Filename "Artist - Title" patterns are extracted before normalising so the dash isn't stripped first.

**Search** — `mfb:searchTracks` filters the local in-memory catalogue (fast, no network). The server search endpoint (`GET /api/tracks/search?q=`) is available but not used for the interactive search panel.

**API routes** (from `routes/api.php`):
- `GET  /api/tracks` — full catalogue (lightweight: id, title, artist, album)
- `GET  /api/tracks/search?q=&limit=` — DB LIKE search, returns id/title/artists/album
- `POST /api/tracks/match` — batch match up to 50 entries, returns full track + confidence
- `GET  /api/tracks/{id}` — full track detail incl. tags, audio_features, streaming

---

## Ongoing work

See `LiminaStudioIntegration.md` for the Limina Studio integration plan:
- Playlist detail panel (replaces file list when a playlist is selected)
- "Create in Limina Studio" button → generates a `.limina` session file from the playlist
- `studio:saveSession` and `studio:openFile` IPC handlers are already wired

---

## Releasing

See `RELEASING.md` for the full process. Short version:

1. Add a section to `CHANGELOG.md` matching the tag exactly (e.g. `## v0.8.1`).
2. Bump `version` in `package.json`, commit.
3. `git tag v0.8.1 && git push origin main && git push origin v0.8.1`
4. GitHub Actions builds, signs, notarizes, and publishes the release automatically.

Never reuse a tag that was already pushed and resulted in a published release — bump to the next patch instead.
