import secrets

from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from time_tracker.config import AppConfig
from time_tracker.database import Base, get_db
from time_tracker.main import create_app


def test_password_login_session_logout_and_api_protection():
    test_password = secrets.token_urlsafe(24)
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    config = AppConfig(
        database_url="sqlite+pysqlite:///:memory:",
        time_tracker_password_hash=PasswordHasher().hash(test_password),
        time_tracker_session_secret="test-session-secret-that-is-long-enough",
        time_tracker_cookie_secure=False,
    )
    app = create_app(config=config)

    def override_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        assert client.get("/api/settings").status_code == 401
        assert client.get("/api/auth/status").json() == {"authenticated": False}
        assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401

        login = client.post("/api/auth/login", json={"password": test_password})
        assert login.status_code == 200
        assert login.json() == {"authenticated": True}
        cookie = login.headers["set-cookie"]
        assert "httponly" in cookie.lower()
        assert "samesite=lax" in cookie.lower()
        assert test_password not in cookie

        assert client.get("/api/settings").status_code == 200
        assert client.post("/api/auth/logout").json() == {"authenticated": False}
        assert client.get("/api/settings").status_code == 401

    engine.dispose()


def test_login_fails_closed_without_password_hash():
    app = create_app(config=AppConfig(time_tracker_session_secret="test-session-secret-that-is-long-enough"))
    with TestClient(app) as client:
        response = client.post("/api/auth/login", json={"password": "anything"})
        assert response.status_code == 503
        assert client.get("/api/timer").status_code == 401


def test_desktop_token_authenticates_without_a_user_password():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    config = AppConfig(
        database_url="sqlite+pysqlite:///:memory:",
        time_tracker_desktop_api_token="desktop-test-token",
        time_tracker_session_secret="test-session-secret-that-is-long-enough",
    )
    app = create_app(config=config)

    def override_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        assert client.get("/api/settings").status_code == 401
        headers = {"x-hours-desktop-token": "desktop-test-token"}
        assert client.get("/api/auth/status", headers=headers).json() == {"authenticated": True}
        assert client.get("/api/settings", headers=headers).status_code == 200
        assert client.get("/api/settings", headers={"x-hours-desktop-token": "wrong"}).status_code == 401

    engine.dispose()


def test_postgres_url_uses_installed_psycopg_driver():
    config = AppConfig(database_url="postgresql://user:password@host:5432/database")
    assert config.database_url == "postgresql+psycopg://user:password@host:5432/database"


def test_default_timezone_is_portable(monkeypatch):
    monkeypatch.delenv("TIME_TRACKER_TIMEZONE", raising=False)
    config = AppConfig(_env_file=None)
    assert config.time_tracker_timezone == "UTC"
