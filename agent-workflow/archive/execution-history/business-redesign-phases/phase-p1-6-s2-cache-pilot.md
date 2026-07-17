# Phase P1.6-S2: Cache Pilot

Date: 2026-06-12

## Scope

Integrate caching on event details endpoint to boost performance. Add domain event hook in the outbox to actively invalidate cached event entries when updates occur.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: OpenCode
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `66f696beb67fca7ce7313a840d89ba4f81621462` (represented by short hash `66f696b`) - `feat: implement redis cache integration and elasticsearch outbox decoupling`

## Changed Files

- `Server-2025-Eventing/src/modules/events/application/service.js`
- `Server-2025-Eventing/src/shared/events/outbox-processor.js`

## Behavior

- **Event Detail Cache**: Refactored `getEventById` in `service.js` to look up key `cache:event:${eventId}` first. On a cache hit, returns the parsed view. On a cache miss, fetches from repository and caches the result with a 1-hour TTL.
- **Cache Invalidation**: Hooked into the outbox processor's `search_index` handler. Any event update/deletion event publishes to the outbox automatically triggers a `cacheProvider.del` call to invalidate the cache key, ensuring fresh data.

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:smoke:events
npm run ci:check
```

Results:
- `db:smoke:events`: Passed.
- `ci:check`: Passed.
