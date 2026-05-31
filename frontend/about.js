const RIPTIDE_CHANGELOG = Object.freeze({
  "0.0.8": [
    "Fixed storage Actions button so file tools menu stays open and works reliably",
    "Added release manifest with centralized version and changelog data",
    "Added torrent move-content, force-start, peer block and port status features",
    "Added tracker reorder controls and next-announce timing in the UI",
    "Added optional skip-hash-check for .torrent imports and better storage action labels"
  ]
});

const RIPTIDE = Object.freeze({
  name: "Riptide",
  version: "0.0.8",
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
