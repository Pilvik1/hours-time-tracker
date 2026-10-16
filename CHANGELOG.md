# Changelog

All notable changes are documented here. This project follows Semantic Versioning while release notes may identify beta limitations.

## [Unreleased]

## [0.1.0-beta.4] - 2026-10-16

Public-readiness release from a sanitized source snapshot.

### Added

- Clean repository history and public contribution surface
- Repository metadata, ownership notice, support guide, roadmap, and branding disclaimer
- DCO verification and CODEOWNERS policy
- Sanitized example data and presentation screenshots

### Changed

- Updated project metadata and links for Pilvik1/hours-time-tracker
- Renamed the Windows application identifier to a repository-owned namespace
- Reframed documentation for independent local-first use and public contribution

### Security

- Removed legacy history, tags, releases, personal test data, and obsolete deployment material from the publication candidate
- Preserved pinned GitHub Actions, secret scanning, dependency audits, release checksums, and SPDX SBOM generation

## [0.1.0-beta.3] - 2026-10-16

### Added

- One-click one-hour calendar entry creation without an editor interruption
- Deterministic side-by-side layout for overlapping entries
- Branded application icon, favicon, startup state, and Windows title bar
- Browser acceptance coverage for timezone persistence and calendar interactions

### Changed

- A deliberate second click opens a newly created entry
- Drag and resize releases save without opening the editor

## [0.1.0-beta.2] - 2026-10-16

First downloadable Windows beta.

### Added

- Windows Electron desktop supervisor
- Bundled FastAPI backend with automatic migrations
- Local SQLite persistence in the Windows user-data directory
- Installer and portable release targets
- Windows frozen-runtime, restart-persistence, checksum, and SBOM release gates
- Public-repository documentation and security automation

### Security

- Removed known high and critical production dependency findings
- Added loopback-only desktop services and per-launch internal API authentication
- Pinned GitHub Actions to immutable commit SHAs
