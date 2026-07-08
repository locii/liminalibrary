# Changelog

## v2.4.0 — Session presets & smoother mixing

Curated Session Mode starting points you can load in one click, plus a batch of Session Mode refinements.

- **System presets** — Load curated starting points (tag generators + Feel EQ) from the new **System Presets** list in Session Mode's Load menu. They're served live from Music for Breathwork, so the collection grows without an app update.
- **No repeats in a session** — Once a track has played, generators won't pick it again for the rest of the session.
- **Cleaner section handoffs** — A generator no longer starts a fresh song in its final minute, avoiding tracks that end moments after they begin.
- **Smoother mid-crossfade skips** — Hitting Fade Next while a crossfade is still in progress no longer drops the audio — it fades from whichever track is louder.
- **Collapse a generator** — Fold a tag generator's Up Next list away with a click, and shuffle just that generator's tracks with **Random**.
- **Reorder and play from a generator** — Drag tracks within a generator to reorder, drag them onto Now Playing to play, or double-click to play now (played tracks leave the list).
- **Set an exact section length** — Type a specific length for a generator (e.g. 8 minutes) as well as cycling the presets.
- **Clearer chips** — Every chip on a generator now has a tooltip explaining what it does.

## v2.3.0 — Always up to date

Your matched library now keeps itself current with Music for Breathwork, and Session Mode gains a couple of quality-of-life touches.

- **Automatic catalogue sync** — Matched tracks refresh their audio features and tags from Music for Breathwork in the background, so when the catalogue is re-analysed online those updates flow through to your library. A **Syncing** indicator shows progress — click it to see exactly which tracks are updating, and Cancel anytime.
- **Your own tags are kept** — Tags you add yourself are preserved through every sync; only the catalogue's own tags are updated, added, or removed.
- **Rescan the whole library** — **Rescan Audio Features** now refreshes matched tracks from the catalogue *and* re-estimates features for everything else, in one cancellable action.
- **Inspect any track in Session Mode** — Click the ⓘ on a track in the Available pool to open its full details — audio features, tags, artwork — right beside your mix.
- **Clear the current track** — A new ✕ in Now Playing clears what's loaded.

## v2.2.0 — Enrich your own tracks

Bring Music for Breathwork's track data and audio features to music that isn't in the catalogue yet, so your whole library can drive Session Mode — not just matched tracks.

