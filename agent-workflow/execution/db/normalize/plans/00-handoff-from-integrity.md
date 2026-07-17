# 00 — Handoff: Integrity CLOSED → 3NF OPEN

| Item | Value |
|---|---|
| Closed program | `execution/db-audit` (DBA integrity) |
| Closed date | 2026-07-17 |
| Open program | `execution/db-3nf` |
| Last migration of closed program | `036_rename_fk_constraints_consistent.sql` |
| Next migration for new program | **037+** |

## Integrity exit metrics (do not regress)

| Metric | Value |
|---|---|
| Tables | 38 |
| FKs | 49, all `fk_*` |
| CHECKs | 8 |
| Orphan audit | ALL CLEAR |
| Integrity score | ~8/10 |
| Normalization score | 4.5/10 ← **this program raises this** |

## What we will not undo

- Transactional `migrate.js`
- Existing Tier A FKs
- Status CHECKs
- FK naming convention

## What we will change

- Structural normalization (tables for entities trapped in JSON/arrays)
- Optional derived-field sync
- **Direct schema cutovers** (empty-dev: no data-preservation dual-write)
- App + seeds + smokes updated in the same phase as schema

## Standing constraint

**Do not care about existing DB data** during this program. Dev has nothing to preserve; prefer DROP/recreate/re-seed over expand–contract.
