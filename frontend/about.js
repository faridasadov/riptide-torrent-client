// DEPENDENCY: This file must be loaded before app.js. app.js references the
// global `RIPTIDE` constant defined here. If this file is missing or fails to
// load, app.js guards against it with a typeof check in the #about-toggle handler.
// ─────────────────────────────────────────────────────────────────────────────
//  RIPTIDE — Brand identity file
//  This object is frozen at runtime. Do not modify or redistribute without
//  permission from faridasadov.
// ─────────────────────────────────────────────────────────────────────────────
const RIPTIDE_CHANGELOG = Object.freeze({
  "0.1.6": ["Settings save button fix (invisible in light mode due to CSS specificity)", "Small screen: detail pane slides in as overlay on screens <900px with back button", "Pearl light fg contrast improved (fg-2/fg-3/fg-4 all darkened)", "Changelog added to About modal"],
  "0.1.5": ["Pearl light theme visual fixes: graph colors, card shadows, toggle contrast"],
  "0.1.4": ["Disabled/Prefer/Require/enabled/Save settings fully translated (EN/AZ/RU)", "Privacy note and IP filter description i18n"],
  "0.1.3": ["Version tracking moved to about.js (RIPTIDE.version)"],
  "0.1.2": ["Health badge on torrent cards", "Torrent age display", "Peer client icons + seed indicator + flag emoji", "Keyboard shortcuts (P/R/Del/↑↓)", "Clipboard magnet monitor", "Desktop notifications on download complete", "QR code for magnet links", "Session stats in footer", "RSS feed favicon", "Auto-move completed downloads", "Duplicate magnet detection"],
  "0.1.1": ["Completed action: seed/stop/move when download finishes", "RSS rule test against live feed", "Speed graph history persisted in localStorage", "IP geolocation flags in Peers tab"],
  "0.1.0": ["Delete with files option", "Global pause/resume all torrents", "Full magnet URI copy", "Torrent rename (custom_name in DB)", "Sort by name/size/progress/speed", "Multi-select with bulk actions bar"],
});

const RIPTIDE = Object.freeze({
  name: "Riptide",
  version: "0.1.6",
  tagline: "Fast. Private. Yours.",
  brand: "faridasadov",
  author: "Farid Asadov",
  copyright: `© ${new Date().getFullYear()} faridasadov. All rights reserved.`,
  engine: "libtorrent 2.0",
  stack: Object.freeze(["Python", "FastAPI", "libtorrent", "Vanilla JS"]),
  links: Object.freeze({
    brand: "https://faridasadov.com",
  }),
});
