# 01 — 3NF Master Plan

> **Program ID:** DB-3NF  
> **Owner:** single agent / review-gated  
> **Start migrations:** `037+`  
> **Depends on:** integrity closed through `036`

---

## 1. Definition of done (program)

| Criterion | Done when |
|---|---|
| Ticket types relational | `event_ticket_types` is source of truth for capacity/price; order path can FK `ticket_type_id` |
| Multi-value ID arrays reduced | Follows / featured / history / FCM not stored only as `TEXT[]` |
| Venue atomic | Core venue fields are columns (or documented stay-as-JSON for non-core) |
| Transitive fields controlled | `min_price` derived or trigger-synced; venue snapshots documented |
| Integrity preserved | Orphan audit still ALL CLEAR; new FKs named `fk_*` |
| App | Critical smokes green (order, tickets, events, seat if used) |
| Docs | Phase reviews + final scorecard in this folder |

**Not required for program close:** full TIMESTAMP unify, PK rewrite to UUID/BIGINT, analytics time-series tables, promo+voucher merge, tickets god-table split.

---

## 2. Normal-form targets

| Form | Target for core OLTP |
|---|---|
| **1NF** | No multi-entity arrays for **relationships**; tags/genres may remain arrays of labels |
| **2NF** | Keep (already OK) |
| **3NF** | No *uncontrolled* transitive dependency; intentional snapshots allowed with docs |

### Keep denormalized (acceptable)

| Field | Why |
|---|---|
| `order_items.event_name`, `ticket_type` name snapshot | Order history immutability |
| `reviews.user_name`, pic | Review history |
| `payment_attempts.*_payload` | Gateway audit |
| `*.raw_data` | Debug / migration |
| `events.recurring_rule`, `matching_preferences`, `perks` | Document-shaped config |

### Must fix for 3NF program

| Violation | Fix |
|---|---|
| `events.ticket_types` JSON entity list | Table `event_ticket_types` |
| `events.featured_profile_ids[]` | `event_featured_profiles` |
| `user_profiles.followed_profile_ids[]` | `user_follows` |
| `user_profiles.history_event_ids[]` | `user_event_history` |
| `user_profiles.fcm_tokens[]` | `user_devices` |
| `events.venue_name` / `city` without sync | Prefer JOIN or trigger from `venues` |
| `events.min_price` from JSON | Derived from ticket types or trigger |
| `order_items.ticket_type_id` no parent | FK → `event_ticket_types` after N1 |

### Duplicate / overlapping tables (not pure 3NF, but same program)

See also [04-duplicate-tables.md](04-duplicate-tables.md).

| Pair | Kind | Recommendation |
|---|---|---|
| `promotions` + `vouchers` | **True functional duplicate** (discount codes) | **N4a** merge → one table (or pick one SoT) |
| `auth_users` + `user_profiles` | **Split identity** + duplicated email/name/roles | **N4b** keep 2 tables; drop duplicate columns from profile; SoT rules |
| `auth_users.roles` + `user_profiles.roles` + RBAC | **Triplicate roles** | **N4b** single SoT (`auth_users.roles` or `organization_memberships`) |
| `organizer_profiles` vs `featured_profiles` | **Not duplicates** (org KYC vs talent cards) | Keep both |
| `audit_logs` (017 vs 025 history) | Historical dual schema | **Already one table** live — no action |

### Optional / later (not N1–N3 gate)

| Item | Phase if pursued |
|---|---|
| `venues.data` full flatten | N3 |
| roles TEXT[] → `user_roles` | N4b optional |
| `events.sponsors` table | N4 optional |
| analytics JSON series tables | Out of V1 |
| **promo + voucher merge** | **N4a** (was “out”; now in-program optional) |
| BIGINT → TIMESTAMPTZ | Separate program |

---

## 3. Phases

### N0 — Inventory & freeze (docs only, short)

**Goal:** Exact live shapes so migrations don’t guess.

Tasks:
1. Sample `events.ticket_types` JSON keys from DB + code paths (`tickets` service, event repo).
2. List writers/readers of each array column (repos + modules).
3. Freeze “acceptable denorm” list (section 2).
4. Write findings into `03-impact-matrix.md` (fill measured rows).
5. Review gate: approve N1 schema.

**Exit:** Impact matrix filled; N1 DDL agreed.

---

### N1 — Ticket types (highest value)

**Why first:** Purchase, capacity, `min_price`, and `order_items.ticket_type_id` all hang off JSON today.

#### Schema (target)

```sql
CREATE TABLE event_ticket_types (
  id            TEXT PRIMARY KEY,
  event_id      TEXT NOT NULL,
  code          TEXT NOT NULL,          -- former JSON key e.g. 'VIP'
  name          TEXT NOT NULL,
  price         NUMERIC NOT NULL DEFAULT 0,
  currency      TEXT DEFAULT 'VND',
  capacity      INT NOT NULL DEFAULT 0,
  available     INT,                    -- or compute: capacity - sold
  sold_count    INT NOT NULL DEFAULT 0,
  sales_start   BIGINT,
  sales_end     BIGINT,
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    BIGINT,
  updated_at    BIGINT,
  raw_data      JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT uq_event_ticket_types_event_code UNIQUE (event_id, code)
);
-- fk_event_ticket_types_event_id → events(id) ON DELETE CASCADE
```

#### Steps (empty-dev: direct cutover)

> **Policy:** no production data — skip multi-week dual-write/backfill. One coherent cutover is OK.

