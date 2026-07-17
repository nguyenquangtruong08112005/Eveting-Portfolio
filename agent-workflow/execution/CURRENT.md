# CURRENT — Active execution pointer

> **Updated:** 2026-07-18

## Active program

| Field | Value |
|---|---|
| Program | **DB-FINISH-ALL** (close residual audit aspects) |
| Status | **OPEN** — W0 reorg done; W1–W6 pending |
| Hub | [db/finish/](db/finish/) |
| Master plan | [db/finish/00-master-plan.md](db/finish/00-master-plan.md) |

## Closed DB programs (do not re-open unless regression)

| Program | Location | Last migration band |
|---|---|---|
| Integrity / DBA | [db/integrity/](db/integrity/) | 031–036 |
| 3NF + identity + timestamps + GIN + partition | [db/normalize/](db/normalize/) | 037–046 |

## Live DB snapshot (as of normalize close)

- Migrations through **046**
- FKs ~63, orphans ALL CLEAR
- Overall score ~**7.7/10** → finish program targets ~**9.0/10**

## How to verify

```bash
cd Server-2025-Eventing
npm run db:migrate
npm run db:smoke:order-foundation
npm run db:audit:orphans
```

## Git policy (standing)

- **Commit often** after each phase gate (W0–W6) and after each migration band lands.
- Server app repo: `Server-2025-Eventing` (own `.git`).
- Monorepo docs: repo root (`agent-workflow`, `START_HERE`, etc.).
- Apps under root `.gitignore` (`web-2025-eventing`, mobiles) have separate repos if present.
- Do **not** push unless the user asks.