# Task 04-T1: Outbox Pattern Verification & Elasticsearch Auto-Reindexing

## 1. Goal
Implement and verify the Transactional Outbox pattern worker ensuring all event database mutations (`INSERT`, `UPDATE`, `DELETE`) are published asynchronously to Elasticsearch without loss.

## 2. Why
Decouples database transaction commit from search engine indexing, guaranteeing search freshness without blocking HTTP request execution.

## 3. Dependencies
- Phase 03 (Deterministic Realistic Data Seeding).

## 4. Preconditions
- `outbox_events` PostgreSQL table present.
- Elasticsearch service responsive.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `OutboxService` inserting change events into `outbox_events` inside database transactions.
  - `outbox-publisher.js` background worker polling `outbox_events` (or listening via PostgreSQL `LISTEN/NOTIFY`), processing unhandled events, indexing to Elasticsearch, and marking `processed_at = NOW()`.
  - Automatic retry with exponential backoff for failed index attempts (up to 5 retries).
  - Dead Letter Queue (DLQ) table for unprocessable outbox messages.
- **Out-of-Scope:**
  - Apache Kafka deployment (overkill for current monorepo portfolio scale).

## 6. Likely Source Modules / Files
- `server/src/jobs/outbox-publisher.js` — [Discovery Target: Outbox worker process]
- `server/src/providers/search/elasticsearch.js` — [Discovery Target: Elasticsearch client wrapper]
- `server/db/migrations/` — [Discovery Target: Outbox table schema]

## 7. Contracts / Behavior to Preserve
- Event payload schema: `{ event_id, event_type, aggregate_type, payload, created_at }`.

## 8. Ordered Implementation Steps
1. Verify `outbox_events` table contains `id`, `aggregate_type`, `aggregate_id`, `event_type`, `payload`, `status`, `retry_count`, `processed_at`, `created_at`.
2. Update event creation/update handlers to write outbox record in same DB transaction.
3. Build `outbox-publisher.js` worker with 2-second polling loop and batch size 50.
4. Implement error handling and dead letter queue marking on max retries.
5. Write unit tests for outbox worker batch processing and failure recovery.

## 9. Database / Migration Needs
- Index on `outbox_events(status, created_at)` where `status = 'PENDING'`.

## 10. Security Requirements
- Sanitization of payload data sent to search index (excluding private organizer notes).

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `node server/src/jobs/outbox-publisher.js --once`

## 12. Acceptance Criteria
- [ ] Creating an event via API automatically inserts row in `outbox_events`.
- [ ] Outbox worker processes row within 2 seconds and updates Elasticsearch index.
- [ ] Outbox worker gracefully retries on temporary Elasticsearch connectivity failure.

## 13. Rollback / Feature-Flag Strategy
- Disable worker polling via `OUTBOX_WORKER_ENABLED=false` and run manual sync script if worker encounters fatal loop.

## 14. Required Artifacts / Handoff Report
- Outbox worker processing log and test verification suite.

## 15. Blocker Questions
- Should outbox records be pruned after 7 days via a retention cron job?
