# Phase P1.6-S1: Redis Provider Boundary

Date: 2026-06-12

## Scope

Introduce the Redis caching provider abstraction with automatic, graceful local in-memory fallback to handle cases where a Redis cluster is offline.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: OpenCode
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `66f696beb67fca7ce7313a840d89ba4f81621462` (represented by short hash `66f696b`) - `feat: implement redis cache integration and elasticsearch outbox decoupling`

## Changed Files

- `Server-2025-Eventing/src/shared/cache/cache-provider.js` [NEW]

## Behavior

- **Cache Provider Facade**: Implements standard cache operations: `get`, `set` (with TTL support), and `del`.
- **Memory Fallback**: Embeds `MemoryCache` using ES6 `Map` with custom key/TTL expiry.
- **Graceful Error Handling**: Attaches client error listeners. If Redis experiences timeout or connection failure, the provider automatically falls back to in-memory caching and logs a warning instead of failing request execution.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node scripts/smoke.lazy-providers.js
npm run ci:check
```

Results:
- `smoke.lazy-providers.js`: Passed.
- `ci:check`: Passed.
