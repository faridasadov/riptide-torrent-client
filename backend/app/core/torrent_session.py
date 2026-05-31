import logging
import os
import re
import shutil
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, urlparse

from app.core.config import ALLOWED_DOWNLOAD_ROOTS, DOWNLOAD_DIR, MIN_FREE_SPACE_BYTES, RESUME_DIR

logger = logging.getLogger(__name__)

try:
    import libtorrent as lt  # type: ignore
except ImportError:  # pragma: no cover - depends on host packages
    lt = None


STATE_NAMES = {
    0: "queued",
    1: "checking",
    2: "downloading metadata",
    3: "downloading",
    4: "finished",
    5: "seeding",
    6: "allocating",
    7: "checking resume data",
}


class TorrentEngineUnavailable(RuntimeError):
    pass


def require_libtorrent() -> Any:
    if lt is None:
        raise TorrentEngineUnavailable(
            "python-libtorrent is not installed. Install dependencies from backend/requirements.txt."
        )
    return lt


def extract_info_hash_from_magnet(magnet: str) -> Optional[str]:
    if not magnet.startswith("magnet:?"):
        return None
    parsed = urlparse(magnet)
    params = parse_qs(parsed.query)
    for xt in params.get("xt", []):
        match = re.match(r"urn:btih:([a-zA-Z0-9]+)", xt)
        if not match:
            continue
        raw = match.group(1)
        if len(raw) == 32:
            import base64
            try:
                return base64.b32decode(raw.upper()).hex()
            except Exception:
                return raw.lower()
        return raw.lower()
    return None


def validate_save_path(path: Optional[str]) -> str:
    target = Path(path).expanduser().resolve() if path and path.strip() else DOWNLOAD_DIR
    if not any(target == root or root in target.parents for root in ALLOWED_DOWNLOAD_ROOTS):
        allowed = ", ".join(str(root) for root in ALLOWED_DOWNLOAD_ROOTS)
        raise ValueError(f"Download folder must be inside allowed roots: {allowed}")
    target.mkdir(parents=True, exist_ok=True)
    if not os.access(str(target), os.W_OK):
        raise ValueError(f"Download folder is not writable: {target}")
    usage = shutil.disk_usage(str(target))
    if usage.free < MIN_FREE_SPACE_BYTES:
        raise ValueError(
            f"Not enough free disk space in download folder: {target}. "
            f"Minimum required: {MIN_FREE_SPACE_BYTES} bytes"
        )
    return str(target)


