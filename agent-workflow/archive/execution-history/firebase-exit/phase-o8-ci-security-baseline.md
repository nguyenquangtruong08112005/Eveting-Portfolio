# Phase O8 - CI Security Baseline

Date: 2026-06-11

## Goal

Add a CI/CD security scan baseline before business-domain redesign, without breaking the existing CI while known dependency findings still exist.

Scope:

- `Server-2025-Eventing`
- GitHub Actions workflow
- npm security scripts
- Server-local security CI documentation

## Worker Task

OpenCode implemented the O8 baseline. Manager review required two corrections before acceptance:

- Do not use `aquasecurity/trivy-action@master`; pin the action.
- Do not put `continue-on-error` at job level; checkout, setup, and install failures should still fail.

## Server Changes

- Added npm scripts:
  - `security:audit`
  - `security:audit:json`
- Added `.github/workflows/server-ci.yml` `security-baseline` job.
- Added `docs/security-ci.md`.

## CI Behavior

The `security-baseline` job is intentionally report-only for scan findings:

- `npm ci` remains blocking.
- `npm run security:audit` is report-only with `continue-on-error: true`.
- Trivy filesystem scan is report-only with `continue-on-error: true`.
- Trivy action is pinned to `aquasecurity/trivy-action@0.28.0`.
- Trivy scans `vuln,secret,misconfig` with severity `HIGH,CRITICAL`.

This keeps visibility high without making every CI run fail before the dependency-remediation slice.

## Verification

Commands run from `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`:

```cmd
git diff --check
npm run ci:check
npm run security:audit
trivy --version
codegraph sync .
```

Results:

- `git diff --check` passed. Git printed only the existing LF-to-CRLF warning for `.github/workflows/server-ci.yml`.
- `npm run ci:check` passed.
- `npm run security:audit` exited nonzero as expected and reported current known findings:
  - 44 total vulnerabilities
  - 5 low
  - 24 moderate
  - 14 high
  - 1 critical
- `trivy --version` failed locally because Trivy CLI is not installed on the Windows host. The GitHub Actions workflow uses the Trivy action instead.
- `codegraph sync .` completed.

## Known Security Findings

Dependency remediation is not complete in O8. Important findings include:

- `fast-xml-parser` critical via AWS SDK dependency chain.
- multiple high findings in `axios`, `express` transitive packages, `multer`, `jsonwebtoken` transitive `jws`, `validator`, `tmp`, `undici`.
- `xlsx` has high findings with no npm audit fix available.

## Next Step

Proceed to O9 pre-business-redesign gaps. Treat dependency remediation as a follow-up security-hardening slice before flipping security scans to blocking.
