# 13 — Post-Fix Scorecard (DB Audit Closed)

> **Date:** 2026-07-17 (updated after migration 036 + doc re-review)  
> **Baseline:** `01-executive-summary.md` (2026-06-22)  
> **Live verification:** Postgres after migrations **031–036**

---

## 1. Score comparison

| Criterion | June 2026 | July 2026 (after DBA + 036) | Delta | Notes |
|---|---|---|---|---|
| Architecture | 7/10 | **7.5/10** | +0.5 | Domain tables + real FK spine |
| Normalization | 4/10 | **4.5/10** | +0.5 | FKs only; still hybrid JSON / arrays |
| **Data integrity** | **3/10** | **8/10** | +5 | 49 FKs, 8 CHECKs, orphans clear, TX migrate |
| Performance | 6/10 | **6/10** | 0 | GIN / composite deferred |
| Consistency | 4/10 | **5.5/10** | +1.5 | Status CHECKs; dual timestamps remain |
| Naming | 6/10 | **7.5/10** | +1.5 | All FKs = `fk_<table>_<column>` |
| Scalability | 5/10 | **5/10** | 0 | Partition / replica deferred |

**Equal-weight overall: ~6.3/10** (was ~5/10).

**Portfolio integrity gate (relationships + migrate safety): PASS.**

Integrity is no longer the critical failure mode. Remaining gaps are intentional deferrals (JSON normalize, timestamp unify, scale).

---

## 2. Live metrics

| Metric | Value |
|---|---|
| Tables | 38 |
| Foreign keys | **49** |
| FK naming non-conformant (`*_fkey` etc.) | **0** |
| CHECKs | **8** (`chk_events_status`, `chk_events_visibility`, `chk_orders_status`, `chk_payment_attempts_status`, `chk_reviews_rating`, `chk_tickets_status`, + legacy loyalty/vouchers) |
| Orphan audit | **ALL CLEAR** |
| Migrations applied through | **036_rename_fk_constraints_consistent.sql** |

### Commerce / identity spine

| Relationship | Status |
|---|---|
| tickets → events, auth_users, orders | ✅ |
| orders → auth_users, events | ✅ |
| order_items → orders, events, tickets, seats | ✅ |
| payment_attempts → orders, tickets | ✅ |
| reviews → events, auth_users | ✅ |
| notifications, event_media → users/events | ✅ |
| user_profiles → auth_users | ✅ |

### Domain completion

| Relationship | Status |
|---|---|
| events → auth_users (organizer), venues | ✅ |
| orders/tickets.organizer_id → auth_users | ✅ |
| tickets → order_items, payment_attempts | ✅ |
| promotions → events, auth_users | ✅ |
| analytics → events | ✅ |
| organizer_profiles/settings/balances → auth_users | ✅ |
| ledger_entries → auth_users + orders | ✅ |
| seat_holds → auth_users (+ seats/events) | ✅ |
| featured_profiles.owner → auth_users | ✅ |
| audit_logs.user_id / auth_tokens.user_id | ✅ (035) |

---

## 3. 3NF verdict (minimum level)

### Short answer: **No — the database as a whole does not meet strict 3NF.**

| Normal form | Portfolio core tables | Whole schema |
|---|---|---|
| **1NF** | Mostly OK for tickets/orders/payments | **Fails** on multi-value columns (`TEXT[]` ID lists, multi-entity JSONB) |
| **2NF** | **OK** (single-column PKs dominate) | **OK** |
| **3NF** | **Partial** | **Not met** — transitive deps + denormalized document fields |

### Still not 3NF (by design or deferred)

| Pattern | Examples | Classification |
|---|---|---|
| Multi-value columns (1NF) | `events.featured_profile_ids`, `user_profiles.followed_profile_ids`, `history_event_ids`, roles arrays | Should be junction tables for pure 3NF |
| Nested entities in JSONB | `events.ticket_types`, `venues.data`, analytics series | Document hybrid; ticket_types is main product gap |
| Transitive / snapshot | `events.venue_name`/`city`, `order_items.event_name`, review user snapshot | Snapshots OK if documented; venue snapshot is weaker |
| God-table mix | `tickets` holds payment + check-in + QR linkage | Not a pure 3NF boundary |

### Acceptable denormalization (keep)

- Order/payment/gateway snapshots (`event_name`, payloads).
- Review author snapshot at write time.
- `raw_data` debug blobs.

### Practical bar for Portfolio V1

- **Referential integrity (ERD honesty):** met.  
- **Strict textbook 3NF across all tables:** **not** met and **not required** to close the DBA integrity phase.  
- Raising normalization to full 3NF is a **separate product/schema phase** (ticket types table, follows table, venue columns).

---

## 4. ERD legend

| Line style | Meaning |
|---|---|
| **Solid** | Real PostgreSQL FK named `fk_<table>_<column>` |
| **Dashed** | App-level only — gateway IDs, polymorphic `audit_logs.resource_id`, JSON keys, `group_id` |
| **No line** | Should not appear for Tier A domain `*_id` columns |

```bash
node scripts/_live_fk_survey.js
node scripts/_fk_count.js
```

---

## 5. Migrations delivered

| Migration | Purpose |
|---|---|
| `031_cleanup_orphans_and_critical_fks.sql` | Commerce + profile FKs |
| `032_portfolio_constraints.sql` | One review per user/event |
| `033_add_remaining_domain_fks.sql` | Tier A domain FKs |
| `034_core_status_check_constraints.sql` | Status / rating CHECKs |
| `035_audit_and_auth_tokens_user_fks.sql` | Actor FKs |
| `036_rename_fk_constraints_consistent.sql` | All FKs → `fk_<table>_<column>` |
| `migrate.js` | Transactional per file |

Scripts: `scripts/run-orphan-audit.js`, `scripts/audit-orphans.sql`, `scripts/_live_fk_survey.js`, `scripts/_dba_close_metrics.js`.

---

## 6. Explicitly still deferred (not phase blockers)

| Item | Why deferred |
|---|---|
| Normalize `events.ticket_types` JSON → table | Product schema change |
| Junction tables for follows / featured profiles | Product + app rewrite |
| Merge promotions + vouchers | Product decision |
| All BIGINT → TIMESTAMPTZ | App-wide refactor |
| GIN / composite index pack | Perf when needed |
| Partition / replica | Scale P3 |
| Polymorphic audit resource FKs | Design choice |

---

## 7. Phase gate summary

| Phase | Verdict |
|---|---|
| DBA-1 Docs / live gap | **PASS** → [reviews/DBA-1-review.md](reviews/DBA-1-review.md) |
| DBA-2 Remaining FKs | **PASS** → [reviews/DBA-2-review.md](reviews/DBA-2-review.md) |
| DBA-3 Status CHECKs | **PASS** → [reviews/DBA-3-review.md](reviews/DBA-3-review.md) |
| DBA-4 Scorecard + ERD legend | **PASS** → [reviews/DBA-4-review.md](reviews/DBA-4-review.md) |
| DBA-5 Naming pass (036) | **PASS** (this scorecard) |

---

## 8. Audit program status

**CLOSED for Portfolio V1 relationship integrity + FK naming + migrate safety.**

Use **this scorecard + live FK list** as integrity truth. June package (`01`–`11`) remains historical evidence; do not re-open DBA phases for deferred P2–P3 items unless product scope expands.

**Next program:** [../db-3nf/](../db-3nf/) — raise normalization (3NF) starting at migration **037**.
