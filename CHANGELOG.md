# Changelog

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
