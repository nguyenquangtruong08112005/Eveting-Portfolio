# Phase P1.2 Decision Brief

Date: 2026-06-12

## Superseded By User Decisions

This brief was the pre-decision audit. The user has now selected the Phase P direction.

Authoritative decision file:

- `Agent Workflows/runs/business-redesign/phase-p-decisions-and-guardrails.md`

Implementation must follow that file before this brief.

## Current Checkpoint

Completed:

- P1.0 domain audit.
- P1.1-A RBAC foundation.
- P1.1-B RBAC route-guard pilot.

Current repos checked:

- Root repo: `staging`, clean.
- `Server-2025-Eventing`: `staging`, clean before this documentation note.

## Read-Only Audit: Current Event Lifecycle

Current event lifecycle is string-based and spread across services/controllers/repositories.

Observed current states:

- `pending`
- `active`
- `rejected`
- `cancelled`

Observed visibility values:

- `private`
- `public`
- `unlisted`

Current transitions:

- Organizer creates event:
  - route: `POST /events`
  - service: `src/modules/events/application/service.js`
  - result: `status = pending`, `visibility = private`
- Admin approves event:
  - route: `POST /admin/events/:id/approve`
  - service: `src/modules/admin/application/service.js`
  - result: `status = active`, `visibility = public`, `approvedAt`
  - also indexes event into Elasticsearch and notifies featured-profile topics.
- Admin rejects event:
  - route: `POST /admin/events/:id/reject`
  - service: `src/modules/admin/application/service.js`
  - result: `status = rejected`, `rejectReason`, `rejectedAt`
  - deletes event from Elasticsearch.
- Organizer cancels event:
  - route: `DELETE /events/:eventId`
  - service: `src/modules/events/application/service.js`
  - result: `status = cancelled`, `cancelledAt`
  - deletes event from Elasticsearch and notifies attendees.

Current public/search behavior:

- Public event list queries only `status = active` and `visibility = public`.
- Nearby event query only `status = active` and `visibility = public`.
- Elasticsearch reindex only indexes `status = active` and `visibility = public`.
- `getEventById` hides `cancelled` events and applies public/unlisted visibility checks.

Existing coverage:

- `scripts/smoke.postgres-write-paths.js` covers admin approve/reject column and raw_data updates.
- `scripts/smoke.mobile-contracts.cjs` protects public/mobile response shapes.
- No dedicated lifecycle state-machine smoke exists yet.

## Main Risks If P1.2 Starts Without Design

- `active` currently means both approved and published; a future web/admin product usually needs separate `approved` and `published` states.
- `DELETE /events/:eventId` actually performs cancellation, not deletion; this should be kept route-compatible but modeled explicitly.
- `status` strings are duplicated across service, repository, Elasticsearch, smoke scripts, and mobile filtering.
- Admin approve currently does Elasticsearch indexing and notification directly in the service.
- Organizer update can edit data without an explicit lifecycle transition rule.
- There is no database constraint or central transition validator for invalid transitions.
- Changing public visibility semantics can break attendee mobile home/search/nearby flows.

## P1.2 Options

### Option 1: Event Lifecycle Foundation

Recommended.

Goal:

- Introduce a central event lifecycle module/state policy while preserving existing status strings and API responses first.

Safe first slice:

- Add constants/policy helpers for existing states and transitions.
- Replace duplicated string literals in backend services with constants.
- Add lifecycle smoke tests for current behavior:
  - create -> pending/private
  - approve -> active/public
  - reject -> rejected
  - cancel -> cancelled
  - public/search only sees active/public
- Do not introduce new states yet.
- Do not change mobile payloads.

Why first:

- Staff/team rules, ticket sales, promotion validity, search indexing, and notification behavior all depend on event state.

### Option 2: Staff / Team Management

Goal:

- Expose organization membership APIs and use P1.1 RBAC for organizer staff roles.

Safe first slice:

- Add read-only organization membership endpoints for current user.
- Add manager/staff role checks only on organizer-owned surfaces.
- Avoid complex invitation flow until email/auth policy is designed.

Risk:

- Needs product decision about whether organizer account equals organization owner, and whether one user can belong to multiple organizer organizations.

### Option 3: Ticket / Order / Payment Hardening

Goal:

- Introduce order/payment state model and stronger transaction boundaries before seat selection and multiple payment methods.

Safe first slice:

- Add order state constants and repository helpers.
- Add smoke for no oversell on a single ticket type.
- Keep current payment payloads unchanged.

Risk:

- Bigger blast radius because it touches booking, ticket capacity, payment webhook, ZaloPay, and "my tickets".

## Manager Recommendation

Choose Option 1 first: Event Lifecycle Foundation.

Reason:

- It is the lowest-risk architecture step that directly supports later web/admin/organizer workflows.
- It creates a stable language for all later business redesign: approval, publishing, cancellation, ticket sale availability, promotion validity, notifications, search, and audit logs.

## Approval Needed Before Implementation

Do not implement P1.2 until the user chooses one of:

- `P1.2 = Event lifecycle foundation`
- `P1.2 = Staff/team management`
- `P1.2 = Ticket/order/payment hardening`

If the user chooses Event lifecycle foundation, first worker task should be server-only, additive, and contract-preserving.
