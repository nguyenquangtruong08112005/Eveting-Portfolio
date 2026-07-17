# 12 — Live Gap Analysis & Plan to Finish DB Audit

> **Date:** 2026-07-17  
> **Source:** Live PostgreSQL survey + `execution/db-audit/*` (baseline 2026-06-22)  
> **Status:** **COMPLETE / CLOSED** (2026-07-17) — all DBA phases PASS through 036.  
> Historical plan for Portfolio V1 integrity (relationships). See `13-post-fix-scorecard.md` for current truth.

---

## 1. Is this audit out of scope?

### Short answer: **No — not out of scope.**

| Concern | Portfolio V1 | Full enterprise audit P2–P3 |
|---|---|---|
| Critical FKs so ERD has real relationships | **In scope** | In scope |
| Transactional migrations | **Done** (P0.1) | Done |
| Orphan cleanup + core commerce FKs | **Done** (031) | Done |
| Remaining domain FKs (events→venue/org, seats, finance, promos) | **In scope** if you draw/show the ERD | In scope |
| CHECK constraints on every status enum | Nice-to-have for V1 | In scope P1 |
| JSONB → normalized tables | Out of V1 product features | P2 |
| BIGINT → TIMESTAMPTZ everywhere | Out of V1 unless blocking | P1–P2 |
| Partitioning / read replicas | Out of scope | P3 |

**Why it is in scope for you:**

1. Your **diagram shows tables without relationships** — that is a real integrity problem, not cosmetic.  
2. Portfolio demos and smokes already **broke** when FKs were added without seed data — proving relationships matter.  
3. Completing FKs makes the ERD honest for thesis / interview.  
4. The original `db-audit` package exists specifically to drive this work.

**What is optional / later:**

- Full 3NF rewrite of `events.ticket_types` JSONB  
- Dual promo merge  
- Scalability partitioning  

Do **not** drop the audit. Finish it in **priority layers** (below).

---

## 2. What the original audit said (2026-06-22)

| Metric (then) | Finding |
|---|---|
| Integrity score | **3/10** — “rất yếu” |
| Tables with FKs | ~15 tables; many critical paths missing |
| Missing examples | tickets→events/users, orders→users, reviews, notifications, event_media, … |
| Migration runner | Not transactional |
| Destructive migrations | 025/026 DROP CASCADE |

Documents:

| File | Role |
|---|---|
| `01-executive-summary.md` | Scores + top risks |
| `04-data-integrity.md` | Full missing-FK matrix |
| `09-table-inventory.md` | Per-table columns |
| `10-fix-plan.md` | P0–P3 execution plan |
| `11-migration-templates.md` | SQL templates (numbering outdated) |

---

## 3. Live survey (2026-07-17) — current DB

### 3.1 Scale

| Metric | Value |
|---|---|
| Base tables | **38** (incl. `schema_migrations`) |
| Foreign keys | **31** constraints |

### 3.2 FKs already present (after 031 + original migrations)

**Commerce / identity (Portfolio core) — largely fixed:**

| From | To | Constraint |
|---|---|---|
| `tickets.event_id` | `events.id` | `fk_tickets_event_id` |
| `tickets.user_id` | `auth_users.id` | `fk_tickets_user_id` |
| `tickets.order_id` | `orders.id` | `fk_tickets_order_id` |
| `orders.user_id` | `auth_users.id` | `fk_orders_user_id` |
| `orders.event_id` | `events.id` | `fk_orders_event_id` |
| `order_items.order_id` | `orders.id` | (original) |
| `order_items.event_id` | `events.id` | `fk_order_items_event_id` |
| `order_items.ticket_id` | `tickets.id` | `fk_order_items_ticket_id` |
| `payment_attempts.order_id` | `orders.id` | (original) |
| `payment_attempts.ticket_id` | `tickets.id` | `fk_payment_attempts_ticket_id` |
| `reviews.event_id` / `user_id` | events / auth_users | `fk_reviews_*` |
| `notifications.user_id` / `event_id` | auth_users / events | `fk_notifications_*` |
| `event_media.event_id` / `user_id` | events / auth_users | `fk_event_media_*` |
| `user_profiles.id` | `auth_users.id` | `fk_user_profiles_auth_user` |
| `sessions.user_id` | `auth_users.id` | (original) |
| Org memberships, roles, seats chain, loyalty, vouchers.event_id | various | original |

