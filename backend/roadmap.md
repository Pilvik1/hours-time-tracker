# Roadmap

## V1 — implemented

- Persistent start/stop/update/restart timer
- Manual time-entry CRUD and duplication
- Project, client, and tag management
- Day/week/month/custom-range retrieval and filters
- Exact and rounded aggregates
- Day/project/client/tag reporting
- Employer-ready XLSX with detailed and summary worksheets
- PostgreSQL migrations, Docker Compose, seed data
- API and frontend integration documentation
- Automated end-to-end, persistence, calculation, and workbook tests
- Single-user Argon2 password authentication with signed HTTP-only sessions
- Integrated Lovable frontend with real persistent API data
- Local Docker/PostgreSQL development stack

## Sensible next additions (only when needed)

1. Add a PostgreSQL backup/restore script and scheduled local backups.
2. Add CSV export if an employer system requires it.
3. Add import from Toggl CSV for historical migration.
4. Add entry pagination if the dataset grows enough to justify it.

Multi-tenancy, teams, subscriptions, invoicing, permissions, and enterprise authentication are explicitly out of scope.
