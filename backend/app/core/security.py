import base64
import hashlib
import hmac
import time
from typing import Iterable

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import (
    AUTH_ENABLED,
    AUTH_PASSWORD,
    AUTH_USERNAME,
    SESSION_COOKIE_NAME,
    SESSION_SECRET,
)


PUBLIC_PATHS = {
    "/",
    "/site",
    "/static/app.js",
    "/static/style.css",
    "/static/design-tokens.css",
    "/static/web.css",
    "/static/icons.js",
    "/static/assets/logo-mark.svg",
    "/api/health",
    "/api/auth/login",
    "/api/auth/logout",
}
SESSION_MAX_AGE = 12 * 60 * 60


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


def _sign(payload: str) -> str:
    return hmac.new(SESSION_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def create_session_token() -> str:
    timestamp = str(int(time.time()))
    payload = f"{AUTH_USERNAME}:{timestamp}"
    return f"{payload}:{_sign(payload)}"


def is_valid_session_token(token: str) -> bool:
    parts = token.split(":")
    if len(parts) != 3:
        return False
    username, timestamp, signature = parts
    if not hmac.compare_digest(username, AUTH_USERNAME):
        return False
    try:
        issued_at = int(timestamp)
    except ValueError:
        return False
    if issued_at > int(time.time()) or int(time.time()) - issued_at > SESSION_MAX_AGE:
        return False
    payload = f"{username}:{timestamp}"
    return hmac.compare_digest(signature, _sign(payload))


async def basic_auth_middleware(request: Request, call_next):
    if not AUTH_ENABLED or request.url.path in PUBLIC_PATHS:
        return await call_next(request)
    if is_valid_session_token(request.cookies.get(SESSION_COOKIE_NAME, "")):
        return await call_next(request)
    if not is_authenticated(request.headers.items()):
        return _unauthorized()
    return await call_next(request)
