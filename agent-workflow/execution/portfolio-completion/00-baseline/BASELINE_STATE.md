# Baseline State & Monorepo Audit (`BASELINE_STATE.md`)

> **Audit Date:** 2026-07-24
> **Target Branch:** `staging`
> **Audited Directories:** `server/`, `web/`, `mobile-attendee/`, `mobile-organizer/`, Monorepo Root.

---

## 1. Monorepo Repository Structure & Frameworks

| Component | Path | Framework / Core Stack | Primary Entrypoint |
| :--- | :--- | :--- | :--- |
| **Server Backend** | `server/` | Node.js, Express (~4.16.1), PostgreSQL (`pg` ^8.21.0), Redis (^6.0.0), Elasticsearch (^9.2.0) | `server/src/server.js` $\rightarrow$ `app.js` |
| **Web Application** | `web/` | Next.js (16.2.9 App Router), React (19.2.4), Tailwind CSS (^4), next-intl (^4.13.0) | `web/src/app/layout.tsx` |
| **Mobile Attendee App** | `mobile-attendee/` | Native Android, Kotlin, Jetpack Compose, Retrofit 2, OkHttp | `com.tdtuer.eventing` |
| **Mobile Organizer App** | `mobile-organizer/` | Native Android, Kotlin, Jetpack Compose, Retrofit 2, OkHttp | `com.tdtuer.eventing_organizer` |

---

## 2. Inventoried Package Scripts

### `server/package.json` Scripts

```json
{
  "start": "start cmd /k nodemon src/server.js && ngrok http 3000",
  "dev": "nodemon src/server.js",
  "db:migrate": "node db/migrate.js",
  "db:smoke:authz-middleware": "node scripts/smoke/smoke.authz-middleware.js",
  "db:smoke:event-lifecycle": "node scripts/smoke/smoke.event-lifecycle.js",
  "db:smoke:event-lifecycle-policy": "node scripts/smoke/smoke.event-lifecycle-policy.js",
  "db:smoke:lifecycle-persistence": "node scripts/smoke/smoke.lifecycle-persistence.js",
  "db:smoke:draft-events": "node scripts/smoke/smoke.draft-events.js",
  "db:smoke:draft-submit": "node scripts/smoke/smoke.draft-submit.js",
  "db:smoke:admin-lifecycle": "node scripts/smoke/smoke.admin-lifecycle.js",
  "db:smoke:order-foundation": "node scripts/smoke/smoke.order-foundation.js",
  "db:smoke:order-wiring": "node scripts/smoke/smoke.order-wiring.js",
  "db:smoke:auth": "node scripts/smoke/smoke.auth.js",
  "db:smoke:postgres-provider": "node scripts/smoke/smoke.postgres-provider.js",
  "db:smoke:lazy-providers": "node scripts/smoke/smoke.lazy-providers.js",
  "db:smoke:postgres-write-paths": "node scripts/smoke/smoke.postgres-write-paths.js",
  "db:smoke:venues": "node scripts/smoke/smoke.venues.js",
  "db:seed:venues": "node scripts/seed/seed.venues.postgres.js",
  "db:seed:demo-users": "node scripts/seed/seed.demo-users.postgres.js",
  "db:seed:platform": "node scripts/seed/seed.platform.postgres.js",
  "db:seed:all": "node scripts/seed/seed.platform.postgres.js",
  "db:seed:notifications": "node scripts/seed/seed.notifications.postgres.js",
  "db:smoke:notifications": "node scripts/smoke/smoke.notifications.js",
  "db:smoke:media": "node scripts/smoke/smoke.media.js",
  "db:smoke:storage-media": "node scripts/smoke/smoke.storage-media.js",
  "db:smoke:promotions": "node scripts/smoke/smoke.promotions.js",
  "db:smoke:promotions-calculation": "node scripts/smoke/smoke.promotions-calculation.js",
  "db:smoke:reviews": "node scripts/smoke/smoke.reviews.js",
  "db:smoke:users": "node scripts/smoke/smoke.users.js",
  "db:smoke:events": "node scripts/smoke/smoke.events.js",
  "db:smoke:tickets": "node scripts/smoke/smoke.tickets.js",
  "db:smoke:repeated-booking": "node scripts/smoke/smoke.repeated-booking.js",
  "db:smoke:idempotency": "node scripts/smoke/smoke.idempotency.js",
  "db:smoke:concurrent-booking": "node scripts/smoke/smoke.concurrent-booking.js",
  "db:smoke:transactions": "node scripts/smoke/smoke.transactions.js",
  "db:smoke:analytics": "node scripts/smoke/smoke.analytics.js",
  "db:smoke:featured_profiles": "node scripts/smoke/smoke.featured_profiles.js",
  "db:smoke:organizer_profiles": "node scripts/smoke/smoke.organizer_profiles.js",
  "db:smoke:security-hardening": "node scripts/smoke/smoke.security-hardening.js",
  "search:reindex": "node scripts/maintenance/reindex.elasticsearch.js",
  "db:smoke:rbac": "node scripts/smoke/smoke.rbac.js",
  "db:smoke:legacy-migration": "node scripts/smoke/smoke.legacy-migration.js",
  "db:smoke:structured-errors": "node scripts/smoke/structured-errors.smoke.cjs",
  "db:smoke:mobile-contracts": "node scripts/smoke/smoke.mobile-contracts.cjs",
  "db:smoke:email-provider": "node scripts/smoke/smoke.email-provider.js",
  "ci:check": "node scripts/ci/check-js-syntax.js && npm run db:smoke:email-provider && npm run db:smoke:authz-middleware && npm run db:smoke:event-lifecycle && npm run db:smoke:event-lifecycle-policy && npm run db:smoke:lazy-providers && npm run db:smoke:repeated-booking && npm run db:smoke:idempotency && npm run db:smoke:concurrent-booking && npm run db:smoke:promotions-calculation && npm run db:smoke:security-hardening",
  "observability:up": "docker compose -f infra/docker/docker-compose.observability.yml up -d",
  "observability:down": "docker compose -f infra/docker/docker-compose.observability.yml down",
  "obs:up": "docker compose -f infra/docker/docker-compose.observability.yml up -d",
  "obs:down": "docker compose -f infra/docker/docker-compose.observability.yml down",
  "local:infra": "docker start mobile-eventing-postgres mobile-eventing-redis es01 2>nul || docker compose -f infra/docker/docker-compose.local.yml up -d",
  "local:mobile": "npm run local:infra && npm run db:migrate && npm run search:reindex && start \"Eventing-API\" cmd /k \"npm run dev\" && ngrok http 3000",
  "local:down": "docker stop mobile-eventing-postgres mobile-eventing-redis es01 2>nul || docker compose -f infra/docker/docker-compose.local.yml down",
  "logs:tail:app": "node scripts/maintenance/tail-log.js app",
  "logs:tail:http": "node scripts/maintenance/tail-log.js http",
  "security:audit": "npm audit --omit=dev --audit-level=high",
  "security:audit:json": "npm audit --omit=dev --audit-level=high --json",
  "db:audit:orphans": "node scripts/db/run-orphan-audit.js",
  "db:audit:fks": "node scripts/db/probes/_fk_count.js",
  "test:unit:qr": "node scripts/ci/test-qr-generator.mjs",
  "job:retention": "node src/jobs/retention.job.js"
}
```

