# Phase P1.4-S2 Order State Machine And Ticket Issuance

Date: 2026-06-20

## Scope

Implement explicit order status transition guards (state machine) to prevent terminal states (`PAID`, `CANCELLED`, `EXPIRED`, `FAILED`) from being overwritten. Ensure status updates drive ticket status and other side-effects transactionally and idempotently.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: Antigravity
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `89ba4f8162146252d67e76aa37ada0f4e0d433fd` - `feat(backend): implement explicit order status transitions with row locking, terminal state check, and smoke tests`

## Changed Files

- `Server-2025-Eventing/src/providers/database/postgres.order.repository.js`
- `Server-2025-Eventing/scripts/smoke.order-state-machine.js` [NEW]

## Behavior

- Implemented `applyOrderStatusUpdate` in `postgres.order.repository.js` which queries order status using row-level locking (`FOR UPDATE`) and blocks invalid state transitions (terminal to other states).
- Refactored `updateOrderStatus` and `updateOrderStatusInTransaction` to use `applyOrderStatusUpdate`.
- Added smoke tests in `scripts/smoke.order-state-machine.js` covering valid and invalid transitions, idempotency, and transactional rollbacks.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node scripts/smoke.order-state-machine.js
node scripts/smoke.zalopay-callback.js
node scripts/smoke.zalopay-callback-idempotency.js
node scripts/smoke.mobile-contracts.cjs
npm run ci:check
```

Results:
- `smoke.order-state-machine.js`: 11 pass, 0 fail.
- `smoke.zalopay-callback.js`: 14 pass, 0 fail.
- `smoke.zalopay-callback-idempotency.js`: 25 pass, 0 fail.
- `smoke.mobile-contracts.cjs`: 17 pass, 0 fail.
- `npm run ci:check`: pass.
