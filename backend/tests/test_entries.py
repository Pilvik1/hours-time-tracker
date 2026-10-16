from conftest import create_manual_entry
from fastapi.testclient import TestClient


def test_manual_entry_calculates_duration(client: TestClient, project: dict):
    entry = create_manual_entry(client, project["id"])
    assert entry["duration_seconds"] == 9000
    assert entry["start_time"] == "09:00:00"
    assert entry["end_time"] == "11:30:00"
    assert entry["project"]["name"] == "Northstar"


def test_duration_only_manual_entry(client: TestClient):
    response = client.post(
        "/api/time-entries",
        json={
            "description": "Planning",
            "date": "2026-09-29",
            "duration_seconds": 1800,
        },
    )
    assert response.status_code == 201
    assert response.json()["duration_seconds"] == 1800
    assert response.json()["start_time"] is None


def test_midnight_crossover(client: TestClient):
    entry = create_manual_entry(
        client,
        date="2026-09-29",
        start_time="23:30:00",
        end_time="01:15:00",
    )
    assert entry["duration_seconds"] == 6300
    assert entry["end_at"].startswith("2026-09-29T23:15:00")  # UTC; Oslo is UTC+2


def test_zero_duration_rejected(client: TestClient):
    response = client.post(
        "/api/time-entries",
        json={
            "description": "Invalid",
            "date": "2026-09-29",
            "start_time": "09:00:00",
            "end_time": "09:00:00",
        },
    )
    assert response.status_code == 422


def test_edit_duplicate_and_delete_entry(client: TestClient):
    entry = create_manual_entry(client)
    edited = client.patch(
        f"/api/time-entries/{entry['id']}",
        json={"description": "Updated title", "comment": "Updated comment"},
    )
    assert edited.status_code == 200
    assert edited.json()["description"] == "Updated title"
    assert edited.json()["comment"] == "Updated comment"

    duplicate = client.post(
        f"/api/time-entries/{entry['id']}/duplicate",
        json={"date": "2026-09-30"},
    )
    assert duplicate.status_code == 201
    assert duplicate.json()["id"] != entry["id"]
    assert duplicate.json()["date"] == "2026-09-30"

    deleted = client.delete(f"/api/time-entries/{entry['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/time-entries/{entry['id']}").status_code == 404


def test_date_filters_and_weekly_totals(client: TestClient):
    create_manual_entry(client, date="2026-09-28", start_time="09:00:00", end_time="10:00:00")
    create_manual_entry(client, date="2026-09-29", start_time="09:00:00", end_time="11:00:00")
    create_manual_entry(client, date="2026-10-06", start_time="09:00:00", end_time="13:00:00")

    response = client.get("/api/time-entries", params={"week": "2026-09-29"})
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 2
    assert body["aggregates"]["total_seconds"] == 10800
    assert body["aggregates"]["weekly_total_seconds"] == 10800
    assert body["aggregates"]["daily_totals"] == [
        {
            "date": "2026-09-28",
            "seconds": 3600,
            "reported_seconds": 3600,
            "decimal_hours": 1.0,
            "reported_decimal_hours": 1.0,
        },
        {
            "date": "2026-09-29",
            "seconds": 7200,
            "reported_seconds": 7200,
            "decimal_hours": 2.0,
            "reported_decimal_hours": 2.0,
        },
    ]

    custom = client.get("/api/time-entries", params={"start_date": "2026-09-29", "end_date": "2026-10-06"})
    assert len(custom.json()["items"]) == 2


def test_rounding_exposes_exact_and_reported(client: TestClient):
    settings = client.patch("/api/settings", json={"rounding_increment": 15})
    assert settings.status_code == 200
    entry = client.post(
        "/api/time-entries",
        json={"description": "Short task", "date": "2026-09-29", "duration_seconds": 601},
    ).json()
    assert entry["duration_seconds"] == 601
    assert entry["reported_duration_seconds"] == 900
