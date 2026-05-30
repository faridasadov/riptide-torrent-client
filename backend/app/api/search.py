from fastapi import APIRouter

from app.core.config import ALLOWED_DOWNLOAD_ROOTS
from app.core.storage import TorrentRepository

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
async def search(q: str = ""):
    query = q.strip().lower()
    torrents = []
    files = []
    if not query:
        return {"query": q, "torrents": torrents, "files": files}

    for torrent in TorrentRepository().list():
        haystack = f"{torrent.get('name', '')} {torrent.get('info_hash', '')} {torrent.get('save_path', '')}".lower()
        if query in haystack:
            torrents.append(torrent)

    for root in ALLOWED_DOWNLOAD_ROOTS:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            try:
                if query in path.name.lower():
                    stat = path.stat()
                    files.append(
                        {
                            "path": str(path),
                            "name": path.name,
                            "type": "directory" if path.is_dir() else "file",
                            "size": stat.st_size if path.is_file() else 0,
                            "root": str(root),
                        }
                    )
            except OSError:
                continue
            if len(files) >= 100:
                break
    files.sort(key=lambda item: (item["type"] != "directory", item["name"].lower()))
    return {"query": q, "torrents": torrents, "files": files[:100]}
