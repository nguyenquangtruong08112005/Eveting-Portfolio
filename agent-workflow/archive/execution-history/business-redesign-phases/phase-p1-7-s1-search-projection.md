# Phase P1.7-S1: Search Outbox Projection Plan

Date: 2026-06-12

## Scope

Decouple the direct search indexing logic from the event CRUD path to improve API response time and isolate search service failures. Move indexing instructions behind the transactional outbox pattern.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: OpenCode
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `66f696beb67fca7ce7313a840d89ba4f81621462` (represented by short hash `66f696b`) - `feat: implement redis cache integration and elasticsearch outbox decoupling`

## Changed Files

- `Server-2025-Eventing/src/modules/events/application/service.js`

## Behavior

- **CRUD Decoupling**: Audited all direct Elasticsearch writes in the event creation, modification, and cancellation routes.
- **Outbox Publishing**: Replaced direct `esClient.index()` and `esClient.delete()` calls with atomic publishes to the outbox table (`search_index` event type) containing the targeted event ID and action (`'index'`, `'delete'`).

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:smoke:events
npm run ci:check
```

Results:
- `db:smoke:events`: Passed.
- `ci:check`: Passed.
