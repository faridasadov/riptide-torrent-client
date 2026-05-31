from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.storage import LabelRepository, RssRepository, SettingsRepository
from app.core.torrent_session import validate_save_path
from app.models.settings import SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ImportPayload(BaseModel):
    settings: dict = {}
    labels: list[dict] = []
    rss_feeds: list[dict] = []
    rss_rules: list[dict] = []


@router.get("")
async def get_settings():
    return SettingsRepository().get_all()


@router.put("")
async def update_settings(payload: SettingsUpdate, request: Request):
    if hasattr(payload, "model_dump"):
        values = payload.model_dump(exclude_none=True)
    else:
        values = payload.dict(exclude_none=True)
    if "default_download_folder" in values and values["default_download_folder"]:
        try:
            validate_save_path(values["default_download_folder"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    if "watch_folder" in values and values["watch_folder"]:
        try:
            validate_save_path(values["watch_folder"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    updated = SettingsRepository().update(values)
    try:
        request.app.state.torrent_service.engine.apply_settings(updated)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return updated


@router.get("/export")
async def export_settings():
    return {
        "settings": SettingsRepository().get_all(),
        "labels": LabelRepository().list(),
        "rss_feeds": RssRepository().list_feeds(),
        "rss_rules": RssRepository().list_rules(),
    }


@router.post("/import")
async def import_settings(payload: ImportPayload, request: Request):
    repo = SettingsRepository()
    values = {key: value for key, value in payload.settings.items() if value is not None}
    if values.get("default_download_folder"):
        validate_save_path(values["default_download_folder"])
    if values.get("watch_folder"):
        validate_save_path(values["watch_folder"])
    updated = repo.update(values)
    label_repo = LabelRepository()
    for label in payload.labels:
        name = str(label.get("name") or "").strip()
        if not name:
            continue
        if label_repo.get(name):
            label_repo.update(name, label.get("color"), label.get("save_path"))
        else:
            label_repo.create(name, label.get("color") or "#5ba2ff", label.get("save_path") or "")
    rss_repo = RssRepository()
    feed_ids = {}
    for feed in payload.rss_feeds:
        url = str(feed.get("url") or "").strip()
        title = str(feed.get("title") or url).strip()
        if not url or not title:
            continue
        try:
            created = rss_repo.create_feed(title, url, bool(feed.get("active", True)))
            feed_ids[int(feed.get("id") or created["id"])] = created["id"]
        except Exception:
            for existing in rss_repo.list_feeds():
                if existing.get("url") == url:
                    rss_repo.update_feed(existing["id"], {"title": title, "active": bool(feed.get("active", True))})
                    feed_ids[int(feed.get("id") or existing["id"])] = existing["id"]
                    break
    for rule in payload.rss_rules:
        label = str(rule.get("label") or "").strip()
        pattern = str(rule.get("pattern") or "").strip()
        destination = str(rule.get("destination") or "").strip()
        if not label or not pattern or not destination:
            continue
        feed_id = rule.get("feed_id")
        mapped_feed_id = feed_ids.get(int(feed_id)) if feed_id is not None else None
        rss_repo.create_rule({
            "label": label,
            "feed_id": mapped_feed_id,
            "pattern": pattern,
            "destination": destination,
            "enabled": bool(rule.get("enabled", True)),
        })
    try:
        request.app.state.torrent_service.engine.apply_settings(updated)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return updated
