# API Contract

Base URL for local development: `http://localhost:8000`

All JSON uses UTF-8. Dates use `YYYY-MM-DD`, clock times use `HH:MM:SS`, and timestamps use ISO 8601 with an offset. IDs are UUID strings. Error responses use FastAPI's standard shape:

```json
{"detail": "Human-readable error"}
```

Validation errors return `422` with field details. Missing resources return `404`. Conflicting state (for example, starting a second timer) returns `409`.

The generated, authoritative schema is available from `GET /openapi.json`; Swagger UI is available at `GET /docs`.

## Authentication

All business endpoints below require the signed `time_tracker_session` cookie. Browser clients must send credentials. The application is intentionally single-user: there is no signup, user management, OAuth, or password-reset flow.

### `GET /api/auth/status`

Returns `{"authenticated": true}` or `{"authenticated": false}`. This endpoint never requires an existing session.

### `POST /api/auth/login`

Request:

```json
{"password": "the environment-configured password"}
```

Success returns `{"authenticated": true}` and sets an HTTP-only, SameSite=Lax session cookie. A wrong password returns `401`; missing production authentication configuration returns `503`.

### `POST /api/auth/logout`

Clears the session and returns `{"authenticated": false}`.

Protected endpoints return `401` with `{"detail":"Authentication required"}` when the cookie is missing, invalid, or expired.

## Settings

### `GET /api/settings`

Returns the single user's settings.

```json
{
  "name": "Ada Example",
  "employer_name": "Example Company",
  "timezone": "UTC",
  "date_format": "DD.MM.YYYY",
  "week_starts_on": "monday",
  "duration_format": "hh:mm",
  "rounding_increment": 0,
  "default_billable": false
}
```

### `PATCH /api/settings`

Accepts any subset of the response fields. `rounding_increment` must be `0`, `5`, `15`, or `30`; timezone must be an IANA timezone; `week_starts_on` is `monday` or `sunday`.

## Clients

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/clients?active=true` | List clients; `active` is optional |
| POST | `/api/clients` | Create a client |
| GET | `/api/clients/{id}` | Read one client |
| PATCH | `/api/clients/{id}` | Update name/active state |
| DELETE | `/api/clients/{id}` | Delete an unused client |

Create request:

```json
{"name": "Northstar", "active": true}
```

Delete returns `409` if a project still references the client; archive it with `PATCH` instead.

## Projects

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/projects?active=true` | List projects; `active` is optional |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/{id}` | Read one project |
| PATCH | `/api/projects/{id}` | Update a project |
| POST | `/api/projects/{id}/archive` | Set `active=false` |

Create request:

```json
{
  "name": "Northstar",
  "client_id": null,
  "color": "#2563EB",
  "billable_default": false,
  "active": true
}
```

Response includes timestamps and an optional nested `client`.

## Tags

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/tags` | List tags |
| POST | `/api/tags` | Create with `{"name":"analysis"}` |
| GET | `/api/tags/{id}` | Read one tag |
| PATCH | `/api/tags/{id}` | Rename |
| DELETE | `/api/tags/{id}` | Delete |

## Timer

### `GET /api/timer`

When stopped:

```json
{
  "running": false,
  "entry_id": null,
  "description": null,
  "comment": null,
  "project_id": null,
  "started_at": null,
  "elapsed_seconds": 0,
  "billable": null,
  "tags": []
}
```

### `POST /api/timer/start`

```json
{
  "description": "Research synthesis",
  "comment": null,
  "project_id": "1d47466d-6977-43b4-996f-fb1adb861a0b",
  "tags": ["bf60bf68-7807-411a-9e5c-f27a2f9fb72e"],
  "billable": false
}
```

Returns `201` and the running state. `billable` may be omitted; project default then user default is used. A second start returns `409`.

### `PATCH /api/timer`

Updates running metadata without resetting elapsed time. Accepts any subset of `description`, `comment`, `project_id`, `tags`, and `billable`.

### `POST /api/timer/stop`

Body may be `{}` or may contain final `description`/`comment` overrides. Returns the finalized time entry. No running timer returns `409`.

### `POST /api/timer/restart/{entry_id}`

Starts a new timer using an existing entry's description, comment, project, tags, and billable state. The new running timer receives a new reserved entry ID.

## Time entries

### `POST /api/time-entries`

Timed form:

```json
{
  "description": "Research synthesis",
  "comment": "Updated assumptions and sensitivity analysis",
  "project_id": "1d47466d-6977-43b4-996f-fb1adb861a0b",
  "date": "2026-09-29",
  "start_time": "09:00:00",
  "end_time": "11:30:00",
  "billable": false,
  "tags": []
}
```

Duration-only form:

```json
{
  "description": "Planning",
  "date": "2026-09-29",
  "duration_seconds": 1800
}
```

Supply either both `start_time` and `end_time`, or `duration_seconds`. An end time earlier than start crosses midnight. Equal times and non-positive durations return `422`.

Response excerpt:

```json
{
  "id": "dc5f2346-a386-49a1-aacd-c512b95e79cd",
  "description": "Research synthesis",
  "comment": "Updated assumptions and sensitivity analysis",
  "date": "2026-09-29",
  "start_time": "09:00:00",
  "end_time": "11:30:00",
  "start_at": "2026-09-29T07:00:00Z",
  "end_at": "2026-09-29T09:30:00Z",
  "duration_seconds": 9000,
  "reported_duration_seconds": 9000,
  "billable": false,
  "tags": [],
  "project": {"id": "...", "name": "Northstar", "client_id": null, "color": "#2563EB"}
}
```

### `GET /api/time-entries/{id}`

Returns one entry, or `404`.

### `PATCH /api/time-entries/{id}`

Accepts any mutable entry field. Changing `date` preserves and relocates existing local clock times. Sending `duration_seconds` switches to duration-only mode. If changing times, send both `start_time` and `end_time`.

### `DELETE /api/time-entries/{id}`

Deletes the entry and returns `204`.

### `POST /api/time-entries/{id}/duplicate`

Body is `{}` or `{"date":"2026-09-30"}`. Returns the new entry with `201`.

### `GET /api/time-entries`

Date selection (choose one mode):

- `day=2026-09-29`
- `week=2026-09-29` (any day in the desired week)
- `month=2026-09`
- `start_date=2026-09-01&end_date=2026-09-30`

Optional filters: `project_id`, `client_id`, `tag_id`, `billable`.

Response:

```json
{
  "items": [],
  "aggregates": {
    "daily_totals": [],
    "weekly_totals": [],
    "total_seconds": 0,
    "reported_total_seconds": 0,
    "weekly_total_seconds": 0
  }
}
```

`items` are chronological. Exact totals and separately rounded/reported totals are authoritative.

## Reports

### `GET /api/reports/summary`

Required: `start_date`, `end_date`. Optional: `project_id`, `client_id`, `tag_id`, `billable`.

Returns exact and reported totals plus `by_day`, `by_project`, `by_client`, and `by_tag`. Every bucket contains `seconds`, `reported_seconds`, `decimal_hours`, and `reported_decimal_hours`.

## XLSX export

### `GET /api/exports/xlsx`

Required: `start_date`, `end_date`. Optional: `project_id`, `client_id`.

Response content type is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with an attachment filename. The `Timesheet` sheet contains individual entries and totals; `Summary` contains date/project/client rollups. `Duration` and `Decimal Hours` always remain exact. When rounding is enabled, separate `Reported Duration` and `Reported Decimal Hours` columns and totals are added.
