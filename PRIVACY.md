# Privacy

Hours is designed to work without an account, hosted service, or internet connection.

## Data stored locally

The desktop app stores time entries, running-timer state, projects, clients, tags, settings, and database metadata in a SQLite file inside the current Windows user's application-data directory. Diagnostic startup logs are stored in Electron's logs directory.

## Data leaving the device

Hours does not include telemetry, analytics, crash-report uploads, advertising, cloud sync, or external AI services. Data leaves the application only when the user explicitly exports an XLSX file or copies information through normal operating-system features.

GitHub may receive standard download metadata when a release is downloaded from GitHub. That is governed by GitHub's policies and is outside the application runtime.

## Network behavior

The desktop app starts two HTTP services bound to `127.0.0.1` on random ports. They are not exposed to the local network or internet. The local frontend requires an HTTP-only session cookie set by Electron, and browser-to-backend calls use a separate random token. Both credentials are regenerated on each launch.

The optional local Docker web stack is a separate development mode. It binds to the local machine; its operator remains responsible for backups, access control, and any resulting server logs.

## Deletion and backups

Uninstalling Hours does not intentionally delete the user-data directory. Users can back up the SQLite database while Hours is closed. Deleting the user-data directory permanently deletes locally stored Hours data; the application has no cloud copy to restore.
