import json
import re
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
                    download_limit, upload_limit, label
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(info_hash) DO UPDATE SET
                    name = excluded.name,
                    magnet = excluded.magnet,
                    torrent_file_path = excluded.torrent_file_path,
                    save_path = excluded.save_path,
                    paused = excluded.paused,
                    download_limit = excluded.download_limit,
                    upload_limit = excluded.upload_limit,
                    label = COALESCE(excluded.label, torrents.label)
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
                    item.get("label"),
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

    def update_label(self, info_hash: str, label: Optional[str]) -> None:
        with get_conn() as conn:
            conn.execute(
                "UPDATE torrents SET label = ? WHERE info_hash = ?",
                (label, info_hash),
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
            try:
                return bool(int(value))
            except (ValueError, TypeError):
                return default
        if isinstance(default, int):
            try:
                return int(value)
            except (ValueError, TypeError):
                return default
        if isinstance(default, float):
            try:
                return float(value)
            except (ValueError, TypeError):
                return default
        return value


class RssRepository:
    def list_feeds(self) -> List[Dict[str, Any]]:
        with get_conn() as conn:
            rows = conn.execute("SELECT * FROM rss_feeds ORDER BY title COLLATE NOCASE").fetchall()
            return [_row_to_dict(row) for row in rows]

    def create_feed(self, title: str, url: str, active: bool = True) -> Dict[str, Any]:
        with get_conn() as conn:
            cursor = conn.execute(
                "INSERT INTO rss_feeds (title, url, active) VALUES (?, ?, ?)",
                (title, url, int(active)),
            )
            row = conn.execute("SELECT * FROM rss_feeds WHERE id = ?", (cursor.lastrowid,)).fetchone()
            return _row_to_dict(row)

    def update_feed(self, feed_id: int, values: Dict[str, Any]) -> Dict[str, Any]:
        allowed = {"title", "url", "active"}
        fields = [key for key in values if key in allowed and values[key] is not None]
        if not fields:
            with get_conn() as conn:
                row = conn.execute("SELECT * FROM rss_feeds WHERE id = ?", (feed_id,)).fetchone()
                if not row:
                    raise KeyError("RSS feed not found")
                return _row_to_dict(row)
        assert all(re.match(r'^[a-z_]+$', f) for f in fields), "Invalid field names"
        assignments = ", ".join(f"{field} = ?" for field in fields)
        params = [int(values[field]) if field == "active" else values[field] for field in fields]
        params.append(feed_id)
        with get_conn() as conn:
            conn.execute(f"UPDATE rss_feeds SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", params)
            row = conn.execute("SELECT * FROM rss_feeds WHERE id = ?", (feed_id,)).fetchone()
            if not row:
                raise KeyError("RSS feed not found")
            return _row_to_dict(row)

    def delete_feed(self, feed_id: int) -> None:
        with get_conn() as conn:
            conn.execute("DELETE FROM rss_feeds WHERE id = ?", (feed_id,))

    def list_rules(self) -> List[Dict[str, Any]]:
        with get_conn() as conn:
            rows = conn.execute(
                """
                SELECT rss_rules.*, rss_feeds.title AS feed_title
                FROM rss_rules
                LEFT JOIN rss_feeds ON rss_feeds.id = rss_rules.feed_id
                ORDER BY rss_rules.created_at DESC
                """
            ).fetchall()
            return [_row_to_dict(row) for row in rows]

    def create_rule(self, item: Dict[str, Any]) -> Dict[str, Any]:
        with get_conn() as conn:
            cursor = conn.execute(
                """
                INSERT INTO rss_rules (label, feed_id, pattern, destination, enabled)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    item["label"],
                    item.get("feed_id"),
                    item["pattern"],
                    item["destination"],
                    int(bool(item.get("enabled", True))),
                ),
            )
            row = conn.execute("SELECT * FROM rss_rules WHERE id = ?", (cursor.lastrowid,)).fetchone()
            return _row_to_dict(row)

    def update_rule(self, rule_id: int, values: Dict[str, Any]) -> Dict[str, Any]:
        allowed = {"label", "feed_id", "pattern", "destination", "enabled", "hits"}
        fields = [key for key in values if key in allowed and values[key] is not None]
        if not fields:
            with get_conn() as conn:
                row = conn.execute("SELECT * FROM rss_rules WHERE id = ?", (rule_id,)).fetchone()
                if not row:
                    raise KeyError("RSS rule not found")
                return _row_to_dict(row)
        assert all(re.match(r'^[a-z_]+$', f) for f in fields), "Invalid field names"
        assignments = ", ".join(f"{field} = ?" for field in fields)
        params = [int(values[field]) if field == "enabled" else values[field] for field in fields]
        params.append(rule_id)
        with get_conn() as conn:
            conn.execute(f"UPDATE rss_rules SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", params)
            row = conn.execute("SELECT * FROM rss_rules WHERE id = ?", (rule_id,)).fetchone()
            if not row:
                raise KeyError("RSS rule not found")
            return _row_to_dict(row)

    def delete_rule(self, rule_id: int) -> None:
        with get_conn() as conn:
            conn.execute("DELETE FROM rss_rules WHERE id = ?", (rule_id,))


class LabelRepository:
    def list(self) -> List[Dict]:
        with get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM labels ORDER BY builtin DESC, CASE WHEN name = 'other' THEN 1 ELSE 0 END ASC, name ASC"
            ).fetchall()
            return [_row_to_dict(row) for row in rows]

    def get(self, name: str) -> Optional[Dict]:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM labels WHERE name = ?", (name,)
            ).fetchone()
            return _row_to_dict(row) if row else None

    def create(self, name: str, color: str, save_path: str) -> None:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO labels (name, color, save_path, builtin) VALUES (?, ?, ?, 0)",
                (name, color, save_path),
            )

    def update(self, name: str, color: Optional[str], save_path: Optional[str]) -> None:
        fields = []
        params: List[Any] = []
        if color is not None:
            fields.append("color = ?")
            params.append(color)
        if save_path is not None:
            fields.append("save_path = ?")
            params.append(save_path)
        if not fields:
            return
        params.append(name)
        with get_conn() as conn:
            conn.execute(
                f"UPDATE labels SET {', '.join(fields)} WHERE name = ?", params
            )

    def delete(self, name: str) -> None:
        label = self.get(name)
        if label and label.get("builtin"):
            raise ValueError("Cannot delete a built-in label")
        with get_conn() as conn:
            conn.execute("DELETE FROM labels WHERE name = ?", (name,))
