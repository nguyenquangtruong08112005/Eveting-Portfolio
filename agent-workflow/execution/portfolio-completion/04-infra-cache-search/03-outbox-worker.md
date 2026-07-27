# Task 04-T3: Outbox Worker & Dead Letter Queue

## Status
Completed (verified)

## Verification Evidence
- **Migration 064** (`outbox_dlq` + non-destructive indexes) applied locally.
- **Phase 04 outbox smoke**: 61 checks passed, 0 failures.
- **Retention cron**: `30 2 * * *` (02:30 Asia/Ho_Chi_Minh) started at server boot; completed outbox rows retained 7 days (configurable via `RETENTION_OUTBOX_DAYS`); batch delete 500 rows per iteration (configurable via `RETENTION_BATCH`).
- **Timestamp type**: Outbox and idempotency columns use `TIMESTAMPTZ`; JS passes direct `new Date()` values.

## Residual Risk
The legacy `outbox` table uses a composite primary key `(id, created_at)`, while UUID IDs are assumed globally unique. This composite PK is a vestige of an earlier design that did not rely on UUID uniqueness alone. Deferred schema hardening (e.g., promoting `id` to sole PK with a unique constraint on a natural key, or adding a formal `REFERENCES` chain) requires explicit later approval and is **not** part of this phase.

## Deliverables

### 1. Outbox Publisher Worker (`server/src/jobs/outbox-publisher.js`)
- **Polling**: 2-second interval via `setTimeout` recursion (configurable via `OUTBOX_POLL_INTERVAL_MS`)
- **Batch size**: 50 rows per claim (configurable via `OUTBOX_BATCH_SIZE`)
- **SKIP LOCKED**: Uses `FOR UPDATE SKIP LOCKED` inside a subquery to claim rows transactionally
- **Exponential backoff enforced in-SQL**: `updated_at + LEAST((1000 * POWER(2, retry_count - 1)), 30000) <= now` prevents early retry
- **Stale processing recovery**: Reclaims rows stuck in `processing` status for >30s
- **Max 5 attempts**: After 5 failures, row is moved to durable DLQ (`outbox_dlq`) and original outbox marked `failed`
- **--once mode**: Single run via `node src/jobs/outbox-publisher.js --once`
- **Feature flag**: `OUTBOX_WORKER_ENABLED=false` disables polling
- **TIMESTAMPTZ**: All timestamp columns use `TIMESTAMPTZ` (post-migration 043); JS code passes direct `new Date()` values

### 2. Dead Letter Queue (`server/db/migrations/064_outbox_dlq_retry.sql`)
- New table `outbox_dlq` with infinite retention (not pruned by retention jobs)
- Schema: `id`, `outbox_id`, `event_type`, `payload`, `status`, `retry_count`, `error_message`, `failed_at`, `created_at`, `updated_at`
- Indexes on `status` and `failed_at`
- After max retries, row is copied to DLQ and original outbox marked `failed`

### 3. Manual Retry CLI (`server/scripts/maintenance/retry-dlq.js`)
```
node scripts/maintenance/retry-dlq.js list                          # List DLQ entries
node scripts/maintenance/retry-dlq.js show <dlq_id>                 # Show details
node scripts/maintenance/retry-dlq.js retry <dlq_id>                # Retry one entry
node scripts/maintenance/retry-dlq.js retry-all [--limit 50]        # Retry all pending
node scripts/maintenance/retry-dlq.js delete <dlq_id>               # Delete one entry
node scripts/maintenance/retry-dlq.js delete-all                    # Delete all entries
node scripts/maintenance/retry-dlq.js <cmd> --dry-run               # Dry-run mode
```

### 4. Retention Job (`server/src/jobs/retention.job.js`)
- Schedule: `30 2 * * *` (02:30) in `Asia/Ho_Chi_Minh` timezone
- Retention: 7 days for completed outbox rows (configurable via `RETENTION_OUTBOX_DAYS`)
- Batch delete: 500 rows per iteration (configurable via `RETENTION_BATCH`)
- Idempotency key cleanup also included
- Uses `new Date()` cutoff for TIMESTAMPTZ comparisons

### 5. Server Integration (`server/src/server.js`)
- Publisher `startPolling` integrated into server startup when `OUTBOX_WORKER_ENABLED=true`
- Legacy `startCronJob` from outbox-processor runs only when `OUTBOX_WORKER_ENABLED=false`
- Prevents legacy processor double processing
- Retention cron `startRetentionCron` started on server boot at 02:30 Asia/Ho_Chi_Minh

### 6. Legacy Processor (`server/src/shared/events/outbox-processor.js`)
- Uses parameterized `new Date()` values for TIMESTAMPTZ columns
- `OUTBOX_WORKER_ENABLED` guard returns empty rows when publisher is active

### 7. Non-destructive Indexes (`server/db/migrations/064_outbox_dlq_retry.sql`)
- `idx_outbox_pending_failed` — partial index on `outbox(status)` WHERE `status IN ('pending', 'failed')`
- `idx_outbox_created_at` — index on `outbox(created_at)` for efficient retention queries
- Existing indexes are preserved

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `OUTBOX_WORKER_ENABLED` | `true` | Enable/disable polling |
| `OUTBOX_POLL_INTERVAL_MS` | `2000` | Poll interval in ms |
| `OUTBOX_BATCH_SIZE` | `50` | Rows per claim |
| `OUTBOX_MAX_RETRIES` | `5` | Max retry attempts |
| `RETENTION_DRY_RUN` | `true` | Dry-run mode for retention |
| `RETENTION_OUTBOX_DAYS` | `7` | Retention period in days |
| `RETENTION_BATCH` | `500` | Batch size for deletion |
| `RETENTION_CRON` | `30 2 * * *` | Cron expression |
| `DLQ_RETRY_MAX` | `50` | Max DLQ retry batch |

## Smoke Test
```
node scripts/smoke/phase04-outbox.smoke.js    # Complete outbox reliability suite (publish, retry, DLQ, requeue, concurrency)
node scripts/smoke/smoke.cache-namespace.js    # Cache namespace helpers
```
