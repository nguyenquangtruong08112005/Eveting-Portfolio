# Database programs

## Navigation

| Folder | Status | What it is |
|---|---|---|
| **[finish/](finish/)** | **OPEN** | Close remaining audit aspects (architecture → scale) |
| [integrity/](integrity/) | CLOSED | FK integrity, CHECKs, transactional migrate, naming FKs |
| [normalize/](normalize/) | CLOSED | 3NF, identity de-dupe, TIMESTAMPTZ, GIN, partitions |

## Reading order (new person)

1. [finish/00-master-plan.md](finish/00-master-plan.md) — open work  
2. [normalize/scorecards/06-identity-ts-gin-scorecard.md](normalize/scorecards/06-identity-ts-gin-scorecard.md) — latest scores  
3. [integrity/close-out/13-post-fix-scorecard.md](integrity/close-out/13-post-fix-scorecard.md) — integrity close  
4. [integrity/baseline-2026-06/](integrity/baseline-2026-06/) — June historical audit only  

## Server migrations

`Server-2025-Eventing/db/migrations/` — `001`–`046` applied; finish program starts at **047**.
