import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import ALLOWED_DOWNLOAD_ROOTS

router = APIRouter(prefix="/api/files", tags=["files"])


class MoveRequest(BaseModel):
    source: str
    destination: str


class DeleteRequest(BaseModel):
    path: str


def _safe_path(value: str) -> Path:
    target = Path(value).expanduser().resolve()
    if not any(target == root or root in target.parents for root in ALLOWED_DOWNLOAD_ROOTS):
        allowed = ", ".join(str(root) for root in ALLOWED_DOWNLOAD_ROOTS)
        raise HTTPException(status_code=400, detail=f"Path must be inside allowed roots: {allowed}")
    return target


def _item(path: Path) -> dict:
    stat = path.stat()
    return {
        "path": str(path),
        "name": path.name,
        "type": "directory" if path.is_dir() else "file",
        "size": stat.st_size if path.is_file() else 0,
        "modified": int(stat.st_mtime),
    }


@router.get("")
async def list_files(path: str = None):
    root = _safe_path(path or str(ALLOWED_DOWNLOAD_ROOTS[0]))
    if not root.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not root.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
    items = [_item(item) for item in sorted(root.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))]
    return {"path": str(root), "roots": [str(root) for root in ALLOWED_DOWNLOAD_ROOTS], "items": items}


@router.post("/move")
async def move_file(payload: MoveRequest):
    source = _safe_path(payload.source)
    destination = _safe_path(payload.destination)
    if not source.exists():
        raise HTTPException(status_code=404, detail="Source path not found")
    if destination.exists():
        raise HTTPException(status_code=400, detail="Destination already exists")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(destination))
    return {"success": True, "path": str(destination)}


@router.delete("")
async def delete_file(payload: DeleteRequest):
    target = _safe_path(payload.path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    return {"success": True}
