# Plan: Finish All DB-Audit Aspects + Project File Reorganization

> **Program ID:** DB-FINISH-ALL + REORG  
> **Date:** 2026-07-18  
> **Constraints:** Portfolio V1 · empty-dev (no data preservation) · single-agent, review gates  
> **Baseline:** Integrity closed (031–036); 3NF+identity+ts+GIN+partition (037–046)  
> **Target overall score:** ~9/10 across the 7 audit criteria (user “6 aspects” mapped below to audit’s 7)

---

## 0. Goals

1. **Close residual work** from the original `db-audit` across every scoring axis.  
2. **Reorganize monorepo / agent-workflow / Server scripts** so current truth is easy to find and historical material is classified.  
3. Keep **demo-critical paths green** (auth, event lifecycle, book/pay, check-in, reviews).  
4. Do **not** re-open enterprise finance (settlement/cooling) or multi-region HA.

### Standing rules

- Empty-dev: direct schema cutovers, re-seed, re-smoke.  
- Migrations continue at **047+**, transactional via `migrate.js`.  
- FK names: `fk_<table>_<column>`.  
- Acceptable denorm kept: order/review/gateway snapshots.  
- Review gate after each major phase before the next.

---

## 1. Aspect map (audit → residual → finish phases)

Original audit used **7 criteria**. Residual work is grouped into **6 finish workstreams** (W1–W6) that cover all residuals listed previously.

| # | Audit criterion | Finish workstream | Primary residual |
|---|---|---|---|
| A1 | Architecture | **W1 Architecture** | Ticket god-table split; payment SoT boundary; dual event status |
| A2 | Normalization | **W2 Normalization** | Roles junction / RBAC; venue bag finish; remaining JSON entities |
| A3 | Data integrity | **W3 Integrity** | Exhaustive CHECKs; notifications user FK story |
| A4 | Performance | **W4 Performance** | Composite indexes; SELECT hygiene; ledger partition |
| A5 | Consistency | *(merged into W1 + W2)* | Status/payment/roles/counters SoT |
| A6 | Naming | **W5 Naming** | `events.date`→`start_at`; time column vocabulary; promotions rename |
| A7 | Scalability | **W6 Scalability / Ops** | Soft-delete; retention jobs; partition maintenance; PK strategy (optional) |
| — | Docs / structure | **W0 Reorg** | Folder classification; single “current truth” index |

**Score targets after all workstreams:**

| Criterion | Now (~) | Target |
|---|---|---|
| Architecture | 8.5 | **9.0** |
| Normalization | 8.0 | **9.0** |
| Integrity | 8.5 | **9.5** |
| Performance | 7.0 | **8.5** |
| Consistency | 8.0 | **9.0** |
| Naming | 7.5 | **9.0** |
| Scalability | 6.5 | **8.0** |
| Overall | ~7.7 | **~9.0** |

---

## 2. Phase W0 — Project file structure reorganization

### 2.1 Problems today

| Area | Issue |
|---|---|
| `agent-workflow/execution/` | Parallel `db-audit`, `db-3nf`, `db-refactor`, `active/*`, `code-review` without a single index of **current truth** |
| June `01–11` vs July scorecards | Readers mix historical scores with live state |
| `Server-2025-Eventing/scripts/` | Flat dump: smokes, seeds, one-off probes (`_*`), cleanup, reindex mixed |
| `Server-2025-Eventing/seed/` | Legacy Firebase JSON + fakedb mixed with useful seeds |
| Monorepo root | OK (`START_HERE`, apps), but agent-workflow is the dense mess |
| `archive/` | Large history (good) but execution still holds completed “active” pointers |

### 2.2 Target structure (agent-workflow)

```text
agent-workflow/
  README.md                          # how to navigate
  knowledge/                         # domain/product (keep; freeze enterprise)
    project/
    decisions/
    diagrams/
    INDEX.md
  execution/
    README.md                        # “current programs”
    CURRENT.md                       # single pointer: active program + score
    db/
      README.md                      # DB program hub
      integrity/                     # move/rename from db-audit (closed)
        baseline-2026-06/            # 01–11 historical
        close-out/                   # 12, 13, reviews/
      normalize/                     # move from db-3nf (closed)
        plans/
        scorecards/
      finish/                        # NEW — this program (open)
        00-master-plan.md            # copy of this plan (durable)
        01-architecture.md
        02-normalization.md
        03-integrity.md
        04-performance.md
        05-naming.md
        06-scalability.md
        07-reorg-checklist.md
        reviews/                     # W0–W6 gates
    code-review/                     # keep or archive completed
    archive/                         # move closed execution packs when done
  archive/                           # existing long-term archive (keep)
```

