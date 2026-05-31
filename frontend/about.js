// DEPENDENCY: This file must be loaded before app.js. app.js references the
// global `RIPTIDE` constant defined here. If this file is missing or fails to
// load, app.js guards against it with a typeof check in the #about-toggle handler.
// ─────────────────────────────────────────────────────────────────────────────
//  RIPTIDE — Brand identity file
//  This object is frozen at runtime. Do not modify or redistribute without
//  permission from faridasadov.
// ─────────────────────────────────────────────────────────────────────────────
const RIPTIDE = Object.freeze({
  name: "Riptide",
  version: "0.0.5-beta",
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
