# W5 — Naming residual

| Item | Decision |
|---|---|
| `events.date` → `start_at` | **Do** (057) |
| `end_date` → `end_at` | Optional same migration |
| `promotions` rename | **Defer** (API `/promotions`) — document as final name |
| `platform_fees` singleton | CHECK + docs (059) |
| Time column vocabulary | Prefer `*_at` where cheap (058 optional) |
