# Phase P1.3-S1 Order Payment Foundation

Date: 2026-06-12

## Scope

Server-only additive foundation for the future checkout model.

No mobile repo changes. Existing routes and payloads are not wired to the new order tables yet:

- `POST /tickets/book`
- `GET /tickets/:ticketId`
- `POST /payments/create-order`

## Worker

- Worker: OpenCode
- Session: `ses_1485a0d99ffeEQbm4L5O5ybwC8`
- CodeGraph rule: prompt required CodeGraph MCP first; manager reviewed final diff and requested hardening before commit.

## Server Commit

- `8e47796` - `feat: add order payment foundation`

## Changed Files

- `Server-2025-Eventing/package.json`
- `Server-2025-Eventing/db/migrations/019_create_order_foundation.sql`
- `Server-2025-Eventing/db/migrations/020_refine_order_foundation.sql`
- `Server-2025-Eventing/db/migrations/021_order_foundation_hardening.sql`
- `Server-2025-Eventing/scripts/smoke.order-foundation.js`
- `Server-2025-Eventing/src/modules/orders/domain/order-status.js`
- `Server-2025-Eventing/src/providers/database/order.repository.js`
- `Server-2025-Eventing/src/providers/database/postgres.order.repository.js`
- `Server-2025-Eventing/src/shared/config/env.config.js`

## Behavior

- Adds standard order tables:
  - `orders`
  - `order_items`
  - `payment_attempts`
- Adds nullable ticket linkage fields:
  - `tickets.order_id`
  - `tickets.order_item_id`
  - `tickets.payment_attempt_id`
- Adds order/payment status constants.
- Adds a Postgres order repository for create/read/status/payment/linkage operations.
- Adds `ORDER_DATABASE_PROVIDER` selector support.
- Does not wire existing booking/payment routes to the new order model yet.
- Does not expose order linkage fields through the existing ticket repository/mobile ticket shape.

## DB Round Trip Impact

No production route DB query count changes in this slice because no existing route is wired to the new repository.

The new order repository methods are intended for later slices:

- `createOrder`: one transaction with one order insert plus one insert per item.
- `getOrderById`: three reads for order, items, and payment attempts.
- `createPaymentAttempt`: one insert.
- `updatePaymentAttempt`: one whitelisted update.
- `updateOrderStatus`: one update.
- `linkTicketToOrder`: one whitelisted ticket update.

## SQL Safety Notes

- Repository queries use positional parameters.
- Dynamic updates are built from explicit whitelisted fields only.
- No user-provided column, table, sort, or SQL fragment is interpolated.
- `smoke.order-foundation.js` uses raw SQL only for schema introspection and synthetic test setup/cleanup.

## Index Plan

Added or hardened indexes:

- `idx_orders_user_id`
- `idx_orders_event_id`
- `idx_orders_organizer_id`
- `idx_orders_status`
- `idx_orders_idempotency_key`
- `idx_orders_unique_idempotency`
- `idx_order_items_order_id`
- `idx_order_items_event_id`
- `idx_order_items_ticket_id`
- `idx_payment_attempts_order_id`
- `idx_payment_attempts_provider_order_id`
- `idx_payment_attempts_status`
- `idx_payment_attempts_ticket_id`
- `idx_tickets_order_id`

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:migrate
node --check scripts\smoke.order-foundation.js
node --check src\providers\database\postgres.order.repository.js
node --check src\providers\database\order.repository.js
node --check src\modules\orders\domain\order-status.js
npm run db:smoke:order-foundation
npm run db:smoke:tickets
npm run db:smoke:transactions
npm run db:smoke:mobile-contracts
npm run db:smoke:postgres-write-paths
npm run ci:check
git diff --check
```

Results:

- `npm run db:migrate`: passed; migrations 019, 020, and 021 are applied/idempotent.
- Changed-file `node --check`: passed.
- `npm run db:smoke:order-foundation`: 112 pass, 0 fail.
- `npm run db:smoke:tickets`: passed.
- `npm run db:smoke:transactions`: passed.
- `npm run db:smoke:mobile-contracts`: 15 pass, 0 fail, 2 skip.
- `npm run db:smoke:postgres-write-paths`: passed.
- `npm run ci:check`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.

## Next Slice Recommendation

P1.3-S2 should wire shadow order records into the ticket booking/payment path without changing response payloads:

- Keep `POST /tickets/book` response shape unchanged.
- Create order/order item/payment attempt records behind the existing ticket flow.
- Keep ZaloPay route contract unchanged.
- Add smoke coverage for a successful ticket booking producing a matching order trail.
