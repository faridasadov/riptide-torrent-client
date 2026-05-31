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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rss_feeds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rss_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                label TEXT NOT NULL,
                feed_id INTEGER,
                pattern TEXT NOT NULL,
                destination TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                hits INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(feed_id) REFERENCES rss_feeds(id) ON DELETE SET NULL
            )
            """
        )
        try:
            conn.execute("ALTER TABLE torrents ADD COLUMN label TEXT DEFAULT NULL")
        except Exception:
            pass  # column already exists
        for ddl in [
            "ALTER TABLE torrents ADD COLUMN queue_position INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE torrents ADD COLUMN ratio_limit REAL NOT NULL DEFAULT 0",
            "ALTER TABLE torrents ADD COLUMN seeding_time_limit INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE torrents ADD COLUMN custom_name TEXT DEFAULT NULL",
        ]:
            try:
                conn.execute(ddl)
            except Exception:
                pass  # column already exists
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS labels (
                name TEXT PRIMARY KEY,
                color TEXT NOT NULL DEFAULT '#1fe3c0',
                save_path TEXT NOT NULL DEFAULT '',
                builtin INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        for row in [
            ("iso",      "#1fe3c0", "", 1),
            ("media",    "#ff7a66", "", 1),
            ("software", "#60a5fa", "", 1),
            ("games",    "#a78bfa", "", 1),
            ("books",    "#34d399", "", 1),
            ("archives", "#fbbf24", "", 1),
            ("other",    "#6b7280", "", 1),
        ]:
            conn.execute(
                "INSERT OR IGNORE INTO labels (name, color, save_path, builtin) VALUES (?, ?, ?, ?)",
                row,
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
