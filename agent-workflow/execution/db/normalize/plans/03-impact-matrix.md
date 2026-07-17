# 03 — Impact Matrix

> Fill remaining **Live shape / call sites** during **N0**.  
> Initial map from code search 2026-07-17.

---

## 1. N1 — Ticket types

| Asset | Writers | Readers | Risk | N0 note |
|---|---|---|---|---|
| `events.ticket_types` JSONB | `postgres.event.repository` upsert; inventory `jsonb_set` sold/available | tickets service book/hold; organizer capacity; admin/event map; promotions map | **High** | Sample 5–10 events for key shape (`price`, `capacity`, `available`, …) |
| `events.min_price` | event upsert | list/detail map | Med | Recompute from types after N1 |
| `order_items.ticket_type_id` | order foundation | — | Med | Often null today; enable FK after backfill |
| `order_items.ticket_type` text | order create | history UI | Low | Keep as snapshot |
| `tickets.type` (if any) | ticket issue | my tickets | Med | Confirm column name in N0 |

**API preference:** keep accepting type **code** string; resolve to row id server-side.

---

## 2. N2 — Arrays → relations

| Column | Writers | Readers | New table |
|---|---|---|---|
| `user_profiles.followed_profile_ids` | profile repo / social module | profile, featured | `user_follows` |
| `user_profiles.history_event_ids` | profile / tickets complete? | profile history | `user_event_history` |
| `user_profiles.fcm_tokens` | notifications / devices | push send | `user_devices` |
| `events.featured_profile_ids` | event repo | event detail | `event_featured_profiles` |
| `followers_count` / `following_count` | profile updates | profile card | derive from `user_follows` |

---

## 3. N3 — Venue / transitive

| Column | Issue | Fix |
|---|---|---|
| `venues.data` | entity-in-JSON | columns + bag |
| `events.venue_name`, `city` | 3NF via venue_id | JOIN or trigger |
| `events.location` | geo document | keep or lat/lng columns |

---

## 4. Explicit non-goals (do not schedule under N0–N3)

- BIGINT → TIMESTAMPTZ global rewrite  
- TEXT PK → UUID/BIGINT  
- promotions + vouchers merge  
- analytics series normalization  
- audit_logs polymorphic resource FK  
- seat map redesign  
- finance settlement tables  

---

## 5. N0 checklist (execute next)

- [ ] `SELECT id, ticket_types FROM events WHERE ticket_types IS NOT NULL LIMIT 20`
- [ ] Document JSON key schema (union of keys)
- [ ] Grep all `ticket_types` / `ticketTypes` / `featured_profile_ids` / `followed_profile_ids` in server + web + mobile
- [ ] Confirm followee target table (featured vs user)
- [ ] List smokes required per phase
- [ ] Gate review → start N1
