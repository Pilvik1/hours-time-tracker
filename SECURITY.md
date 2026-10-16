# Security Policy

## Supported versions

Hours is pre-release software. Security fixes are applied to the newest published beta only.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability-reporting or Security Advisory interface for this repository. If that interface is unavailable, contact the repository owner privately through the GitHub profile before sharing details.

Include the affected version, operating system, reproduction steps, impact, and any suggested mitigation. Do not include real time-tracking data, passwords, tokens, or database files.

The maintainer will acknowledge a report when practical, validate it, prepare a fix, and coordinate disclosure. No bounty program is currently offered.

## Release security

Release artifacts are built by GitHub Actions, accompanied by SHA-256 checksums and an SPDX SBOM, and independently re-downloaded for verification. Beta Windows binaries are initially unsigned and may trigger SmartScreen warnings.

Production dependency audits must report no known vulnerabilities. Build-only dependencies fail CI on high or critical advisories; moderate build-tool findings are reviewed separately because they are not bundled into the desktop runtime.

## Security boundaries

- The packaged desktop services bind only to loopback addresses.
- The desktop frontend and backend use separate random per-launch credentials.
- GitHub Actions used by this repository are pinned to immutable commit SHAs.
- Pull-request workflows receive read-only repository permissions and do not receive release credentials.
- Checksums and an SPDX SBOM are published with each release.
