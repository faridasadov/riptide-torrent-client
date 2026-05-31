import shutil

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


@router.get("/port-status")
async def port_status(request: Request):
    service = request.app.state.torrent_service
    if not hasattr(service, "get_port_status"):
        raise HTTPException(status_code=503, detail="Torrent engine unavailable")
    return service.get_port_status()
