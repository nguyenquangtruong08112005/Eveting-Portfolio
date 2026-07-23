# Database providers

## Policy (Portfolio V1)

- **Only Postgres** is supported.
- Files named `*.repository.js` (without `postgres.` prefix) are **thin shims** that re-export `postgres.*.repository.js`.
- New code may import either:
  - `@/providers/database/event.repository` (stable facade), or
  - `@/providers/database/postgres.event.repository` (explicit)

Both resolve to the same Postgres implementation. Do **not** add a second real implementation (Firebase/memory) behind the facade.

## Dual-path status

| Layer | Status |
|---|---|
| Legacy dual Firebase/Postgres implementations | Removed / shimmed to Postgres only |
| Shim facades | Kept for import stability |
| New repositories | Create `postgres.<domain>.repository.js` + optional facade |

## Identity

- `auth_users` = authentication source of truth  
- `user_profiles.id` = same id as `auth_users.id` (FK since migration 031)
