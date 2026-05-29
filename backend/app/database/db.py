import sqlite3
from contextlib import contextmanager
from typing import Iterator

from app.core.config import DB_PATH, DEFAULT_SETTINGS, ensure_directories


def connect() -> sqlite3.Connection:
    ensure_directories()
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS torrents (
                info_hash TEXT PRIMARY KEY,
                name TEXT NOT NULL DEFAULT '',
                magnet TEXT,
                torrent_file_path TEXT,
                save_path TEXT NOT NULL,
                added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                paused INTEGER NOT NULL DEFAULT 0,
                download_limit INTEGER NOT NULL DEFAULT 0,
                upload_limit INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS status_snapshots (
                info_hash TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(info_hash) REFERENCES torrents(info_hash) ON DELETE CASCADE
            )
            """
        )
        for key, value in DEFAULT_SETTINGS.items():
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
                (key, _serialize(value)),
            )


def _serialize(value) -> str:
    if isinstance(value, bool):
        return "1" if value else "0"
    return str(value)