**Rules:**

- Only `execution/CURRENT.md` + `execution/db/finish/` are “open work.”  
- `db-audit` / `db-3nf` become **closed libraries** under `execution/db/{integrity,normalize}/`.  
- Do **not** delete June baseline; move under `baseline-2026-06/`.  
- After W0, update `START_HERE.md` + root `README.md` links.

### 2.3 Target structure (Server scripts)

```text
Server-2025-Eventing/
  scripts/
    smoke/                 # all smoke.*.js
    seed/                  # seed.*.js (+ optional move json seeds later)
    db/                    # audit-orphans, run-orphan-audit, migrate helpers
      probes/              # _fk_count, _live_fk_survey, _schema_ts_probe, …
    maintenance/           # cleanup*, reindex*, update-event-dates, tail-log
    ci/                    # check-js-syntax, structured-errors, mobile-contracts
  seed/
    postgres/              # keep postgres-relevant
    legacy/                # firebase_seed_data, fakedb, events_FIXED, etc.
  db/
    migrations/            # keep flat numbered (no split — migrate.js order)
    README.md              # migration index 001–046 done, 047+ planned
```

**Implementation notes:**

- Prefer **git mv** to preserve history.  
- Update `package.json` scripts paths (`npm run smoke:*`) if any point at old paths.  
- Add thin root shims only if something external hardcodes paths (prefer update package.json).  
- Probes keep leading `_` or move under `probes/` without underscore.

### 2.4 Target structure (optional monorepo docs)

```text
docs/                         # optional top-level for thesis readers
  DB_CURRENT.md               # symlink/copy of scoreboard
  ARCHITECTURE.md             # short monorepo map
```

Or keep under `agent-workflow` only — prefer **not** duplicating; one hub.

### 2.5 W0 tasks & gate

| ID | Task | Output |
|---|---|---|
| W0.1 | Create `execution/db/` hub + move closed packs | tree as above |
| W0.2 | Write `execution/CURRENT.md` + `execution/db/finish/00-master-plan.md` | pointers |
| W0.3 | Reclassify Server `scripts/` + `seed/legacy/` | new folders |
| W0.4 | Fix package.json / START_HERE / README links | green paths |
| W0.5 | Archive `execution/active/*` completed markers | no stale “OPEN” |

**Exit gate:** Any new contributor can find “DB current score + open plan” in ≤2 clicks; smokes still runnable via documented commands.

---

## 3. Phase W1 — Architecture (+ consistency of status/payment)

### 3.1 Dual event status → single SoT

**Problem:** `events.status` and `events.lifecycle_status` coexist.

**Decision (recommended):**

- **SoT:** `lifecycle_status` for lifecycle machine (DRAFT→…→COMPLETED).  
- Keep `status` temporarily as **derived projection** for legacy public filters (`active`/`published`) **or** map lifecycle→public status in API only and drop column.

**Plan:**

| Step | Work | Migration |
|---|---|---|
| W1.1 | Document lifecycle ↔ public mapping table in finish docs | — |
| W1.2 | App: all transitions write lifecycle; public list reads lifecycle map | — |
| W1.3 | Backfill not needed (empty-dev); set `status` from map on write or drop | `047` |
| W1.4 | CHECK only on lifecycle (+ visibility already exists) | `047` |
| W1.5 | Drop `events.status` if API fully mapped (preferred end state) | `047` or `048` |

### 3.2 Payment SoT → `payment_attempts`

**Problem:** payment truth split across tickets / orders / payment_attempts.

**Decision:**

| Field class | SoT |
|---|---|
| Attempt lifecycle | `payment_attempts.status` |
| Order paid/cancelled | `orders.status` + timestamps |
| Ticket eligibility | derived from order/payment; ticket keeps **snapshot** only if needed for mobile payload |

