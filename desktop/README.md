# Riptide Desktop

This is the native desktop package wrapper for Riptide.

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

The generated files are written to `desktop\dist`, including:

- `Riptide-<version>-win-x64.exe` NSIS installer

During development, the wrapper can still connect to an already running backend:

```bash
RIPTIDE_URL=http://127.0.0.1:8000 npm start
```
