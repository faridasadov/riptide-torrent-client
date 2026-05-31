import tempfile
import logging
import json
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from app.core.config import MAX_TORRENT_FILE_BYTES
from app.core.storage import TorrentRepository
from app.core.torrent_session import TorrentEngineUnavailable
from app.models.torrent import AddMagnetRequest, AddTorrentResponse, CreateTorrentRequest, FilePriorityRequest, LimitRequest, RenameRequest, SeedingLimitsRequest, SequentialRequest, SetLabelRequest, SuperSeedingRequest, TrackerListRequest

router = APIRouter(prefix="/api/torrents", tags=["torrents"])
_torrent_repo = TorrentRepository()
logger = logging.getLogger(__name__)


def _service(request: Request):
    return request.app.state.torrent_service


def _handle_error(exc: Exception) -> HTTPException:
    if isinstance(exc, TorrentEngineUnavailable):
        return HTTPException(status_code=503, detail=str(exc))
    if isinstance(exc, KeyError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    logger.exception("Unhandled torrent API error: %s", exc)
    return HTTPException(status_code=500, detail=str(exc))


@router.post("/add-magnet", response_model=AddTorrentResponse)
async def add_magnet(payload: AddMagnetRequest, request: Request):
    try:
        result = _service(request).add_magnet(
            payload.magnet,
            payload.save_path,
            payload.start_paused,
            payload.sequential,
        )
        return {"success": True, **result}
    except Exception as exc:
        raise _handle_error(exc)


@router.post("/add-file", response_model=AddTorrentResponse)
async def add_file(
    request: Request,
    file: UploadFile = File(...),
    save_path: str = Form(None),
    start_paused: bool = Form(False),
    sequential: bool = Form(False),
    priorities: str = Form(None),
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
        parsed_priorities = None
        if priorities:
            parsed_priorities = [int(value) for value in json.loads(priorities)]
        result = _service(request).add_torrent_file(
            tmp_path,
            file.filename,
            save_path,
            start_paused,
            sequential,
            parsed_priorities,
        )
        return {"success": True, **result}
    except Exception as exc:
        raise _handle_error(exc)
    finally:
        if tmp_path:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass


@router.post("/preview-file")
async def preview_file(request: Request, file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".torrent"):
        raise HTTPException(status_code=400, detail="Only .torrent files are accepted")
    tmp_path = None
    try:
        content = await file.read()
        if len(content) > MAX_TORRENT_FILE_BYTES:
            raise ValueError(f".torrent file is too large. Maximum allowed size is {MAX_TORRENT_FILE_BYTES} bytes")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".torrent") as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        return _service(request).preview_torrent_file(tmp_path)
    except Exception as exc:
        raise _handle_error(exc)
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)


@router.post("/create-file")
async def create_file(payload: CreateTorrentRequest, request: Request):
    try:
        path = _service(request).create_torrent_file(payload.source_path, payload.trackers, payload.comment or "")
        return FileResponse(path, media_type="application/x-bittorrent", filename=Path(path).name)
    except Exception as exc:
        raise _handle_error(exc)


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


@router.patch("/{torrent_id}/sequential")
async def set_sequential(torrent_id: str, payload: SequentialRequest, request: Request):
    try:
        _service(request).set_sequential(torrent_id, payload.enabled)
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)


@router.patch("/{torrent_id}/super-seeding")
async def set_super_seeding(torrent_id: str, payload: SuperSeedingRequest, request: Request):
    try:
        _service(request).set_super_seeding(torrent_id, payload.enabled)
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)


@router.patch("/{torrent_id}/files")
async def set_file_priorities(torrent_id: str, payload: FilePriorityRequest, request: Request):
    try:
        _service(request).set_file_priorities(torrent_id, payload.priorities)
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)


@router.post("/{torrent_id}/reannounce")
async def reannounce(torrent_id: str, request: Request):
    try:
        _service(request).reannounce(torrent_id)
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)


@router.post("/{torrent_id}/recheck")
async def recheck(torrent_id: str, request: Request):
    try:
        _service(request).recheck(torrent_id)
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)


@router.put("/{torrent_id}/trackers")
async def replace_trackers(torrent_id: str, payload: TrackerListRequest, request: Request):
    try:
        _service(request).replace_trackers(torrent_id, payload.urls)
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)


@router.post("/{torrent_id}/queue/{action}")
async def queue_action(torrent_id: str, action: str, request: Request):
    try:
        position = _service(request).queue_action(torrent_id, action)
        return {"success": True, "queue_position": position}
    except Exception as exc:
        raise _handle_error(exc)


@router.patch("/{torrent_id}/seeding-limits")
async def seeding_limits(torrent_id: str, payload: SeedingLimitsRequest, request: Request):
    try:
        _service(request).seeding_limits(torrent_id, payload.ratio_limit, payload.seeding_time_limit)
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)


@router.post("/pause-all")
async def pause_all(request: Request):
    try:
        _service(request).pause_all()
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)


@router.post("/resume-all")
async def resume_all(request: Request):
    try:
        _service(request).resume_all()
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)


@router.get("/{torrent_id}/magnet")
async def get_magnet(torrent_id: str, request: Request):
    try:
        uri = _service(request).get_magnet_uri(torrent_id)
        return {"magnet": uri}
    except Exception as exc:
        raise _handle_error(exc)


@router.patch("/{torrent_id}/rename")
async def rename_torrent(torrent_id: str, payload: RenameRequest, request: Request):
    try:
        _service(request).rename(torrent_id, payload.name)
        return {"success": True}
    except Exception as exc:
        raise _handle_error(exc)
