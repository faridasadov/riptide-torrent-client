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


class SettingsUpdate(BaseModel):
    default_download_folder: Optional[str] = None
    max_active_downloads: Optional[int] = Field(default=None, ge=1, le=100)
    global_download_limit: Optional[int] = Field(default=None, ge=0)
    global_upload_limit: Optional[int] = Field(default=None, ge=0)
    dht_enabled: Optional[bool] = None
    upnp_enabled: Optional[bool] = None
    lsd_enabled: Optional[bool] = None
