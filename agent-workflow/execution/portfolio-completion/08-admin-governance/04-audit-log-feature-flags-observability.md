# Task 08-T4: System Audit Logs, Feature Flags & Observability

## 1. Goal
Implement the central System Audit Log inspector, Feature Flag controller, and Grafana/Prometheus observability dashboard embed (`/admin/observability`).

## 2. Why
Provides complete platform operational transparency, runtime feature management, and system health monitoring for portfolio demonstrations.

## 3. Dependencies
- Task `08-T3` (Financial Oversight, Payout Approval & Refund Review).

## 4. Preconditions
- Admin role authenticated.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **Audit Logs (`GET /admin/audit-logs`):** Displays immutable system log of administrative and security actions (actor, action, entity, IP, timestamp, details).
  - **Feature Flags (`GET /admin/config/flags`, `PUT /admin/config/flags`):** Dynamic runtime toggles (e.g. `MAINTENANCE_MODE`, `SOCIAL_LOGIN_ENABLED`, `PROMOTIONS_ENABLED`, `SEAT_HOLD_TTL_MINUTES`).
  - **Observability Embed (`/admin/observability`):** Embedded Grafana metrics view / Prometheus metrics endpoint (`/metrics`) exposing request rates, error ratios, DB pool status, and memory usage.
- **Out-of-Scope:**
  - Exporting logs to external SIEM tools.

## 6. Likely Source Modules / Files
- `server/src/modules/admin/` — [Discovery Target: Audit log & feature flag service]
- `web/src/app/admin/observability/page.tsx` — [Discovery Target: Admin Grafana embed & observability UI]

## 7. Contracts / Behavior to Preserve
- Prometheus `/metrics` response format (OpenMetrics standard).

## 8. Ordered Implementation Steps
1. Create PostgreSQL migration for `system_audit_logs` and `feature_flags` tables.
2. Build `AuditLogService.logAction(actorId, action, entityType, entityId, metadata)` helper.
3. Configure `prom-client` in Express app to expose system metrics on `/metrics` endpoint.
4. Implement dynamic feature flag evaluation with 10-second Redis caching.
5. Develop Admin Observability UI in `web/src/app/admin/observability/page.tsx`.
6. Write unit tests for feature flag updating and audit log creation.

## 9. Database / Migration Needs
- PostgreSQL migration `073_create_audit_logs_and_feature_flags.sql`.

## 10. Security Requirements
- Ensure `/metrics` endpoint is protected by internal network token or Admin authorization.
- Feature flag updates logged to audit log immediately.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `npm run build` (in `web/`)

## 12. Acceptance Criteria
- [ ] Admin actions automatically create entry in `system_audit_logs`.
- [ ] Toggling feature flag in Admin UI updates system behavior within 10 seconds.
- [ ] `/metrics` endpoint exposes valid Prometheus metrics counters.

## 13. Rollback / Feature-Flag Strategy
- Hardcoded environment variables serve as fallback if `feature_flags` database table is empty.

## 14. Required Artifacts / Handoff Report
- Observability and feature flag test execution report.

## 15. Blocker Questions
- Should feature flag changes require dual-admin confirmation in production?
