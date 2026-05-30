import logging as _logging
import os
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = PROJECT_DIR / "backend"
DATA_DIR = Path(os.getenv("TORRENT_CLIENT_DATA_DIR", str(PROJECT_DIR / "data"))).expanduser().resolve()
RESUME_DIR = DATA_DIR / "resume"
DOWNLOAD_DIR = Path(os.getenv("TORRENT_CLIENT_DEFAULT_DOWNLOAD_DIR", str(PROJECT_DIR / "downloads"))).expanduser().resolve()
DB_PATH = DATA_DIR / "torrents.db"
FRONTEND_DIR = PROJECT_DIR / "frontend"

AUTH_USERNAME = os.getenv("TORRENT_CLIENT_USERNAME", "admin")
AUTH_PASSWORD = os.getenv("TORRENT_CLIENT_PASSWORD", "admin")
AUTH_ENABLED = os.getenv("TORRENT_CLIENT_AUTH_ENABLED", "1") != "0"

if AUTH_USERNAME == "admin" and AUTH_PASSWORD == "admin":
    _logging.warning(
        "SECURITY: Using default admin:admin credentials. "
        "Set TORRENT_CLIENT_USERNAME and TORRENT_CLIENT_PASSWORD."
    )

SESSION_SECRET = os.getenv("TORRENT_CLIENT_SESSION_SECRET") or os.urandom(32).hex()
SESSION_COOKIE_NAME = os.getenv("TORRENT_CLIENT_SESSION_COOKIE_NAME", "torrent_client_session")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("TORRENT_CLIENT_CORS_ORIGINS", "http://127.0.0.1,http://localhost").split(",")
    if origin.strip()
]
MAX_TORRENT_FILE_BYTES = int(os.getenv("TORRENT_CLIENT_MAX_TORRENT_FILE_BYTES", str(2 * 1024 * 1024)))
MIN_FREE_SPACE_BYTES = int(os.getenv("TORRENT_CLIENT_MIN_FREE_SPACE_BYTES", str(5 * 1024 * 1024 * 1024)))
ALLOWED_DOWNLOAD_ROOTS = [
    Path(root).expanduser().resolve()
    for root in os.getenv("TORRENT_CLIENT_ALLOWED_DOWNLOAD_ROOTS", str(DOWNLOAD_DIR)).split(":")
    if root.strip()
]

DEFAULT_SETTINGS = {
    "default_download_folder": str(DOWNLOAD_DIR),
    "max_active_downloads": 3,
    "global_download_limit": 0,
    "global_upload_limit": 0,
    "dht_enabled": True,
    "upnp_enabled": True,
    "lsd_enabled": True,
}


def ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RESUME_DIR.mkdir(parents=True, exist_ok=True)
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
