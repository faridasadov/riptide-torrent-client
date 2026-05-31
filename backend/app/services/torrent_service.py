import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import DEFAULT_SETTINGS, RESUME_DIR
from app.core.storage import SessionStatsRepository, SettingsRepository, TorrentRepository
from app.core.torrent_session import (
    TorrentEngineUnavailable,
    TorrentSessionManager,
    extract_info_hash_from_magnet,
    validate_save_path,
)


class TorrentService:
    def __init__(
        self,
        engine: TorrentSessionManager,
        torrent_repo: TorrentRepository,
        settings_repo: SettingsRepository,
    ) -> None:
        self.engine = engine
        self.torrent_repo = torrent_repo
        self.settings_repo = settings_repo

    def add_magnet(
        self,
        magnet: str,
        save_path: str = None,
        start_paused: bool = False,
        sequential: bool = False,
        force_start: bool = False,
        rename: str = None,
    ) -> Dict[str, str]:
        candidate_hash = extract_info_hash_from_magnet(magnet)
        if not candidate_hash:
            raise ValueError("Invalid magnet link")
        if self.torrent_repo.exists(candidate_hash):
            raise ValueError("Torrent already exists")

        final_path = validate_save_path(save_path or self.settings_repo.get_all()["default_download_folder"])
        torrent_id = self.engine.add_magnet(magnet, final_path)
        if sequential:
            self.engine.set_sequential_download(torrent_id, True)
        if force_start:
            self.engine.set_force_start(torrent_id, True)
        if start_paused:
            self.engine.pause_torrent(torrent_id)
        try:
            if self.torrent_repo.exists(torrent_id):
                self.engine.remove_torrent(torrent_id, delete_files=False)
                raise ValueError("Torrent already exists")
            self.torrent_repo.upsert(
                {
                    "info_hash": torrent_id,
                    "name": "",
                    "custom_name": rename.strip() if rename else None,
                    "magnet": magnet,
                    "save_path": final_path,
                    "paused": start_paused,
                    "force_start": force_start,
                }
            )
        except Exception:
            try:
                self.engine.remove_torrent(torrent_id, delete_files=False)
            except Exception:
                pass
            raise
        return {"torrent_id": torrent_id, "message": "Torrent added"}

    def add_torrent_file(
        self,
        source_file: str,
        filename: str,
        save_path: str = None,
        start_paused: bool = False,
        sequential: bool = False,
        priorities: Optional[List[int]] = None,
        skip_hash_check: bool = False,
        force_start: bool = False,
        rename: str = None,
        trackers_override: Optional[List[str]] = None,
    ) -> Dict[str, str]:
        final_path = validate_save_path(save_path or self.settings_repo.get_all()["default_download_folder"])
        info = self.engine.get_torrent_file_info(source_file)
        torrent_id = info["torrent_id"]
        if self.torrent_repo.exists(torrent_id):
            raise ValueError("Torrent already exists")

        stored_dir = RESUME_DIR / "torrent-files"
        stored_dir.mkdir(parents=True, exist_ok=True)
        suffix = Path(filename).suffix or ".torrent"
        stored_path = stored_dir / f"{torrent_id}{suffix}"
        shutil.copyfile(source_file, stored_path)

        added = self.engine.add_torrent_file(str(stored_path), final_path, seed_mode=skip_hash_check)
        if sequential:
            self.engine.set_sequential_download(torrent_id, True)
        if force_start:
            self.engine.set_force_start(torrent_id, True)
        if priorities:
            self.engine.set_file_priorities(torrent_id, priorities)
        if trackers_override:
            self.engine.replace_trackers(torrent_id, trackers_override)
        if start_paused:
            self.engine.pause_torrent(torrent_id)
        try:
            self.torrent_repo.upsert(
                {
                    "info_hash": torrent_id,
                    "name": added.get("name") or info.get("name") or "",
                    "custom_name": rename.strip() if rename else None,
                    "torrent_file_path": str(stored_path),
                    "save_path": final_path,
                    "paused": start_paused,
                    "force_start": force_start,
                }
            )
        except Exception:
            try:
                self.engine.remove_torrent(torrent_id, delete_files=False)
            except Exception:
                pass
            raise
        return {"torrent_id": torrent_id, "message": "Torrent added"}

    def list_statuses(self) -> List[Dict[str, Any]]:
        rows = self.torrent_repo.list()
        statuses = [self.engine.get_status(row["info_hash"], row) for row in rows]
        for row, status in zip(rows, statuses):
            self._enforce_seeding_limits(row, status)
            self.torrent_repo.save_status_snapshot(status["info_hash"], status)
        return statuses

    def get_status(self, torrent_id: str) -> Dict[str, Any]:
        row = self.torrent_repo.get(torrent_id.lower())
        if not row:
            raise KeyError("Torrent not found")
        status = self.engine.get_status(torrent_id, row)
        self._enforce_seeding_limits(row, status)
        self.torrent_repo.save_status_snapshot(status["info_hash"], status)
        return status

    def get_details(self, torrent_id: str) -> Dict[str, Any]:
        row = self.torrent_repo.get(torrent_id.lower())
        if not row:
            raise KeyError("Torrent not found")
        details = self.engine.get_details(torrent_id, row)
        self.torrent_repo.save_status_snapshot(details["status"]["info_hash"], details["status"])
        return details

    def pause(self, torrent_id: str) -> None:
        self.engine.pause_torrent(torrent_id)
        self.torrent_repo.update_paused(torrent_id.lower(), True)

    def resume(self, torrent_id: str) -> None:
        self.engine.resume_torrent(torrent_id)
        self.torrent_repo.update_paused(torrent_id.lower(), False)

    def delete(self, torrent_id: str, delete_files: bool = False) -> None:
        row = self.torrent_repo.get(torrent_id.lower())
        content_roots: list[str] = []
        if row and delete_files:
            content_roots = self.engine.get_content_roots(
                torrent_id.lower(),
                str(row.get("save_path") or ""),
                str(row.get("name") or ""),
            )
            fallback_dir = Path(str(row.get("save_path") or "")) / str(row.get("name") or "")
            if row.get("name") and str(fallback_dir) not in content_roots:
                content_roots.append(str(fallback_dir))
        self.engine.remove_torrent(torrent_id.lower(), delete_files=False)
        for root in content_roots:
            target = Path(root)
            try:
                if target.is_dir():
                    shutil.rmtree(target, ignore_errors=True)
                elif target.exists():
                    target.unlink(missing_ok=True)
            except Exception:
                pass
        resume_file = RESUME_DIR / f"{torrent_id.lower()}.fastresume"
        if resume_file.exists():
            resume_file.unlink()
        if row and row.get("torrent_file_path"):
            torrent_file = Path(row["torrent_file_path"])
            if torrent_file.exists():
                torrent_file.unlink()
        self.torrent_repo.delete(torrent_id.lower())

    def limit(self, torrent_id: str, download_limit=None, upload_limit=None) -> None:
        self.engine.set_torrent_limits(torrent_id.lower(), download_limit, upload_limit)
        row = self.torrent_repo.get(torrent_id.lower()) or {}
        dl = download_limit if download_limit is not None else int(row.get("download_limit") or 0)
        ul = upload_limit if upload_limit is not None else int(row.get("upload_limit") or 0)
        self.torrent_repo.update_limits(torrent_id.lower(), dl, ul)

    def pause_all(self) -> None:
        self.engine.pause_all()
        rows = self.torrent_repo.list()
        for row in rows:
            self.torrent_repo.update_paused(row["info_hash"], True)

    def resume_all(self) -> None:
        self.engine.resume_all()
        rows = self.torrent_repo.list()
        for row in rows:
            self.torrent_repo.update_paused(row["info_hash"], False)

    def get_magnet_uri(self, torrent_id: str) -> str:
        return self.engine.get_magnet_uri(torrent_id)

    def rename(self, torrent_id: str, name: str) -> None:
        self.torrent_repo.update_custom_name(torrent_id.lower(), name.strip())

    def set_completed_action(self, torrent_id: str, action: str, path: Optional[str] = None) -> None:
        if action not in ("seed", "stop", "move"):
            raise ValueError(f"Invalid completed action: {action}")
        if action == "move" and not path:
            raise ValueError("Path required for move action")
        self.torrent_repo.update_completed_action(torrent_id.lower(), action)
        if path:
            self.torrent_repo.update_completed_action_path(torrent_id.lower(), path.strip())

    def get_session_stats(self) -> Dict[str, int]:
        return SessionStatsRepository().get()

    def get_port_status(self) -> Dict[str, Any]:
        return self.engine.get_port_status()

    def record_stats(self) -> None:
        rows = self.torrent_repo.list()
        total_dl = total_ul = 0
        for row in rows:
            status = self.engine.get_status(row["info_hash"], row)
            total_dl += status.get("download_speed", 0)
            total_ul += status.get("upload_speed", 0)
        if total_dl > 0 or total_ul > 0:
            SessionStatsRepository().add(total_dl * 60, total_ul * 60)

    def is_duplicate(self, info_hash: str) -> bool:
        return self.torrent_repo.exists(info_hash.lower())

    def check_completed_actions(self) -> None:
        rows = self.torrent_repo.list()
        applied = self.engine.apply_completed_actions(rows)
        for info_hash in applied:
            self.torrent_repo.update_paused(info_hash, True)

    def set_sequential(self, torrent_id: str, enabled: bool) -> None:
        self.engine.set_sequential_download(torrent_id, enabled)

    def set_super_seeding(self, torrent_id: str, enabled: bool) -> None:
        self.engine.set_super_seeding(torrent_id, enabled)

    def set_force_start(self, torrent_id: str, enabled: bool) -> None:
        self.engine.set_force_start(torrent_id, enabled)
        self.torrent_repo.update_force_start(torrent_id.lower(), enabled)

    def set_file_priorities(self, torrent_id: str, priorities: list) -> None:
        self.engine.set_file_priorities(torrent_id, priorities)

    def reannounce(self, torrent_id: str) -> None:
        self.engine.force_reannounce(torrent_id.lower())

    def recheck(self, torrent_id: str) -> None:
        self.engine.force_recheck(torrent_id.lower())

    def replace_trackers(self, torrent_id: str, urls: list[str]) -> None:
        self.engine.replace_trackers(torrent_id.lower(), urls)

    def queue_action(self, torrent_id: str, action: str) -> int:
        position = self.engine.queue_action(torrent_id.lower(), action)
        self.torrent_repo.update_queue_position(torrent_id.lower(), position)
        return position

    def seeding_limits(self, torrent_id: str, ratio_limit: float, seeding_time_limit: int) -> None:
        self.torrent_repo.update_seeding_limits(torrent_id.lower(), ratio_limit, seeding_time_limit)

    def move_content(self, torrent_id: str, destination: str) -> str:
        target = self.engine.move_storage(torrent_id.lower(), destination)
        self.torrent_repo.update_save_path(torrent_id.lower(), target)
        return target

    def block_peer_ip(self, torrent_id: str, ip: str) -> str:
        row = self.torrent_repo.get(torrent_id.lower())
        if not row:
            raise KeyError("Torrent not found")
        import ipaddress
        ip_obj = ipaddress.ip_address(ip)
        entry = f"{ip_obj}/32" if ip_obj.version == 4 else f"{ip_obj}/128"
        settings = self.settings_repo.get_all()
        existing = str(settings.get("ip_filter", "") or "").strip()
        lines = [line.strip() for line in existing.splitlines() if line.strip()]
        if entry not in lines:
            lines.append(entry)
        merged = "\n".join(lines)
        self.settings_repo.update({"ip_filter": merged})
        return merged

    def preview_torrent_file(self, source_file: str) -> Dict[str, Any]:
        return self.engine.preview_torrent_file(source_file)

    def create_torrent_file(self, source_path: str, trackers: list[str], comment: str = "") -> str:
        return self.engine.create_torrent_file(source_path, trackers, comment)

    def _enforce_seeding_limits(self, row: Dict[str, Any], status: Dict[str, Any]) -> None:
        if status.get("paused") or str(status.get("status", "")).lower() != "seeding":
            return
        ratio_limit = float(row.get("ratio_limit") or 0)
        time_limit = int(row.get("seeding_time_limit") or 0)
        should_pause = False
        downloaded = int(status.get("downloaded") or 0)
        uploaded = int(status.get("uploaded") or 0)
        if ratio_limit > 0 and downloaded > 0 and uploaded / downloaded >= ratio_limit:
            should_pause = True
        if time_limit > 0:
            try:
                added = datetime.fromisoformat(str(row.get("added_at")).replace("Z", "+00:00"))
                if added.tzinfo is None:
                    added = added.replace(tzinfo=timezone.utc)
                if (datetime.now(timezone.utc) - added).total_seconds() >= time_limit * 60:
                    should_pause = True
            except Exception:
                pass
        if should_pause:
            self.pause(status["info_hash"])
            status["paused"] = True
            status["status"] = "paused"


def create_service() -> TorrentService:
    settings_repo = SettingsRepository()
    torrent_repo = TorrentRepository()
    engine = TorrentSessionManager()
    engine.apply_settings(settings_repo.get_all())
    return TorrentService(engine, torrent_repo, settings_repo)


class UnavailableTorrentService:
    def __init__(self, error: Exception) -> None:
        self.error = error

    def __getattr__(self, name: str):
        raise TorrentEngineUnavailable(str(self.error))
