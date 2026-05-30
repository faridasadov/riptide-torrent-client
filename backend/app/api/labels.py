from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.storage import LabelRepository

router = APIRouter(prefix="/api/labels", tags=["labels"])
_repo = LabelRepository()


class LabelCreate(BaseModel):
    name: str
    color: str = "#1fe3c0"
    save_path: str = ""


class LabelUpdate(BaseModel):
    color: Optional[str] = None
    save_path: Optional[str] = None


@router.get("")
async def list_labels():
    return _repo.list()


@router.post("", status_code=201)
async def create_label(body: LabelCreate):
    name = body.name.strip().lower()
    if not name:
        raise HTTPException(400, "Label name required")
    if _repo.get(name):
        raise HTTPException(409, "Label already exists")
    _repo.create(name, body.color, body.save_path)
    return _repo.get(name)


@router.put("/{name}")
async def update_label(name: str, body: LabelUpdate):
    if not _repo.get(name):
        raise HTTPException(404, "Label not found")
    _repo.update(name, body.color, body.save_path)
    return _repo.get(name)


@router.delete("/{name}", status_code=204)
async def delete_label(name: str):
    label = _repo.get(name)
    if not label:
        raise HTTPException(404, "Label not found")
    if label["builtin"]:
        raise HTTPException(400, "Cannot delete built-in label")
    _repo.delete(name)
    return None
