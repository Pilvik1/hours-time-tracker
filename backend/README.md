# Time Tracker API

FastAPI component for the Hours Time Tracker application. It owns authentication, persistence, timer state, time-entry validation, authoritative totals, reporting, and XLSX generation.

Use the repository-level [README](../README.md) to start the complete application.

## Local backend development

From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e 'backend[dev]'
cd backend
alembic upgrade head
uvicorn time_tracker.main:app --reload
```

The default database URL expects PostgreSQL on localhost. Set `DATABASE_URL` explicitly when using another instance. Authentication fails closed unless `TIME_TRACKER_PASSWORD` or `TIME_TRACKER_PASSWORD_HASH` is set. Use `TIME_TRACKER_SESSION_SECRET` with at least 32 random characters; set `TIME_TRACKER_COOKIE_SECURE=true` behind HTTPS.

## Test

From the repository root:

```bash
.venv/bin/ruff format --check backend
.venv/bin/ruff check backend
.venv/bin/pytest backend/tests --cov=time_tracker --cov-report=term-missing --cov-fail-under=75
```

Tests use isolated SQLite databases for speed. CI separately proves the migration and seed against PostgreSQL 16.

## Design

- A singleton database row stores the persistent running timer.
- Elapsed time is derived from `started_at`; there are no heartbeat writes.
- Timed entries store timezone-aware UTC timestamps and expose local clock values.
- Raw timestamps and exact durations are immutable under reporting rounding.
- The password is never stored in the application database.
- Every business API route requires a valid signed session cookie.

## Documentation

- [API contract](docs/API.md)
- [Frontend handoff](docs/FRONTEND_HANDOFF.md)
- [Backend architecture details](architecture.md)
- [Roadmap](roadmap.md)
