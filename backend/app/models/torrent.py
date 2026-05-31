from typing import List, Optional

from pydantic import BaseModel, Field


class AddMagnetRequest(BaseModel):
    magnet: str = Field(min_length=15, max_length=2000)
    save_path: Optional[str] = None


class AddTorrentResponse(BaseModel):
    success: bool
    torrent_id: str
    message: str


class LimitRequest(BaseModel):
    download_limit: Optional[int] = Field(default=None, ge=0)
    upload_limit: Optional[int] = Field(default=None, ge=0)


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
    label: Optional[str] = None
    sequential: bool = False


class SetLabelRequest(BaseModel):
    label: Optional[str] = None


class SequentialRequest(BaseModel):
    enabled: bool


class FilePriorityRequest(BaseModel):
    priorities: List[int]


class LabelOut(BaseModel):
    name: str
    color: str
    save_path: str
    builtin: bool
