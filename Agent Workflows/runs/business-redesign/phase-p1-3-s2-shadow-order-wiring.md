# Phase P1.3-S2 Shadow Order Wiring

Date: 2026-06-12

## Scope

Server-only shadow order/payment write path behind the existing ticket and payment flow.

No mobile repo changes. Existing route paths, status codes, and response payload shapes are preserved:

- `POST /tickets/book`
- `GET /tickets/:ticketId`
- `POST /payments/create-order`
- ZaloPay callback/status behavior

## Worker

- Worker: OpenCode
- Session: `ses_1485a0d99ffeEQbm4L5O5ybwC8`
- CodeGraph rule: worker used CodeGraph first for the initial flow lookup; manager reviewed transaction safety and required a savepoint fix.

## Server Commit

- `0a45bf5` - `feat: wire shadow order records`

## Changed Files

- `Server-2025-Eventing/package.json`
- `Server-2025-Eventing/scripts/smoke.order-wiring.js`
- `Server-2025-Eventing/src/modules/payments/api/controller.js`
- `Server-2025-Eventing/src/modules/tickets/application/service.js`
- `Server-2025-Eventing/src/providers/database/postgres.order.repository.js`

## Behavior

- Successful `bookTicket` now creates a shadow `orders` row and one `order_items` row.
- The ticket row is linked through nullable `order_id` and `order_item_id` columns.
- Ticket response objects still do not expose `orderId`, `orderItemId`, `paymentAttemptId`, or snake_case variants.
- `createPaymentOrder` now creates a shadow `payment_attempts` row and links `tickets.payment_attempt_id`.
- `confirmTicketPayment` updates linked `payment_attempts.status` to `succeeded` when a shadow attempt exists.
- Shadow write failures are non-fatal and logged through the shared logger.

## Transaction Safety

- `bookTicket` shadow SQL is isolated with a PostgreSQL savepoint:
  - `SAVEPOINT shadow_order`
  - shadow order/order item/link writes
  - `RELEASE SAVEPOINT shadow_order` on success
  - `ROLLBACK TO SAVEPOINT shadow_order` and release on failure
- A real SQL failure inside the shadow block is covered by smoke:
  - `SELECT * FROM definitely_missing_shadow_table`
  - ticket booking still returns a valid pending ticket
  - no order linkage is required for that failure case
- Payment attempt create plus ticket link now use one atomic repository helper.
- Payment confirmation reads ticket order linkage through the current transaction client.

## DB Round Trip Impact

Happy path estimates:

- `POST /tickets/book`: existing booking transaction plus 3 shadow writes, with 2 extra savepoint commands (`SAVEPOINT` and `RELEASE SAVEPOINT`).
- `POST /payments/create-order`: existing ticket read, ZaloPay HTTP call, existing ticket update, one order-link read, then one short atomic transaction with payment attempt insert plus ticket link update.
- Payment callback/status confirmation: existing confirm transaction plus one transaction-scoped order-link read and one payment attempt update when a link exists.

## SQL Safety Notes

- New repository reads and writes use positional parameters.
- Dynamic update clauses are built from explicit whitelisted fields.
- No user input is interpolated into SQL fragments.
- `scripts/smoke.order-wiring.js` uses raw SQL only for synthetic setup/cleanup and the intentional savepoint failure assertion.

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:migrate
node --check src\modules\tickets\application\service.js
node --check src\modules\payments\api\controller.js
node --check src\providers\database\postgres.order.repository.js
node --check scripts\smoke.order-wiring.js
npm run db:smoke:order-wiring
npm run db:smoke:order-foundation
npm run db:smoke:tickets
npm run db:smoke:transactions
npm run db:smoke:mobile-contracts
npm run db:smoke:postgres-write-paths
npm run ci:check
git diff --check
```

Results:

- `npm run db:migrate`: passed; migrations 001-021 already applied.
- Changed-file `node --check`: passed.
- `npm run db:smoke:order-wiring`: 58 pass, 0 fail.
- `npm run db:smoke:order-foundation`: 112 pass, 0 fail.
- `npm run db:smoke:tickets`: passed.
- `npm run db:smoke:transactions`: passed.
- `npm run db:smoke:mobile-contracts`: 15 pass, 0 fail, 2 skip.
- `npm run db:smoke:postgres-write-paths`: passed.
- `npm run ci:check`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.

## Risk / Follow-Up

The worker surfaced a pre-existing event raw-data update issue while testing repeated booking on the same synthetic event. The S2 smoke uses a fresh event for the SQL-failure test to avoid mixing that unrelated bug into this slice.

Recommended follow-up before seat map work:

- P1.3-S3: fix or isolate event `raw_data` dot-notation update behavior so repeated ticket availability updates cannot corrupt the event document projection used by booking.
- Then continue into seat map / seat hold foundation.
