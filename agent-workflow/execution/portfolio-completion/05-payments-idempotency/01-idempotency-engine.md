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

## 6. Likely Source Modules / Files
- `server/src/middleware/idempotency.js` — [Discovery Target: Idempotency middleware]
- `server/src/providers/idempotency/` — [Discovery Target: PostgreSQL idempotency storage service]

## 7. Contracts / Behavior to Preserve
- `Idempotency-Key: <UUIDv4>` header structure.

## 8. Ordered Implementation Steps
1. Create PostgreSQL migration for `idempotency_keys` table (`id`, `key`, `user_id`, `endpoint`, `request_hash`, `status`, `response_code`, `response_body`, `created_at`, `expires_at`).
2. Build `PostgresIdempotencyService` handling `acquireLock()`, `saveResponse()`, and `getExisting()`.
3. Implement `idempotencyMiddleware()` capturing Express response and saving to database.
4. Attach middleware to order, payment, seat confirmation, refund, and payout routes.
5. Write unit and integration tests verifying identical replay, payload mismatch rejection (422), and concurrent lock contention (409).

## 9. Database / Migration Needs
- PostgreSQL migration creating `idempotency_keys` table with unique index on `(key, user_id, endpoint)`.

## 10. Security Requirements
- Request payload hash includes `user_id` to prevent cross-user key collision attacks.
- Sanitize sensitive values before storing response payload in database.

## 11. Test / Build / Smoke Commands
- Test commands will be selected from `server/package.json` inventoried in Phase 00.

## 12. Acceptance Criteria
- [ ] PostgreSQL `idempotency_keys` table acts as the sole durable source of truth.
- [ ] Retrying `POST /orders` with identical key and body returns cached HTTP 201 response.
- [ ] Retrying `POST /orders` with same key but modified body returns HTTP 422 Unprocessable Entity.
- [ ] Concurrent requests with same key return HTTP 409 Conflict.

## 13. Rollback / Feature-Flag Strategy
- Disable idempotency enforcement via `IDEMPOTENCY_ENFORCE=false` flag if client key errors occur.

## 14. Required Artifacts / Handoff Report
- Idempotency test suite execution log and payload mismatch verification report.

## 15. Blocker Questions
- Should anonymous checkout sessions generate synthetic client fingerprints to serve as the user component of the payload hash?
