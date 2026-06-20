# Phase P1.4-S1: Payment Attempt State Machine & ZaloPay Webhook Idempotency

Date: 2026-06-20

## Scope

Ensure payment attempt status transitions are explicit, transactional, and idempotent, preventing double-processing of webhook callbacks under concurrent conditions.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: OpenCode
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `52f7a9ee130feff450613f266c7c5ee12a75d0a3` (represented by short hash `52f7a9e`) - `feat(backend): implement payment attempt state machine, transactional webhook idempotency, and concurrent callback locking`

## Changed Files

- `Server-2025-Eventing/src/providers/database/postgres.order.repository.js`
- `Server-2025-Eventing/src/modules/tickets/application/service.js`
- `Server-2025-Eventing/src/modules/payments/api/routes.js`
- `Server-2025-Eventing/src/modules/payments/api/controller.js`
- `Server-2025-Eventing/scripts/smoke.zalopay-callback-idempotency.js` [NEW]

## Behavior

- **Payment Attempt State Machine**: Defined terminal states (`SUCCEEDED`, `FAILED`, `CANCELLED`). Added transition checks in `applyPaymentAttemptUpdate` to block status changes once a terminal state is reached. Added row locking (`FOR UPDATE`) when retrieving status.
- **Webhook Idempotency**: Refactored the ZaloPay callback handler (`handleZaloPayCallback`) to run inside a database transaction. It locks the payment attempt by provider order ID using `FOR UPDATE`, checks for duplicate or concurrent webhook triggers, and handles updates transactionally.
- **Manual Status Check**: Exposed `/payments/check-status` endpoint enforcing the same payment attempts transition guards.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node scripts/smoke.zalopay-callback.js
node scripts/smoke.zalopay-callback-idempotency.js
npm run db:smoke:mobile-contracts
npm run ci:check
```

Results:
- `smoke.zalopay-callback.js`: 14 pass, 0 fail.
- `smoke.zalopay-callback-idempotency.js`: 25 pass, 0 fail.
- `db:smoke:mobile-contracts`: 17 pass, 0 fail.
- `ci:check`: pass.
