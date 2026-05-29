from fastapi import APIRouter, HTTPException, Request

from app.core.storage import SettingsRepository
from app.models.settings import SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_settings():
    return SettingsRepository().get_all()


@router.put("")
async def update_settings(payload: SettingsUpdate, request: Request):
    if hasattr(payload, "model_dump"):
        values = payload.model_dump(exclude_none=True)
    else:
        values = payload.dict(exclude_none=True)
    updated = SettingsRepository().update(values)
    try:
        request.app.state.torrent_service.engine.apply_settings(updated)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return updated
