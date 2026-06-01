from typing import Optional

from pydantic import BaseModel, Field


class Settings(BaseModel):
    default_download_folder: str
    max_active_downloads: int = Field(ge=1, le=100)
    global_download_limit: int = Field(ge=0)
    global_upload_limit: int = Field(ge=0)
    dht_enabled: bool
    upnp_enabled: bool
    lsd_enabled: bool
    pex_enabled: bool = True
    listen_port: int = Field(default=6881, ge=1, le=65535)
    random_port: bool = False
    alt_speed_enabled: bool = False
    alt_speed_dl: int = Field(default=0, ge=0)
    alt_speed_ul: int = Field(default=0, ge=0)
    alt_speed_begin: str = "09:00"
    alt_speed_end: str = "23:00"
    alt_speed_days: str = "1111111"
    watch_folder: str = ""
    watch_folder_enabled: bool = False
    ip_filter: str = ""
    queueing_enabled: bool = False
    max_active_torrents: int = Field(default=500, ge=1, le=5000)
    max_active_uploads: int = Field(default=5, ge=1, le=1000)
    global_connections_limit: int = Field(default=500, ge=1, le=10000)
    torrent_connections_limit: int = Field(default=100, ge=1, le=5000)
    global_upload_slots: int = Field(default=20, ge=1, le=1000)
    torrent_upload_slots: int = Field(default=4, ge=1, le=1000)
    connection_speed: int = Field(default=30, ge=1, le=1000)
    limit_tcp_overhead: bool = False
    limit_utp_rate: bool = True
    utp_tcp_mixed_mode: int = Field(default=0, ge=0, le=1)
    allow_multiple_connections_from_same_ip: bool = False
    anonymous_mode: bool = False
    encryption_policy: int = Field(default=0, ge=0, le=2)
    file_pool_size: int = Field(default=100, ge=1, le=10000)
    async_io_threads: int = Field(default=10, ge=1, le=128)
    disk_cache: int = Field(default=-1, ge=-1, le=1048576)
    bind_interface: str = ""


class SettingsUpdate(BaseModel):
    default_download_folder: Optional[str] = None
    max_active_downloads: Optional[int] = Field(default=None, ge=1, le=100)
    global_download_limit: Optional[int] = Field(default=None, ge=0)
    global_upload_limit: Optional[int] = Field(default=None, ge=0)
    dht_enabled: Optional[bool] = None
    upnp_enabled: Optional[bool] = None
    lsd_enabled: Optional[bool] = None
    pex_enabled: Optional[bool] = None
    listen_port: Optional[int] = Field(default=None, ge=1, le=65535)
    random_port: Optional[bool] = None
    alt_speed_enabled: Optional[bool] = None
    alt_speed_dl: Optional[int] = Field(default=None, ge=0)
    alt_speed_ul: Optional[int] = Field(default=None, ge=0)
    alt_speed_begin: Optional[str] = None
    alt_speed_end: Optional[str] = None
    alt_speed_days: Optional[str] = None
    watch_folder: Optional[str] = None
    watch_folder_enabled: Optional[bool] = None
    ip_filter: Optional[str] = None
    queueing_enabled: Optional[bool] = None
    max_active_torrents: Optional[int] = Field(default=None, ge=1, le=5000)
    max_active_uploads: Optional[int] = Field(default=None, ge=1, le=1000)
    global_connections_limit: Optional[int] = Field(default=None, ge=1, le=10000)
    torrent_connections_limit: Optional[int] = Field(default=None, ge=1, le=5000)
    global_upload_slots: Optional[int] = Field(default=None, ge=1, le=1000)
    torrent_upload_slots: Optional[int] = Field(default=None, ge=1, le=1000)
    connection_speed: Optional[int] = Field(default=None, ge=1, le=1000)
    limit_tcp_overhead: Optional[bool] = None
    limit_utp_rate: Optional[bool] = None
    utp_tcp_mixed_mode: Optional[int] = Field(default=None, ge=0, le=1)
    allow_multiple_connections_from_same_ip: Optional[bool] = None
    anonymous_mode: Optional[bool] = None
    encryption_policy: Optional[int] = Field(default=None, ge=0, le=2)
    file_pool_size: Optional[int] = Field(default=None, ge=1, le=10000)
    async_io_threads: Optional[int] = Field(default=None, ge=1, le=128)
    disk_cache: Optional[int] = Field(default=None, ge=-1, le=1048576)
    bind_interface: Optional[str] = None
