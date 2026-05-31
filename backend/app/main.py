import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response

from app.api import auth, files, rss, search, settings, system, torrents
from app.api.labels import router as labels_router
from app.core.config import CORS_ORIGINS, FRONTEND_DIR, ensure_directories
from app.core.security import basic_auth_middleware
from app.core.storage import SettingsRepository, TorrentRepository
from app.database.db import init_db
from app.services.resume_service import ResumeService
from app.services.torrent_service import UnavailableTorrentService, create_service


async def periodic_alt_speed(app: FastAPI) -> None:
    _settings_repo = SettingsRepository()
    while True:
        await asyncio.sleep(60)
        service = app.state.torrent_service
        if hasattr(service, "engine"):
            try:
                settings = _settings_repo.get_all()
                await asyncio.to_thread(service.engine.check_alt_speed, settings)
            except Exception:
                pass


async def periodic_watch_folder(app: FastAPI) -> None:
    _settings_repo = SettingsRepository()
    seen = set()
    while True:
        await asyncio.sleep(15)
        service = app.state.torrent_service
        if not hasattr(service, "engine"):
            continue
        settings = _settings_repo.get_all()
        if not settings.get("watch_folder_enabled") or not settings.get("watch_folder"):
            continue
        try:
            from pathlib import Path
            folder = Path(settings["watch_folder"]).expanduser().resolve()
            for item in folder.glob("*.torrent"):
                key = str(item)
                if key in seen:
                    continue
                seen.add(key)
                try:
                    await asyncio.to_thread(service.add_torrent_file, key, item.name, settings["default_download_folder"])
                except Exception:
                    pass
        except Exception:
            pass


async def periodic_resume_save(app: FastAPI) -> None:
    _repo = TorrentRepository()
    while True:
        await asyncio.sleep(60)
        service = app.state.torrent_service
        if hasattr(service, "engine"):
            resume = ResumeService(service.engine, _repo)
            await asyncio.to_thread(resume.save_resume_data)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_directories()
    init_db()
    resume_task = None
    alt_speed_task = None
    watch_task = None
    try:
        app.state.torrent_service = create_service()
        ResumeService(app.state.torrent_service.engine, TorrentRepository()).restore_torrents()
        resume_task = asyncio.create_task(periodic_resume_save(app))
        alt_speed_task = asyncio.create_task(periodic_alt_speed(app))
        watch_task = asyncio.create_task(periodic_watch_folder(app))
    except Exception as exc:
        app.state.torrent_service = UnavailableTorrentService(exc)
    yield
    if resume_task:
        resume_task.cancel()
    if alt_speed_task:
        alt_speed_task.cancel()
    if watch_task:
        watch_task.cancel()
    service = app.state.torrent_service
    if hasattr(service, "engine"):
        ResumeService(service.engine, TorrentRepository()).save_resume_data()


app = FastAPI(title="Local Torrent Client", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    allow_credentials=True,
)
app.middleware("http")(basic_auth_middleware)
app.include_router(auth.router)
app.include_router(files.router)
app.include_router(rss.router)
app.include_router(search.router)
app.include_router(torrents.router)
app.include_router(settings.router)
app.include_router(system.router)
app.include_router(labels_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def index():
    return HTMLResponse((FRONTEND_DIR / "index.html").read_text(encoding="utf-8"))


@app.get("/site")
async def site():
    return HTMLResponse((FRONTEND_DIR / "site.html").read_text(encoding="utf-8"))


@app.get("/static/about.js")
async def frontend_about_js():
    return Response(
        (FRONTEND_DIR / "about.js").read_text(encoding="utf-8"),
        media_type="application/javascript",
    )


@app.get("/static/app.js")
async def frontend_js():
    return Response(
        (FRONTEND_DIR / "app.js").read_text(encoding="utf-8"),
        media_type="application/javascript",
    )


@app.get("/static/style.css")
async def frontend_css():
    return Response(
        (FRONTEND_DIR / "style.css").read_text(encoding="utf-8"),
        media_type="text/css",
    )


@app.get("/static/design-tokens.css")
async def design_tokens_css():
    return Response(
        (FRONTEND_DIR / "design-tokens.css").read_text(encoding="utf-8"),
        media_type="text/css",
    )


@app.get("/static/web.css")
async def website_css():
    return Response(
        (FRONTEND_DIR / "web.css").read_text(encoding="utf-8"),
        media_type="text/css",
    )


@app.get("/static/icons.js")
async def site_icons_js():
    return Response(
        (FRONTEND_DIR / "icons.js").read_text(encoding="utf-8"),
        media_type="application/javascript",
    )


@app.get("/static/assets/logo-mark.svg")
async def logo_mark():
    return Response(
        (FRONTEND_DIR / "assets" / "logo-mark.svg").read_text(encoding="utf-8"),
        media_type="image/svg+xml",
    )
