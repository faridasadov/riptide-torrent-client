import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import DEFAULT_SETTINGS, RESUME_DIR
from app.core.storage import SettingsRepository, TorrentRepository
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
                    "magnet": magnet,
                    "save_path": final_path,
                    "paused": start_paused,
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

        added = self.engine.add_torrent_file(str(stored_path), final_path)
        if sequential:
            self.engine.set_sequential_download(torrent_id, True)
        if priorities:
            self.engine.set_file_priorities(torrent_id, priorities)
        if start_paused:
            self.engine.pause_torrent(torrent_id)
        try:
            self.torrent_repo.upsert(
                {
                    "info_hash": torrent_id,
                    "name": added.get("name") or info.get("name") or "",
                    "torrent_file_path": str(stored_path),
                    "save_path": final_path,
                    "paused": start_paused,
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
        self.engine.remove_torrent(torrent_id.lower(), delete_files)
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

    def set_sequential(self, torrent_id: str, enabled: bool) -> None:
        self.engine.set_sequential_download(torrent_id, enabled)

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
