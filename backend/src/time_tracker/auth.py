import secrets
import time

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import APIKeyCookie
from pydantic import BaseModel, Field

SESSION_COOKIE_NAME = "time_tracker_session"
password_hasher = PasswordHasher()
session_cookie = APIKeyCookie(name=SESSION_COOKIE_NAME, auto_error=False)


class LoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=1024)


class AuthStatus(BaseModel):
    authenticated: bool


def _session_is_valid(request: Request) -> bool:
    if not request.app.state.auth_enabled:
        return True
    expected_desktop_token = request.app.state.config.time_tracker_desktop_api_token.get_secret_value()
    supplied_desktop_token = request.headers.get("x-hours-desktop-token", "")
    if expected_desktop_token and secrets.compare_digest(expected_desktop_token, supplied_desktop_token):
        return True
    if request.session.get("authenticated") is not True:
        return False
    authenticated_at = request.session.get("authenticated_at")
    if not isinstance(authenticated_at, int | float):
        return False
    max_age = request.app.state.config.time_tracker_session_max_age_seconds
    return time.time() - authenticated_at <= max_age


def require_authenticated(
    request: Request,
    _cookie: str | None = Depends(session_cookie),
) -> None:
    if not _session_is_valid(request):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")


auth_router = APIRouter(prefix="/api/auth", tags=["authentication"])


@auth_router.get("/status", response_model=AuthStatus)
def authentication_status(request: Request) -> AuthStatus:
    return AuthStatus(authenticated=_session_is_valid(request))


@auth_router.post("/login", response_model=AuthStatus)
def login(payload: LoginRequest, request: Request) -> AuthStatus:
    password_hash = request.app.state.password_hash
    if not password_hash:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )
    try:
        password_hasher.verify(password_hash, payload.password)
    except (VerifyMismatchError, VerificationError, InvalidHashError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password") from exc
    request.session.clear()
    request.session.update({"authenticated": True, "authenticated_at": int(time.time())})
    return AuthStatus(authenticated=True)


@auth_router.post("/logout", response_model=AuthStatus)
def logout(request: Request) -> AuthStatus:
    request.session.clear()
    return AuthStatus(authenticated=False)
