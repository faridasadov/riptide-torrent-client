import json
from typing import Any, Dict, List, Optional

from app.core.config import DEFAULT_SETTINGS
from app.database.db import get_conn


def _row_to_dict(row) -> Dict[str, Any]:
    return dict(row)


class TorrentRepository:
    def get(self, info_hash: str) -> Optional[Dict[str, Any]]:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM torrents WHERE info_hash = ?", (info_hash,)
            ).fetchone()
            return _row_to_dict(row) if row else None

    def list(self) -> List[Dict[str, Any]]:
        with get_conn() as conn:
            rows = conn.execute("SELECT * FROM torrents ORDER BY added_at DESC").fetchall()
            return [_row_to_dict(row) for row in rows]

    def exists(self, info_hash: str) -> bool:
        return self.get(info_hash) is not None

    def upsert(self, item: Dict[str, Any]) -> None:
        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO torrents (
                    info_hash, name, magnet, torrent_file_path, save_path, paused,
                    download_limit, upload_limit
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(info_hash) DO UPDATE SET
                    name = excluded.name,
                    magnet = excluded.magnet,
                    torrent_file_path = excluded.torrent_file_path,
                    save_path = excluded.save_path,
                    paused = excluded.paused,
                    download_limit = excluded.download_limit,
                    upload_limit = excluded.upload_limit
                """,
                (
                    item["info_hash"],
                    item.get("name", ""),
                    item.get("magnet"),
                    item.get("torrent_file_path"),
                    item["save_path"],
                    int(bool(item.get("paused", False))),
                    int(item.get("download_limit", 0) or 0),
                    int(item.get("upload_limit", 0) or 0),
                ),
            )

    def update_paused(self, info_hash: str, paused: bool) -> None:
        with get_conn() as conn:
            conn.execute(
                "UPDATE torrents SET paused = ? WHERE info_hash = ?",
                (int(paused), info_hash),
            )

    def update_limits(self, info_hash: str, download_limit: int, upload_limit: int) -> None:
        with get_conn() as conn:
            conn.execute(
                """
                UPDATE torrents
                SET download_limit = ?, upload_limit = ?
                WHERE info_hash = ?
                """,
                (download_limit, upload_limit, info_hash),
            )

    def delete(self, info_hash: str) -> None:
        with get_conn() as conn:
            conn.execute("DELETE FROM torrents WHERE info_hash = ?", (info_hash,))

    def save_status_snapshot(self, info_hash: str, payload: Dict[str, Any]) -> None:
        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO status_snapshots (info_hash, payload, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(info_hash) DO UPDATE SET
                    payload = excluded.payload,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (info_hash.lower(), json.dumps(payload, separators=(",", ":"))),
            )


class SettingsRepository:
    def get_all(self) -> Dict[str, Any]:
        values = dict(DEFAULT_SETTINGS)
        with get_conn() as conn:
            rows = conn.execute("SELECT key, value FROM settings").fetchall()
        for row in rows:
            default = DEFAULT_SETTINGS.get(row["key"])
            values[row["key"]] = self._deserialize(row["value"], default)
        return values

    def update(self, values: Dict[str, Any]) -> Dict[str, Any]:
        allowed = set(DEFAULT_SETTINGS)
        with get_conn() as conn:
            for key, value in values.items():
                if key in allowed and value is not None:
                    conn.execute(
                        """
                        INSERT INTO settings (key, value) VALUES (?, ?)
                        ON CONFLICT(key) DO UPDATE SET value = excluded.value
                        """,
                        (key, self._serialize(value)),
                    )
        return self.get_all()

    def _serialize(self, value: Any) -> str:
        if isinstance(value, bool):
            return "1" if value else "0"
        return str(value)

    def _deserialize(self, value: str, default: Any) -> Any:
        if isinstance(default, bool):
            return value in {"1", "true", "True", "yes", "on"}
        if isinstance(default, int):
            return int(value)
        return value