### 3.3 Still missing FKs (why your diagram looks disconnected)

These `*_id` columns exist **without** a FOREIGN KEY (live survey `NO_FK|…`):

#### Tier A — should fix for a correct ERD / Portfolio integrity

| Column | Suggested reference | Why |
|---|---|---|
| `events.organizer_id` | `auth_users(id)` **or** `organizer_profiles(user_id)` | Event ownership |
| `events.venue_id` | `venues(id)` | Venue relationship |
| `orders.organizer_id` | `auth_users(id)` | Settlement path |
| `tickets.organizer_id` | `auth_users(id)` | Consistency with event |
| `tickets.order_item_id` | `order_items(id)` | Order line link |
| `tickets.payment_attempt_id` | `payment_attempts(id)` | Payment trail |
| `promotions.event_id` | `events(id)` | Promo scope |
| `promotions.organizer_id` | `auth_users(id)` | Owner |
| `analytics.event_id` | `events(id)` | Metrics belong to event |
| `featured_profiles.owner_user_id` | `auth_users(id)` | Owner |
| `organizer_profiles.user_id` | `auth_users(id)` | Profile identity |
| `organizer_settings.organizer_id` | `auth_users(id)` | Settings owner |
| `organizer_balances.organizer_id` | `auth_users(id)` | Balance owner |
| `ledger_entries.organizer_id` | `auth_users(id)` | Ledger party |
| `seat_holds.user_id` | `auth_users(id)` | Who holds seat |
| `order_items.seat_id` | `seats(id)` | Seat booking |

#### Tier B — usually **not** FK (not relational parents)

| Column | Reason |
|---|---|
| `audit_logs.resource_id` | Polymorphic (event/order/user…) |
| `audit_logs.user_id` | Prefer `actor_id` + optional FK to `auth_users` if always a user |
| `loyalty_points_ledger.reference_id` | Polymorphic (ticket/order) |
| `payment_attempts.provider_*` / `transaction_id` | External gateway IDs |
| `tickets.zalo_app_trans_id` | External |
| `tickets.group_id` | Soft group key (unless you add a groups table) |
| `order_items.ticket_type_id` | Often string key into JSON `events.ticket_types`, not a table |

### 3.4 Progress vs original integrity score

| Area | June audit | Now |
|---|---|---|
| Migrate transactional | Fail | **Fixed** |
| Core tickets/orders/reviews/notifications FKs | Missing | **Fixed (031)** |
| Identity profile→auth | Missing | **Fixed** |
| Event→venue/organizer | Missing | **Still open** |
| Finance/org/promo FKs | Missing | **Still open** |
| Seating user hold | Partial | **seat_holds.user_id open** |
| CHECK enums / timestamp unify | Weak | **Still open** |

**Integrity is better than 3/10 but not “finished.”** Your ERD still correctly shows many floating tables until Tier A FKs land.

---

## 4. Plan to finish the audit (execution, not more essay)

### Goal of “finish”

1. **Document truth:** live inventory matches ERD (what has FK / what is intentional non-FK).  
2. **Apply remaining Tier A FKs** with orphan cleanup (migration `033+`).  
3. **Close audit scorecard** (re-score integrity after FKs).  
4. **Optional P1:** CHECKs on status columns for core tables only.

### Phase DBA-1 — Reconcile docs (0.5 day) ✅ this document starts it

| Task | Output |
|---|---|
| Live FK list | §3 above |
| Mark 01-summary / 04 as **partially superseded** | Update README pointer |
| ERD legend | “solid line = FK; dashed = app-level / JSON ref” |

### Phase DBA-2 — Remaining Tier A FKs (1–2 days) ← **main work**

Migration strategy (same pattern as 031):

1. Expand `scripts/audit-orphans.sql` for Tier A columns.  
2. Migration `033_add_remaining_domain_fks.sql`:
   - DELETE/NULL orphans  
   - ADD CONSTRAINT IF NOT EXISTS for each Tier A row  
