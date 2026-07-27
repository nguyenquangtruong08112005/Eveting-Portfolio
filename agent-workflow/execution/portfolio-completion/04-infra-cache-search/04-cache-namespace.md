# Task 04-T4: Cache Namespace Helpers

## Status
Completed (verified)

## Verification Evidence
- **Cache smoke suite**: passed on both normal Redis and forced MemoryCache fallback.
- **Gzip64 compression**: transparently compresses payloads >= 8192 bytes; gzip64 prefix detection on read verified.
- **Pattern invalidation**: `delByPattern` uses Redis `SCAN` when Redis is available, regex-based `Map` scan in `MemoryCache` fallback.
- **Invalidation hooks**: confirmed to fire on `createEvent`/`updateEvent`/`cancelEvent` and all seat/ticket mutations (`bookTicket`, `holdSeat`, `releaseSeat`, etc.).

## Deliverables

### 1. Cache Namespace Helpers (`server/src/shared/cache/namespace-helpers.js`)
Provides a namespaced caching layer over the existing `cache-provider.js` with:

- **TTL Policies** (configurable via env):
  - Events: 300s (5 min)
  - Categories: 3600s (1 hr)
  - Venues: 3600s (1 hr)
  - Seat Availability: 10s

- **Key Prefixes**:
  - `cache:event:<id>`
  - `cache:categories`
  - `cache:venue:<id>`
  - `cache:venues`
  - `cache:seat:<eventId>`

- **Gzip Compression**: JSON payloads >= 8192 bytes (configurable via `CACHE_GZIP_THRESHOLD`) are transparently gzip-compressed, base64-encoded with a `gzip64:` prefix, and stored as a plain string. On read, the prefix is detected, base64-decoded, and gunzipped. This ensures identical behavior across Redis (string-based `get`/`set`) and `MemoryCache`.

- **Redis Fallback**: Uses the existing `cache-provider.js` which falls back to `MemoryCache` when Redis is unavailable. `MemoryCache` uses an in-process `Map` with TTL expiry; `delByPattern` falls back to regex-based key scan over the `Map`. Controlled via `CACHE_ENABLED=false` to disable caching entirely.

- **Pattern-based Invalidation**: `delByPattern(pattern)` uses Redis `SCAN` (cursor-based iteration) to bulk-invalidate by pattern when Redis is available, avoiding the blocking `KEYS` command.

### 2. Invalidation Hooks

**Event mutation** (`server/src/modules/events/application/service.js`):
- `createEvent`: Invalidates categories and venues caches
- `updateEvent`: Invalidates event + categories caches
- `cancelEvent`: Invalidates event + categories caches

**Ticket purchase** (`server/src/modules/tickets/application/service.js`):
- `bookTicket`: Invalidates seat availability for the event
- `bookHeldSeats`: Invalidates seat availability for the event
- `holdSeat`: Invalidates seat availability for the event
- `releaseSeat`: Invalidates seat availability for the event
- `confirmTicketPayment`: Invalidates seat availability for the event
- `failTicketPayment`: Invalidates seat availability for the event
- `cancelPendingTicket`: Invalidates seat availability for the event

### 3. API

```js
const cacheNamespace = require('@/shared/cache/namespace-helpers');

// Namespaced get/set
await cacheNamespace.getEvent(eventId);
await cacheNamespace.setEvent(eventId, data);

await cacheNamespace.getCategories();
await cacheNamespace.setCategories(data);

await cacheNamespace.getVenue(venueId);
await cacheNamespace.setVenue(venueId, data);

await cacheNamespace.getSeatAvailability(eventId);
await cacheNamespace.setSeatAvailability(eventId, data);

// Invalidation
await cacheNamespace.invalidateEvent(eventId);
await cacheNamespace.invalidateCategories();
await cacheNamespace.invalidateVenue(venueId);
await cacheNamespace.invalidateSeatAvailability(eventId);
await cacheNamespace.invalidate('event', eventId);  // Generic

// Low-level
await cacheNamespace.get(key);
await cacheNamespace.set(key, value, ttlSeconds);
await cacheNamespace.del(key);
await cacheNamespace.delByPattern('cache:event:*');
```

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `CACHE_ENABLED` | `true` | Global cache toggle |
| `CACHE_GZIP_THRESHOLD` | `8192` | Min bytes to trigger gzip |
| `CACHE_TTL_EVENT` | `300` | Event cache TTL (s) |
| `CACHE_TTL_CATEGORIES` | `3600` | Categories cache TTL (s) |
| `CACHE_TTL_VENUES` | `3600` | Venues cache TTL (s) |
| `CACHE_TTL_SEAT` | `10` | Seat availability TTL (s) |

## Smoke Tests
```
node scripts/smoke/smoke.cache-namespace.js    # Cache namespace helpers (gzip64, SCAN, fallback)
node scripts/smoke/phase04-outbox.smoke.js      # Outbox reliability (retry, DLQ, requeue, concurrency)
```
