import fnmatch
import ipaddress
import re
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.core.storage import RssRepository

router = APIRouter(prefix="/api/rss", tags=["rss"])


class FeedCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    url: str = Field(min_length=1, max_length=1000)
    active: bool = True


class FeedUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    url: Optional[str] = Field(default=None, min_length=1, max_length=1000)
    active: Optional[bool] = None


class RuleCreate(BaseModel):
    label: str = Field(min_length=1, max_length=160)
    feed_id: Optional[int] = None
    pattern: str = Field(min_length=1, max_length=300)
    destination: str = Field(min_length=1, max_length=1000)
    enabled: bool = True


class RuleUpdate(BaseModel):
    label: Optional[str] = Field(default=None, min_length=1, max_length=160)
    feed_id: Optional[int] = None
    pattern: Optional[str] = Field(default=None, min_length=1, max_length=300)
    destination: Optional[str] = Field(default=None, min_length=1, max_length=1000)
    enabled: Optional[bool] = None


def _validate_rss_url(url: str) -> None:
    try:
        parsed = urlparse(url)
    except Exception:
        raise ValueError("Invalid URL")
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http/https URLs are allowed for RSS feeds")
    host = (parsed.hostname or "").lower()
    blocked_hosts = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}
    if host in blocked_hosts:
        raise ValueError("Local/private URLs are not allowed")
    try:
        addr = ipaddress.ip_address(host)
        if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
            raise ValueError("Private/reserved IP addresses are not allowed")
    except ValueError as e:
        if "not allowed" in str(e):
            raise
        # host is a domain name, not an IP — allow it
    if host.endswith(".local") or host.endswith(".internal"):
        raise ValueError("Local network domains are not allowed")


def _values(payload):
    if hasattr(payload, "model_dump"):
        return payload.model_dump(exclude_none=True)
    return payload.dict(exclude_none=True)


def _matches_pattern(title: str, pattern: str) -> bool:
    value = title or ""
    raw = pattern or ""
    if raw.startswith("re:"):
        try:
            return re.search(raw[3:], value, re.IGNORECASE) is not None
        except re.error as exc:
            raise HTTPException(status_code=400, detail=f"Invalid regex: {exc}")
    return fnmatch.fnmatch(value.lower(), raw.lower())


def _validate_pattern(pattern: str) -> None:
    raw = pattern or ""
    if not raw.startswith("re:"):
      return
    try:
        re.compile(raw[3:], re.IGNORECASE)
    except re.error as exc:
        raise HTTPException(status_code=400, detail=f"Invalid regex: {exc}")


@router.get("/feeds")
async def list_feeds():
    return RssRepository().list_feeds()


@router.post("/feeds")
async def create_feed(payload: FeedCreate):
    try:
        _validate_rss_url(payload.url)
        return RssRepository().create_feed(payload.title, payload.url, payload.active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/feeds/{feed_id}")
async def update_feed(feed_id: int, payload: FeedUpdate):
    try:
        return RssRepository().update_feed(feed_id, _values(payload))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/feeds/{feed_id}")
async def delete_feed(feed_id: int):
    RssRepository().delete_feed(feed_id)
    return {"success": True}


@router.get("/feeds/{feed_id}/items")
async def feed_items(feed_id: int):
    feed = next((item for item in RssRepository().list_feeds() if item["id"] == feed_id), None)
    if not feed:
        raise HTTPException(status_code=404, detail="RSS feed not found")
    try:
        _validate_rss_url(feed["url"])
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            response = await client.get(feed["url"])
            response.raise_for_status()
        root = ET.fromstring(response.text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not fetch RSS feed: {exc}")

    channel_items = root.findall("./channel/item")
    atom_items = root.findall("{http://www.w3.org/2005/Atom}entry")
    parsed = []
    for item in channel_items[:80]:
        title = item.findtext("title", default="untitled")
        link = item.findtext("link", default="")
        pub_date = item.findtext("pubDate", default="")
        enclosure = item.find("enclosure")
        size = enclosure.attrib.get("length", "0") if enclosure is not None else "0"
        parsed.append({"title": title, "link": link, "date": pub_date, "size": int(size or 0)})
    for item in atom_items[:80]:
        title = item.findtext("{http://www.w3.org/2005/Atom}title", default="untitled")
        link_el = item.find("{http://www.w3.org/2005/Atom}link")
        link = link_el.attrib.get("href", "") if link_el is not None else ""
        date = item.findtext("{http://www.w3.org/2005/Atom}updated", default="")
        parsed.append({"title": title, "link": link, "date": date, "size": 0})
    return {"feed": feed, "items": parsed[:80]}


@router.get("/rules")
async def list_rules():
    return RssRepository().list_rules()


@router.post("/rules")
async def create_rule(payload: RuleCreate):
    try:
        return RssRepository().create_rule(_values(payload))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/rules/{rule_id}")
async def update_rule(rule_id: int, payload: RuleUpdate):
    try:
        return RssRepository().update_rule(rule_id, _values(payload))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: int):
    RssRepository().delete_rule(rule_id)
    return {"success": True}


class RuleTestRequest(BaseModel):
    pattern: str = Field(min_length=1, max_length=300)
    feed_id: Optional[int] = None


@router.post("/rules/test")
async def test_rule(payload: RuleTestRequest):
    _validate_pattern(payload.pattern)
    repo = RssRepository()
    all_feeds = repo.list_feeds()
    if payload.feed_id:
        feeds = [f for f in all_feeds if f["id"] == payload.feed_id]
    else:
        feeds = [f for f in all_feeds if f.get("active")]

    matches = []
    for feed in feeds[:5]:
        try:
            _validate_rss_url(feed["url"])
            async with httpx.AsyncClient(timeout=8, follow_redirects=False) as client:
                resp = await client.get(feed["url"])
                resp.raise_for_status()
            root = ET.fromstring(resp.text)
            for item in root.findall("./channel/item")[:80]:
                title = item.findtext("title", default="")
                if _matches_pattern(title, payload.pattern):
                    matches.append({"title": title, "feed": feed["title"]})
        except Exception:
            continue
    return {"matches": matches, "total": len(matches)}
