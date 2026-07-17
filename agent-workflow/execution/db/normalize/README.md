# DB 3NF Optimization

> **Status:** **CLOSED** (3NF + identity/ts/gin/partition)  
> **Predecessor:** [db-audit](../db-audit/) integrity CLOSED  
> **Scorecards:** [05](05-implementation-scorecard.md) · [06](06-identity-ts-gin-scorecard.md)

## Standing rules (kept)

1. Empty-dev: no data preservation dual-write.  
2. FK names: `fk_<table>_<column>`.  
3. Acceptable denorm: order/review snapshots, gateway payloads.

## What shipped

| Migration | Purpose |
|---|---|
| 037 | `event_ticket_types`; drop `events.ticket_types`; order_items FK |
| 038 | Social junctions; drop profile/event multi-id arrays |
| 039 | Venue atomic columns |
| 040 | Merge vouchers → promotions |
| 041 | Identity SoT light |
| 042 | Full identity column de-dupe |
| 043 | BIGINT → TIMESTAMPTZ (bulk) |
| 044 | GIN indexes |
| 045 | Partition notifications / outbox / audit_logs |
| 046 | Junction table TIMESTAMPTZ fixups |

## API compatibility

- Events still expose `ticketTypes` as `{ [code]: { price, available, …, id } }` assembled from rows.  
- Clients may keep sending type **code** on book; server stores relational type **id** on `order_items`.

## Verify

```bash
cd Server-2025-Eventing
node db/migrate.js
node scripts/smoke.order-foundation.js
node scripts/smoke.repeated-booking.js
node scripts/run-orphan-audit.js
```
