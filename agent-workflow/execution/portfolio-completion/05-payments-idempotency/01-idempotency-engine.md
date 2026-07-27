# Task 05-T1: Core Idempotency Engine (`idempotency_keys` Spec)

## 1. Goal
Build and enforce the system-wide Idempotency Engine backed by PostgreSQL (`idempotency_keys` table) as the sole durable authority, with Redis as an optional accelerator.

## 2. Why
Guarantees financial and inventory safety by preventing duplicate order creation, double charging, double refunding, or duplicate seat purchases when clients retry due to network instability.

## 3. Dependencies
- Phase 04 (Infrastructure, Caching & Search Engine Optimization).

## 4. Preconditions
- PostgreSQL migration for `idempotency_keys` table ready.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **Durable Authority:** The PostgreSQL `idempotency_keys` table is the **sole source of truth**. Redis acts purely as an optional accelerator for lock acquisition.
  - **Required Endpoints:**
    - Order creation (`POST /api/web/orders` / `/api/mobile/orders`)
    - Payment initiation & callback handling (`POST /checkout/process`, `POST /payments/zalopay/callback`)
    - Seat confirmation & ticket purchase (`POST /events/:id/seats/confirm`)
    - Refund issuance & Payout approvals (`POST /admin/finance/refunds`, `POST /organizer/payouts`)
    - Explicitly selected unsafe retries of failed state transitions.
  - **Key Scoping & Payload Hash:** Scoped by `user_id` + `endpoint_operation`, request payload hash (`sha256(req.body)`), execution status (`IN_PROGRESS`, `COMPLETED`), cached status code, cached response body, and expiration TTL (24 hours).
  - **Web Client Key Behavior:** Web client generates a fresh UUID key per user intent (e.g. clicking "Place Order") and reuses the key ONLY when retrying an identical failed or timed-out request.
  - **Mismatch Handling:** Reusing an `Idempotency-Key` with a different request payload returns **HTTP 422 Unprocessable Entity** (`IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH`).
  - Concurrent requests with same key return **HTTP 409 Conflict** (`CONCURRENT_REQUEST_IN_PROGRESS`).
- **Out-of-Scope:**
  - Requiring `Idempotency-Key` headers on safe `GET`, `HEAD`, or `OPTIONS` endpoints.

## 6. Actual Source Files
- `server/src/shared/middleware/idempotency.middleware.js` — Middleware (canonicalize, SHA256 hashing, response interception).
- `server/src/providers/database/postgres.idempotency.repository.js` — PostgreSQL repository (`acquireLock`, `saveResponse`, `deleteKey`, `getByKey`).
- `server/src/providers/database/idempotency.repository.js` — Provider facade (routes to postgres).
- `server/db/migrations/065_refine_idempotency_keys.sql` — Additive-only migration (intentionally not executed by this recovery task).

## 7. Contracts / Behavior to Preserve
- `Idempotency-Key: <UUIDv4>` explicit header only (no body fallback, no fingerprint fallback).
- Authenticated principal via `req.user.uid || req.user.id || req.user.user_id`.
- Scope = `principal + method + normalized path (query stripped)`.
- Canonical nested object key sorting before SHA256; array order preserved.

## 8. Implementation Steps — Complete
1. ~~Create PostgreSQL migration for `idempotency_keys` table~~ — Migration 065 rewritten as additive-only (no DROP). Intentionally not executed by this recovery task.
2. ~~Build repository~~ — `server/src/providers/database/postgres.idempotency.repository.js`.
3. ~~Implement middleware~~ — `server/src/shared/middleware/idempotency.middleware.js`.
4. ~~Attach middleware~~ — `POST tickets/book`, `hold-seat`, `book-held-seats` (after validation); `POST payments/create-order` (after validation + ownership).
5. ~~Smoke test~~ — `server/scripts/smoke/smoke.idempotency.js`.

