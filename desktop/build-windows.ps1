$ErrorActionPreference = "Stop"

$DesktopDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $DesktopDir
$BackendDir = Join-Path $RepoRoot "backend"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$VenvPip = Join-Path $BackendDir ".venv\Scripts\pip.exe"

if (-not (Test-Path $VenvPython)) {
  Push-Location $BackendDir
  py -3.11 -m venv .venv
  Pop-Location
}

& $VenvPython -m pip install --upgrade pip
& $VenvPip install -r (Join-Path $BackendDir "requirements-build.txt")

Push-Location $DesktopDir
npm install
$env:PATH = "$(Join-Path $BackendDir '.venv\Scripts');$env:PATH"
npm run dist:win
Pop-Location

Write-Host "Windows installer files are in: $(Join-Path $DesktopDir 'dist')"
