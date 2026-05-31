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
    alt_speed_enabled: bool = False
    alt_speed_dl: int = Field(default=0, ge=0)
    alt_speed_ul: int = Field(default=0, ge=0)
    alt_speed_begin: str = "09:00"
    alt_speed_end: str = "23:00"
    alt_speed_days: str = "1111111"
    watch_folder: str = ""
    watch_folder_enabled: bool = False
    ip_filter: str = ""


class SettingsUpdate(BaseModel):
    default_download_folder: Optional[str] = None
    max_active_downloads: Optional[int] = Field(default=None, ge=1, le=100)
    global_download_limit: Optional[int] = Field(default=None, ge=0)
    global_upload_limit: Optional[int] = Field(default=None, ge=0)
    dht_enabled: Optional[bool] = None
    upnp_enabled: Optional[bool] = None
    lsd_enabled: Optional[bool] = None
    alt_speed_enabled: Optional[bool] = None
    alt_speed_dl: Optional[int] = Field(default=None, ge=0)
    alt_speed_ul: Optional[int] = Field(default=None, ge=0)
    alt_speed_begin: Optional[str] = None
    alt_speed_end: Optional[str] = None
    alt_speed_days: Optional[str] = None
    watch_folder: Optional[str] = None
    watch_folder_enabled: Optional[bool] = None
    ip_filter: Optional[str] = None
