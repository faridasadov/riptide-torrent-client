import shutil
import subprocess
import hashlib
import zipfile
import tarfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import ALLOWED_DOWNLOAD_ROOTS

router = APIRouter(prefix="/api/files", tags=["files"])


class MoveRequest(BaseModel):
    source: str
    destination: str


class DeleteRequest(BaseModel):
    path: str


class ExtractRequest(BaseModel):
    path: str
    destination: str = None


class ActionRequest(BaseModel):
    path: str


def _safe_path(value: str) -> Path:
    target = Path(value).expanduser().resolve()
    if not any(target == root or root in target.parents for root in ALLOWED_DOWNLOAD_ROOTS):
        allowed = ", ".join(str(root) for root in ALLOWED_DOWNLOAD_ROOTS)
        raise HTTPException(status_code=400, detail=f"Path must be inside allowed roots: {allowed}")
    return target


def _item(path: Path) -> dict:
    stat = path.stat()
    suffixes = [part.lower() for part in path.suffixes]
    return {
        "path": str(path),
        "name": path.name,
        "type": "directory" if path.is_dir() else "file",
        "size": stat.st_size if path.is_file() else 0,
        "modified": int(stat.st_mtime),
        "is_iso": path.is_file() and path.suffix.lower() == ".iso",
        "is_archive": path.is_file() and any(ext in suffixes for ext in [".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".7z", ".rar"]),
    }


def _archive_members(target: Path) -> list[dict]:
    lower = target.name.lower()
    if lower.endswith(".zip"):
        with zipfile.ZipFile(target) as archive:
            return [{"path": info.filename, "size": int(info.file_size)} for info in archive.infolist()[:200]]
    if tarfile.is_tarfile(target):
        with tarfile.open(target) as archive:
            members = archive.getmembers()[:200]
            return [{"path": member.name, "size": int(member.size)} for member in members]
    seven_zip = shutil.which("7z") or shutil.which("7zz")
    if seven_zip and lower.endswith((".7z", ".rar")):
        result = subprocess.run([seven_zip, "l", "-slt", str(target)], capture_output=True, text=True, check=True)
        entries = []
        current_path = None
        current_size = 0
        for line in result.stdout.splitlines():
            if line.startswith("Path = "):
                if current_path and current_path != target.name:
                    entries.append({"path": current_path, "size": current_size})
                    if len(entries) >= 200:
                        break
                current_path = line.split("=", 1)[1].strip()
                current_size = 0
            elif line.startswith("Size = "):
                try:
                    current_size = int(line.split("=", 1)[1].strip())
                except ValueError:
                    current_size = 0
        if current_path and current_path != target.name and len(entries) < 200:
            entries.append({"path": current_path, "size": current_size})
        return entries
    raise HTTPException(status_code=400, detail="Archive preview is currently supported for ZIP and TAR archives")


def _extract_archive(target: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    lower = target.name.lower()
    if lower.endswith(".zip"):
        with zipfile.ZipFile(target) as archive:
            archive.extractall(destination)
        return
    if tarfile.is_tarfile(target):
        with tarfile.open(target) as archive:
            archive.extractall(destination)
        return
    seven_zip = shutil.which("7z") or shutil.which("7zz")
    if seven_zip and target.name.lower().endswith((".7z", ".rar")):
        subprocess.run([seven_zip, "x", "-y", f"-o{destination}", str(target)], check=True, capture_output=True, text=True)
        return
    raise HTTPException(status_code=400, detail="Archive extraction is currently supported for ZIP and TAR archives")


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


@router.get("/download")
async def download_file(path: str):
    target = _safe_path(path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(target, filename=target.name)


@router.post("/checksum")
async def checksum_file(payload: ActionRequest):
    target = _safe_path(payload.path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    md5 = hashlib.md5()
    sha256 = hashlib.sha256()
    with target.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            md5.update(chunk)
            sha256.update(chunk)
    return {"path": str(target), "md5": md5.hexdigest(), "sha256": sha256.hexdigest()}


@router.post("/archive/inspect")
async def inspect_archive(payload: ActionRequest):
    target = _safe_path(payload.path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Archive not found")
    return {"path": str(target), "entries": _archive_members(target)}


@router.post("/archive/extract")
async def extract_archive(payload: ExtractRequest):
    target = _safe_path(payload.path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Archive not found")
    destination = _safe_path(payload.destination or str(target.parent / target.stem))
    _extract_archive(target, destination)
    return {"success": True, "destination": str(destination)}


@router.post("/iso/mount")
async def mount_iso(payload: ActionRequest):
    target = _safe_path(payload.path)
    if not target.exists() or not target.is_file() or target.suffix.lower() != ".iso":
        raise HTTPException(status_code=400, detail="ISO file not found")
    try:
        loop = subprocess.run(
            ["/usr/bin/udisksctl", "loop-setup", "-r", "-f", str(target)],
            capture_output=True,
            text=True,
            check=True,
        )
        text = (loop.stdout or "") + (loop.stderr or "")
        device = next((token for token in text.split() if token.startswith("/dev/loop")), None)
        if not device:
            raise HTTPException(status_code=500, detail="Loop device was not returned by udisksctl")
        mounted = subprocess.run(
            ["/usr/bin/udisksctl", "mount", "-b", device],
            capture_output=True,
            text=True,
            check=True,
        )
        out = (mounted.stdout or "") + (mounted.stderr or "")
        mount_point = None
        if " at " in out:
            mount_point = out.split(" at ", 1)[1].strip().rstrip(".")
        return {"success": True, "device": device, "mount_point": mount_point}
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or str(exc)).strip()
        raise HTTPException(status_code=400, detail=f"ISO mount failed: {detail}")


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
