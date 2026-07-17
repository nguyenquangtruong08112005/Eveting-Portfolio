# 06 — Identity de-dupe · TIMESTAMPTZ · GIN/partition

> **Date:** 2026-07-17  
> **Migrations:** `042`–`046`  
> **Policy:** empty-dev

---

## Delivered

### Identity de-dupe (042)

| Table | Keeps | Dropped |
|---|---|---|
| `auth_users` | email, password_hash, roles, is_active, email_verified | name, profile_pic_url, bio |
| `user_profiles` | name, pic, bio, cover, social, points, level | email, roles |

- Auth reads **JOIN** profile for display name/pic/bio.
- Profile email lookup goes through `auth_users`.
- Roles SoT: `auth_users` only.

### BIGINT → TIMESTAMPTZ (043 + 046)

- Domain times converted (events, tickets, orders, payments, reviews, media, promotions, seats, loyalty, junctions, …).
- App bridge: `src/providers/database/time.helper.js` (`toDb` / `fromDb`).
- API still exposes epoch **millis** via `fromDb`.

### GIN (044)

- `events.category`, `tags`, `location`, `sponsors`, `raw_data`
- `venues.data`, `promotions.data`, `tickets.raw_data`
- `user_profiles.matching_preferences`, `analytics.tickets_sold`

### Partition (045)

| Table | Strategy |
|---|---|
| `notifications` | RANGE (`created_at`) + yearly + DEFAULT |
| `outbox` | same |
| `audit_logs` | same |

PK is `(id, created_at)` on partitioned parents.

---

## Verification

| Check | Result |
|---|---|
| migrate 042–046 | OK |
| smoke.order-foundation | **115 passed** |
| smoke.repeated-booking | **19 passed** |
| orphan audit | **ALL CLEAR** |
| auth columns | no name/bio/pic |
| profile columns | no email/roles |

---

## Scores (delta)

| Criterion | After 3NF core | After this pack |
|---|---|---|
| Normalization | 7.5 | **8/10** |
| Consistency | 6.5 | **8/10** |
| Integrity | 8.5 | **8.5/10** |
| Performance | 6 | **7/10** (GIN + partition ready) |
| Naming | 7.5 | 7.5 |
| Architecture | 8 | **8.5/10** |
| Scalability | 5 | **6.5/10** (partitioned hot tables) |

**Overall ~7.7/10** (was ~7.1 after N1–N4a).
