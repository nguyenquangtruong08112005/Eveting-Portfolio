# Phase P1.3-S4: Inventory Locking & Idempotent Booking

Date: 2026-06-12

## Scope

Prevent generic ticket inventory overselling under high concurrency by introducing row-level database locking and request idempotency key validation.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: OpenCode
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `6f399c09c9ce05342a781298c19b5fa155abce8a` (represented by short hash `6f399c0`) - `feat(backend): implement idempotent bookings, inventory row-locks, and seat hold schema foundation`

## Changed Files

- `Server-2025-Eventing/db/migrations/026_create_idempotency_keys.sql` [NEW]
- `Server-2025-Eventing/src/providers/database/idempotency.repository.js` [NEW]
- `Server-2025-Eventing/src/providers/database/postgres.idempotency.repository.js` [NEW]
- `Server-2025-Eventing/src/shared/middleware/idempotency.middleware.js` [NEW]
- `Server-2025-Eventing/src/modules/tickets/api/routes.js`
- `Server-2025-Eventing/scripts/smoke.idempotency.js` [NEW]
- `Server-2025-Eventing/scripts/smoke.concurrent-booking.js` [NEW]

## Behavior

- **Database Migration**: Added the `idempotency_keys` table to store response payloads against unique request fingerprints or keys.
- **Idempotency Middleware**: Integrated a middleware that checks for client-supplied headers or body parameters and falls back to a 5-second request fingerprint hash (combining user ID, route, and payload) to prevent duplicate bookings within a short time window.
- **Inventory Locking**: Implemented transactional row-level locking (`SELECT ... FOR UPDATE`) on the `events` table during the ticket booking flow to serialize quantity checks and decrements.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node scripts/smoke.idempotency.js
node scripts/smoke.concurrent-booking.js
npm run db:smoke:mobile-contracts
npm run ci:check
```

Results:
- `smoke.idempotency.js`: 12 pass, 0 fail.
- `smoke.concurrent-booking.js`: 15 pass, 0 fail.
- `db:smoke:mobile-contracts`: 17 pass, 0 fail.
- `ci:check`: pass.
