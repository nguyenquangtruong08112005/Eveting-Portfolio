# 05 — 3NF Implementation Scorecard

> **Date:** 2026-07-17  
> **Policy:** empty-dev direct cutover  
> **Migrations:** `037`–`041` applied

---

## 1. Delivered

| Phase | Work | Status |
|---|---|---|
| N1 | `event_ticket_types`; drop `events.ticket_types`; order_items FK | ✅ |
| N2 | `user_follows`, `event_featured_profiles`, `user_event_history`, `user_devices`; drop arrays | ✅ |
| N3 | Venue atomic columns (`address`, `city`, `lat`, `lng`, …) | ✅ |
| N4a | Vouchers dropped; discount columns on `promotions` | ✅ |
| N4b | Auth roles SoT via `auth_users` in `getUserRoles`; light default align | ✅ partial |

## 2. Live metrics

| Metric | Pre (integrity close) | After 3NF |
|---|---|---|
| Tables | 38 | **42** |
| FKs | 49 | **56** (all `fk_*`) |
| Migrations | 036 | **041** |
| Orphans | ALL CLEAR | **ALL CLEAR** |

## 3. Normalization re-rate

| Criterion | Before | After | Notes |
|---|---|---|---|
| Normalization | 4.5/10 | **7.5/10** | Ticket types + social 1NF fixed |
| Integrity | 8/10 | **8.5/10** | More FKs, still solid |
| Consistency | 5.5/10 | **6.5/10** | Single promo SoT; identity partial |
| Naming | 7.5/10 | **7.5/10** | New FKs follow convention |
| Architecture | 7.5/10 | **8/10** | Clearer aggregates |
| Performance | 6/10 | 6/10 | Unchanged |
| Scalability | 5/10 | 5/10 | Unchanged |

**Overall ~7.1/10** (was ~6.3).

### 3NF / 1NF status

| Area | Status |
|---|---|
| Ticket types entity | **3NF OK** (table) |
| Follows / featured / history / devices | **1NF OK** (junctions) |
| Venues core attrs | **Improved** (columns + bag) |
| Promo domain | **Single SoT** (`promotions`) |
| Snapshots (order/review) | Acceptable denorm (kept) |
| `events.category` / `tags` arrays | Labels — acceptable |
| Dual identity email/name | Still present (N4b light only) |
| Dual timestamps BIGINT/TIMESTAMPTZ | Deferred |

## 4. App cutover

| Component | Change |
|---|---|
| `ticket-types.helper.js` | New |
| `social.helper.js` | New |
| `postgres.event.repository.js` | Hydrate types + featured; write relational |
| `postgres.user.repository.js` | Junction follow/FCM/history; auth roles SoT |
| `postgres.venue.repository.js` | Atomic columns |
| `postgres.voucher.repository.js` | Reads `promotions` |
| `postgres.admin` / `promotion` event reads | Use event repo |
| tickets book path | `order_items.ticket_type_id` = type row id |
| Smokes order-foundation / wiring / repeated-booking | Updated |

## 5. Verification

| Check | Result |
|---|---|
| `node db/migrate.js` | 037–041 OK |
| `smoke.order-foundation.js` | **115 passed** |
| `smoke.order-wiring.js` | 53 pass / 1 fail (pre-existing shadow-fail isolation vs portfolio fail-closed) |
| `smoke.repeated-booking.js` | **19 passed** |
| `run-orphan-audit.js` | **ALL CLEAR** |

## 6. Residual (optional later)

- Drop duplicate `user_profiles.email/name` columns fully  
- BIGINT → TIMESTAMPTZ  
- GIN indexes  
- Full merge identity table  
- Revisit order-wiring shadow isolation smoke expectation  

**Program status: CLOSED for Portfolio 3NF cutover (empty-dev).**
