# Task 06-T3: Concurrency Race-Condition Testing & Auto-Release Worker

## 1. Goal
Implement high-concurrency race condition automated stress tests and deploy the background worker (`server/src/jobs/seat-release-worker.js`) to automatically release expired seat holds.

## 2. Why
Verifies system resilience under extreme flash-sale ticket buying traffic (hundreds of simultaneous buyers requesting the same seat), ensuring zero over-booking and automated inventory recovery.

## 3. Dependencies
- Task `06-T2` (Seat Hold TTL & Database Transactional Locking).

## 4. Preconditions
- Seat hold transaction APIs operational.
- Concurrency test tool (`autocannon` or custom Node.js `Promise.all` runner) available.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `seat-release-worker.js` polling `performance_seats` every 15 seconds where `status = 'HELD' AND hold_expires_at < NOW()`, marking status `AVAILABLE` and clearing Redis keys.
  - Automated release on payment cancellation or payment timeout (ZaloPay 15m expiration).
  - High-concurrency race condition test suite (`npm run test:concurrency:seats`) firing 100 parallel requests for the exact same seat.
  - Verification that exactly 1 request succeeds (HTTP 201) and 99 fail gracefully (HTTP 409 Conflict).
- **Out-of-Scope:**
  - Distributed multi-region database replication testing.

## 6. Likely Source Modules / Files
- `server/src/jobs/seat-release-worker.js` — [Discovery Target: Seat release worker process]
- `server/test/concurrency/seat-hold.concurrency.test.js` — [Discovery Target: Concurrency test suite]

## 7. Contracts / Behavior to Preserve
- Absolute invariant: Total booked/held seats for any performance MUST NEVER exceed physical capacity.

## 8. Ordered Implementation Steps
1. Build `seat-release-worker.js` with batch updating logic (`UPDATE performance_seats SET status = 'AVAILABLE', held_by_user_id = NULL WHERE status = 'HELD' AND hold_expires_at < NOW()`).
2. Implement Redis pub/sub or cache invalidation on batch release.
3. Write `seat-hold.concurrency.test.js` launching 100 concurrent HTTP requests via `Promise.all()` targeted at single seat ID.
4. Verify DB consistency: count of `HELD` or `SOLD` records for target seat code equals exactly 1.
5. Execute stress test and log results.

## 9. Database / Migration Needs
- Index on `performance_seats(status, hold_expires_at)` where `status = 'HELD'`.

## 10. Security Requirements
- Ensure release worker uses isolated database connection pool to avoid starving main web app pool during flash sales.

## 11. Test / Build / Smoke Commands
- `node server/src/jobs/seat-release-worker.js --once`
- `npm run test:concurrency:seats`

## 12. Acceptance Criteria
- [ ] Concurrency test with 100 parallel requests results in exactly 1 successful reservation and 99 clean 409 rejections.
- [ ] Zero duplicate tickets generated for same seat.
- [ ] Expired seat holds (>10m) automatically released by worker within 30 seconds.

## 13. Rollback / Feature-Flag Strategy
- Disable worker polling loop via `SEAT_RELEASE_WORKER_ENABLED=false` if database lock contention occurs during maintenance.

## 14. Required Artifacts / Handoff Report
- Concurrency stress test execution report detailing throughput, latency, and 100% reservation accuracy.

## 15. Blocker Questions
- Should the seat release worker notify connected WebSocket client sessions when seats are returned to the available pool?
