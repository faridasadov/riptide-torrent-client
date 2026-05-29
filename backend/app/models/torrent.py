from typing import Optional

from pydantic import BaseModel, Field


class AddMagnetRequest(BaseModel):
    magnet: str
    save_path: Optional[str] = None


class AddTorrentResponse(BaseModel):
    success: bool
    torrent_id: str
    message: str


class LimitRequest(BaseModel):
    download_limit: int = Field(default=0, ge=0)
    upload_limit: int = Field(default=0, ge=0)


class TorrentStatus(BaseModel):
    torrent_id: str
    name: str
    info_hash: str
    progress: float
    status: str
    download_speed: int
    upload_speed: int
    total_size: int
    downloaded: int
    uploaded: int
    seeds: int
    peers: int
    eta: Optional[int]
    save_path: str
    paused: bool
    download_limit: int
    upload_limit: int
