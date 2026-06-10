# Security CI - Report-Only Baseline

Phase O8 adds a `security-baseline` job to `.github/workflows/server-ci.yml`.
Infra steps (checkout, setup-node, npm ci) are **blocking**; the two scan steps
are **report-only** for visibility without gating the pipeline.

## Scans included

| Scan | Tool | Command / Action |
|---|---|---|
| npm audit | npm | `npm audit --omit=dev --audit-level=high` |
| Filesystem scan | Trivy (`aquasecurity/trivy-action`) | scanners `vuln,secret,misconfig`, severity `HIGH,CRITICAL`, exit-code `0` |

Scan steps have `continue-on-error: true` and are explicitly labelled **Report-Only**.
Infra steps have no `continue-on-error` so failures in checkout, setup, or install still fail the job.

## Why report-only?

Known high/critical findings exist in the current dependency tree AND the codebase
itself.  Until the dependency-remediation slice is complete, blocking on these
scans would break `ci:check` for every contributor.

## Future state

When all known issues are remediated:
1. Remove `continue-on-error: true` from the scan step-level.
2. Add `"security:audit:ci": "npm audit --omit=dev --audit-level=high"` as a blocking
   step (or use `--audit-level=moderate` for stricter gating).
3. Set Trivy `exit-code: 1` to make findings block the pipeline.

## Local usage

```bash
npm run security:audit        # human-readable; exits nonzero on high+
npm run security:audit:json   # machine-readable JSON; exits nonzero on high+
```
