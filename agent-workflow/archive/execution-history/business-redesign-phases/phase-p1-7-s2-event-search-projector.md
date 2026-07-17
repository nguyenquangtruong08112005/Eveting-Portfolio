# Phase P1.7-S2: Event Search Projector

Date: 2026-06-18

## Scope

Consume event domain events/outbox to update Elasticsearch asynchronously, decoupling Elasticsearch updates from the API request lifecycle. The projector also handles cache invalidation for the modified event.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: OpenCode
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `66f696beb67fca7ce7313a840d89ba4f81621462` (represented by short hash `66f696b`) - `feat: implement redis cache integration and elasticsearch outbox decoupling`

## Changed Files

- `Server-2025-Eventing/src/shared/events/outbox-processor.js`

## Behavior

- **Search Index Processor**: Implemented the `search_index` event handler within `PROCESSORS` registry in `outbox-processor.js`.
  - **Cache Invalidation**: Actively invalidates Redis cache for `cache:event:${eventId}` on any update.
  - **Elasticsearch Updates**: Resolves the event by querying `eventRepository.getEventById(eventId)`.
    - If the event is deleted, inactive, or not public, it is deleted from the Elasticsearch index.
    - If the event is active and public, its projection is rebuilt and synced/indexed into the `events` Elasticsearch index.

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:smoke:events
npm run search:reindex
npm run ci:check
```

Results:
- `db:smoke:events`: Passed.
- `search:reindex`: Reindexed events successfully.
- `ci:check`: Passed.
