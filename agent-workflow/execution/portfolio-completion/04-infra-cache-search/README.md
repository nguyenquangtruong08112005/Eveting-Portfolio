# Phase 04: Infrastructure, Caching & Search Engine Optimization

## Overview
Phase 04 verifies and optimizes background infrastructure components: Transactional Outbox pattern worker for reliable search index updates, automated Elasticsearch re-indexing workers, Redis caching strategies, distributed rate limiting, and idempotency key persistence.

## Deliverables
- Transactional Outbox pattern worker (`server/src/jobs/outbox-publisher.js`) guaranteeing eventual consistency between PostgreSQL and Elasticsearch, with DLQ and manual retry CLI.
- Redis multi-tier caching module (`server/src/shared/cache/cache-provider.js` and `namespace-helpers.js`) with gzip64 compression, SCAN-based invalidation, and MemoryCache fallback.
- Verified Elasticsearch re-index worker and cache namespace hooks on event/ticket mutations.
- Verified Redis storage driver fallback for rate limiter and idempotency engine.

## Tasks
1. [`01-elasticsearch-outbox-reindex.md`](01-elasticsearch-outbox-reindex.md) — Outbox Pattern Verification & Elasticsearch Auto-Reindexing
2. [`02-redis-cache-limiter.md`](02-redis-cache-limiter.md) — Redis Caching, Rate Limiter & Idempotency Storage Setup
3. [`03-outbox-worker.md`](03-outbox-worker.md) — Outbox Worker & Dead Letter Queue (`04-T3`)
4. [`04-cache-namespace.md`](04-cache-namespace.md) — Cache Namespace Helpers (`04-T4`)

## Authoritative Smoke Tests
- **Outbox**: `npm run db:smoke:phase04-outbox` (or `node server/scripts/smoke/phase04-outbox.smoke.js`) — **61 checks, 0 failures**
- **Cache Namespace**: `npm run db:smoke:cache-namespace` (or `node server/scripts/smoke/smoke.cache-namespace.js`) — **passed (normal Redis + forced fallback)**

## Verified Evidence Summary
- Migration `064_outbox_dlq_retry` applied locally; non-destructive partial indexes created.
- Outbox/idempotency timestamp columns confirmed `TIMESTAMPTZ`.
- Retention cron `30 2 * * *` (02:30 Asia/Ho_Chi_Minh) registered at server boot; completed rows retained 7 days; batch size 500.
- No production deployment verification is claimed.

## Residual Risk
The legacy `outbox` table uses composite primary key `(id, created_at)`; UUID IDs are assumed globally unique. Deferred schema hardening requires explicit later approval.
