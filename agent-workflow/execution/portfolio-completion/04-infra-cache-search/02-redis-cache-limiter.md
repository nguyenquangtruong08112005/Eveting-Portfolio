# Task 04-T2: Redis Caching, Rate Limiter & Idempotency Storage Setup

## 1. Goal
Implement unified Redis client wrapper supporting multi-namespace caching, distributed lock primitives, sliding-window rate limiting, and idempotency key persistence.

## 2. Why
Provides high-performance sub-millisecond response caching for public event catalog routes while serving as the fast storage backend for security rate limiters and concurrency controls.

## 3. Dependencies
- Task `04-T1` (Outbox Pattern Verification & Elasticsearch Auto-Reindexing).

## 4. Preconditions
- Redis 7+ container running and accessible via `REDIS_URL`.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `RedisClientService` in `server/src/providers/cache/redis.js` supporting auto-reconnection and sentinel/standalone modes.
  - Cache helper methods (`get`, `set`, `del`, `delByPattern`).
  - Cache namespaces: `cache:events:`, `cache:venues:`, `cache:categories:`, `cache:seatmaps:`.
  - Cache invalidation on event update / ticket purchase.
  - TTL policy: Events (5m), Categories (1h), Venues (1h), Seat Availability (10s).
- **Out-of-Scope:**
  - Redis Cluster sharding (standalone Redis sufficient for current architecture).

## 6. Likely Source Modules / Files
- `server/src/providers/cache/redis.js` — [Discovery Target: Redis client provider]
- `server/src/modules/events/` — [Discovery Target: Event catalog controller caching]

## 7. Contracts / Behavior to Preserve
- Fallback behavior: If Redis is unreachable, queries pass directly to PostgreSQL database without crashing Express server (`cacheMiss` fallback).

## 8. Ordered Implementation Steps
1. Create `RedisClientService` using `ioredis` library with connection pooling and error logging.
2. Implement cache wrapper decorator/middleware for public catalog endpoints (`GET /events`, `GET /events/:id`, `GET /categories`).
3. Add cache invalidation triggers inside `EventService.updateEvent()` and `OrderService.createOrder()`.
4. Implement atomic Lua script execution for sliding-window rate limiting.
5. Write unit tests for cache hits, misses, TTL expiration, and graceful Redis connection failure fallback.

## 9. Database / Migration Needs
- None (In-memory storage).

## 10. Security Requirements
- Redis authentication password enabled via `REDIS_PASSWORD`.
- Isolated key namespaces preventing key collisons across modules.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `node server/scripts/smoke/smoke.redis-connection.js`

## 12. Acceptance Criteria
- [x] Cache smoke suite passed — normal Redis and forced in-process MemoryCache fallback both verified by cache-smoke evidence.
- [x] Cache invalidation hooks fire on event/ticket mutations (verified by smoke).

## 13. Rollback / Feature-Flag Strategy
- Disable cache layer globally via `CACHE_ENABLED=false` environment flag.

## 14. Required Artifacts / Handoff Report
- Cache benchmark latency report and Redis health verification log.

## 15. Blocker Questions
- Should response compression (gzip/brotli) be applied before storing large JSON strings in Redis?