| Step | Migration / app | Notes |
|---|---|---|
| N1.1 | `037_create_event_ticket_types.sql` | Table + indexes + FK |
| N1.2 | Optional tiny backfill | Only if seed JSON remains; else seeds rewrite to table |
| N1.3 | App cutover | Event/ticket/order code reads/writes **table only** |
| N1.4 | `038_…` | `order_items.ticket_type_id` FK; drop or stop using JSON column |
| N1.5 | Drop `events.ticket_types` (allowed) | Empty-dev — no need to keep JSON “for one release” |

#### Verification

- Backfill count: sum of JSON keys ≈ row count in `event_ticket_types`
- Smoke: order foundation, tickets, concurrent booking if present
- Orphan audit still clear
- New FKs: `fk_event_ticket_types_event_id`, `fk_order_items_ticket_type_id`

#### Risks

| Risk | Mitigation |
|---|---|
| JSON shape varies | N0 inventory; `raw_data` catch-all |
| Race on `available` | Keep existing row-level / transaction patterns; later CHECK available ≥ 0 |
| Mobile/web still send type **code** string | Keep `code` unique per event; API can accept code or id |

**Exit gate:** Review N1 — dual-read works; smokes green; optional FK on order_items.

---

### N2 — Social / multi-value relationships (1NF)

#### Target tables

| Old | New |
|---|---|
| `user_profiles.followed_profile_ids` | `user_follows(follower_id, followee_id, created_at)` PK composite or `id` |
| `events.featured_profile_ids` | `event_featured_profiles(event_id, featured_profile_id, sort_order)` |
| `user_profiles.history_event_ids` | `user_event_history(user_id, event_id, attended_at)` |
| `user_profiles.fcm_tokens` | `user_devices(user_id, fcm_token, platform, last_seen_at)` UNIQUE(token) |

#### Steps

| Step | Work |
|---|---|
| N2.1 | Create four tables + FKs to `auth_users` / `featured_profiles` / `events` |
| N2.2 | Backfill from arrays |
| N2.3 | Dual-write profile/event repos |
| N2.4 | Dual-read; counters: recompute or triggers on `user_follows` |
| N2.5 | Stop writing arrays (keep columns nullable/default empty for rollback) |

**Keep as arrays (not N2):** `events.category`, `events.tags`, `featured_profiles.genres` — labels, not entity FKs. Optional GIN indexes later (perf program).

**Exit gate:** Arrays unused by write path; counters consistent; smokes for profile/follow if any.

---

### N3 — Venue & transitive cleanup

| Task | Approach |
|---|---|
| N3.1 | Promote common `venues.data` keys → columns (`name`, `address`, `city`, `lat`, `lng`, `capacity`, …) + backfill |
| N3.2 | `events.venue_name` / `city`: either (A) generate from JOIN in repo, or (B) trigger on venue update |
| N3.3 | `events.min_price`: trigger or app recompute from `event_ticket_types.price` |
| N3.4 | Document remaining JSON in `venues.data` as extension bag |

**Exit gate:** Event list/detail still show venue; no silent drift for min_price on new writes.

---

### N4 — Scorecard & optional polish

1. Re-run live FK/orphan metrics.
2. Update normalization scorecard (`04-3nf-scorecard.md`).
3. Optional if budget remains:
   - CHECK `available >= 0` on ticket types
   - Drop unused array writes
   - `user_roles` instead of roles arrays (touches auth deeply — careful)
4. Close program; hand residual to “perf/timestamps” backlog.

---

## 4. Migration number plan (reserved)

| # | Intent |
|---|---|
| 037 | create `event_ticket_types` |
| 038 | backfill ticket types from JSON |
| 039 | `order_items.ticket_type_id` FK (nullable first) |
| 040 | social junction tables |
| 041 | backfill social |
| 042 | venues column expand |
| 043 | min_price / venue sync helpers (trigger or app-only note) |

Numbers may shift if intermediate fixes needed; keep sequential.

---

## 5. App touch list (N1 first)

| Area | Files (indicative) |
|---|---|
| Event map/CRUD | `postgres.event.repository.js`, admin event repo |
| Booking | `modules/tickets/application/service.js` |
| Orders | order repository / foundation |
| Organizer capacity | `modules/organizer/application/service.js` |
| Seeds / smokes | `seed.events.*`, `smoke.order-*`, `smoke.tickets.js` |
| Clients | Web/mobile only if API shape changes (prefer keep code string API) |

**API compatibility preference:** external API still accepts ticket **type code**; server resolves to `event_ticket_types.id` internally.

---

## 6. Risk register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Seed/smoke still assume JSON | High | Update seeds + smokes in same phase as schema |
| R2 | App still writes old columns | High | Grep cutover; fail closed |
| R3 | Scope creep to timestamps/PK | Med | Explicit out-of-scope list |
| R4 | ~~Drop too early / data loss~~ | **N/A (empty-dev)** | Data not preserved; recreate DB OK |
| R5 | Portfolio demo break | High | Review gate + smokes every phase |

---

## 7. Review protocol

After each phase:
1. Short review doc under `reviews/N{k}-review.md`
2. Live metrics snippet
3. Smoke results
4. Explicit **PASS / FAIL** and residual risks
5. Only then start next phase

---

## 8. Success metrics

| Metric | Now | After N1 | After N2–N3 |
|---|---|---|---|
| Normalization score | 4.5/10 | ~6/10 | **7–8/10** |
| `ticket_types` as JSON SoT | Yes | No (table SoT) | No |
| Multi-value relationship arrays (write path) | Yes | Yes | No |
| Integrity / orphans | 8/10 clear | Still clear | Still clear |
