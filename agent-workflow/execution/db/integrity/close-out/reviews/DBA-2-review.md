# DBA-2 Review Gate — Remaining Domain FKs

**Date:** 2026-07-17  
**Verdict:** **PASS — proceed to DBA-3**

## Deliverables

| Item | Evidence |
|---|---|
| Migration `033_add_remaining_domain_fks.sql` | Applied OK |
| Orphan audit extended | `scripts/run-orphan-audit.js` → ALL CLEAR |
| Live FK count | **47** (was 31 before 033) |
| Order foundation smoke | **114/114 PASS** (seatId null for section path) |
| Event lifecycle smoke | **68/68 PASS** |

## Orphans cleaned (pre-FK)

| Check (pre) | Action |
|---|---|
| events.organizer missing user (34) | SET NULL |
| orders/tickets organizer (29) | SET NULL |
| analytics missing event (14) | DELETE |
| organizer_balances (5) / ledger (7) | DELETE orphans |

## New FKs (Tier A)

events.organizer/venue, orders.organizer, tickets.organizer/order_item/payment_attempt, promotions, analytics, featured_profiles.owner, organizer_profiles/settings/balances, ledger.organizer, seat_holds.user, order_items.seat.

## Residual intentional non-FK

Gateway ids, polymorphic audit resource_id, ticket_type string keys, group_id.

## Blockers for DBA-3

None.
