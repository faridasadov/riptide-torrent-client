import base64
import hmac
from typing import Iterable

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import AUTH_ENABLED, AUTH_PASSWORD, AUTH_USERNAME


PUBLIC_PATHS = {"/api/health"}


def _unauthorized():
    return JSONResponse(
        {"detail": "Authentication required"},
        status_code=401,
        headers={"WWW-Authenticate": "Basic"},
    )


def _parse_basic_auth(value: str):
    if not value.startswith("Basic "):
        return None
    try:
        decoded = base64.b64decode(value[6:].strip()).decode("utf-8")
    except Exception:
        return None
    if ":" not in decoded:
        return None
    return decoded.split(":", 1)


def is_authenticated(headers: Iterable[tuple]) -> bool:
    header_map = {key.lower(): value for key, value in headers}
    parsed = _parse_basic_auth(header_map.get("authorization", ""))
    if not parsed:
        return False
    username, password = parsed
    return hmac.compare_digest(username, AUTH_USERNAME) and hmac.compare_digest(
        password, AUTH_PASSWORD
    )


async def basic_auth_middleware(request: Request, call_next):
    if not AUTH_ENABLED or request.url.path in PUBLIC_PATHS:
        return await call_next(request)
    if not is_authenticated(request.headers.items()):
        return _unauthorized()
    return await call_next(request)
