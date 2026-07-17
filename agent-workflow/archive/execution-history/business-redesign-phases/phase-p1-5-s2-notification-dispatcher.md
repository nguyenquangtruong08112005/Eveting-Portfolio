# Phase P1.5-S2: Notification Dispatcher

Date: 2026-06-12

## Scope

Implement the background processing of notification outbox entries, routing events to various targets (FCM/Push, Socket.IO, Email mockup) with automatic retry limits and error logging.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: OpenCode
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `daf4c8cb1d7e59b2ea1298c19b5fa155abce8ada` (represented by short hash `daf4c8c`) - `feat: transactional outbox foundation and hybrid notification processor`

## Changed Files

- `Server-2025-Eventing/src/shared/events/outbox-processor.js` [NEW]
- `Server-2025-Eventing/scripts/smoke.notifications-outbox.js`

## Behavior

- **Outbox Processor**: Runs a background cron job (every 30 seconds) and setImmediate trigger. Retrieves pending/failed outbox entries.
- **Notification Router**: Maps channel targets (`push` to fcmService, `socket` to Socket.IO, `email` to log/mock).
- **Error/Retry Safety**: Increments `retry_count` and updates status to `'failed'` after 3 failed attempts, logging error messages.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node scripts/smoke.notifications-outbox.js
node scripts/smoke.notifications.js
npm run ci:check
```

Results:
- `smoke.notifications-outbox.js`: Passed.
- `smoke.notifications.js`: Passed.
- `ci:check`: Passed.
