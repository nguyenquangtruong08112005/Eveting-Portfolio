# Task 08-T3: Financial Oversight, Payout Approval & Refund Review

## 1. Goal
Implement the Admin Financial Oversight dashboard, payout approval review, and platform-level refund override controls (`/admin/finance`).

## 2. Why
Provides complete platform financial governance, enabling administrators to review revenue splits, approve organizer payouts, and resolve dispute refunds.

## 3. Dependencies
- Task `08-T2` (Event Moderation & Platform Quality Control).

## 4. Preconditions
- Payment and payout ledger tables populated.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `GET /admin/finance/overview` — Platform Gross Merchandise Value (GMV), Total Net Revenue, Collected Commission (e.g. 5%), Pending Payout Balance.
  - `GET /admin/finance/payouts` — Lists requested organizer payouts awaiting approval.
  - `POST /admin/finance/payouts/:id/approve` — Approves payout request and records transaction reference.
  - `POST /admin/finance/refunds/override` — Force issues order refund in dispute cases.
  - Transaction ledger auditing export (`GET /admin/finance/ledger/export`).
- **Out-of-Scope:**
  - Direct integration with core banking core software (simulated payout execution).

## 6. Likely Source Modules / Files
- `server/src/modules/admin/` — [Discovery Target: Admin financial controllers]
- `web/src/app/admin/observability/page.tsx` — [Discovery Target: Admin financial & system monitoring UI]

## 7. Contracts / Behavior to Preserve
- Financial ledger immutability (payout and refund records are insert-only audit rows).

## 8. Ordered Implementation Steps
1. Create PostgreSQL migration for `payout_requests` and `financial_ledger` tables.
2. Build `AdminFinanceService` calculating platform revenue, managing payout approvals, and executing refund overrides.
3. Enforce idempotency on payout approval endpoint (`POST /admin/finance/payouts/:id/approve`).
4. Develop Admin Financial Oversight UI in `web/src/app/admin/finance/page.tsx`.
5. Write unit tests for financial calculations and payout state transitions.

## 9. Database / Migration Needs
- PostgreSQL migration `072_create_payout_and_ledger_tables.sql`.

## 10. Security Requirements
- Requires `role = 'admin'` authentication.
- Strict double-spending checks prior to executing payout approval.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `npm run build` (in `web/`)

## 12. Acceptance Criteria
- [ ] Financial overview correctly displays GMV, platform commission, and organizer balances.
- [ ] Admin approval of payout marks record `PAID` and updates ledger cleanly.
- [ ] Attempting duplicate payout approval on processed payout rejected with HTTP 409.

## 13. Rollback / Feature-Flag Strategy
- Hold pending payouts in `REVIEW_HOLD` status if discrepancy detected in ledger balance.

## 14. Required Artifacts / Handoff Report
- Admin financial test execution suite log.

## 15. Blocker Questions
- What default commission percentage should the platform deduct from organizer gross sales (e.g. 5%)?
