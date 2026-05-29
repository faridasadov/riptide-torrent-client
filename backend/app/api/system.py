import shutil

from fastapi import APIRouter

from app.core.storage import SettingsRepository, TorrentRepository

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/status")
async def system_status():
    settings = SettingsRepository().get_all()
    usage = shutil.disk_usage(settings["default_download_folder"])
    torrents = TorrentRepository().list()
    return {
        "download_root": settings["default_download_folder"],
        "disk_total": usage.total,
        "disk_used": usage.used,
        "disk_free": usage.free,
        "torrent_count": len(torrents),
        "dht_enabled": settings["dht_enabled"],
        "upnp_enabled": settings["upnp_enabled"],
        "lsd_enabled": settings["lsd_enabled"],
    }
