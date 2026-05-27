export interface ChangelogEntry {
  version: string
  date: string
  sections: {
    icon: string
    title: string
    items: string[]
  }[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.8',
    date: 'May 2026',
    sections: [
      {
        icon: '✦',
        title: "What's New modal",
        items: [
          'Shows automatically on first launch after each update',
          'Lists changes for the current version with previous versions collapsible below',
          'Dismissing saves the version — won\'t appear again until the next update',
        ],
      },
    ],
  },
  {
    version: '1.1.7',
    date: 'May 2026',
    sections: [
      {
        icon: '⇌',
        title: 'Improved crossfade timing on export',
        items: [
          'Tracks without manual cue points now fade in so the fade completes exactly when the outgoing track begins its fade-out',
          'Fade-in includes a 3-second buffer beyond detected content start for a more gradual build',
        ],
      },
    ],
  },
  {
    version: '1.1.6',
    date: 'May 2026',
    sections: [
      {
        icon: '⬚',
        title: 'Layout & UI updates',
        items: [
          'Player bar now spans the full window width',
          'Folder panel footer redesigned with compact two-column grid and Refresh button',
          'Matched count shown in file list footer alongside file count',
          'Tag count shown in tags pane when no tags are selected',
          'Version badge redesigned to match Limina Mix style',
        ],
      },
    ],
  },
  {
    version: '1.1.5',
    date: 'April 2026',
    sections: [
      {
        icon: '♫',
        title: 'Player fix',
        items: [
          'Fixed race condition where switching tracks while audio was playing could cause silence',
        ],
      },
    ],
  },
  {
    version: '1.1.4',
    date: 'April 2026',
    sections: [
      {
        icon: '✦',
        title: 'Now Playing overlay simplified',
        items: [
          'Waveform and time display removed for a cleaner layout focused on album art, track info, and transport',
        ],
      },
    ],
  },
  {
    version: '1.1.3',
    date: 'March 2026',
    sections: [
      {
        icon: '🔗',
        title: 'Re-fetch from MFB fix',
        items: [
          'Re-fetching track data no longer wipes existing MFB metadata when the session token is expired',
          'Re-fetch button is now only shown when logged in',
        ],
      },
    ],
  },
  {
    version: '1.1.2',
    date: 'March 2026',
    sections: [
      {
        icon: '◉',
        title: 'Now Playing overlay',
        items: [
          'Click album art or track name in the player bar to open a full-screen overlay',
          'Large album image, blurred background, waveform, transport controls, and phase/tag chips',
          'Click any tag to filter the file list to that tag',
        ],
      },
    ],
  },
  {
    version: '1.1.1',
    date: 'February 2026',
    sections: [
      {
        icon: '⌕',
        title: 'Search across all playlists',
        items: [
          'Search box in the playlist sidebar finds any track across all your MFB playlists',
          'Results show which playlists contain the track, whether it\'s in your library, and buy links',
          'Playlist tracks can now be dragged to Finder or a DAW',
          '"Show in Library" navigates to the file in the folder view and auto-scrolls to it',
        ],
      },
    ],
  },
  {
    version: '1.1.0',
    date: 'February 2026',
    sections: [
      {
        icon: '🖼',
        title: 'Album art throughout the app',
        items: [
          'Artwork from the MFB catalogue appears in file list rows, player bar, properties panel, and playlist views',
          'Previously-matched files are back-filled silently on next login',
          'Folder right-click context menu with "Show in Finder" and "Remove Folder"',
          'Removed files view now has sortable columns and per-row play buttons',
        ],
      },
    ],
  },
]