**Plan:**

| Step | Work | Migration |
|---|---|---|
| W1.6 | Inventory all writers of `tickets.payment_*`, `zalo_*`, `last_payment_attempt` | doc |
| W1.7 | Write path: payment callbacks update `payment_attempts` then `orders`; tickets get status only | app |
| W1.8 | Optionally drop or freeze ticket payment columns after cutover | `048` |
| W1.9 | Smokes: zalopay callback, order-wiring, tickets | scripts |

### 3.3 Tickets god-table split (architecture)

**Target tables (expand-contract not required — empty-dev direct):**

```text
tickets                 -- core: id, event_id, user_id, order_item_id, type, qty, prices, status, qr ref
ticket_check_ins        -- ticket_id, checked_in_at, staff_id, event_id, count
ticket_qr_tokens        -- ticket_id, token_hash, expires_at, revoked_at  (optional if JWT-only)
```

| Step | Work | Migration |
|---|---|---|
| W1.10 | Design column move matrix | doc |
| W1.11 | Create check-in (+ optional QR) tables + FKs | `049` |
| W1.12 | Move check-in fields off tickets; update organizer check-in service | app |
| W1.13 | Leave gateway snapshot columns off tickets if still needed → payment_attempts only | app |

### 3.4 W1 exit gate

- One lifecycle SoT documented and enforced.  
- Payment attempt is authority for payment state.  
- Check-in not mixed into payment columns.  
- Smokes: lifecycle, order, zalopay, check-in.

---

## 4. Phase W2 — Normalization (remaining)

### 2.1 Roles TEXT[] → relational (optional depth)

**Option A (recommended for portfolio):** `user_roles(user_id, role_id)` + seed roles from `roles` table; stop using TEXT[] for authz.  
**Option B:** Keep TEXT[] but mark RBAC tables as future — weaker.

**Plan (A):**

| Step | Migration / app |
|---|---|
| W2.1 | `050_user_roles.sql` — table + FKs + seed from `auth_users.roles` |
| W2.2 | Authz middleware reads `user_roles` (+ org memberships where needed) |
| W2.3 | Drop `auth_users.roles` array (or keep deprecated read-only) |
| W2.4 | Smoke rbac + auth |

### 2.2 Venue bag finish

| Step | Work |
|---|---|
| W2.5 | Ensure all readers use atomic columns first |
| W2.6 | Stop writing core fields into `venues.data` |
| W2.7 | Optional: shrink `data` to extension-only; document |

### 2.3 Remaining JSON entities (product-priority order)

| Entity | Action | Priority |
|---|---|---|
| `events.sponsors` | Optional `event_sponsors` table | Medium |
| `analytics.*` time series JSON | Optional child tables | Low (reporting) |
| `events.location` | Keep JSON **or** lat/lng columns only | Low if venue covers physical |
| `promotions.data` residual rules | Prefer columns already added | Medium |

| Step | Work | Migration |
|---|---|---|
| W2.8 | Decide keep-list vs table-list in finish doc | — |
| W2.9 | Implement high-priority only (sponsors if demo needs; else skip) | `051` optional |

### 2.4 Counters

| Counter | Strategy |
|---|---|
| followers/following | Trigger on `user_follows` **or** recompute on read for portfolio |
| points | Trigger on `loyalty_points_ledger` → `user_memberships` / profile |
| min_price | Recompute from `event_ticket_types` on type write (already partial) |
| view_count | Optional side table later |

| Step | Work | Migration |
|---|---|---|
| W2.10 | SQL triggers for follows counters + points | `052` |
| W2.11 | App remove dual-write counter increments | app |

### W2 exit gate

- Roles SoT documented and used by authz.  
- Venue core fields not depend on JSON bag.  
- Counters cannot drift silently (triggers or pure compute).

---

## 5. Phase W3 — Integrity polish

| Step | Work | Migration |
|---|---|---|
| W3.1 | Inventory free-text status/type columns still without CHECK | probe script |
| W3.2 | Add CHECKs: seat status, seat_hold status, outbox status, ledger types, profile level, ticket type availability ≥ 0 | `053` |
| W3.3 | Notifications: replace `user_id='all'` with `NULL` + `audience='broadcast'` column **or** dedicated broadcast table | `054` |
| W3.4 | Re-add safe FK `notifications.user_id → auth_users` for non-broadcast rows (partial or nullable) | `054` |
| W3.5 | Expand orphan audit SQL for new tables | scripts |
| W3.6 | Enum documentation table (markdown) matching CHECKs | docs |

