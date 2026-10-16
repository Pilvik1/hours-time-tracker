import secrets

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from time_tracker import __version__
from time_tracker.api.router import router
from time_tracker.auth import SESSION_COOKIE_NAME, auth_router, password_hasher, require_authenticated
from time_tracker.config import AppConfig, get_config


def create_app(config: AppConfig | None = None, auth_enabled: bool = True) -> FastAPI:
    config = config or get_config()
    application = FastAPI(
        title=config.app_name,
        version=__version__,
        description="Local-first, single-user time tracking backend.",
    )
    application.state.config = config
    application.state.auth_enabled = auth_enabled
    configured_password = config.time_tracker_password.get_secret_value()
    if configured_password.startswith("change-me"):
        configured_password = ""
    application.state.password_hash = config.time_tracker_password_hash or (
        password_hasher.hash(configured_password) if configured_password else ""
    )
    configured_session_secret = config.time_tracker_session_secret
    if len(configured_session_secret) < 32 or configured_session_secret.startswith("change-me"):
        configured_session_secret = secrets.token_urlsafe(48)
    application.add_middleware(
        SessionMiddleware,
        secret_key=configured_session_secret,
        session_cookie=SESSION_COOKIE_NAME,
        max_age=config.time_tracker_session_max_age_seconds,
        same_site="lax",
        https_only=config.time_tracker_cookie_secure,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.time_tracker_cors_origins,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(auth_router)
    application.include_router(router, dependencies=[Depends(require_authenticated)])

    @application.get("/health", tags=["system"])
    def health() -> dict[str, str | bool]:
        return {
            "status": "ok",
            "storage": "sqlite" if config.database_url.startswith("sqlite") else "postgresql",
            "desktop_auth": bool(config.time_tracker_desktop_api_token.get_secret_value()),
        }

    return application


app = create_app()