class TorrentSessionManager:
    def __init__(self) -> None:
        self.lt = require_libtorrent()
        self.session = self._create_session()
        self.handles: Dict[str, Any] = {}
        self._lock = threading.Lock()

    def _create_session(self) -> Any:
        ses = self.lt.session()
        try:
            ses.listen_on(6881, 6891)
        except TypeError:
            ses.listen_on((6881, 6891))
        return ses

    def apply_settings(self, settings: Dict[str, Any]) -> None:
        if settings.get("dht_enabled", True):
            self.session.start_dht()
        else:
            self.session.stop_dht()

        if settings.get("upnp_enabled", True):
            self.session.start_upnp()
        else:
            self.session.stop_upnp()

        if settings.get("lsd_enabled", True):
            self.session.start_lsd()
        else:
            self.session.stop_lsd()

        self._set_session_limits(
            int(settings.get("global_download_limit", 0) or 0),
            int(settings.get("global_upload_limit", 0) or 0),
        )
        self._set_active_downloads(int(settings.get("max_active_downloads", 3) or 3))

    def _set_session_limits(self, download_limit: int, upload_limit: int) -> None:
        if hasattr(self.session, "set_download_rate_limit"):
            self.session.set_download_rate_limit(download_limit)
            self.session.set_upload_rate_limit(upload_limit)
            return
        pack = self.session.get_settings()
        pack["download_rate_limit"] = download_limit
        pack["upload_rate_limit"] = upload_limit
        self.session.apply_settings(pack)

    def _set_active_downloads(self, limit: int) -> None:
        try:
            pack = self.session.get_settings()
            pack["active_downloads"] = limit
            self.session.apply_settings(pack)
        except Exception as e:
            logger.warning("Failed to set active downloads: %s", e)

    def add_magnet(self, magnet: str, save_path: str, resume_data: Optional[bytes] = None) -> str:
        info_hash = extract_info_hash_from_magnet(magnet)
        if not info_hash:
            raise ValueError("Invalid magnet link: btih info hash is missing")

        params: Dict[str, Any] = {"save_path": validate_save_path(save_path)}
        if resume_data:
            params["resume_data"] = resume_data
        handle = self.lt.add_magnet_uri(self.session, magnet, params)
        torrent_id = str(handle.info_hash()).lower() if handle.info_hash() else info_hash
        with self._lock:
            self.handles[torrent_id] = handle
        return torrent_id

    def add_torrent_file(
        self,
        torrent_path: str,
        save_path: str,
        resume_data: Optional[bytes] = None,
    ) -> Dict[str, str]:
        try:
            info = self.lt.torrent_info(torrent_path)
        except Exception as exc:
            raise ValueError(f"Invalid or damaged .torrent file: {exc}") from exc

        params: Dict[str, Any] = {"ti": info, "save_path": validate_save_path(save_path)}
        if resume_data:
            params["resume_data"] = resume_data
        handle = self.session.add_torrent(params)
        torrent_id = str(info.info_hash()).lower()
        with self._lock:
            self.handles[torrent_id] = handle
        return {"torrent_id": torrent_id, "name": info.name()}

    def get_torrent_file_info(self, torrent_path: str) -> Dict[str, str]:
        try:
            info = self.lt.torrent_info(torrent_path)
        except Exception as exc:
            raise ValueError(f"Invalid or damaged .torrent file: {exc}") from exc
        return {"torrent_id": str(info.info_hash()).lower(), "name": info.name()}

    def get_handle(self, torrent_id: str) -> Any:
        with self._lock:
            handle = self.handles.get(torrent_id.lower())
        if not handle or not handle.is_valid():
            raise KeyError("Torrent is not loaded in the current session")
        return handle

    def pause_torrent(self, torrent_id: str) -> None:
        handle = self.get_handle(torrent_id)
        try:
            handle.unset_flags(self.lt.torrent_flags.auto_managed)
        except Exception:
            pass
        handle.pause()

    def resume_torrent(self, torrent_id: str) -> None:
        handle = self.get_handle(torrent_id)
        handle.resume()
        try:
            handle.set_flags(self.lt.torrent_flags.auto_managed)
        except Exception:
            pass

    def remove_torrent(self, torrent_id: str, delete_files: bool = False) -> None:
        with self._lock:
            handle = self.handles.pop(torrent_id.lower(), None)
        if handle and handle.is_valid():
            flags = 0
            if delete_files:
                flags = getattr(self.lt.options_t, "delete_files", 1)
            self.session.remove_torrent(handle, flags)

    def set_torrent_limits(self, torrent_id: str, download_limit: int, upload_limit: int) -> None:
        handle = self.get_handle(torrent_id)
        handle.set_download_limit(download_limit if download_limit > 0 else -1)
        handle.set_upload_limit(upload_limit if upload_limit > 0 else -1)

    def set_sequential_download(self, torrent_id: str, enabled: bool) -> None:
        handle = self.get_handle(torrent_id)
        handle.set_sequential_download(enabled)

    def set_file_priorities(self, torrent_id: str, priorities: list) -> None:
        handle = self.get_handle(torrent_id)
        handle.prioritize_files(priorities)

    def get_status(self, torrent_id: str, db_row: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        with self._lock:
            handle = self.handles.get(torrent_id.lower())
        if not handle or not handle.is_valid():
            return self._offline_status(torrent_id, db_row)
        status = handle.status()
        total_size = int(getattr(status, "total_wanted", 0) or getattr(status, "total_done", 0) or 0)
        progress = round(float(getattr(status, "progress", 0.0) or 0.0) * 100, 2)
        download_rate = int(getattr(status, "download_rate", 0) or 0)
        remaining = max(total_size - int(getattr(status, "total_wanted_done", 0) or 0), 0)
        eta = int(remaining / download_rate) if download_rate > 0 else None
        name = getattr(status, "name", "") or (db_row or {}).get("name", "") or "metadata loading"
        state = int(getattr(status, "state", 0) or 0)
        status_text = "metadata loading" if not handle.has_metadata() else STATE_NAMES.get(state, "unknown")
        return {
            "torrent_id": torrent_id.lower(),
            "name": name,
            "info_hash": torrent_id.lower(),
            "progress": progress,
            "status": "paused" if status.paused else status_text,
            "download_speed": download_rate,
            "upload_speed": int(getattr(status, "upload_rate", 0) or 0),
            "total_size": total_size,
            "downloaded": int(getattr(status, "total_wanted_done", 0) or getattr(status, "total_done", 0) or 0),
            "uploaded": int(getattr(status, "total_upload", 0) or 0),
            "seeds": int(getattr(status, "num_seeds", 0) or 0),
            "peers": int(getattr(status, "num_peers", 0) or 0),
            "eta": eta,
            "save_path": (db_row or {}).get("save_path", ""),
            "paused": bool(status.paused),
            "download_limit": int((db_row or {}).get("download_limit", 0) or 0),
            "upload_limit": int((db_row or {}).get("upload_limit", 0) or 0),
            "label": (db_row or {}).get("label"),
            "sequential": self._get_sequential(handle),
        }

    def check_alt_speed(self, settings: Dict[str, Any]) -> None:
        if not settings.get("alt_speed_enabled"):
            return
        import datetime
        now = datetime.datetime.now()
        begin = settings.get("alt_speed_begin", "09:00")
        end_t = settings.get("alt_speed_end", "23:00")
        days = settings.get("alt_speed_days", "1111111")
        try:
            bh, bm = map(int, begin.split(":"))
            eh, em = map(int, end_t.split(":"))
            day_idx = now.weekday()
            cur = now.hour * 60 + now.minute
            in_sched = (
                len(days) > day_idx
                and days[day_idx] == "1"
                and cur >= bh * 60 + bm
                and cur < eh * 60 + em
            )
            dl = int(settings.get("alt_speed_dl", 0) or 0) if in_sched else int(settings.get("global_download_limit", 0) or 0)
            ul = int(settings.get("alt_speed_ul", 0) or 0) if in_sched else int(settings.get("global_upload_limit", 0) or 0)
            self._set_session_limits(dl, ul)
        except Exception as e:
            logger.warning("Alt speed check failed: %s", e)

    def _get_sequential(self, handle) -> bool:
        try:
            tf = getattr(self.lt, "torrent_flags", None)
            if tf and hasattr(tf, "sequential_download"):
                return bool(handle.flags() & tf.sequential_download)
        except Exception:
            pass
        return False

    def get_details(self, torrent_id: str, db_row: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        status = self.get_status(torrent_id, db_row)
        with self._lock:
            handle = self.handles.get(torrent_id.lower())
        details: Dict[str, Any] = {
            "status": status,
            "files": [],
            "peers": [],
            "trackers": [],
        }
        if not handle or not handle.is_valid() or not handle.has_metadata():
            return details

        try:
            info = handle.get_torrent_info()
            file_storage = info.files()
            file_progress = handle.file_progress()
            try:
                priorities = handle.get_file_priorities()
            except Exception:
                priorities = []
            files = []
            for index in range(file_storage.num_files()):
                files.append(
                    {
                        "path": file_storage.file_path(index),
                        "size": int(file_storage.file_size(index)),
                        "downloaded": int(file_progress[index]) if index < len(file_progress) else 0,
                        "priority": int(priorities[index]) if index < len(priorities) else 4,
                    }
                )
            details["files"] = files
            details["trackers"] = [
                {"url": tracker.url, "tier": int(getattr(tracker, "tier", 0) or 0)}
                for tracker in info.trackers()
            ]
        except Exception as e:
            logger.warning("Failed to get torrent file/tracker details for %s: %s", torrent_id, e)

        try:
            peers = []
            for peer in handle.get_peer_info()[:80]:
                flags = int(getattr(peer, "flags", 0) or 0)
                peers.append(
                    {
                        "ip": str(getattr(peer, "ip", "")),
                        "client": str(getattr(peer, "client", "")),
                        "download_speed": int(getattr(peer, "down_speed", 0) or 0),
                        "upload_speed": int(getattr(peer, "up_speed", 0) or 0),
                        "progress": round(float(getattr(peer, "progress", 0.0) or 0.0) * 100, 2),
                        "interesting": bool(flags & getattr(self.lt.peer_info, "interesting", 0)),
                    }
                )
            details["peers"] = peers
        except Exception as e:
            logger.warning("Failed to get peer info for %s: %s", torrent_id, e)

        return details

    def _offline_status(self, torrent_id: str, db_row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        row = db_row or {}
        return {
            "torrent_id": torrent_id.lower(),
            "name": row.get("name") or "offline",
            "info_hash": torrent_id.lower(),
            "progress": 0.0,
            "status": "not loaded",
            "download_speed": 0,
            "upload_speed": 0,
            "total_size": 0,
            "downloaded": 0,
            "uploaded": 0,
            "seeds": 0,
            "peers": 0,
            "eta": None,
            "save_path": row.get("save_path", ""),
            "paused": bool(row.get("paused", False)),
            "download_limit": int(row.get("download_limit", 0) or 0),
            "upload_limit": int(row.get("upload_limit", 0) or 0),
            "label": row.get("label"),
        }

    def save_resume_data(self, torrent_id: str) -> Optional[bytes]:
        handle = self.handles.get(torrent_id.lower())
        if not handle or not handle.is_valid():
            return None
        try:
            handle.save_resume_data()
            deadline = time.time() + 2
            while time.time() < deadline:
                for alert in self.session.pop_alerts():
                    if alert.__class__.__name__ == "save_resume_data_alert":
                        if str(alert.handle.info_hash()).lower() == torrent_id.lower():
                            return self.lt.bencode(alert.resume_data)
                    if alert.__class__.__name__ == "save_resume_data_failed_alert":
                        return None
                time.sleep(0.05)
        except Exception:
            return None
        return None

    def save_all_resume_data(self) -> None:
        RESUME_DIR.mkdir(parents=True, exist_ok=True)
        with self._lock:
            handle_snapshot = dict(self.handles)
        # Issue all save requests first
        pending: Dict[str, Any] = {}
        for torrent_id, handle in handle_snapshot.items():
            if handle and handle.is_valid():
                try:
                    handle.save_resume_data()
                    pending[torrent_id] = handle
                except Exception as e:
                    logger.warning("Failed to request resume data for %s: %s", torrent_id, e)
        if not pending:
            return
        # Drain alerts once for all pending handles
        deadline = time.time() + 5
        collected: Dict[str, bytes] = {}
        while time.time() < deadline and len(collected) < len(pending):
            for alert in self.session.pop_alerts():
                name = alert.__class__.__name__
                if name == "save_resume_data_alert":
                    ih = str(alert.handle.info_hash()).lower()
                    if ih in pending:
                        try:
                            collected[ih] = self.lt.bencode(alert.resume_data)
                        except Exception as e:
                            logger.warning("Failed to bencode resume data for %s: %s", ih, e)
                elif name == "save_resume_data_failed_alert":
                    ih = str(alert.handle.info_hash()).lower()
                    logger.warning("Resume data save failed for %s", ih)
                    collected.setdefault(ih, b"")
            time.sleep(0.05)
        for torrent_id, data in collected.items():
            if data:
                (RESUME_DIR / f"{torrent_id}.fastresume").write_bytes(data)

    def restore(self, row: Dict[str, Any]) -> None:
        torrent_id = row["info_hash"].lower()
        resume_path = RESUME_DIR / f"{torrent_id}.fastresume"
        resume_data = resume_path.read_bytes() if resume_path.exists() else None
        try:
            if row.get("magnet"):
                self.add_magnet(row["magnet"], row["save_path"], resume_data)
            elif row.get("torrent_file_path"):
                self.add_torrent_file(row["torrent_file_path"], row["save_path"], resume_data)
            else:
                logger.warning("Skipping restore for %s: no magnet or torrent_file_path", torrent_id)
                return
        except Exception as e:
            logger.error("Failed to restore torrent %s: %s", torrent_id, e)
            return
        if row.get("paused"):
            self.pause_torrent(torrent_id)
        self.set_torrent_limits(
            torrent_id,
            int(row.get("download_limit", 0) or 0),
            int(row.get("upload_limit", 0) or 0),
        )
