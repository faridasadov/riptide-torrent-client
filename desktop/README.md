# Riptide Desktop

This is the native Tauri desktop wrapper for Riptide.

Packaged Windows builds include the Python backend and start it automatically.
The app stores data under the Windows user profile and downloads to `Downloads\Riptide`.

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

For Linux bundles, run this on a Linux machine with Rust, Node 18+ and Python:

```bash
cd desktop
./build-linux.sh
```

For a full Windows installer, run the Windows build on a Windows machine:

```powershell
cd desktop
.\build-windows.ps1
```

Equivalent manual commands:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-build.txt

cd ..\desktop
npm install
npm run dist:win
```

The generated files are written under `desktop\src-tauri\target\release\bundle`, including:

- `Riptide_<version>_x64-setup.exe` NSIS installer

Linux bundle output is under:

- `desktop/src-tauri/target/release/bundle/appimage`
- `desktop/src-tauri/target/release/bundle/deb`

The shell loads the existing FastAPI frontend from the local backend URL and adds:
- native window menu
- tray icon with hide-to-tray behavior
- single-instance handling
- backend auto-start and shutdown
- `.torrent` / magnet handoff plumbing

During development, the wrapper can still connect to an already running backend with `RIPTIDE_URL`.
