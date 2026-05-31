import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.core.config import MAX_TORRENT_FILE_BYTES
from app.core.storage import TorrentRepository
from app.core.torrent_session import TorrentEngineUnavailable
from app.models.torrent import AddMagnetRequest, AddTorrentResponse, LimitRequest, SetLabelRequest

router = APIRouter(prefix="/api/torrents", tags=["torrents"])
_torrent_repo = TorrentRepository()


def _service(request: Request):
    return request.app.state.torrent_service


def _handle_error(exc: Exception) -> HTTPException:
    if isinstance(exc, TorrentEngineUnavailable):
        return HTTPException(status_code=503, detail=str(exc))
    if isinstance(exc, KeyError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))


@router.post("/add-magnet", response_model=AddTorrentResponse)
async def add_magnet(payload: AddMagnetRequest, request: Request):
    try:
        result = _service(request).add_magnet(payload.magnet, payload.save_path)
        return {"success": True, **result}
    except Exception as exc:
        raise _handle_error(exc)


@router.post("/add-file", response_model=AddTorrentResponse)
async def add_file(
    request: Request,
    file: UploadFile = File(...),
    save_path: str = Form(None),
):
    if not file.filename or not file.filename.endswith(".torrent"):
        raise HTTPException(status_code=400, detail="Only .torrent files are accepted")
    tmp_path = None
    try:
        content = await file.read()
        if not content.startswith(b"d"):
            raise ValueError("File does not appear to be a valid .torrent (invalid bencode header)")
        if len(content) > MAX_TORRENT_FILE_BYTES:
            raise ValueError(
                f".torrent file is too large. Maximum allowed size is {MAX_TORRENT_FILE_BYTES} bytes"
            )
        with tempfile.NamedTemporaryFile(delete=False, suffix=".torrent") as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        result = _service(request).add_torrent_file(tmp_path, file.filename, save_path)
        return {"success": True, **result}
    except Exception as exc:
        raise _handle_error(exc)
    finally:
        if tmp_path:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass


@router.get("")
async def list_torrents(request: Request):
    try:
        return _service(request).list_statuses()
    except Exception as exc:
        raise _handle_error(exc)


@router.get("/{torrent_id}")
async def get_torrent(torrent_id: str, request: Request):
    try:
        return _service(request).get_status(torrent_id)
    except Exception as exc:
        raise _handle_error(exc)


@router.get("/{torrent_id}/details")
async def get_torrent_details(torrent_id: str, request: Request):
    try:
        return _service(request).get_details(torrent_id)
    except Exception as exc:
        raise _handle_error(exc)


@router.post("/{torrent_id}/pause")
async def pause_torrent(torrent_id: str, request: Request):
    try:
        _service(request).pause(torrent_id)
        return {"success": True, "message": "Torrent paused"}
    except Exception as exc:
        raise _handle_error(exc)


@router.post("/{torrent_id}/resume")
async def resume_torrent(torrent_id: str, request: Request):
    try:
        _service(request).resume(torrent_id)
        return {"success": True, "message": "Torrent resumed"}
    except Exception as exc:
        raise _handle_error(exc)


@router.delete("/{torrent_id}")
async def delete_torrent(torrent_id: str, request: Request, delete_files: bool = False):
    try:
        _service(request).delete(torrent_id, delete_files)
        return {"success": True, "message": "Torrent deleted"}
    except Exception as exc:
        raise _handle_error(exc)


@router.post("/{torrent_id}/limit")
async def limit_torrent(torrent_id: str, payload: LimitRequest, request: Request):
    try:
        _service(request).limit(torrent_id, payload.download_limit, payload.upload_limit)
        return {"success": True, "message": "Torrent limits updated"}
    except Exception as exc:
        raise _handle_error(exc)


@router.patch("/{torrent_id}/label")
async def set_label(torrent_id: str, payload: SetLabelRequest, request: Request):
    try:
        _torrent_repo.update_label(torrent_id.lower(), payload.label)
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)
