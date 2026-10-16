from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from time_tracker.database import Base, get_db
from time_tracker.main import create_app


class Clock:
    def __init__(self, value: datetime):
        self.value = value

    def __call__(self) -> datetime:
        return self.value


def test_start_and_stop_timer(client: TestClient, project: dict, monkeypatch):
    clock = Clock(datetime(2026, 9, 29, 7, 0, 0, 123456, tzinfo=UTC))
    monkeypatch.setattr("time_tracker.services.timer.utc_now", clock)
    started = client.post(
        "/api/timer/start",
        json={"description": "Research synthesis", "project_id": project["id"]},
    )
    assert started.status_code == 201
    assert started.json()["running"] is True
    entry_id = started.json()["entry_id"]

    updated = client.patch(
        "/api/timer",
        json={"comment": "Updated assumptions and sensitivity analysis"},
    )
    assert updated.status_code == 200
    assert updated.json()["comment"] == "Updated assumptions and sensitivity analysis"

    clock.value += timedelta(hours=2, minutes=30)
    stopped = client.post("/api/timer/stop", json={})
    assert stopped.status_code == 200, stopped.text
    body = stopped.json()
    assert body["id"] == entry_id
    assert body["duration_seconds"] == 9000
    assert body["description"] == "Research synthesis"
    assert body["comment"] == "Updated assumptions and sensitivity analysis"
    assert body["start_time"] == "09:00:00"
    assert body["end_time"] == "11:30:00"
    assert body["start_at"].endswith(".123456Z")
    assert client.get("/api/timer").json()["running"] is False


def test_duplicate_timer_start_is_rejected(client: TestClient, monkeypatch):
    clock = Clock(datetime(2026, 9, 29, 7, 0, tzinfo=UTC))
    monkeypatch.setattr("time_tracker.services.timer.utc_now", clock)
    first = client.post("/api/timer/start", json={"description": "First"})
    second = client.post("/api/timer/start", json={"description": "Second"})
    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["detail"] == "A timer is already running"


def test_restart_existing_entry(client: TestClient, monkeypatch):
    from conftest import create_manual_entry

    entry = create_manual_entry(client)
    clock = Clock(datetime(2026, 9, 30, 8, 0, tzinfo=UTC))
    monkeypatch.setattr("time_tracker.services.timer.utc_now", clock)
    response = client.post(f"/api/timer/restart/{entry['id']}")
    assert response.status_code == 201
    assert response.json()["description"] == entry["description"]
    assert response.json()["entry_id"] != entry["id"]


def test_timer_persists_across_app_restart(tmp_path, monkeypatch):
    database_path = tmp_path / "persistence.sqlite3"
    engine = create_engine(f"sqlite+pysqlite:///{database_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def override_db():
        with factory() as db:
            yield db

    clock = Clock(datetime(2026, 9, 29, 7, 0, tzinfo=UTC))
    monkeypatch.setattr("time_tracker.services.timer.utc_now", clock)
    first_app = create_app(auth_enabled=False)
    first_app.dependency_overrides[get_db] = override_db
    with TestClient(first_app) as first_client:
        response = first_client.post("/api/timer/start", json={"description": "Persistent work"})
        assert response.status_code == 201
        entry_id = response.json()["entry_id"]

    clock.value += timedelta(minutes=45)
    second_app = create_app(auth_enabled=False)
    second_app.dependency_overrides[get_db] = override_db
    with TestClient(second_app) as second_client:
        timer = second_client.get("/api/timer")
        assert timer.status_code == 200
        assert timer.json()["running"] is True
        assert timer.json()["entry_id"] == entry_id
        assert timer.json()["elapsed_seconds"] == 2700
    engine.dispose()