**Exit gate:** Orphan audit ALL CLEAR; CHECK count documented; no sentinel `'all'` user id.

---

## 6. Phase W4 — Performance

### 4.1 Composite indexes

| Index | Purpose |
|---|---|
| `notifications (user_id, is_read, created_at DESC)` | Inbox |
| `tickets (event_id, status)` | Organizer listing |
| `tickets (user_id, status)` | My tickets |
| `events (lifecycle_status, visibility, start_at)` | Discovery (after rename) |
| `orders (user_id, status, created_at DESC)` | Order history |
| `payment_attempts (order_id, status)` | Payment lookup |
| `outbox (status, created_at)` | Worker poll (if not covered) |

Migration: `055_composite_indexes.sql`.

### 4.2 Query hygiene

| Step | Work |
|---|---|
| W4.1 | Grep repositories for `SELECT *` on wide tables; project needed columns |
| W4.2 | Event list endpoints avoid loading full ticket type maps when not needed |
| W4.3 | Document anti-patterns in finish/04-performance.md |

### 4.3 Partition expansion

| Step | Work | Migration |
|---|---|---|
| W4.4 | Partition `ledger_entries` by `created_at` (empty-dev recreate) | `056` |
| W4.5 | Script `scripts/db/create_next_partitions.js` for year+1 on notif/outbox/audit/ledger | script |
| W4.6 | Optional: `idempotency_keys` TTL job only (no partition required) | job |

### W4 exit gate

- Composite indexes live; EXPLAIN sample queries use them (document).  
- Ledger partitioned or explicitly deferred with reason.  
- Partition maintainer script exists.

---

## 7. Phase W5 — Naming

| Step | Work | Migration / app |
|---|---|---|
| W5.1 | Rename `events.date` → `events.start_at` (and keep `end_date` → `end_at` optional) | `057` + app FIELD_MAP |
| W5.2 | Normalize time names where cheap: prefer `*_at` over `purchase_date` / `payment_time` | `057` partial or `058` |
| W5.3 | Rename `promotions` → `discount_codes` **or** document promotions as final name (avoid churn if demo uses “promo”) | product choice |
| W5.4 | `platform_fees` singleton: CHECK or named constraint; document | `059` |
| W5.5 | Table naming note: leave `analytics`/`outbox` unless low-cost rename views | docs only |
| W5.6 | Update ERD legend + finish naming checklist | docs |

**Recommendation:** Do **start_at** rename (high clarity). Defer `promotions` rename if API contracts use `/promotions`.

### W5 exit gate

- No public reliance on `events.date` column name.  
- Naming checklist green for constraints/indexes/FKs (already mostly ok).

---

## 8. Phase W6 — Scalability / ops

| Step | Work | Migration / code |
|---|---|---|
| W6.1 | Soft-delete: add `deleted_at TIMESTAMPTZ` to events, auth_users/profiles, venues, orders (nullable) | `060` |
| W6.2 | Repositories filter `deleted_at IS NULL` by default | app |
| W6.3 | Retention job skeleton: delete/archive outbox completed > N days; idempotency expired; audit optional | `jobs/retention.job.js` |
| W6.4 | Document PK strategy decision: **keep TEXT** for portfolio **or** UUID v7 for new tables only | ADR |
| W6.5 | Document read-replica runbook (no infra requirement for V1) | docs |
| W6.6 | Explicitly out-of-scope: sharding, multi-region | docs |

**Exit gate:** Soft-delete columns exist and are honored on main reads; retention job runs dry-run mode; ADR written.

---

## 9. Migration number reservation (047+)

