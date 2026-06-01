import platform
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from app.core.storage import SettingsRepository, TorrentRepository

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/status")
async def system_status():
    settings = SettingsRepository().get_all()
    try:
        usage = shutil.disk_usage(settings["default_download_folder"])
        free = usage.free
        total = usage.total
        used = usage.used
    except (OSError, FileNotFoundError):
        free = 0
        total = 0
        used = 0
    torrents = TorrentRepository().list()
    return {
        "download_root": settings["default_download_folder"],
        "disk_total": total,
        "disk_used": used,
        "disk_free": free,
        "torrent_count": len(torrents),
        "dht_enabled": settings["dht_enabled"],
        "upnp_enabled": settings["upnp_enabled"],
        "lsd_enabled": settings["lsd_enabled"],
    }


@router.get("/browse")
async def browse_directory(path: str = None):
    server_os = platform.system().lower()  # "linux", "windows", "darwin"
    home = Path.home()

    if path is None:
        shortcuts = []
        if home.exists():
            shortcuts.append({"path": str(home), "name": "Home"})
            dl = home / "Downloads"
            if dl.exists():
                shortcuts.append({"path": str(dl), "name": "Downloads"})
        for mount in ["/media", "/mnt", "/data", "/opt", "/srv"]:
            mp = Path(mount)
            if mp.exists():
                shortcuts.append({"path": mount, "name": mount})
        return {"path": str(home), "parent": None, "dirs": [], "shortcuts": shortcuts, "os": server_os}

    target = Path(path).expanduser().resolve()
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")

    parent = str(target.parent) if target != target.parent else None
    try:
        dirs = sorted(
            [{"path": str(item), "name": item.name}
             for item in target.iterdir()
             if item.is_dir() and not item.name.startswith(".")],
            key=lambda d: d["name"].lower(),
        )
    except PermissionError:
        dirs = []

    shortcuts = [{"path": str(home), "name": "Home"}]
    dl = home / "Downloads"
    if dl.exists():
        shortcuts.append({"path": str(dl), "name": "Downloads"})

    return {"path": str(target), "parent": parent, "dirs": dirs, "shortcuts": shortcuts, "os": server_os}


@router.get("/port-status")
async def port_status(request: Request):
    service = request.app.state.torrent_service
    if not hasattr(service, "get_port_status"):
        raise HTTPException(status_code=503, detail="Torrent engine unavailable")
    return service.get_port_status()
