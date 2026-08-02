# Phase 06: Seat-Map Engine & High-Concurrency Locking

## Overview
Phase 06 delivers the technical seat-map engine: multi-performance support, section/row/seat layout definitions, temporary seat holds with TTL expiration, PostgreSQL database-level unique constraints and transaction locking, Redis acceleration, race-condition tests, and an automated payment expiry hold release worker.

Product acceptance is deliberately separate from technical completion. The current generic grid is not acceptable as a default customer-facing map for every event. Task 04 records the required product decision before the feature is exposed again.

## Deliverables
- Visual seat map layout schema engine (JSON grid layout parser).
- Seat hold reservation endpoint (`POST /events/:id/seats/hold`) with 10-minute TTL.
- Database transaction locking (`SELECT ... FOR UPDATE`) & UNIQUE constraint (`performance_id`, `seat_id`).
- Automated background worker releasing expired seat holds.
- Concurrency test suite simulating high parallel seat reservation contention.

## Tasks
1. [`01-seatmap-schema-editor.md`](01-seatmap-schema-editor.md) — Organizer Visual Seat Map Editor & Schema Engine
2. [`02-seat-hold-ttl-transactions.md`](02-seat-hold-ttl-transactions.md) — Seat Hold TTL & Database Transactional Locking
3. [`03-concurrency-race-tests.md`](03-concurrency-race-tests.md) — Concurrency Race-Condition Testing & Auto-Release Worker
4. [`04-seatmap-product-acceptance.md`](04-seatmap-product-acceptance.md) — Product Gate: organizer-authored layout or feature concealment

## Verification Evidence (2026-07-28)

### Smoke Tests
| Test | Result |
|---|---|
| smoke.phase06-seats.js | PASS 10/0 |
| smoke.phase06-seat-concurrency.js (100-way) | PASS 5/0 — 1 success / 99 conflicts / 834ms / 120 req/s |
| smoke.migration-bank-accounts.js | PASS 15/0 |

### Invariants Verified
- [x] Mixed ticket types produce one order and one payment attempt
- [x] Seats remain HELD before successful payment and become SOLD only after payment success
- [x] No public endpoint can directly transition a seat to SOLD
- [x] Only one promotion/voucher can apply
- [x] Custom attendee answers persist against stable question IDs
- [x] Private events do not leak to public browse/search/indexing
- [x] Organizer team RBAC, re-KYC, analytics, and duplicate QR check-in work
- [x] Malformed QR preserves legacy 400 DTO: { "valid": false, "error": "INVALID_TICKET" }

### Server Checks
- [x] Migrations 001-079: all OK from clean, all SKIP on re-run
- [x] Syntax check: 96 JS files, all pass
- [x] SQL parameter audit: 137 queries, 0 unsafe interpolations
- [x] No conflict markers in server directory
- [x] No whitespace errors

### Web Checks
- [x] test:unit — all 6 test suites pass
- [x] lint — 0 errors, 6 warnings (pre-existing)
- [x] build (next build) — compiled + TS check passed
- [x] Order checkout smoke passed
- [x] Aggregate payment smoke passed
- [x] Commerce concurrency smoke passed
- [x] Mobile contracts smoke: 16 PASS / 0 FAIL

### Residual Risks
- Rate limiter interferes with 100-way concurrency test; SKIP_RATE_LIMIT=true bypass required
- Seat hold TTL (10 min) uses server-side worker; no Redis-based TTL for fallback
- Bank account encryption uses AES-256-GCM; key rotation is manual
