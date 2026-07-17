# DB Audit — Server-2025-Eventing

Báo cáo khảo sát database của `Server-2025-Eventing`.

| Layer | Role |
|---|---|
| **Current truth** | `13-post-fix-scorecard.md` + live Postgres |
| **Baseline (historical)** | `01` … `11` (2026-06-22 schema/file audit) |
| **Finish plan (done)** | `12-live-gap-and-finish-plan.md` |
| **Phase gates** | `reviews/DBA-1…4-review.md` — all **PASS** |

## Live snapshot (2026-07-17, post 031–036)

| Metric | Value |
|---|---|
| Tables | **38** |
| Foreign keys | **49** — all named `fk_<table>_<column>` |
| Core status/type CHECKs | **8** (6 named `chk_*` + 2 legacy) |
| Orphan audit | **ALL CLEAR** |
| Migrations applied | **001 → 036** |

## Portfolio V1 scope

| Work | Status |
|---|---|
| Transactional `migrate.js` | Done |
| Commerce + domain FKs (ERD solid lines) | Done (031–033, 035) |
| Status CHECKs | Done (034) |
| FK naming consistency | Done (036) |
| JSONB normalize / TIMESTAMPTZ unify / partition | **Deferred** (not V1 gate) |

## How to read

1. **`13-post-fix-scorecard.md`** — scores, ERD legend, deferred list.
2. **`reviews/*`** — DBA phase PASS records.
3. `01`–`11` — June deep-dive; numbers may be stale (use scorecard for scores).
4. `12` — plan used to finish; historical after close.

## Scores (July 2026 re-rate after 036)

| Criterion | June 2026 | July 2026 |
|---|---|---|
| Architecture | 7/10 | **7.5/10** |
| Normalization | 4/10 | **4.5/10** |
| **Data integrity** | **3/10** | **8/10** |
| Performance | 6/10 | **6/10** |
| Consistency | 4/10 | **5.5/10** |
| Naming | 6/10 | **7.5/10** |
| Scalability | 5/10 | **5/10** |
| **Overall (equal-weight)** | **~5/10** | **~6.3/10** |

**Integrity-focused portfolio gate:** **PASS / CLOSED.**

**Successor program:** [../db-3nf/](../db-3nf/) — 3NF optimization (OPEN).  
Do not re-open DBA integrity phases unless orphans/FKs regress.

## Verify live

```bash
cd Server-2025-Eventing
node scripts/_live_fk_survey.js
node scripts/run-orphan-audit.js
node scripts/_dba_close_metrics.js
```
