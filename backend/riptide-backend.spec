# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path
import os
import sys


cwd = Path.cwd()
repo_root = cwd.parent if cwd.name == "desktop" else Path(SPECPATH).parent
backend_dir = repo_root / "backend"
target_platform = os.getenv("RIPTIDE_BUILD_PLATFORM", sys.platform)
openssl_bin = Path(os.getenv("OPENSSL_BIN", r"C:\Program Files\OpenSSL-Win64\bin"))
openssl_binaries = [
    (str(path), ".")
    for path in [
        openssl_bin / "libcrypto-1_1-x64.dll",
        openssl_bin / "libssl-1_1-x64.dll",
    ]
    if path.exists()
]
backend_name = "riptide-backend.exe" if target_platform.startswith("win") else "riptide-backend"


a = Analysis(
    [str(backend_dir / "desktop_entry.py")],
    pathex=[str(backend_dir)],
    binaries=openssl_binaries,
    datas=[
        (str(repo_root / "frontend"), "frontend"),
        (str(repo_root / "release.json"), "."),
    ],
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops.auto",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan.on",
        "multipart",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name=backend_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
