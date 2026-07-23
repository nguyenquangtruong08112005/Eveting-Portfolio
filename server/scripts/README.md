# Scripts layout

| Folder | Contents |
|---|---|
| `smoke/` | Integration smoke tests (`npm run db:smoke:*`) |
| `seed/` | Postgres seed runners (`npm run db:seed:*`) |
| `db/` | Orphan audit + `probes/` schema surveys |
| `maintenance/` | Cleanup, ES reindex, log tail |
| `ci/` | Syntax check, unit helpers |

Data seeds: `../seed/postgres/` (active) · `../seed/legacy/` (Firebase-era archives).
