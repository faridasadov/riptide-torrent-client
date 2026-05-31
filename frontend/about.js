const RIPTIDE_CHANGELOG = Object.freeze({
  "0.1.9": [
    "Added cards/table torrent list toggle with persistent UI preference",
    "Expanded add-torrent flow with rename-before-add and tracker override support",
    "Added RSS regex rule shortcut and regex-aware rule testing",
    "Completed desktop magnet and .torrent handoff flow with local file import"
  ],
  "0.1.8": [
    "Fixed torrent file creation for directory-based fixtures and local content",
    "Validated delete-with-files using a controlled fixture",
    "Version line corrected to continue from 0.1.7 to 0.1.8"
  ],
  "0.1.7": [
    "Fixed storage Actions button so file tools menu stays open and works reliably",
    "Added release manifest with centralized version and changelog data",
    "Added torrent move-content, force-start, peer block and port status features",
    "Added tracker reorder controls and next-announce timing in the UI",
    "Added optional skip-hash-check for .torrent imports and better storage action labels"
  ]
});

const RIPTIDE = Object.freeze({
  name: "Riptide",
  version: "0.1.9",
  tagline: "Fast. Private. Yours.",
  brand: "faridasadov",
  author: "Farid Asadov",
  copyright: `© ${new Date().getFullYear()} faridasadov. All rights reserved.`,
  engine: "libtorrent 2.0",
  stack: Object.freeze(["Python", "FastAPI", "libtorrent", "Vanilla JS"]),
  links: Object.freeze({
    brand: "https://faridasadov.com"
  })
});