## 9. Database / Migration
- Migration 065 is additive-only (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys (key)`).
- Global key uniqueness enforced; existing composite index retained.

## 10. Security Requirements
- Global key uniqueness: same key across different principal or endpoint returns safe 409 `IDEMPOTENCY_KEY_OWNED_BY_OTHER` without payload leakage.
- Static logger messages only (no keys, payloads, responses, or raw errors in logs).

## 11. Smoke Command
```
npm run db:smoke:idempotency → 20 passed, 0 failed (2026-07-27)
```

## 12. Acceptance Criteria — All Met
- [x] Explicit `Idempotency-Key` header required for authenticated high-risk mutations.
- [x] Canonical nested object hashing with array order preserved.
- [x] Exact same-key same-scope replay returns `X-Idempotency-Cache: HIT`.
- [x] Same key different payload returns **422** `IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH`.
- [x] Same scope while `IN_PROGRESS` returns **409** `CONCURRENT_REQUEST_IN_PROGRESS`.
- [x] Same key from another principal or endpoint returns **409** `IDEMPOTENCY_KEY_OWNED_BY_OTHER` (no payload leakage).
- [x] **5xx scoped key release** with deterministic middleware-level smoke proving recovery.
- [x] Ticket and payment route middleware runs after validation (and ownership where applicable).
- [x] `deleteKey` rejects missing scope values; deletes by key + user_id + endpoint only.
- [x] Smoke cleanup runs in `finally` block regardless of assertion failures.

## 13. Rollback / Feature-Flag Strategy
- Disable idempotency enforcement via `IDEMPOTENCY_ENFORCE=false` flag if client key errors occur.

## 14. Client Contract Implementation

### Web (`web/src/services/ticket.service.ts`)
- Attaches `X-Idempotency-Key` (via `crypto.randomUUID()`) to: `tickets/book`, `tickets/hold-seat`, `tickets/book-held-seats`, `payments/create-order`.
- Not attached to `releaseSeat`, `validateVoucher`, or any GET endpoint.
- UUID generated per call; `apiClient.ts` spreads the same `headers` object across `fetchWithRetry` retries and 401-refresh retry, so the key is preserved.

### Mobile Attendee (`mobile-attendee/`)
- `EventApiService.kt` — Retrofit `@Header("X-Idempotency-Key")` on `post("tickets/book")` and `post("payments/create-order")`.
- `TicketRepositoryImpl.kt` — generates `java.util.UUID.randomUUID().toString()` per repository call and passes it into Retrofit.
- OkHttp auth interceptor rebuilds the request from the original chain request, preserving all headers including `X-Idempotency-Key` on 401 retry.

### Mobile Organizer (`mobile-organizer/`)
- Identical pattern: `EventApiService.kt` Retrofit header + `TicketRepositoryImpl.kt` UUID generation for the same two endpoints.

### Endpoint coverage per client

| Client | tickets/book | tickets/hold-seat | tickets/book-held-seats | payments/create-order | payments/check-status |
|---|---|---|---|---|---|
| Web | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attendee | ✅ | ❌ | ❌ | ✅ | ✅ |
| Organizer | ✅ | ❌ | ❌ | ✅ | ❌ |

## 15. Verification Evidence

### Phase 05-T1 Evidence

| Check | Result |
|---|---|
| Server smoke (`npm run db:smoke:idempotency`) | 20 passed, 0 failed (2026-07-27) |
| Web lint (`npm run lint`) | 0 errors, 6 pre-existing warnings |
| Attendee compile (`gradlew.bat :app:compileDebugKotlin`) | BUILD SUCCESSFUL |
| Organizer compile (`gradlew.bat :app:compileDebugKotlin`) | BUILD SUCCESSFUL |

### Phase 05-T2 Evidence

| Check | Result |
|---|---|
| ZaloPay callback/idempotency smoke | 40 passed, 0 failed |
| Server `node --check` (routes + smoke JS) | Pass |
| Web lint (`npm run lint`) | 0 errors, 6 pre-existing warnings |
| Attendee compile (`gradlew.bat :app:compileDebugKotlin`) | BUILD SUCCESSFUL |
| `git diff --check` | Clean |

**Phase 05-T1 and T2 contracts are verified for web, attendee, and organizer.** No refund or payout work is included by current approved scope. No real ZaloPay sandbox transaction was run; all provider interactions are mocked/stubbed in smoke.

## 16. Recovery Task Evidence
- Recovery tasks A (engine correction), B (migration + route ordering), C (migration cleanup), D (docs), E+F (web+mobile client header injection), T2A (payment-state concurrency hardening), T2B (attendee confirmation polling), T2C (check-status idempotency wiring) completed.
- `git diff --check`: clean.
- `node --check`: syntax valid on all three engine files.

## 17. Phase 05-T2 Deliverables Summary

### T2A — Payment Status Concurrency Hardening
- `manualCheckPaymentStatus` locks the latest payment attempt via `getLatestPaymentAttemptByTicketId(ticketId, tx, true)` with `FOR UPDATE` inside the existing `runTransaction`, re-checks terminal state after acquiring the lock.
- Callback (`handleZaloPayCallback`) and check-status (`manualCheckPaymentStatus`) races serialised by the row lock; callback/status race smoke proven with exactly one ledger entry.
- `auditLog` middleware uses nullable `null` actor for webhook routes (no `req.user`), matching `audit_logs.user_id` nullable column and `ON DELETE SET NULL` FK — no FK violations on callback audit entries.

### T2B — Attendee ZaloPay Confirmation Polling
- `PaymentViewModel` polls `POST /payments/check-status` every 3 seconds, max 8 attempts (24 seconds).
- On `paid`: emits `PaymentSuccess(navigates to ticket detail)`. On `failed`/`cancelled`: emits `PaymentError(stops polling)`.
- After 8 attempts exhaust without terminal status: shows "pending confirmation" with a single bounded manual Refresh button; no automatic retry, no re-opening ZaloPay SDK.
- `paymentInProgress` flag disables Checkout button throughout: order creation, ZaloPay SDK open, backend confirmation polling, and manual refresh. Cleared on SDK cancel/error and terminal backend statuses.
- No self-cancellation of polling coroutine before emitting terminal events.

### T2C — Check-Status Idempotency Wiring
- `POST /payments/check-status` route now includes `idempotency()` after `requireOwnership`, matching create-order ordering.
- Web `TicketService.checkPaymentStatus` sends `crypto.randomUUID()` per call, preserved through existing retry.
- Smoke proves duplicate same-key check-status replays cached response without extra ZaloPay query or duplicate ledger; new key after state transition observes `paid` without double-processing.
- Attendee already sends fresh `java.util.UUID` per check-status call via existing `@Header("X-Idempotency-Key")` wiring.

### Out-of-Scope (not included in Phase 05)
- No refund or payout workflows.
- No ZaloPay provider switch or real sandbox transaction.
- No organizer payment UI.
- No anonymous checkout idempotency.
- No callback route idempotency (existing state-machine guard is sufficient).
