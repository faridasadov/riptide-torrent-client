import json
import platform
import shutil
import subprocess
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


_NET_FS_TYPES = {"nfs", "nfs4", "nfs3", "cifs", "smb", "smb2", "smb3",
                 "sshfs", "fuse.sshfs", "davfs", "fuse.davfs2",
                 "fuse.rclone", "fuse.mergerfs", "s3fs", "glusterfs",
                 "lustre", "beegfs", "ocfs2", "afs"}


def _network_mounts_linux() -> list[dict]:
    mounts = []
    try:
        with open("/proc/mounts") as f:
            for line in f:
                parts = line.split()
                if len(parts) < 3:
                    continue
                device, mountpoint, fstype = parts[0], parts[1], parts[2]
                if fstype.lower() in _NET_FS_TYPES or (
                    ":" in device and not device.startswith("/")
                ) or device.startswith("//"):
                    name = Path(mountpoint).name or mountpoint
                    mounts.append({"path": mountpoint, "name": name,
                                   "device": device, "fstype": fstype})
    except OSError:
        pass
    return mounts


def _network_mounts_windows() -> list[dict]:
    mounts = []
    try:
        import string
        import ctypes
        bitmask = ctypes.windll.kernel32.GetLogicalDrives()
        for letter in string.ascii_uppercase:
            if bitmask & 1:
                drive = f"{letter}:\\"
                # DRIVE_REMOTE = 4
                if ctypes.windll.kernel32.GetDriveTypeW(drive) == 4:
                    try:
                        buf = ctypes.create_unicode_buffer(512)
                        ctypes.windll.mpr.WNetGetConnectionW(
                            f"{letter}:", buf, ctypes.byref(ctypes.c_ulong(512))
                        )
                        device = buf.value or drive
                    except Exception:
                        device = drive
                    mounts.append({"path": drive, "name": f"{letter}: (Network)",
                                   "device": device, "fstype": "network"})
            bitmask >>= 1
    except Exception:
        pass
    return mounts


def _network_mounts() -> list[dict]:
    if platform.system() == "Windows":
        return _network_mounts_windows()
    return _network_mounts_linux()


def _build_shortcuts_windows() -> list[dict]:
    import string
    sc = []
    home = Path.home()
    if home.exists():
        sc.append({"path": str(home), "name": "Home"})
        dl = home / "Downloads"
        if dl.exists():
            sc.append({"path": str(dl), "name": "Downloads"})
        desktop = home / "Desktop"
        if desktop.exists():
            sc.append({"path": str(desktop), "name": "Desktop"})
    try:
        import ctypes
        bitmask = ctypes.windll.kernel32.GetLogicalDrives()
        for letter in string.ascii_uppercase:
            if bitmask & 1:
                drive = f"{letter}:\\"
                drive_type = ctypes.windll.kernel32.GetDriveTypeW(drive)
                if drive_type in (3, 5, 6):  # FIXED, CDROM, RAMDISK
                    sc.append({"path": drive, "name": f"{letter}:"})
            bitmask >>= 1
    except Exception:
        pass
    return sc


def _build_shortcuts_unix(home: Path) -> list[dict]:
    sc = []
    if home.exists():
        sc.append({"path": str(home), "name": "Home"})
        dl = home / "Downloads"
        if dl.exists():
            sc.append({"path": str(dl), "name": "Downloads"})
    for mount in ["/media", "/mnt", "/data", "/opt", "/srv"]:
        if Path(mount).exists():
            sc.append({"path": mount, "name": mount})
    return sc


@router.get("/browse")
async def browse_directory(path: str = None):
    server_os = platform.system().lower()
    home = Path.home()
    net_mounts = _network_mounts()
    is_windows = platform.system() == "Windows"

    def build_shortcuts():
        if is_windows:
            return _build_shortcuts_windows()
        return _build_shortcuts_unix(home)

    start_path = "C:\\" if is_windows else str(home)

    if path is None:
        return {
            "path": start_path, "parent": None, "dirs": [],
            "shortcuts": build_shortcuts(),
            "network": net_mounts,
            "os": server_os,
        }

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

    return {
        "path": str(target), "parent": parent, "dirs": dirs,
        "shortcuts": build_shortcuts(),
        "network": net_mounts,
        "os": server_os,
    }


@router.get("/interfaces")
async def list_interfaces():
    result = [{"name": "Any (0.0.0.0)", "value": "", "addrs": ["0.0.0.0"]}]
    try:
        out = subprocess.run(["ip", "-j", "addr"], capture_output=True, text=True, timeout=3)
        if out.returncode == 0:
            for iface in json.loads(out.stdout):
                name = iface.get("ifname", "")
                if name == "lo":
                    continue
                addrs = [a["local"] for a in iface.get("addr_info", []) if a.get("family") == "inet"]
                result.append({"name": name, "value": name, "addrs": addrs or []})
    except Exception:
        pass
    return result


@router.get("/port-status")
async def port_status(request: Request):
    service = request.app.state.torrent_service
    if not hasattr(service, "get_port_status"):
        raise HTTPException(status_code=503, detail="Torrent engine unavailable")
    return service.get_port_status()
