# Riptide Desktop

This is the native desktop package wrapper for the existing Riptide web app/API.

Run locally:

```bash
cd desktop
npm install
RIPTIDE_URL=http://127.0.0.1:8000 npm start
```

Build packages:

```bash
npm run dist:linux
npm run dist:win
```

The wrapper expects the Riptide backend to be running. Production packaging can later bundle or supervise the Python service beside Electron.
