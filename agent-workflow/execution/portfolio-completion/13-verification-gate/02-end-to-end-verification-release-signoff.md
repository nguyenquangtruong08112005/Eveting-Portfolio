# Task 13-T2: End-to-End Verification & Release Sign-off

## 1. Goal
Execute the complete end-to-end release verification suite covering functional E2E flows, contract testing, concurrency stress, disaster recovery backup/restore drills, public health smoke tests, and generate the final Release Sign-off Certificate.

## 2. Why
Provides conclusive, empirical proof that the monorepo application is fully verified, operational, resilient, and ready for public portfolio presentation.

## 3. Dependencies
- Task `13-T1` (Automated Security Scans).

## 4. Preconditions
- Staging server deployed and accessible at `https://eventing.moteo.fun` and `https://eventing-api.moteo.fun`.
- AWS SSM CLI monitor script `scripts/monitor-server.cmd` operational.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **Full Functional E2E Verification:** Playwright E2E suite covering User Registration $\rightarrow$ Email Activation $\rightarrow$ Event Discovery $\rightarrow$ Interactive Seat Hold $\rightarrow$ ZaloPay Payment $\rightarrow$ Ticket Issuance $\rightarrow$ Mobile QR Check-in Scan.
  - **Database Disaster Recovery Drill:** Executing PostgreSQL backup (`pg_dump`), dropping test database, restoring from backup (`pg_restore`), and verifying data integrity.
  - **Public Smoke Tests:** Executing `scripts/monitor-server.cmd health` verifying Web 200 OK, API `/health` 200 OK, and container zero-restart status.
  - Generating official `RELEASE_SIGNOFF.md` document.
- **Out-of-Scope:**
  - Ongoing post-release maintenance.

## 6. Likely Source Modules / Files
- `web/e2e/` — [Discovery Target: Playwright E2E test suite]
- `scripts/monitor-server.cmd` — [Discovery Target: Server monitoring & health script]

## 7. Contracts / Behavior to Preserve
- 100% clean exit codes across all verification commands.

## 8. Ordered Implementation Steps
1. Execute Playwright E2E web testing suite against staging URL.
2. Perform database backup and restore validation script (`node server/scripts/db/dr-test.js`).
3. Execute server monitoring script `scripts/monitor-server.cmd health` verifying HTTP endpoints.
4. Verify Prometheus `/metrics` and Grafana dashboard status.
5. Create `RELEASE_SIGNOFF.md` recording test execution dates, commit SHAs, and verification status.

## 9. Database / Migration Needs
- PostgreSQL backup file verification.

## 10. Security Requirements
- Backup files encrypted at rest (`pg_dump` piped to GPG encryption).

## 11. Test / Build / Smoke Commands
- `npx playwright test` (in `web/`)
- `scripts\monitor-server.cmd health`
- `scripts\monitor-server.cmd status`

## 12. Acceptance Criteria
- [ ] 100% of Playwright E2E tests pass.
- [ ] Disaster recovery drill confirms 100% data recovery accuracy.
- [ ] Public health endpoints (`https://eventing.moteo.fun` and `https://eventing-api.moteo.fun/health`) return 200 OK.
- [ ] Official `RELEASE_SIGNOFF.md` signed and committed to repository documentation.

## 13. Rollback / Feature-Flag Strategy
- If E2E verification fails, abort merge to `main` and execute rollback script on staging.

## 14. Required Artifacts / Handoff Report
- `RELEASE_SIGNOFF.md` document, E2E test video/log recordings, and public smoke verification output.

## 15. Blocker Questions
- Are all stakeholders aligned on declaring the portfolio completion program finished upon signature of `RELEASE_SIGNOFF.md`?
