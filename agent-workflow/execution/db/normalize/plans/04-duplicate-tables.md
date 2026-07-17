# 04 — Duplicate / Overlapping Tables

> Live probe: 2026-07-17 (`scripts/_duplicate_tables_probe.js`)  
> Related: integrity closed; this is **consistency + normalization of ownership**, not missing FKs.

---

## 1. Summary

| Pair | Duplicate? | Live rows | Action in 3NF program |
|---|---|---|---|
| **promotions ↔ vouchers** | **Yes** (same domain) | 0 / 0 | **N4a** — merge or pick single SoT |
| **auth_users ↔ user_profiles** | **Partial** (shared identity fields) | 49 / 38 | **N4b** — keep split; remove field dupes |
| **organizer_profiles ↔ featured_profiles** | **No** | 6 / 0 | Keep both |
| **audit_logs dual history** | Was migration conflict | 1 table | Done (single `025` shape) |
| **roles ×3** | Concept duplicate | — | **N4b** with identity |

---

## 2. `promotions` vs `vouchers` — true duplicate domain

### Purpose overlap
Both are **discount / promo codes** with `code`, validity window, usage limits, optional `event_id`.

| | promotions (005) | vouchers (030) |
|---|---|---|
| PK | TEXT | UUID default |
| Discount rules | buried in `data` JSONB | first-class `discount_type` / `value` |
| Owner | `organizer_id` | none |
| Validity | `valid_until` BIGINT | `valid_to` TIMESTAMPTZ |
| App | `postgres.promotion.repository.js` | `postgres.voucher.repository.js` |
| Live data | **0 rows** | **0 rows** |

### Why it hurts
- Two APIs, two repos, two UNIQUE `code` indexes — **codes can collide across tables**.
- Demo/docs unclear which path booking uses.
- Blocks a clean 3NF “discount” entity.

### Options

| Option | Pros | Cons |
|---|---|---|
| **A. Keep promotions, drop vouchers** | Older + organizer_id; more code | Lose clean discount columns |
| **B. Keep vouchers, drop promotions** | Cleaner columns + CHECK | No organizer_id; less app wiring |
| **C. Merge → `discount_codes`** | Clean 3NF | More migration work |
| **D. Defer** (both empty) | Zero risk now | Debt remains |

**Recommendation for Portfolio:** **A or C**.  
Because both are **empty**, merge cost is low → prefer **C** in N4a if we touch this at all:

```text
discount_codes (
  id, code UNIQUE, organizer_id?, event_id?,
  discount_type, discount_value, max_discount, min_order,
  usage_limit, used_count, valid_from, valid_to, is_public,
  data JSONB, created_at
)
```

Wire one repository; delete or view-wrap the other table after cutover.

**Not in N1–N3** (ticket types / social / venue come first). Empty tables → low urgency.

---

## 3. `auth_users` vs `user_profiles` — split identity (not full table dup)

### Intent (good design if clean)
| Table | Role |
|---|---|
| `auth_users` | Credentials, login, active flag, email verified |
| `user_profiles` | Social / attendee profile, follows, FCM, loyalty display |

### What is wrong today
**Duplicated columns** (same meaning, two writers):

| Column | auth_users | user_profiles | Problem |
|---|---|---|---|
| email | ✓ | ✓ | Can drift |
| name | ✓ | ✓ | Can drift |
| profile_pic_url | ✓ | ✓ | Can drift |
| bio | ✓ | ✓ | Can drift |
| roles | ✓ TEXT[] | ✓ TEXT[] | Defaults differ (`user` vs `attendee`) |

Already good: `fk_user_profiles_id` → `auth_users.id` (1:1).

Live: **49** auth users, **38** profiles → some users **without** profile (orphan-of-profile, not FK orphan).

### Options

| Option | Verdict |
|---|---|
| Merge into one `users` table | Heavy app rewrite — **avoid for V1** |
| **Keep 2 tables; SoT rules** | **Recommended** |
| Drop profile row if no social fields | Too aggressive |

### Recommended SoT (N4b)

| Field | Source of truth | Other table |
|---|---|---|
| password_hash, is_active, email_verified | **auth_users only** | — |
| email | **auth_users** | remove from profile or generated view |
| name, profile_pic, bio | pick one (prefer **user_profiles** for display; sync on register) | stop dual-write |
| roles | **auth_users.roles** until RBAC tables used | stop reading profile.roles for authz |
| follows, FCM, points, level | **user_profiles** / later junction tables | — |

Ensure every register path creates **both** rows (or lazy-create profile).

---

## 4. Roles triplicate

| Store | Used for |
|---|---|
| `auth_users.roles` | Real authz in many paths |
| `user_profiles.roles` | Profile/featured checks |
| `roles` + `role_permissions` + `organization_memberships` | RBAC tables exist but incomplete adoption |

**N4b:** document one SoT; optional later `user_roles(user_id, role_id)`.

---

## 5. Not duplicates

| Pair | Why keep both |
|---|---|
| `organizer_profiles` / `featured_profiles` | Business KYC vs celebrity/talent cards |
| `orders` / `tickets` / `payment_attempts` | Different aggregates |
| `membership_tiers` / `user_memberships` / `loyalty_points_ledger` | Tier def / membership / ledger (good) |
| `promotions.data` vs columns | Same table, document shape — not second table |

---

## 6. `audit_logs` history

Migrations 017 and 025 both defined `audit_logs`; 025 `DROP`ped the first.  
Live columns: `user_id, action, resource_type, resource_id, changes, ip_address, created_at` — **one table**. No merge work.

---

## 7. Placement in program

| Phase | Work |
|---|---|
| N0 | Note which promo API demos use (if any) |
| N1–N3 | **Do not block** on duplicates |
| **N4a** | promotions/vouchers decision + migrate if merging |
| **N4b** | Identity field SoT + role SoT; optional column drops |

### Priority vs ticket types

| Priority | Item |
|---|---|
| P0 for 3NF value | Ticket types (N1) |
| P1 | Social arrays (N2) |
| P2 | Venue (N3) |
| **P2–P3** | **Promo/voucher merge** (easy while empty!) |
| P3 | Identity column cleanup (careful, high app touch) |

**Tactical tip:** Both empty + **empty-dev policy** → N4a can be a hard cutover (create merged table, drop old two, rewire one repo). No data migration required.

---

## Standing constraint (user, 2026-07-17)

**Do not optimize migrations for existing data.** Dev DB has nothing that must be preserved. Prefer destructive/direct schema changes; re-seed and re-smoke instead of expand–contract.