### `web/package.json` Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test:unit": "node --experimental-strip-types src/lib/safe-redirect.test.ts"
}
```

---

## 3. Database Migration Audit (`server/db/migrations/`)

- **Observed Range:** `001_create_venues.sql` through `060_soft_delete_columns.sql` (Total 58 SQL files).
- **Key Schema Milestones:**
  - `002_create_auth_tables.sql` — Base user & token storage
  - `016_create_password_reset_and_verification_tables.sql` — Password reset & email verification tokens
  - `017_create_rbac_tables.sql` — Base RBAC rules
  - `019_create_order_foundation.sql` $\rightarrow$ `021_order_foundation_hardening.sql` — Order foundation
  - `022_create_seat_maps.sql` & `027_create_seat_holds.sql` — Seat map & seat hold tables
  - `024_create_outbox.sql` — Transactional Outbox pattern table
  - `026_create_idempotency_keys.sql` — Idempotency storage table
  - `038_social_junction_tables.sql` — Initial social identity junction table
  - `060_soft_delete_columns.sql` — Soft delete audit columns

---

## 4. Git Tracked vs Ignored State

- **Ignored Patterns (.gitignore):**
  - `.env`, `.env.local`, `.env.production`
  - `node_modules/`, `.next/`, `dist/`, `build/`
  - `.idea/`, `.vscode/`, `.DS_Store`
  - APK/AAB build outputs in mobile directories (`.gradle/`, `app/build/`)
- **Tracked State:** Clean branch `staging`, all source files tracked without uncommitted secrets.

---

## 5. BASELINE FINDINGS & Contract Discrepancies

> **Note:** These findings document current codebase reality. No code edits are executed outside the plan.

1. **Non-Existent `/api/mobile` Route Mounts:** `server/src/app.js` mounts `/auth`, `/api/auth`, `/users`, `/events`, `/tickets`, `/organizer`, `/admin`, and `/api/web/*`. There are **no `/api/mobile/*` routes mounted in `app.js`**. Mobile apps call `/auth/*` and `/events/*` directly.
2. **Social Auth Route Naming:** `server/src/modules/auth/api/routes.js` defines `/google-login` and `/facebook-login` (NOT `/google` or `/facebook`).
3. **Web Token Transport Misalignment:** `web/src/services/apiClient.ts` currently stores tokens in `localStorage` (`localStorage.getItem('token')` / `localStorage.getItem('refreshToken')`). Phase 01 Task `01-T3` will migrate Web to host-only HttpOnly Secure SameSite cookies.
4. **Validation Library Standard:** `server/src/modules/auth/api/routes.js` strictly uses `express-validator` (`body('email').notEmpty().isEmail()`, `validateRequest`). Express controllers use `express-validator` across backend modules.
