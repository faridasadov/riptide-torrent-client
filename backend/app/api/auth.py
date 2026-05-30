from fastapi import APIRouter, Response
from pydantic import BaseModel

from app.core.config import AUTH_ENABLED, AUTH_PASSWORD, AUTH_USERNAME, SESSION_COOKIE_NAME
from app.core.security import SESSION_MAX_AGE, create_session_token, is_valid_session_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(payload: LoginRequest, response: Response):
    if not AUTH_ENABLED or (payload.username == AUTH_USERNAME and payload.password == AUTH_PASSWORD):
        response.set_cookie(
            SESSION_COOKIE_NAME,
            create_session_token(),
            max_age=SESSION_MAX_AGE,
            httponly=True,
            samesite="lax",
        )
        return {"authenticated": True, "username": AUTH_USERNAME}
    response.status_code = 401
    return {"detail": "Invalid username or password"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"authenticated": False}


@router.get("/me")
async def me():
    return {"authenticated": True, "username": AUTH_USERNAME}
