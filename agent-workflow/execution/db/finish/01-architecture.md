# W1 — Architecture residual

See [00-master-plan.md](00-master-plan.md) §3.

## Decisions (locked for implementation)

1. **Lifecycle SoT:** `events.lifecycle_status`; drop or derive legacy `events.status`.  
2. **Payment SoT:** `payment_attempts` for attempt state; `orders` for order state; tickets hold non-payment snapshot only.  
3. **Split check-in** off tickets into `ticket_check_ins`.

## Migrations

- `047` lifecycle  
- `048` payment column cleanup  
- `049` ticket_check_ins  

## Exit

Lifecycle + payment + check-in smokes green; review note in `reviews/W1-review.md`.
