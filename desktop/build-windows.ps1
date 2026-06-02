$ErrorActionPreference = "Stop"

$DesktopDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $DesktopDir
$BackendDir = Join-Path $RepoRoot "backend"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$VenvPip = Join-Path $BackendDir ".venv\Scripts\pip.exe"

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  throw "Rust toolchain is required for the Tauri desktop shell. Install rustup first: https://rustup.rs/"
}

$NodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
if ($NodeMajor -lt 18) {
  throw "Node.js 18 or newer is required for Tauri builds."
}

if (-not (Test-Path $VenvPython)) {
  Push-Location $BackendDir
  py -3.11 -m venv .venv
  Pop-Location
}

& $VenvPython -m pip install --upgrade pip
& $VenvPip install -r (Join-Path $BackendDir "requirements-build.txt")

Push-Location $DesktopDir
$NpmCmd = Get-Command npm.cmd -ErrorAction Stop
& $NpmCmd.Source install
$env:PATH = "$(Join-Path $BackendDir '.venv\Scripts');$env:PATH"
& $NpmCmd.Source run dist:win
Pop-Location

Write-Host "Windows installer files are in: $(Join-Path $DesktopDir 'src-tauri\target\release\bundle')"
