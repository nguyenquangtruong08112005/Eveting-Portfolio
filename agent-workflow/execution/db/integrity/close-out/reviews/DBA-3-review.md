# DBA-3 Review Gate — Core CHECK Constraints

**Date:** 2026-07-17  
**Verdict:** **PASS — proceed to DBA-4**

## Deliverables

| Item | Evidence |
|---|---|
| Migration `034_core_status_check_constraints.sql` | Applied OK |
| Live CHECK count (`chk_%`) | **6** |
| Constraints | events.status/visibility, orders.status, tickets.status, payment_attempts.status, reviews.rating |
| Order foundation smoke | 114/114 PASS |
| Event lifecycle smoke | 68/68 PASS |
| Orphan audit | ALL CLEAR |

## Notes

- Event status CHECK allows **legacy** (`pending`, `active`) + **canonical** lifecycle values.
- Ticket status allows `checkedIn` and `checked_in` for app variance.

## Blockers for DBA-4

None.
