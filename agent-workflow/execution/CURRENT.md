# CURRENT — Active execution pointer

> **Updated:** 2026-07-18

## Active program

| Field | Value |
|---|---|
| Program | **DB-FINISH-ALL** |
| Status | **CLOSED** |
| Hub | [db/finish/](db/finish/) |
| Final scorecard | [db/finish/99-final-scorecard.md](db/finish/99-final-scorecard.md) |
| Overall score | **~8.9/10** (target 9.0) |

## Closed DB programs

| Program | Location | Migrations |
|---|---|---|
| Integrity | [db/integrity/](db/integrity/) | 031–036 |
| Normalize | [db/normalize/](db/normalize/) | 037–046 |
| Finish | [db/finish/](db/finish/) | 047–060 |

## Verify

```bash
cd Server-2025-Eventing
npm run db:migrate
npm run db:smoke:order-foundation
npm run db:audit:orphans
node src/jobs/retention.job.js
```

## Git policy

Commit after each phase gate.  
Apps = `server/`, `web/`, `mobile-attendee/`, `mobile-organizer/` (each own repo).  
Docs = monorepo root. No push unless asked.

## Archive

Old folder names + pre-remake tags: [`../../../archive/legacy-folder-names-2026-07/README.md`](../../../archive/legacy-folder-names-2026-07/README.md)