3. Re-run order/lifecycle smokes (seed parents first).  
4. Update ERD / diagram tool from live `pg_constraint`.

**Suggested FK decisions (pick one and stick to it):**

| Field | Decision |
|---|---|
| `events.organizer_id` | → `auth_users(id)` ON DELETE RESTRICT |
| `events.venue_id` | → `venues(id)` ON DELETE SET NULL |
| `*.organizer_id` on finance tables | → `auth_users(id)` (same as code today) |
| `organizer_profiles.user_id` | → `auth_users(id)` ON DELETE CASCADE |
| `seat_holds.user_id` | → `auth_users(id)` ON DELETE CASCADE |
| `order_items.seat_id` | → `seats(id)` ON DELETE SET NULL (nullable) |

### Phase DBA-3 — Core CHECK constraints (0.5–1 day, optional but good for ERD quality)

Only Portfolio-critical enums:

```text
events.status / visibility
orders.status
tickets.status
payment_attempts.status
reviews.rating 1..5
```

### Phase DBA-4 — Close the audit report (0.5 day)

| Task | Output |
|---|---|
| Re-run orphan script (all zero for FK columns) | Evidence |
| Write `13-post-fix-scorecard.md` | New integrity score |
| Update `01-executive-summary.md` banner: “Baseline June; delta July” | No rewrite entire June docs |
| Export ERD from live DB (optional tool) | Matches FKs |

### Explicitly **defer** (still not “out of scope forever”)

| Item | Defer until |
|---|---|
| Normalize `ticket_types` JSON → table | Product needs multi-price strategies |
| Merge promotions + vouchers | Single promo engine decision |
| All BIGINT → TIMESTAMPTZ | App-wide timestamp refactor |
| Partitioning / sharding | Real load |

---

## 5. How this relates to Portfolio V1

```text
Portfolio V1 product features  ── already mostly shipping
        │
        ├── DB integrity for CORE path     ← DONE (031)
        │
        └── DB integrity for FULL ERD      ← DBA-2 (this plan)  IN SCOPE
                (diagram / thesis / no floating tables)
```

Settlement **product** stays out of V1.  
Settlement **tables** (`ledger_entries`, balances) still deserve FKs if they appear on the diagram.

---

## 6. Immediate next steps (ordered)

| # | Action | Owner |
|---|---|---|
| 1 | Approve Tier A FK list (§3.3) | You / PO |
| 2 | Extend `audit-orphans.sql` for Tier A | Dev |
| 3 | Ship migration `033_add_remaining_domain_fks.sql` | Dev |
| 4 | Smoke: order-foundation + lifecycle + tickets | Dev |
| 5 | Refresh diagram from live FKs | You |
| 6 | Write `13-post-fix-scorecard.md` | Dev |

---

## 7. Answer to “why does my diagram lack relationships?”

Because historically tables were created **without FKs** (Firebase-era / aggregate-style TEXT ids). Migration **031** fixed the **commerce spine**. Everything else (events ownership, venues, promos, finance, seat hold user) still has only **logical** IDs — the database does not enforce them, so diagram tools that read constraints show **orphan boxes**.

Finishing DBA-2 makes the diagram match reality.

---

## 8. Status checklist

| Audit fix-plan item | Status |
|---|---|
| P0.1 transactional migrate | ✅ Done |
| P0.2 audit_logs reconcile | ⬜ Optional / lower than Tier A FKs |
| P0.3 critical FKs (commerce) | ✅ Done as 031 (renumbered vs template 033) |
| Remaining domain FKs | ⬜ **DBA-2 — finish plan focus** |
| P1 CHECKs / timestamps | ⬜ DBA-3 optional |
| P2 normalize JSON | ⬜ Deferred |
| P3 scale | ⬜ Out of Portfolio |

---

**Conclusion:** The db-audit is **in scope**. Core integrity is partially complete. **Finish = Tier A FKs + live scorecard + diagram refresh**, not re-writing all 11 audit essays or building enterprise finance product.
