# Contributing

## Before opening a change

Use an issue for substantial behavior or architecture changes. Security reports belong in the private process described in `SECURITY.md`.

## Development workflow

1. Fork or branch from the current default branch.
2. Keep changes focused and avoid committing generated builds, databases, secrets, or personal time data.
3. Install and validate the backend and frontend using the commands in `README.md`.
4. Add tests for behavior changes.
5. Update documentation when runtime, privacy, data storage, or release behavior changes.
6. Open a pull request using the repository template.

Windows packaging changes must pass the frozen-backend health and persistence gates in `.github/workflows/desktop-release.yml`.

Pull requests from forks run with read-only permissions and must not require repository secrets. Maintainers should not add secrets to untrusted pull-request workflows.

## Developer Certificate of Origin

This project uses the Developer Certificate of Origin 1.1 instead of a CLA. Sign each commit with `git commit -s` to certify that you have the right to submit the contribution under the project's license. See <https://developercertificate.org/>.

The DCO workflow checks every non-merge commit in a pull request. If a commit is missing the trailer, amend it locally and update the pull request; do not add a separate empty sign-off commit.

## Style

- Python: Ruff formatting and linting
- TypeScript/React: TypeScript, ESLint, Prettier conventions already configured in `frontend/`
- Prefer simple, maintainable changes and explicit failure behavior.

By participating, you agree to follow `CODE_OF_CONDUCT.md`.
