from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from time_tracker.config import get_config
from time_tracker.database import Base, get_db
from time_tracker.main import create_app


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    yield factory
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(session_factory, monkeypatch) -> Generator[TestClient, None, None]:
    # Exercise timezone conversion explicitly without making a regional timezone
    # the product default.
    monkeypatch.setenv("TIME_TRACKER_TIMEZONE", "Europe/Oslo")
    get_config.cache_clear()
    app = create_app(auth_enabled=False)

    def override_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    get_config.cache_clear()


@pytest.fixture
def project(client: TestClient) -> dict:
    response = client.post(
        "/api/projects",
        json={"name": "Northstar", "color": "#2563EB", "billable_default": False},
    )
    assert response.status_code == 201
    return response.json()


def create_manual_entry(client: TestClient, project_id: str | None = None, **overrides) -> dict:
    payload = {
        "description": "Research synthesis",
        "comment": "Updated model assumptions",
        "project_id": project_id,
        "date": "2026-09-29",
        "start_time": "09:00:00",
        "end_time": "11:30:00",
        "billable": False,
        "tags": [],
    }
    payload.update(overrides)
    response = client.post("/api/time-entries", json=payload)
    assert response.status_code == 201, response.text
    return response.json()
