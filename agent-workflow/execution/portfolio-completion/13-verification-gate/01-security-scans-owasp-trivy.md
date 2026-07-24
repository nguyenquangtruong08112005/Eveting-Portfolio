# Task 13-T1: Automated Security Scans (OWASP, Trivy, IaC Audit)

## 1. Goal
Execute comprehensive automated security scans including OWASP Top 10 API vulnerability checks, Trivy container image scanning, Node.js dependency audits, and Terraform IaC security static analysis.

## 2. Why
Guarantees the application, containers, dependencies, and infrastructure contain zero critical or high-severity security vulnerabilities before public release.

## 3. Dependencies
- Phase 12 (Git Flow, Release Model & Infrastructure Gates).

## 4. Preconditions
- Docker images built locally or in CI runner.
- Security scanners (`trivy`, `npm audit`, `tfsec` / `checkov`) available.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **Trivy Container Scan:** Scanning `eventing-web` and `eventing-api` Docker images for OS and application package vulnerabilities.
  - **Dependency Audit:** `npm audit --audit-level=high` in `server/` and `web/`.
  - **IaC Static Analysis:** `tfsec server/infra/terraform/` checking for open security groups or unencrypted S3 buckets.
  - **OWASP API Verification:** Automated scan verifying BOLA (API1), Broken Authentication (API2), Property-level Authorization (API3), Unrestricted Resource Consumption (API4), Broken Function Level Authorization (API5), Unrestricted Access to Business Flows (API6), Server-Side Request Forgery (API7), Security Misconfiguration (API8), Improper Inventory Management (API9), and Unsafe Consumption of APIs (API10).
- **Out-of-Scope:**
  - Third-party physical penetration testing.

## 6. Likely Source Modules / Files
- `server/` — [Discovery Target: Server source for dependency audit]
- `web/` — [Discovery Target: Web source for dependency audit]
- `server/infra/` — [Discovery Target: Infra configuration for security scan]

## 7. Contracts / Behavior to Preserve
- Zero CRITICAL or HIGH unresolved vulnerabilities in release builds.

## 8. Ordered Implementation Steps
1. Run `npm audit` in `server/` and `web/`, upgrading any vulnerable transitive packages.
2. Run `trivy image` against compiled web and server Docker images.
3. Run `tfsec` against Terraform infrastructure modules.
4. Execute OWASP API test suite verifying security boundary responses.
5. Generate `SECURITY_AUDIT_REPORT.md`.

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- All identified CRITICAL and HIGH severity vulnerabilities must be patched or explicitly documented with risk acceptance justification before release sign-off.

## 11. Test / Build / Smoke Commands
- `npm audit --audit-level=high`
- `trivy image eventing-web:latest`
- `trivy image eventing-api:latest`
- `tfsec server/infra/terraform`

## 12. Acceptance Criteria
- [ ] `npm audit` reports 0 high/critical vulnerabilities.
- [ ] Trivy container scan reports 0 critical vulnerabilities.
- [ ] Terraform security scanner passes with zero high-severity findings.

## 13. Rollback / Feature-Flag Strategy
- Block release deployment if security scan returns non-zero exit code in CI runner.

## 14. Required Artifacts / Handoff Report
- `SECURITY_AUDIT_REPORT.md` summary file.

## 15. Blocker Questions
- Are any upstream base Docker images (e.g. `node:20-alpine`) containing unpatchable low-severity CVEs?
