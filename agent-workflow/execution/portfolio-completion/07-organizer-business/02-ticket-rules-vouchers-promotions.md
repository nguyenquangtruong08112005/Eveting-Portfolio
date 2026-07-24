# Task 07-T2: Ticket Rules, Vouchers & Promotion Engine

## 1. Goal
Implement ticket pricing & sales boundary rules, alongside the complete organizer Promotions & Voucher management engine.

## 2. Why
Fulfills `PO-idea.md` specifications (items #2 and #20), enabling organizers to configure ticket sales constraints and execute targeted promotional campaigns.

## 3. Dependencies
- Task `07-T1` (Event Builder, Address Dictionary & Attendee Qs).

## 4. Preconditions
- Event and performance entities created.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **Ticket Rules (`PO-idea.md` #2):** Name, Price (VND), Free ticket toggle (`is_free`), Total Quantity, Min/Max tickets per order, Sale start/end dates (`sell_at`, `end_sell_at`), Ticket description, Ticket picture.
  - **Vouchers / Promotions (`PO-idea.md` #20):**
    - Program Name, Code (e.g. `SUMMER2026`), Start-End datetime, Description, Promo Image.
    - **Display Setting:** Public (shown automatically in discount modal during payment) vs Private (organizer must share code directly with buyers).
    - **Discount Types:** Fixed Amount (e.g. 50,000 VND) or Percentage (e.g. 10%).
    - **Usage Limits:** Total number of tickets allowed for voucher, Total number of orders allowed per buyer.
    - **Scope:** All performances vs specific performance ID.
    - **Ticket Min/Max Scope:** Min/Max number of tickets in cart required to apply voucher.
- **Out-of-Scope:**
  - Dynamic surge pricing algorithms.

## 6. Likely Source Modules / Files
- `server/src/modules/promotions/` — [Discovery Target: Promotion & voucher service]
- `server/src/modules/tickets/` — [Discovery Target: Ticket tier configuration]
- `web/src/features/organizer/promotions/` — [Discovery Target: Organizer promotions manager UI]

## 7. Contracts / Behavior to Preserve
- `POST /checkout/validate-voucher` returns calculated discount amount and updated total order price.

## 8. Ordered Implementation Steps
1. Create PostgreSQL migration for `promotions`, `promotion_performances`, and `voucher_usages` tables.
2. Build `PromotionService.validateVoucher()` checking date window, public/private access, total order limit, buyer limit, and performance scope.
3. Update Checkout API to apply validated voucher discount during order calculation inside DB transaction.
4. Develop Organizer Promotions Manager UI in `web/src/features/organizer/promotions/`.
5. Write unit and integration tests for voucher redemption validation and limit enforcement.

## 9. Database / Migration Needs
- PostgreSQL migration `065_create_promotions_and_vouchers.sql` with unique index on `(organizer_id, code)`.

## 10. Security Requirements
- Atomic increment of `used_count` in Redis/PostgreSQL to prevent voucher usage over-subscription during concurrent checkouts.
- Code sanitization (uppercase alphanumeric only).

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `node server/scripts/smoke/smoke.promotions.js`

## 12. Acceptance Criteria
- [ ] Ticket tiers respect min/max per order constraints during checkout validation.
- [ ] Public vouchers display automatically in buyer payment modal; private vouchers require manual code entry.
- [ ] Expired or over-subscribed vouchers rejected with clear user error message.

## 13. Rollback / Feature-Flag Strategy
- Disable promotions globally via `PROMOTIONS_ENABLED=false` flag if calculation discrepancies occur.

## 14. Required Artifacts / Handoff Report
- Promotion engine validation test suite output.

## 15. Blocker Questions
- Can a buyer combine a public voucher with a private promo code on a single order?
