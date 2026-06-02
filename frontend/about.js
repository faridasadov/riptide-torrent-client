const RIPTIDE_CHANGELOG = Object.freeze({
  "0.1.27": [
    "Desktop backend packaging now resolves PyInstaller from the backend virtualenv automatically",
    "This removes the host PATH dependency from the Linux and Windows desktop backend build step"
  ],
  "0.1.26": [
    "Aligned release metadata and About versioning with the current Tauri desktop line",
    "Cleaned up desktop documentation to reflect Tauri packaging instead of the old Electron shell"
  ],
  "0.1.25": [
    "Added a live desktop tray status loop with download and upload rates in the tooltip",
    "Tray icon now animates and changes state based on active downloading or uploading traffic"
  ],
  "0.1.24": [
    "Started the packaged Windows backend with CREATE_NO_WINDOW so no extra cmd window stays open",
    "Prevents the app from depending on a visible console window for backend lifetime"
  ],
  "0.1.23": [
    "Added startup tracing for the Windows Tauri shell to capture bundled backend launch diagnostics",
    "Used to verify the packaged backend path, data directory and startup timeout behavior on installed builds"
  ],
  "0.1.22": [
    "Switched the packaged Windows backend data path to a stable LOCALAPPDATA-based directory",
    "Avoids Tauri path-resolution edge cases in the installed Windows app while launching the bundled backend"
  ]
});

const RIPTIDE = Object.freeze({
  name: "Riptide",
  version: "0.1.27",
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
