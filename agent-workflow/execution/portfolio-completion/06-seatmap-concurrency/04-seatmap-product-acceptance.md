# Phase 06 Task 04: Seat-Map Product Acceptance Gate

## Status

`DECISION REQUIRED - no implementation authorized`

## Problem

The technical seat engine can render a generic grid for seeded events. This is misleading: a venue does not automatically have that layout, and customers must never select seats from an invented map.

## Decision 06-D1

Choose exactly one path before any further implementation.

### Path A: Organizer-authored seat maps

- An organizer creates or imports a venue/performance-specific layout before enabling reserved seating.
- Events without a valid published layout use general-admission ticket types only.
- The attendee UI renders seat selection only when the event performance has a validated, published layout.
- The organizer editor needs sections, rows, seat labels, blocked/accessible seats, price zones, preview, publish validation, versioning, and audit history.
- Existing hold, PostgreSQL locking, Redis acceleration, and payment confirmation remain the source-of-truth engine underneath the authored layout.

### Path B: Hide reserved seating

- Hide all customer-facing seat-map controls permanently for the portfolio release.
- Keep the technical engine and database schema inactive behind a feature flag for later work.
- All events use general-admission ticket types; no fake seat map is rendered.

## Non-negotiable rules for either path

- Never generate a customer-visible seat map from a default/demo grid.
- Seat selection is enabled only for an event with a real, valid performance layout.
- Existing seat-hold and payment transitions remain server-authoritative.
- Mobile and web must receive the same explicit `reservedSeatingEnabled`/layout-availability contract before UI exposure.

## Verification after a decision

- Event without a published layout never renders a seat selector.
- A published layout matches its organizer preview and server seat inventory.
- Concurrent hold/payment tests remain green.
- Web and both Android apps obey the same gating contract.
