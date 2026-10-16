# Frontend Handoff

The integrated frontend lives in `/frontend`. This document records the network and data contract for future frontend changes.

## Connection

Preferred local browser URL:

```text
http://localhost:3000
```

The TanStack server proxies `/api/*` to `API_INTERNAL_URL` (default `http://localhost:8000`). Use relative `/api` URLs in browser code and always include credentials.

```text
API_INTERNAL_URL=http://localhost:8000
```

CORS permits configured local origins for independent development. Start with `GET /api/auth/status`; unauthenticated users go to `/login`. Log in with `POST /api/auth/login`, send `credentials: "include"` on every request, and log out with `POST /api/auth/logout`.

## Source of truth

- Use `duration_seconds`, aggregates, and report values returned by the API.
- Do not recalculate authoritative totals in the browser.
- Display `reported_duration_seconds` when reporting rounding is enabled; retain `duration_seconds` for exact time.
- Use `start_time`/`end_time` for local clock display and `start_at`/`end_at` when an absolute timestamp is needed.
- Use settings from `GET /api/settings`; do not hard-code timezone, week start, or rounding.

## Recommended startup sequence

1. `GET /api/settings`
2. `GET /api/projects?active=true`
3. `GET /api/clients?active=true`
4. `GET /api/tags`
5. `GET /api/timer`
6. `GET /api/time-entries?week=<today>`

Run this sequence only after authentication succeeds.

## Timer integration

Start:

```ts
await fetch(`${API}/api/timer/start`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    description: "Research synthesis",
    comment: null,
    project_id: selectedProjectId,
    tags: selectedTagIds,
    billable: false,
  }),
});
```

The backend persists only `started_at`. For a smooth display, calculate the visual counter from `Date.now() - started_at` client-side, and periodically re-fetch `GET /api/timer` (for example on focus and every 30–60 seconds). A page refresh or frontend restart must begin by fetching timer state.

Update the running title/comment/project/tags with `PATCH /api/timer`. Stop with `POST /api/timer/stop` and body `{}`. Refresh both timer state and the visible entry range after stopping.

If timer start returns `409`, fetch `GET /api/timer`; another tab or prior session already started it.

## Entry retrieval

For the weekly view:

```text
GET /api/time-entries?week=2026-09-29
```

The date can be any date inside the desired week. The backend applies `settings.week_starts_on` and returns:

- chronological `items`
- `daily_totals`
- `weekly_totals`
- exact `total_seconds`
- rounded `reported_total_seconds`

Use query parameters for project/client/tag/billable filters. Pass UUIDs without transformation.

## Manual entry form

Support two mutually exclusive modes:

1. `date + start_time + end_time`
2. `date + duration_seconds`

Send clock times as `HH:MM:SS`. The backend handles midnight crossing. Surface a `422` response beside the relevant fields instead of trying to repair invalid data silently.

`description` is the short title. `comment` is the longer optional explanation. Keep these separate in UI state and requests.

## XLSX download

```ts
const response = await fetch(
  `${API}/api/exports/xlsx?start_date=2026-09-28&end_date=2026-10-04`
);
if (!response.ok) throw await response.json();
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const anchor = document.createElement("a");
anchor.href = url;
anchor.download = "timesheet.xlsx";
anchor.click();
URL.revokeObjectURL(url);
```

The response's `Content-Disposition` contains the canonical filename if the frontend chooses to parse it.

## Error handling

| Status | Meaning | UI action |
|---|---|---|
| 401 | Session missing or expired | Clear cached private data and navigate to `/login` |
| 404 | Resource no longer exists | Refresh data and show a concise notice |
| 409 | State/name conflict | Show `detail`; refresh timer for timer conflicts |
| 422 | Invalid request or time state | Show validation detail near the form |
| 500 | Unexpected backend failure | Preserve unsaved form state and allow retry |

FastAPI may return `detail` as a string or a validation-error array/object. The frontend error helper should support both.

## Contract discovery

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI: `http://localhost:8000/openapi.json`
- Human-readable examples: `docs/API.md`

Generate API client types from OpenAPI if useful, but keep the network layer thin; the backend contract is small enough that a large SDK abstraction is unnecessary.
