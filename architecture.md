# Architecture

## Desktop runtime

```text
Electron main process
  │
  ├── generates separate per-launch frontend/backend credentials and selects two free loopback ports
  ├── starts bundled hours-backend.exe
  │     ├── applies Alembic migrations
  │     ├── binds 127.0.0.1:<random>
  │     └── reads/writes AppData/Hours/data/hours.sqlite3
  │
  ├── starts bundled TanStack/Nitro server using Electron's Node runtime
  │     ├── binds 127.0.0.1:<random>
  │     ├── serves the renderer
  │     └── proxies /api/* with the internal token
  │
  └── opens a sandboxed BrowserWindow after both health checks pass
```

The renderer never receives Node integration, filesystem access, database credentials, or either internal credential. Electron sets an HTTP-only cookie for the same-origin local frontend server, which adds the separate backend token when proxying API requests. External navigation and popup creation are denied by the Electron main process.

The desktop database lives outside the installation directory so installer upgrades do not replace user data. Application and backend startup output is written to `hours-desktop.log` in Electron's logs directory.

## Web runtime

```text
Browser
  │  HTTPS, same-origin /api/*, HTTP-only session cookie
  ▼
TanStack Start frontend / API reverse proxy
  │  private HTTP
  ▼
FastAPI authentication + REST API
  │
  └── PostgreSQL
```

The web path uses an environment-configured password, a signed HTTP-only session cookie, and PostgreSQL. Only the frontend should receive public network exposure.

## Ownership boundaries

- The frontend owns presentation and transient form state.
- Electron owns local process lifecycle, local ports, diagnostic logging, and the desktop window.
- FastAPI owns authentication, validation, time calculations, exact and reported totals, and XLSX generation.
- SQLite owns desktop persistence; PostgreSQL owns web persistence.
- Alembic owns schema evolution in both modes.

## Security boundaries

- Desktop services bind only to `127.0.0.1`.
- Separate cryptographically random frontend and backend credentials are generated for every desktop launch.
- The frontend requires an HTTP-only local-session cookie set by Electron, then adds the backend token server-side; renderer JavaScript cannot read either credential.
- A direct request to the backend without a valid desktop token or web session receives `401`.
- Electron uses `contextIsolation`, disables renderer Node integration, enables the Chromium sandbox, and blocks navigation away from the local app origin.

## Release boundary

The Windows release is publishable only after backend/frontend checks, PyInstaller compilation, frozen-backend health and restart-persistence tests, Electron packaging, artifact checksum generation, and GitHub Actions completion. The installer is unsigned until a code-signing certificate is configured.