- **Find on Music for Breathwork** — For any unmatched track, open the ⋯ menu → **Find on Music for Breathwork…**, search, and pick the exact track. Your file inherits its real artist, album, artwork and audio features. (It's added to the catalogue privately, credited to you; you can choose to list it publicly later.)
- **Estimated audio features** — Tracks that aren't in the catalogue now have their audio features estimated locally — energy, valence, tension, spaciousness and more — so they join the Session Mode Feel EQ on the same scale as catalogue tracks. Re-estimate anytime from the library menu, and stop a running scan.

## v2.1.0 — Free Session Mode

Session Mode is now free to play. Anyone can build and play a live, auto-crossfading mix from their library — tags, Feel EQ, the Up Next queue and generators, transport, and the crossfade slider all work without an account. The pro tools that keep what you play are reserved for **Music for Breathwork Pro**.

- **Play for free** — Building and playing a mix no longer requires an account.
- **Pro-only capture tools** — Recording sessions, saving templates, loading saved templates/sessions, and adding a playlist to the queue are now Pro features. Free users see these as locked controls that open a short prompt linking to [musicforbreathwork.com/pricing](https://musicforbreathwork.com/pricing).
- **Tags open by default** — The sidebar now opens on the **Tags** pane instead of Folders.

## v2.0.0 — Session Mode

A major update that turns Limina Library into a live mixing tool. **Session Mode** (formerly "Generate") builds and plays a continuous, crossfading breathwork mix from your library in real time — and lets you record, replay, and template your sessions.

- **Session Mode** — Open it from the new **Sessions** tab → **Create session**. A dedicated view that plays a seamless, auto-crossfading mix. Now Playing shows album art, a live waveform with cue markers, transport controls, and a crossfade-length slider you can move mid-fade (in-progress crossfades re-time to match).
- **Tag pool & Feel EQ** — Filter the available tracks by tag (match **Any** or **All**), then shape the selection with a 4-band **Feel EQ** — Affective Intensity, Activating Intensity, Tension, and Spaciousness. The pool re-sorts live by how well each track fits.
- **Up Next queue & generators** — Queue specific tracks, or drop in **tag generators** that keep pulling matching tracks for a set duration. Reorder items, preview what's coming next, and let the last generator carry the "tail" once the queue empties. You can also add an owned Music for Breathwork playlist straight to the queue.
- **Cue-aware crossfades** — A background scan analyses each track's energy envelope to find intro/outro points, so crossfades land on musical moments. Per-track fade points and curves are editable, and you can re-scan a folder on demand.
- **Record sessions** — Hit **Record** to capture the blow-by-blow of a session — the exact tracklist and the changes you make as you go. Saving opens the session so you can see everything that was captured; it then lives in the **Sessions** tab to replay or export.
- **Templates & replay** — **Save as Template** stores the current queue and settings as a reusable starting point. The **Load…** menu loads either a Template (a reusable plan) or a Recorded Session (replays the exact tracklist). Export any session's tracklist to your clipboard from the ⋯ menu.
- **Navbar mini-player** — Playback started in Session Mode stays visible and controllable from a compact strip in the top bar after you leave the panel.
- **Guided tour** — A walkthrough of Session Mode appears the first time you open it, and can be replayed any time with the **?** button.
- **Reorganised sidebar** — The left panel tabs are now **Tags · Playlists · Sessions · Folders**, and the panel is a little wider.

## v1.1.10

- **Windows audio playback fixed** — Preview and Now Playing audio failed to load on Windows because the streaming URL was built assuming a Unix-style file path, so the drive letter fused onto the server port and backslashes corrupted the path. Windows paths are now normalised correctly. macOS is unaffected.
- **"Added" date column** — The file list has a new sortable **Added** column showing when each track was added, so you can sort to find recently added music. The date is taken from the file's creation date, so it backfills across your whole library the next time you rescan.

## v1.1.9

- **What's New modal** — Shows automatically on first launch after each update. Lists changes for the current version with previous versions collapsible below. Dismissing saves the version to localStorage — won't appear again until the next update. Skipped on brand-new installs (guided tour shows instead).

## v1.1.7

- **Improved no-cue crossfade timing** — When exporting a playlist to Limina Mix, tracks without manual cue points now fade in so the fade completes exactly when the outgoing track begins its fade-out. The fade-in duration also includes a 3-second buffer beyond the detected content start for a more gradual build.

## v1.1.6

- **Full-width transport bar** — The player bar now spans the entire window width, sitting below the folder panel and content area rather than only the right column.
- **Folder panel footer redesigned** — Sync M4B and Add Folder sit in a compact two-column grid. A Refresh button (rescan in folders mode, refresh playlists in playlists mode) replaces the old full-width buttons. The matched count moves to the file list footer.
- **Matched count in file list footer** — The file list footer now shows `N / M matched` on the right alongside the file count, visible at all times.
- **Tag count in tags pane** — When no tags are selected in the tags panel, the footer shows the total number of tags in the library.
- **Version badge** — The version/update badge in the player bar now matches the Limina Mix design: version number is a tap-to-check button; shows a download icon and version when an update is ready.

## v1.1.5

- **Player bar audio fix** — Fixed a race condition where switching tracks while audio was playing could cause `play()` to be interrupted by a stale `pause()` call, resulting in silence. The `playing` state is now tracked via a ref so the audio-source coordination handler always reads the current value synchronously.

## v1.1.4

- **Now Playing overlay simplified** — The waveform and time display have been removed from the Now Playing overlay, leaving a cleaner layout focused on album art, track info, phase/tag chips, and transport controls.

## v1.1.3

- **Re-fetch from MFB fix** — Re-fetching track data no longer wipes the existing MFB metadata when the session token is expired or invalid. The button is now only shown when logged in, since the MFB API requires authentication.

## v1.1.2

- **Now Playing overlay** — Clicking the album art or track name in the player bar opens a full-screen overlay with a large album image, blurred background underlay, waveform, transport controls, and phase/tag chips. Clicking any tag filters the file list to that tag and closes the overlay. The MFB track title links directly to the track page on musicforbreathwork.com.

## v1.1.1

- **Search tracks across all playlists** — A search box in the playlist sidebar lets you find any track across all your MFB playlists. Results show which playlists contain the track, whether it's in your library, and buy links. Clicking a result jumps straight to that playlist.
- **Playlist track drag** — Matched tracks in the playlist panel can now be dragged to Finder or a DAW, matching the behaviour in the folder file list.
- **Playlist track context menu** — Right-clicking a matched track in the playlist panel shows a context menu with Copy, Show in Finder, and Show in Library.
- **Show in Library** — "Show in Library" navigates to the file's watched folder in the file list, selects the track, and auto-scrolls to it so you can see it in context alongside neighbouring files.

## v1.1.0

- **Album art throughout the app** — Album artwork from the MFB catalogue now appears in file list rows, the player bar, the properties panel header, playlist panel header and track rows, the missing track panel, and the playlist sidebar. Previously-matched files that predate this feature are back-filled silently on next login.
- **Folder context menu** — Right-clicking a watched folder now shows a context menu with "Show in Finder" and "Remove Folder", replacing the hover-only × button.
- **Removed files improvements** — The removed files view now has sortable columns (Name, Artist, Filename) and a play button on each row so you can preview a track before deciding whether to restore it.
- **Title-based sort in file list** — The Name column sort now uses the MFB track title when available, falling back to the raw filename, so matched tracks sort by their proper names.
- **Playlist coverage count fix** — The "N / M" count in the playlist sidebar is now deduplicated — owning multiple copies of the same track no longer inflates the count.
- **Authenticated catalogue fetch** — The MFB catalogue is now fetched with your auth token, and the cache is invalidated on login and logout so the right set of tracks is always shown.
- **Improved match scoring for "Artist - Title" filenames** — The artist portion of "Artist - Title" filename patterns is now used as a scoring signal, improving match accuracy for files named in that format.
- **Null-safety fixes** — Defensive checks in the Missing Track panel and Properties panel prevent crashes with certain MFB API responses.

## v1.0.0

- **Mix Cue Editor — waveform-integrated cue points** — Clip start/end and intro/outro fade markers are now visible directly on the track waveform in the properties panel. A "Set Cue Points" button opens the full Mix Cue Editor from within the waveform display, and each marker is drawn as a coloured line on the preview so you can see exactly where cuts and fades fall.
- **Power-law fade curves matching Limina Mix** — Fade shapes in the Mix Cue Editor now use the same power-law formula as Limina Mix (exponent = 4^−curve, range −1 to 1). The curve is controlled by dragging the handle on the waveform: drag horizontally to adjust the fade length, drag vertically to change the curve shape. The result exported to a Limina Studio session is numerically identical to what you'd set inside Limina Mix.
- **Progress colouring in the Mix Cue Editor** — The waveform in the cue editor is now coloured with the track's accent colour, split at the playhead to show played vs. unplayed, matching the style of the main waveform preview.
- **Click-to-seek** — Clicking anywhere on the Mix Cue Editor waveform (without dragging) seeks playback to that position.
- **Limina Studio export fixes** — Tracks with clip cue points now export with the correct full-file duration so Limina Studio trims them accurately; previously a clipped track would play for only a second or two. Crossfade timing has also been corrected so the incoming track's fade-in ends exactly where the outgoing track's fade-out ends, and the first track in a playlist can now carry a fade-in.

## v0.9.1

- Fixes release pipeline

## v0.9.0

- **2-way sync with Music for Breathwork** — When you match a local file to a track in the MFB catalogue, the link is now pushed to your MFB account. Matched tracks show an "Owned" badge on track cards, the track detail page, and search results across the website, so you can see at a glance which tracks you already have.
- **Sync on match & unlink** — Applying or removing a match triggers a sync automatically, so your MFB library stays in step with your local library without any manual action.
- **Manual sync button** — A "Sync with MFB" button in the Folders panel footer lets you push your full match list on demand. Shows a brief "Synced ✓" confirmation after completing.
- **Auto-sync on launch** — When you open the app and the catalogue has loaded, your matched tracks are synced to MFB automatically. Re-login also triggers a fresh sync.
- **Bulk apply now syncs** — "Apply all pending matches" pushes the updated list to MFB in the same action.

## v0.8.0

- **Sidebar filters** — The Folders and Playlists tabs now have a search box at the top so you can quickly find a folder or playlist by name in a large library.
- **Playlist sorting** — Sort the playlist list by newest (default) or by name, ascending or descending.
- **Dismissed matches stay dismissed** — When you reject a pending MFB match for an unmatched track, the dismissal is now remembered. The track no longer keeps reappearing in the auto-indexing queue on every rescan.
- **Preview already-linked files in pending matches** — When the MFB match panel says "N files already linked to this track", each linked file now has its own play button so you can confirm what's already in your library before linking another copy.
- **Smarter crossfade detection** — Fade-in detection now uses each track's own peak loudness as the reference instead of a fixed threshold, so quiet ambient intros and loud bang starts both get sensible fade lengths. Adjacent track tails and intros overlap independently so neither gets truncated. Maximum fade-in window raised from 10s to 30s.

## v0.7.0

- **Apple Music buy button** — Playlist tracks and the Missing Track panel now show a "Buy on Apple Music" button when the MFB database has an Apple Music URL for that track. The button opens the Apple Music app directly (via the `music://` deep-link protocol) and automatically swaps the country segment in the URL to match the user's system locale.

## v0.6.0

- **Bandcamp & Beatport buy buttons** — Missing tracks in a playlist now show inline buy buttons (Bandcamp in blue, Beatport in green) when the track has purchase links in the MFB database. Buttons appear in both the playlist track list and the Missing Track detail panel. Tracks with a local file do not show buy buttons.
- **Smart crossfade analysis** — When exporting a playlist to Limina Mix, each matched file is now analysed with the Web Audio API to detect natural fade-out tails and "bang" starts. Crossfade lengths are set per clip based on the waveform rather than a generic fixed value, with a 15-second timeout fallback for large files.
- **MFB track preview in Track Lookup** — A play button in the Track Lookup results lets you preview the MFB candidate audio before linking it to a local file.
- **Arrow key navigation in player** — Left/Right arrow keys now navigate between tracks while the player bar is visible.
- **Dropbox cloud-only file support** — 0-byte placeholder files (e.g. Dropbox cloud-only stubs) no longer block a library scan; the entry is created and metadata fills in on rescan once the file downloads.
- **Match confidence score tooltip** — Track Lookup results show a confidence score on hover so you can judge ambiguous matches before linking.

## v0.5.5

- **Preview duplicate matches** — Each row in the Duplicate Match panel (Properties) now has a small play button so you can quickly listen to each candidate file and confirm which one to keep before unlinking the others.

## v0.5.3

- **Mac auto-update fixed** — Earlier Mac builds shipped only the `.dmg`, but macOS's auto-updater (Squirrel.Mac) needs a `.zip` of the `.app` bundle to apply updates. Releases now ship both, so updates download and install correctly instead of hanging on "Downloading update…" forever. If you've been stuck on a frozen update spinner, fully quit Limina Library (Cmd-Q) and relaunch — the next check will succeed.
- **Manual "Check for updates" button** — Added in v0.5.1; combined with the v0.5.3 fix it now does what it says on the tin.
