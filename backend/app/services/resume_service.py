from app.core.torrent_session import TorrentSessionManager
from app.core.storage import TorrentRepository


class ResumeService:
    def __init__(self, engine: TorrentSessionManager, repo: TorrentRepository) -> None:
        self.engine = engine
        self.repo = repo

    def restore_torrents(self) -> None:
        for row in self.repo.list():
            try:
                self.engine.restore(row)
            except Exception:
                # A bad resume entry should not block the app startup.
                continue

    def save_resume_data(self) -> None:
        self.engine.save_all_resume_data()
