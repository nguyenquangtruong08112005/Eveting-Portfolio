# Task 05-T2: ZaloPay Gateway Integration, Refund & Payout Safeguards

## 1. Goal
Implement ZaloPay Sandbox Payment Gateway integration, cryptographic webhook signature verification (`HMAC-SHA256`), order status reconciliation, refund execution, and organizer payout safeguards.

## 2. Why
Provides authentic Vietnamese payment method processing while safeguarding platform funds against double refunds, invalid webhooks, or unauthorized payouts.

## 3. Dependencies
- Task `05-T1` (Core Idempotency Engine).

## 4. Preconditions
- ZaloPay Sandbox credentials configured (`ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2`, `ZALOPAY_ENDPOINT`).

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `POST /payments/zalopay/create` — Generates ZaloPay order URL & `app_trans_id`.
  - `POST /payments/zalopay/callback` — Cryptographic signature verification using `KEY2`.
  - Order state machine transitions: `PENDING` $\rightarrow$ `PAID` $\rightarrow$ `REFUNDED` or `EXPIRED`.
  - `POST /admin/refunds` — Admin refund process releasing order tickets.
  - `POST /organizer/payouts` — Payout calculation logic deducting platform commission (e.g. 5%) and checking event completion status.
  - Refund safeguards: DB lock on order row preventing concurrent double-refunding.
- **Out-of-Scope:**
  - Live bank wire integration (handled via simulated payout workflow).

## 6. Likely Source Modules / Files
- `server/src/providers/payment/zalopay.js` — [Discovery Target: ZaloPay provider implementation]
- `server/src/modules/payments/` — [Discovery Target: Payment controllers & webhook handler]
- `server/src/modules/orders/` — [Discovery Target: Order state machine & refund service]

## 7. Contracts / Behavior to Preserve
- ZaloPay callback response format: `{ return_code: 1, return_message: "success" }`.

## 8. Ordered Implementation Steps
1. Create `ZaloPayProvider` implementing `createOrder()`, `verifyCallback()`, and `queryOrderStatus()`.
2. Build `POST /payments/zalopay/callback` endpoint validating `data` + `mac` using `ZALOPAY_KEY2`.
3. Wrap order status update and ticket issuance in PostgreSQL transaction (`FOR UPDATE` lock on `orders` table).
4. Implement `RefundService.processRefund()` verifying `order.payment_status === 'PAID'` before executing refund.
5. Implement `PayoutService.calculateOrganizerPayout()` verifying `event.end_time < NOW()` and `payout_status === 'UNPAID'`.
6. Write integration tests for payment callback handling, signature forgery rejection, and refund double-spend protection.

## 9. Database / Migration Needs
- PostgreSQL migration adding `zalopay_trans_id`, `payout_status`, `payout_amount`, and `commission_fee` to `orders` and `events` tables.

## 10. Security Requirements
- Verify ZaloPay callback `mac` signature on every webhook request without exception.
- Webhook endpoint rejects requests with invalid signatures with HTTP 400.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `node server/scripts/smoke/smoke.zalopay-webhook.js`

## 12. Acceptance Criteria
- [ ] ZaloPay sandbox payment URL generated successfully.
- [ ] Valid ZaloPay callback updates order status to `PAID` and issues tickets.
- [ ] Forged webhook signature rejected immediately.
- [ ] Double refund attempt on same order rejected with HTTP 409 Conflict.

## 13. Rollback / Feature-Flag Strategy
- Mock payment mode `PAYMENT_MOCK_ENABLED=true` auto-completes payments for staging testing.

## 14. Required Artifacts / Handoff Report
- Payment integration test report and ZaloPay callback verification log.

## 15. Blocker Questions
- Should partial refunds be permitted for orders containing multiple ticket types?
