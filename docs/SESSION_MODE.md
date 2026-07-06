# Session Mode — Feature Writeup (v2.0.0)

Session Mode turns Limina Library from a catalogue into a live mixing tool. It builds and plays a continuous, auto-crossfading breathwork mix from your own library, and lets you record, replay, and template what you play. This is the headline of the 2.0 release (the feature was previously prototyped as "Generate" / Auto-Mix).

This document is a plain-language tour of everything that shipped, grouped by area. It doubles as reference for release notes, the website, and support.

---

## Getting in and out

- **Enter:** the left sidebar has a new **Sessions** tab. Its **Create session** button opens Session Mode. (Session Mode is a Music for Breathwork account feature.)
- **Sidebar order:** tabs are now **Tags · Playlists · Sessions · Folders**, and the panel is slightly wider to fit them.
- **Leave:** the **Close** button in the header returns to the library. Playback keeps going — see the mini-player below.

---

## Playing a mix

**Now Playing** is the heart of the panel:

- Album art, track title and artist for the current track.
- A **live waveform** with playback position and cue markers (intro-end, outro-start, fade-in point). Click the waveform to cue-and-crossfade to any point.
- **Transport:** Play/Pause, Skip to next, and **Fade next** (start the crossfade into the next track immediately).
- **Crossfade length slider (Xfade):** sets how long transitions take. You can move it *during* a crossfade and the in-progress fade re-times to match.
- Optional inline **visualizer** with a fullscreen mode.

The engine is persistent: it lives outside the panel, so playback survives closing Session Mode.

---

## Choosing what plays

**The pool** is the set of tracks Session Mode can pull from. You shape it two ways:

- **Tags** — filter to tracks carrying particular tags, matching **Any** (union) or **All** (intersection). Drag tags in from the picker or the sidebar.
- **Feel EQ** — a 4-band soft filter that *steers* rather than hard-filters the selection: **Affective Intensity**, **Activating Intensity**, **Tension**, and **Spaciousness**. Boost or cut each band; the available list re-sorts live by how well each track fits, showing a per-track "feel match" score.

The **Available** list on the right is searchable and lazy-loaded, so large libraries stay fast.

---

## Up Next — the queue

The queue decides ordering. It holds two kinds of item:

- **Tracks** — specific files, added by double-click, drag, or the + button.
- **Tag generators** — a tag group (plus its Feel EQ snapshot) that keeps pulling matching tracks. Each generator can have an optional **duration** and its own **Any/All** match mode. A generator shows a "ghost preview" of the exact tracks it will play next, in order, so what you see is what you'll hear. You can reorder, shuffle, or sort a generator's upcoming list.

When the queue empties, the **tail** takes over — the most recently used generator (or the whole pool) keeps the mix going indefinitely.

You can also add an owned **Music for Breathwork playlist** straight into the queue.

---

## Cue-aware crossfades

Crossfades sound best when they land on musical moments rather than arbitrary times:

- A **background cue scan** walks the library one file at a time, running an ffmpeg energy-envelope analysis to detect each track's intro-end and outro-start. It's throttled to stay out of the way and only touches unscanned files.
- You can force a re-scan of a folder from its right-click menu ("Scan track cue points").
- Per-track **fade points and curves** are editable in the cue editor, and manual cues are always preserved over detected ones.

---

## Recording sessions

A **session** is a recording of what actually happened during a mix — the "blow-by-blow".

- Hit **Record** (next to Play/Pause) to start capturing. The button shows a live elapsed time and track count.
- Recording captures the **realized tracklist** (what actually played, with start offsets and crossfade lengths) and the **plan edits** you made along the way (adding/removing generators, changing durations, etc.).
- Clicking the record button again opens the **Save Session** modal — name it and save. Saving requires at least one track to have played, so you can't accidentally save an empty recording.
- On save, the session opens in the **Recorded Sessions** view so you can see exactly what was captured, and it appears in the **Sessions** tab.

**In the Sessions tab (sidebar):** every recorded session is listed with its date, duration, and track count. Click one to **load it and start playing** immediately.

**In the Recorded Sessions modal:** a chronological timeline of tracks + edits + crossfades, with actions to **Load & play**, **Export tracklist** (to clipboard), **Save as Template**, or **Delete**.

---

## Templates vs. Sessions

Two distinct, complementary concepts — this distinction is worth keeping clear:

| | **Template** | **Recorded Session** |
|---|---|---|
| What it is | A reusable *plan* — tags, generators, tracks and settings | A recording of an *actual playthrough* |
| Created by | **Save as Template** | **Record** → save |
| Loading it | Sets up the queue to generate from | Replays the exact tracklist you captured |

Both are reachable from the header **Load…** menu, grouped under **Templates** and **Recorded Sessions**. The trash button next to it deletes whichever is selected.

The **⋯ menu** near Load offers **Export tracklist** (copies the current plan to the clipboard) and a shortcut to the recorded-sessions list.

---

## Around the app

- **Navbar mini-player** — once a mix is playing, a compact strip in the top bar shows the current track with play/pause and skip, and jumps back into Session Mode on click. It stays after you leave the panel.
- **Guided tour** — a Session Mode walkthrough appears automatically the first time you open the panel, and can be replayed any time with the **?** button in the header.

---

## Where things live (for maintainers)

- `components/MixPanel.tsx` — the Session Mode view.
- `components/SessionsModal.tsx` — recorded-sessions timeline + actions.
- `components/SaveSessionModal.tsx` — the name-and-save prompt.
- `components/MixMiniPlayer.tsx` — navbar strip.
- `components/MixVisualizer.tsx` — visualizer.
- `components/sessionTourSteps.ts` — guided-tour steps (rendered by the shared `GuidedTour`).
- `lib/mixEngine.ts` / `lib/mixEngineSingleton.ts` — persistent crossfading playback engine.
- `lib/mixSelection.ts` — pool/queue materialisation and feel scoring.
- `lib/sessionRecorder.ts` — session recording (tracklist + edit diffing).
- `lib/cueScan.ts` — background intro/outro cue analysis.
- Store: `store/libraryStore.ts` — `mixQueue`, `savedMixes` (templates), `mixSessions` (recordings), `mixPlayback`, and related actions.
