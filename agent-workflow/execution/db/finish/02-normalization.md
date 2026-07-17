# W2 — Normalization residual

## Keep (acceptable)

- Order/review/gateway snapshots  
- `events.category` / `tags` label arrays  
- `events.location` JSON until venue covers geo  
- Analytics series JSON (low priority)

## Do

| Item | Approach | Migration |
|---|---|---|
| Roles | `user_roles` + RBAC seed | 050 |
| Venue bag | Atomic columns SoT | docs + app |
| Counters | Triggers on follows + loyalty | 052 |
| Sponsors | Optional table | 051 optional |
