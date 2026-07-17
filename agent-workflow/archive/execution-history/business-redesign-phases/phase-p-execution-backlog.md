# Phase P Execution Backlog

Date: 2026-06-12

Purpose: detailed task backlog for local workers. Codex stays manager/verifier. Workers implement one slice at a time and must keep mobile-facing behavior stable unless the slice explicitly says otherwise.

## Global Worker Rules

- Use existing OpenCode session when possible: `ses_1485a0d99ffeEQbm4L5O5ybwC8`.
- Use CodeGraph MCP first for backend structure lookup.
- Backend implementation: OpenCode preferred.
- Android/Kotlin implementation: AGY preferred.
- Web implementation: AGY or OpenCode, after backend API contracts are ready.
- Do not touch mobile repos from backend slices.
- Do not change route paths, response payloads, or mobile contracts unless the slice explicitly includes a migration.
- Use shared errors, shared logger, validation middleware, env config helpers, and existing module boundaries.
- Report DB query budget for every route touched.
- SQL must be parameterized; dynamic fields must be whitelisted.
- Every slice must add or update smoke coverage.

## Always-Run Verification For Server Slices

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
npm run db:migrate
node --check <changed-js-files>
npm run ci:check
npm run db:smoke:mobile-contracts
git diff --check
```

Add domain smokes per slice.

## Current Status

Completed:

- P1.0 domain audit
- P1.1-A RBAC foundation
- P1.1-B RBAC route guard pilot
- P1.1-C RBAC guardrail cleanup
- P1.2-S1 event lifecycle foundation
- P1.2-S2 lifecycle policy smoke
- P1.2-S3 lifecycle persistence
- P1.2-S4 draft event flow
- P1.2-S5 draft submit workflow
- P1.2-S6 admin lifecycle boundary
- P1.3-S1 order/payment foundation
- P1.3-S2 shadow order wiring

Current next slice:

- P1.3-S3 event raw-data update hardening before seat map / seat hold work.

## P1.3 Ticketing, Orders, Seats, Holds

### P1.3-S3 Event Raw-Data Update Hardening

Worker: OpenCode.

Goal: fix the pre-existing event `raw_data` dot-notation update issue surfaced during repeated booking tests.

Scope:

- Audit `postgres.event.repository.js` update paths.
- Identify how `ticketTypes.<type>.available` updates affect typed columns and `raw_data`.
- Ensure repeated ticket booking on the same event does not corrupt the event projection used by `getEventInTransaction`.
- Preserve all event API payloads.
- Add a smoke test that books twice against one synthetic event and verifies availability decrements correctly both times.

Verification:

- `npm run db:smoke:order-wiring`
- new raw-data/repeated-booking smoke
- `npm run db:smoke:events`
- `npm run db:smoke:tickets`
- `npm run db:smoke:mobile-contracts`
- `npm run ci:check`

Worker prompt:

```text
Implement Phase P1.3-S3 event raw-data update hardening. Use CodeGraph MCP first. Server-only. Do not change API route paths or response payloads. Focus on the pre-existing issue where event update dot-notation can create partial raw_data and break repeated booking reads. Audit postgres.event.repository update paths, fix the smallest safe layer so repeated ticket bookings on one event keep ticketTypes available correct in both typed columns and returned event projection. Add a smoke that books twice against one synthetic event and verifies availability decrements and ticket payloads remain unchanged. Use shared logger/errors. Run npm run db:migrate, node --check changed files, new smoke, npm run db:smoke:order-wiring, npm run db:smoke:events, npm run db:smoke:tickets, npm run db:smoke:mobile-contracts, npm run ci:check, git diff --check. Return changed files, DB query budget, verification, risks. Do not commit.
```

### P1.3-S4 Inventory Locking And Idempotent Booking

Worker: OpenCode.

Goal: prevent overselling for generic ticket inventory.

Scope:

- Add row-level locking or equivalent transaction-safe inventory update for ticket availability.
- Add idempotency key support behind existing booking flow without requiring mobile change yet.
- Preserve `POST /tickets/book` current payload compatibility.
- Add concurrent booking smoke with limited inventory.

Verification:

- concurrent booking smoke
- `npm run db:smoke:order-wiring`
- `npm run db:smoke:transactions`
- `npm run db:smoke:mobile-contracts`

### P1.3-S5 Seat Map Schema Foundation

Worker: OpenCode.

Goal: add additive schema and repository for one basic reserved seating event type.

Scope:

- Tables: seat_maps, seat_sections, seats, seat_holds.
- Seat status model: available, held, sold, blocked.
- Hold TTL fields and indexes.
- Repository only; do not wire to mobile booking yet.
- Smoke for create seat map, hold seat, expire/release hold.

Verification:

- new seat map smoke
- `npm run db:smoke:order-foundation`
- `npm run ci:check`

### P1.3-S6 Seat Hold Booking Pilot

Worker: OpenCode.

Goal: wire reserved-seat booking for a pilot API while keeping current mobile flow unchanged.

Scope:

- Add new web-ready endpoint under a versioned or web namespace only if needed.
- Validate seat hold ownership and TTL.
- Convert hold to sold ticket/order item transactionally.
- Add duplicate seat booking smoke.

Verification:

- seat hold booking smoke
- concurrent same-seat smoke
- mobile contract smoke

## P1.4 Payment, Commission, Refund, Payout

### P1.4-S1 Payment Attempt State Machine

Worker: OpenCode.

Goal: make payment attempt status transitions explicit and idempotent.

Scope:

- Domain constants/policy for payment attempt transitions.
- Idempotent ZaloPay callback handling keyed by provider transaction/order id.
- Duplicate callback smoke.
- Preserve existing callback response.

### P1.4-S2 Order State Machine And Ticket Issuance

Worker: OpenCode.

Goal: make order paid/cancelled/expired drive ticket issuance safely.

Scope:

- Order transition policy.
- Ticket issuance record if needed.
- Payment success updates order + ticket + analytics in one transaction.
- Smoke for pending_payment -> paid and duplicate success callback.

### P1.4-S3 Commission And Ledger Foundation

Worker: OpenCode.

Goal: model money flow without provider expansion yet.

Scope:

- Tables: ledger_entries, platform_fees, organizer_balances.
- Commission config.
- Smoke for one paid order calculating gross, fee, net.

### P1.4-S4 Refund And Payout Plan

Worker: OpenCode first as design-only unless user approves implementation.

Goal: write refund/payout state diagrams and schema proposal.

## P1.5 Notification Observer / Outbox

### P1.5-S1 Domain Event And Outbox Foundation

Worker: OpenCode.

Goal: introduce in-process domain event publisher and durable outbox table.

Scope:

- Domain event interface.
- Outbox table with status/retry/error fields.
- Transaction-aware outbox insert helper.
- No channel behavior changes yet.

### P1.5-S2 Notification Dispatcher

Worker: OpenCode.

Goal: move push/email/in-app/socket targets behind observer handlers.

Scope:

- OneSignal handler.
- Email handler placeholder or provider port.
- In-app notification writer.
- Delivery log.
- Retry-safe idempotency key.

### P1.5-S3 Socket.IO Realtime In-App

Worker: OpenCode.

Goal: web/mobile realtime notification channel.

Scope:

- Socket auth.
- User room / organizer room.
- Notification event emission.
- Smoke with local socket client if practical.

## P1.6 Redis Cache And Realtime Sync

### P1.6-S1 Redis Provider Boundary

Worker: OpenCode.

Goal: add cache provider abstraction without changing behavior.

Scope:

- Cache port.
- Redis adapter.
- Memory/noop adapter for local fallback.
- Config/env validation.

### P1.6-S2 Cache Pilot

Worker: OpenCode.

Goal: cache one low-risk read endpoint.

Scope:

- Event detail or featured profiles.
- Cache key convention.
- Domain-event invalidation hook.
- Hit/miss smoke.

## P1.7 Search Projection Cleanup

### P1.7-S1 Search Outbox Projection Plan

Worker: OpenCode.

Goal: remove direct Elasticsearch sync from CRUD path gradually.

Scope:

- Audit direct Elasticsearch calls.
- Write projector boundary.
- Keep existing behavior.

### P1.7-S2 Event Search Projector

Worker: OpenCode.

Goal: consume event domain events/outbox to update Elasticsearch.

Scope:

- Projector script/job.
- Reindex parity smoke.
- Graceful search fallback stays intact.

## P1.8 Promotion, Membership, Marketing

### P1.8-S1 Promotion Business Redesign Audit

Worker: OpenCode read-only.

Goal: define target promotion model after order/payment foundation.

Output:

- campaign/voucher/eligibility/usage-limit schema plan.
- current gap matrix.

### P1.8-S2 Promotion Calculation Engine

Worker: OpenCode.

Goal: centralize price calculation.

Scope:

- Pure promotion eligibility/calculation functions.
- Race-safe usage limit later in booking transaction.
- Smokes for percent/fixed/usage-limit/member-only cases.

### P1.8-S3 Membership Foundation

Worker: OpenCode.

Goal: add membership tiers and benefits after promotion engine.

## P1.9 Social, Reviews, Discovery

### P1.9-S1 Review Eligibility

Worker: OpenCode.

Goal: only allow reviews after attendance/payment.

Scope:

- Review eligibility policy.
- Preserve existing review payloads where possible.
- Smoke for paid/checked-in/not-attended cases.

### P1.9-S2 Preferences And Recommendation Inputs

Worker: OpenCode backend, AGY Android if UI changes are needed.

Goal: collect attendee interests and use them in recommendations.

## P1.10 Web Product

### P1.10-S1 Web Architecture Bootstrap

Worker: AGY or OpenCode.

Goal: create Eventing web app skeleton after backend core contracts stabilize.

Scope:

- Next.js app.
- shadcn/ui setup.
- attendee, organizer, admin route shells.
- Auth wiring plan.
- No deep business UI yet.

### P1.10-S2 Admin Moderation Web

Worker: AGY/OpenCode.

Goal: admin event queue and organizer verification UI.

### P1.10-S3 Organizer Web Dashboard

Worker: AGY/OpenCode.

Goal: event CRUD, lifecycle actions, ticket/order summary.

### P1.10-S4 Attendee Web

Worker: AGY/OpenCode.

Goal: browse/search/detail/checkout shell.

## P1.11 Security And Compliance

### P1.11-S1 Ticket And Payment Threat Model

Worker: security pass / OpenCode read-only.

Goal: attack-path review for QR, payment callback, order idempotency, access control.

### P1.11-S2 OWASP Verification Gate

Worker: OpenCode/security.

Goal: make security scan checklist executable.

Scope:

- Auth bypass checks.
- Broken access control checks.
- SQL injection review.
- SSRF/XSS/CSRF notes for web phase.
- npm audit and Trivy CI outputs.

### P1.11-S3 Audit Log Foundation

Worker: OpenCode.

Goal: durable audit trail for admin/organizer/payment/ticket actions.

## Manager Commit Rules

After each passing slice:

1. Commit server changes in `Server-2025-Eventing`.
2. Add a run note under `Agent Workflows/runs/business-redesign/`.
3. Update `Agent Workflows/runs/firebase-exit/MANAGER_STATE.md`.
4. Commit docs in root repo.
5. Run `codegraph sync . && codegraph status .` in the server repo.
