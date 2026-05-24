# Changelog

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
