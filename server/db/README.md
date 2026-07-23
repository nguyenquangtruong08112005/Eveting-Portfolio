# Database migrations

Runner: `node db/migrate.js` (`npm run db:migrate`).

| Band | Program |
|---|---|
| 001–030 | Original schema |
| 031–036 | Integrity (FKs, CHECKs, naming) |
| 037–046 | 3NF + identity + TIMESTAMPTZ + GIN + partitions |
| **047+** | Finish program — see `agent-workflow/execution/db/finish/` |

Do not reorder applied files. Empty-dev: direct cutovers OK.
