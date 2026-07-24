# Task 06-T2: Seat Hold TTL & Database Transactional Locking

## 1. Goal
Implement seat reservation holds backed by PostgreSQL database-level transactional locks (`SELECT ... FOR UPDATE`), atomic status updates, hold ownership + expiration verification, and database-level unique seat constraints.

## 2. Why
Ensures double-booking is physically impossible at the database layer while providing Redis advisory cache acceleration for UI seat queries.

## 3. Dependencies
- Task `06-T1` (Organizer Visual Seat Map Editor & Schema Engine).

## 4. Preconditions
- Seat and performance tables audited during Phase 00.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **PostgreSQL Database Ground Truth:** PostgreSQL row locking (`SELECT ... FOR UPDATE NOWAIT`) or atomic conditional update (`UPDATE performance_seats SET status = 'HELD' WHERE id = $1 AND status = 'AVAILABLE'`), database unique constraints, and transaction isolation are the **sole source of truth**.
  - **Redis Role:** Redis acts purely as an advisory cache / accelerator for fast seat map rendering; Redis is **never** the sole lock authority.
  - **Core System Invariant:** Total active holds (`HELD` with `expires_at > NOW()`) plus confirmed purchases (`SOLD`) for any seat MUST NEVER exceed 1.
  - Seat holds reserved for 10 minutes with explicit hold owner `user_id`.
  - Manual hold release API (`DELETE /events/:id/seats/hold`).
- **Out-of-Scope:**
  - Inventing migration numbers, Knex ORM calls, or redundant indexes prior to Phase 00 audit.

## 6. Likely Source Modules / Files
- `server/src/modules/seats/` — [Discovery Target: Seat hold transaction logic]
- `server/src/providers/cache/redis.js` — [Discovery Target: Redis seat status accelerator]

## 7. Contracts / Behavior to Preserve
- Standard error response when seat is already held: HTTP 409 Conflict with `{ error: "SEAT_ALREADY_RESERVED" }`.

## 8. Ordered Implementation Steps
1. Audit existing seat tables and indexes during Phase 00.
2. Build seat hold service executing inside database transaction with `FOR UPDATE NOWAIT` or atomic conditional UPDATE.
3. Update Redis cache key `seat:status:<performance_id>:<seat_id>` as advisory cache.
4. Implement manual hold release route clearing hold owner and setting status `AVAILABLE`.
5. Write unit tests verifying transaction rollback if any selected seat in a batch reservation fails lock acquisition.

## 9. Database / Migration Needs
- Database schema changes to be determined after Phase 00 schema audit.

## 10. Security Requirements
- Validate user session before granting seat hold.
- Maximum 10 seats per hold request to prevent reservation hogging.

## 11. Test / Build / Smoke Commands
- Test commands will be selected from `server/package.json` inventoried in Phase 00.

## 12. Acceptance Criteria
- [ ] Attempting to hold a seat already held by another user returns HTTP 409 Conflict.
- [ ] Database transaction rolls back completely if 1 out of 5 requested seats is unavailable.
- [ ] PostgreSQL database remains sole authority; stopping Redis does not compromise seat lock integrity.

## 13. Rollback / Feature-Flag Strategy
- Fallback to serializable database transactions if row-level locking encounters deadlock under specific driver configurations.

## 14. Required Artifacts / Handoff Report
- Seat hold transaction test execution report.

## 15. Blocker Questions
- Should seat hold duration be extended automatically when user enters checkout page?