| # | Intent | Phase |
|---|---|---|
| 047 | Event lifecycle single SoT / drop or freeze status | W1 |
| 048 | Payment field cleanup on tickets | W1 |
| 049 | ticket_check_ins (+ optional QR table) | W1 |
| 050 | user_roles | W2 |
| 051 | event_sponsors (optional) | W2 |
| 052 | counter triggers | W2 |
| 053 | remaining CHECKs | W3 |
| 054 | notifications audience model + FK | W3 |
| 055 | composite indexes | W4 |
| 056 | partition ledger_entries | W4 |
| 057 | events.start_at rename (+ optional end_at) | W5 |
| 058 | optional time column renames on tickets | W5 |
| 059 | platform_fees guard | W5 |
| 060 | soft-delete columns | W6 |

Numbers may slip; keep sequential.

---

## 10. Execution order & review gates

```text
W0 Reorg ──► W1 Architecture ──► W2 Normalization ──► W3 Integrity
                                                         │
                         W5 Naming ◄── W4 Performance ◄──┘
                              │
                         W6 Scalability ──► Final scorecard + archive finish/
```

| Gate | Required evidence |
|---|---|
| After W0 | Tree + links work; smoke command from README works |
| After W1 | Lifecycle + payment smokes green |
| After W2 | Authz/roles smoke; no dual-write counters |
| After W3 | Orphan audit + CHECK inventory |
| After W4 | Index list + optional EXPLAIN notes |
| After W5 | No `events.date` in code |
| After W6 | Soft-delete + retention dry-run + final scorecard |

**Parallelism:** W0 first (blocking). W5 naming can run after W1 (depends on lifecycle column). Prefer **serial** for single agent.

---

## 11. App / test touch matrix (high level)

| Area | Files (indicative) |
|---|---|
| Events lifecycle | `modules/events/**`, `postgres.event.repository.js`, admin smokes |
| Payment | `modules/payments/**`, `modules/tickets/**`, `postgres.order.repository.js`, zalopay smokes |
| Check-in | `modules/organizer/**`, ticket repo |
| Roles | `postgres.auth.repository.js`, `postgres.rbac.repository.js`, authz middleware |
| Notifications | notification repo, outbox dispatcher |
| Naming | event FIELD_MAP, mobile/web types if they map `date` |
| Soft-delete | all public list repositories |

---

## 12. Deliverables (definition of program done)

1. All W0–W6 exit gates **PASS** with review notes under `execution/db/finish/reviews/`.  
2. Migrations through planned set applied on local DB.  
3. Critical smokes green (auth, lifecycle, order-foundation, repeated-booking, zalopay if stable, rbac).  
4. Final scorecard `execution/db/finish/99-final-scorecard.md` with per-aspect scores.  
5. `execution/CURRENT.md` set to **CLOSED** and program archived under `execution/db/finish/` or `archive/`.  
6. Project folder structure matches §2; no flat smoke/probe mix.

---

## 13. Explicitly still optional / out of scope

| Item | Treatment |
|---|---|
| Enterprise settlement / cooling / multi-fault refunds | Out (PORTFOLIO_V1) |
| Full microservices split | Out |
| Production dual-write expand–contract | Out (empty-dev) |
| Sharding / multi-region | Document only |
| Global PK rewrite TEXT→UUID for all tables | ADR only unless time remains |
| Merging auth_users + user_profiles into one table | Not required after de-dupe |

---

## 14. Risk register

| Risk | Mitigation |
|---|---|
| Reorg breaks smoke entrypoints | Update package.json; run one smoke after W0 |
| Lifecycle rename breaks mobile contracts | Keep API DTO field names stable; only DB/internal rename |
| Payment cutover breaks ZaloPay demo | Keep gateway ids on payment_attempts; smokes first |
| Scope explosion (JSON analytics tables) | W2.8 keep-list; skip low value |
| Soft-delete breaks unique email constraints | Partial unique indexes `WHERE deleted_at IS NULL` |

---

## 15. Immediate next action (when approved)

1. Execute **W0** (folder reorg + CURRENT pointer + finish plan docs).  
2. Then **W1.1–W1.5** lifecycle SoT.  
3. Continue W1 payment → check-in split.

---

## 16. Success metrics

| Metric | Target |
|---|---|
| Open residual checklist items from prior message | **0 open** or documented defer with ADR |
| Overall DB score | **≥ 9.0** equal-weight |
| Orphan audit | ALL CLEAR |
| Critical smokes | All pass |
| Time to find current DB truth | ≤ 2 minutes for a new reader |
