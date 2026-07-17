# Phase P1.8-S2: Promotion Calculation Engine

Date: 2026-06-21

## Scope

Centralize promotion validation and price calculations inside the SQL transaction boundary. Implement active row-level database locking during promotion validation, wire usage counting to seating bookings, and ensure quota slots are released if payments cancel or fail.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: Antigravity
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `22c6132db74fb8a34552ded0838c1a6e94b017a4` (represented by short hash `22c6132`) - `feat(backend): implement transactional promotion validation, row locking, and usage releases`

## Changed Files

- `Server-2025-Eventing/package.json`
- `Server-2025-Eventing/scripts/smoke.promotions-calculation.js` [NEW]
- `Server-2025-Eventing/src/modules/tickets/application/helpers/promotion-validator.helper.js`
- `Server-2025-Eventing/src/modules/tickets/application/service.js`
- `Server-2025-Eventing/src/providers/database/postgres.promotion.repository.js`

## Behavior

- **Row Locking**: Added `lock` parameter to `findPromoByCodeInTransaction` in `postgres.promotion.repository.js` appending `FOR UPDATE` to the SQL query. Wired it through the validation helper `applyPromotion`.
- **Seating Integration**: Added transactional used count increment in `bookHeldSeats` when a coupon is successfully applied.
- **Quota Release**: Integrated transactional release logic in `cancelPendingTicket` and `failTicketPayment` that decrements the promotion's `used_count` if `appliedPromoCode` is present on the ticket.
- **CI Integration**: Registered the promotions smoke test in `package.json` and added it as a required check in the `ci:check` script.

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:smoke:promotions-calculation
npm run db:smoke:mobile-contracts
npm run ci:check
```

Results:
- `db:smoke:promotions-calculation`: Passed (17/17 assertions).
- `db:smoke:mobile-contracts`: Passed (17/17 assertions).
- `ci:check`: Passed.
