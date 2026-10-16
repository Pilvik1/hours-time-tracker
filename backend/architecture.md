# Architecture

## Objective

A small, reliable backend for one person's time records. The architecture separates transport, business logic, persistence, and exports without introducing enterprise patterns that do not earn their keep.

## Components

```text
TanStack Start frontend / same-origin API proxy
        |
        | signed HTTP-only cookie + JSON / XLSX
        v
FastAPI auth + routers
        |
        v
Entry / timer / report / export services
        |
        v
SQLAlchemy ORM + Alembic
        |
        v
PostgreSQL persistent volume
```

## Key decisions

### Exact time storage

Timed entries store timezone-aware UTC `start_at` and `end_at` values plus the user's local work `date`. API responses expose both ISO timestamps and local `start_time`/`end_time`. Duration-only entries have no fabricated clock times.

### Persistent timer

The running timer is a single database row with primary key `1`. It stores a reserved entry UUID, metadata, and `started_at`. Stopping the timer atomically creates the final `TimeEntry` with that UUID and removes the running row. Elapsed time is computed from `started_at`; no heartbeat writes are needed.

### Midnight crossing

For a manual entry, an end time earlier than its start time means the entry ends on the following day. Equal start/end times are rejected rather than interpreted as either zero or 24 hours.

### Rounding

Raw timestamps and `duration_seconds` never change. The configured 5/15/30-minute rounding uses half-up rounding per entry and appears separately as `reported_duration_seconds` and reported aggregates.

### Deletion and history

Time entries and tags support explicit deletion. Projects are archived rather than deleted, protecting historical reporting. Clients referenced by projects cannot be deleted.

## Package layout

```text
src/time_tracker/
  auth.py                single-user password/session authentication
  api/router.py          HTTP endpoints
  services/common.py     entity lookup and validation
  services/entries.py    entry CRUD, filtering, aggregates
  services/timer.py      persistent timer state machine
  services/reporting.py  grouped report calculations
  services/export.py     XLSX workbook generation
  models.py              SQLAlchemy schema
  schemas.py             Pydantic request/response contracts
  time_utils.py          timezone, interval, rounding helpers
  main.py                FastAPI application, sessions, auth gate, and CORS
alembic/                 versioned PostgreSQL migrations
tests/                   API, persistence, export, and end-to-end tests
```

## Reliability boundaries

- Database constraints enforce unique names and the singleton timer key.
- Timer start/stop uses row locking where supported by the database.
- Service validation prevents missing foreign keys and invalid time combinations.
- Docker starts the API only after PostgreSQL is healthy and applies migrations before Uvicorn.
- PostgreSQL's named volume provides restart persistence; backups remain an operational responsibility.
