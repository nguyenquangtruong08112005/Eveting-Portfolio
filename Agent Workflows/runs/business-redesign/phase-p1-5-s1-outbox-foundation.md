# Phase P1.5-S1: Domain Event And Outbox Foundation

Date: 2026-06-12

## Scope

Introduce a transaction-aware outbox pattern to decouple domain events from side-effects (e.g. search indexing, notification dispatching). Define a durable `outbox` table and publisher interface.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: OpenCode
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `daf4c8cb1d7e59b2ea1298c19b5fa155abce8ada` (represented by short hash `daf4c8c`) - `feat: transactional outbox foundation and hybrid notification processor`

## Changed Files

- `Server-2025-Eventing/db/migrations/024_create_outbox.sql` [NEW]
- `Server-2025-Eventing/src/shared/events/event-publisher.js` [NEW]

## Behavior

- **Database Migration**: Added the `outbox` table tracking `event_type`, `payload` (JSONB), `status` (`'pending'`, `'processing'`, `'completed'`, `'failed'`), `retry_count`, and errors.
- **Event Publisher**: Added a unified `publish` helper in `event-publisher.js` that checks for an active SQL transaction client, inserting the event record within the transaction boundary to ensure atomicity.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node scripts/smoke.notifications-outbox.js
npm run ci:check
```

Results:
- `smoke.notifications-outbox.js`: Passed.
- `ci:check`: Passed.
