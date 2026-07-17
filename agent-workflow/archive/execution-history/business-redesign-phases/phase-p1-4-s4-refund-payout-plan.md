# Phase P1.4-S4 Refund And Payout Plan (Design Phase)

Date: 2026-06-20

## Scope

Formulate the technical design proposal, database schema models, state transition diagrams, and accounting rules for processing customer refunds and organizer payouts.

No code modifications were introduced to the runtime files.

## Worker

- Worker: Antigravity
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `6165a1ca098cb8852d1f53f67fca7ce7313a840d` - `docs: add refunds and payouts state machine and schema design specification`

## Changed Files

- `Server-2025-Eventing/docs/refunds-payouts-design.md` [NEW]

## Behavior

- Drafted state machine models for:
  - **Refund lifecycle**: `pending` -> `processing` -> `succeeded` / `failed`.
  - **Payout lifecycle**: `requested` -> `processing` -> `completed` / `failed` / `cancelled`.
- Formulated schemas for `refunds` and `payouts` tables.
- Defined transactional balance updates:
  - **Refund**: Proportional split debiting (`net_amount` from organizer balance and `platform_fee` from platform fees).
  - **Payout**: Active balance withholding upon payout request, and refund logic on failure or cancellation.
- Documented details in `docs/refunds-payouts-design.md`.

## Verification

- Design reviewed and automatically approved by the user.
