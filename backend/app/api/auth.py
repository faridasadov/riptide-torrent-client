import time
from collections import defaultdict

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel

from app.core.config import AUTH_ENABLED, AUTH_PASSWORD, AUTH_USERNAME, SESSION_COOKIE_NAME
from app.core.security import SESSION_MAX_AGE, create_session_token, is_valid_session_token, revoke_session_token
from fastapi import HTTPException

router = APIRouter(prefix="/api/auth", tags=["auth"])

_login_attempts: dict = defaultdict(list)


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    attempts = [t for t in _login_attempts[ip] if now - t < 60]
    _login_attempts[ip] = attempts
    if len(attempts) >= 10:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in a minute.")
    _login_attempts[ip].append(now)


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(payload: LoginRequest, request: Request, response: Response):
    _check_rate_limit(request.client.host)
    if not AUTH_ENABLED or (payload.username == AUTH_USERNAME and payload.password == AUTH_PASSWORD):
        response.set_cookie(
            SESSION_COOKIE_NAME,
            create_session_token(),
            max_age=SESSION_MAX_AGE,
            httponly=True,
            samesite="lax",
            secure=True,
        )
        return {"authenticated": True, "username": AUTH_USERNAME}
    response.status_code = 401
    return {"detail": "Invalid username or password"}


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE_NAME, "")
    if token:
        revoke_session_token(token)
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"authenticated": False}


@router.get("/me")
async def me():
    return {"authenticated": AUTH_ENABLED, "username": AUTH_USERNAME if AUTH_ENABLED else ""}
