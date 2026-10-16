#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
database_file="$repository_root/.e2e/time-tracker.sqlite"
mkdir -p "$repository_root/.e2e"
rm -f "$database_file"
(
  cd "$repository_root/backend"
  DATABASE_URL="sqlite+pysqlite:///../.e2e/time-tracker.sqlite" \
    "$repository_root/.venv/bin/alembic" upgrade head
)
