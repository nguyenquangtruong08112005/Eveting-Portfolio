# Phase 07.1: Manual-QA Regression Remediation

## Status

`PLANNED - BLOCKING BEFORE PHASE 08`

## Objective

Correct manual-QA regressions without expanding the business model. Every fix must preserve existing mobile contracts unless a contract is explicitly versioned and audited.

## Scope

### 07.1-A Checkout contract regressions

- Ensure every web checkout mutation sends the canonical `Idempotency-Key` header.
- Align attendee-question payload validation with the actual ticket quantity and ticket-type contract. A mixed ticket checkout must not fail because the UI and backend disagree on attendee cardinality.
- Verify one order, multiple order items, one payment attempt, and a retry-safe ZaloPay flow remain intact.

### 07.1-B Event map fallback

- Repair the broken map render.
- Keep a usable OpenStreetMap external-link fallback when interactive rendering is unavailable.
- Do not claim a map provider is available when its asset or token has failed to load.

### 07.1-C Organizer finance and context

- Never render raw backend authorization/load messages before a relevant user action.
- Show a neutral loading, empty, or permission-safe state; display inline validation only after submission or a real failed request.
- Seed safe, clearly-demo bank/tax data for `organizer@eventing.com` only. Do not prefill every organizer form.
- Replace the unclear `Current organizer ADMIN` label with the selected organizer name plus a comprehensible role/context indicator.

### 07.1-D Organizer team

- Restore a visible, accessible `Invite member` action.
- Verify it is reachable at supported viewport widths and enforces team RBAC server-side.

## Explicit non-goals

- No new payout/refund policy.
- No Featured Profile ownership changes; those are Phase 08.
- No new mobile UI behavior except a compatibility fix required by the checkout contract.

## Required verification

- Browser/manual flow: checkout with one and mixed ticket types, with and without attendee questions.
- API/DB evidence: idempotency replay and mixed-order invariant.
- Browser/manual flow: broken-map fallback is actionable.
- Browser/manual flow: organizer finance and team views show no raw unauthorized errors by default.
- Affected web build/lint and targeted backend smoke checks.
