# Limina Studio Integration

## Playlist Detail Panel

- [ ] When a playlist is selected in the folder panel, show a playlist detail panel in place of (or alongside) the file list
- [ ] Panel header: playlist cover image (from the first track's album image_url), playlist title, description
- [ ] Summary row: track count, total playlist duration
- [ ] Track list — each row shows:
  - Preview play button (stream via audio server)
  - Track title + artist
  - Duration
  - Link icon → selects and opens that file's PropertiesPanel (or highlights it in the file list)
  - Visual indicator if the track is missing from the library

---

## Generate Limina Studio Session

### Session structure (from `May 26 Breathwork.limina`)

The `.limina` file is JSON with:
- `tracks[]` — mixer tracks, each with `id`, `name`, `color`, `volume`, `muted`, `solo`, `order`
- `clips[]` — audio clips placed on a track, each with `id`, `trackId`, `filePath`, `fileName`, `startTime`, `duration`, `trimStart`, `trimEnd`, `fadeIn`, `fadeOut`, `fadeInCurve`, `fadeOutCurve`, `crossfadeIn`, `crossfadeOut`, `volume`, `automation[]`
- `markers[]`
- `sessionLabel`
- `trackHeights` / `laneHeights`

### Generation logic

- [ ] Add "Create in Limina Studio" button to the playlist detail panel
- [ ] Generate two mixer tracks: **Track A** (order 0) and **Track B** (order 1), each with a distinct colour, volume 1
- [ ] Walk playlist tracks **in playlist order**, alternating clips between Track A and Track B (track 1 → A, track 2 → B, track 3 → A, …)
- [ ] Each library file becomes one clip on its assigned track:
  - `startTime` = 0 (user places them in Studio)
  - `duration` = file duration from library
  - `trimStart` / `trimEnd` = 0
  - `fadeIn` / `fadeOut` = 0, curves = 0.5 (Studio defaults)
  - `volume` = 1, `automation` = []
- [ ] Skip playlist tracks that are missing from the library; warn the user how many were skipped
- [ ] Prompt the user for a save location and filename (default: `<playlist title>.limina`)
- [ ] Write the JSON to disk via an IPC handler (`studio:saveSession`)

### Open in Limina Studio

- [ ] After saving, offer an "Open in Limina Studio" button
- [ ] Use `shell.openPath(filePath)` in the main process — Limina Studio should be registered as the `.limina` file handler on the system
- [ ] Add IPC handler `studio:openFile` that calls `shell.openPath`

---

## IPC surface needed

| Handler | Direction | Purpose |
|---|---|---|
| `studio:saveSession` | renderer → main | Write `.limina` JSON to a user-chosen path |
| `studio:openFile` | renderer → main | `shell.openPath` the saved `.limina` file |

---

## Backlog / Nice-to-haves

- Configurable default fade-in / fade-out per track
- Drag-to-reorder tracks in the playlist detail view before exporting
- Show a "session created" toast with a Reveal in Finder link
