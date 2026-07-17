# W0 — Reorg checklist

> **Status:** PASS (2026-07-18)

## agent-workflow

- [x] `execution/db/integrity/{baseline-2026-06,close-out}` from old `db-audit`
- [x] `execution/db/normalize/{plans,scorecards}` from old `db-3nf`
- [x] `execution/db/finish/` open program
- [x] `execution/CURRENT.md` pointer
- [x] Old `execution/active/*` → `execution/archive/active-2026-07/`
- [x] Old `db-refactor` → `normalize/legacy-notes`

## Server-2025-Eventing

- [x] `scripts/smoke/` — smoke tests
- [x] `scripts/seed/` — seed runners
- [x] `scripts/db/` + `probes/` — audits
- [x] `scripts/maintenance/` — cleanup, reindex, logs
- [x] `scripts/ci/` — syntax check, unit helpers
- [x] `seed/postgres/` vs `seed/legacy/`
- [x] `package.json` script paths updated
- [x] Relative requires fixed (`../../src/...`)
- [x] `npm run db:smoke:order-foundation` green after reorg

## Docs links

- [x] START_HERE / root README point at CURRENT + db hub
