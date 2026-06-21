# Phase P1.8-S3: Membership Foundation

Date: 2026-06-21

## Scope

Introduce customer membership tiers (Standard, Silver, Gold, Platinum), flat-rate pricing benefits, transactional loyalty points earning upon payment success, and automatic tier qualification upgrades based on lifetime points accumulation. Provide BFF web API route `/api/web/memberships/me` for attendees to view tier status and points ledger.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: Antigravity
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `3eb1f69bb1ea10292723c0bf1db22d7d8e6ad7ea` (represented by short hash `3eb1f69`) - `feat(backend): implement Phase P1.8-S3: Membership Foundation, points accrual, discount, and me BFF API`

## Changed Files

- `Server-2025-Eventing/db/migrations/029_create_memberships.sql` [NEW]
- `Server-2025-Eventing/scripts/smoke.membership-loyalty.js` [NEW]
- `Server-2025-Eventing/src/app.js`
- `Server-2025-Eventing/src/modules/memberships/api/controller.js` [NEW]
- `Server-2025-Eventing/src/modules/memberships/api/routes.js` [NEW]
- `Server-2025-Eventing/src/modules/memberships/application/service.js` [NEW]
- `Server-2025-Eventing/src/modules/memberships/index.js` [NEW]
- `Server-2025-Eventing/src/modules/tickets/application/service.js`
- `Server-2025-Eventing/src/providers/database/membership.repository.js` [NEW]
- `Server-2025-Eventing/src/providers/database/postgres.membership.repository.js` [NEW]
- `Server-2025-Eventing/src/shared/config/env.config.js`

## Behavior

- **Database Migrations**: Created tables `membership_tiers`, `user_memberships`, and `loyalty_points_ledger`, and seeded the tiers `standard` (0%), `silver` (2%), `gold` (5%), and `platinum` (10%).
- **Database Repository Layer**: Built `membership.repository` proxy and `postgres.membership.repository` implementation including defensive checks to check user existence in `auth_users` to keep dummy/mock tests compatible.
- **Membership Discount Integration**: Integrated flat-rate membership discounts in `bookTicket` and `bookHeldSeats` before applying voucher promo codes. Passes membership discount details to order/ticket metadata in JSONB raw data.
- **Loyalty Accrual & Auto Upgrades**: Credits 1 loyalty point per 10,000 VND spent in `confirmTicketPayment`. Compares lifetime points against tier thresholds to automatically apply tier upgrades.
- **BFF Route**: Exposes `GET /api/web/memberships/me` route returning user's active tier, discount percentage, points balance, lifetime points, and ledger history.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node scripts/smoke.membership-loyalty.js
npm run ci:check
```

Results:
- `smoke.membership-loyalty.js`: Passed (20/20 assertions).
- `ci:check`: Passed (checks syntax, middleware, event lifecycles, and promotions).
