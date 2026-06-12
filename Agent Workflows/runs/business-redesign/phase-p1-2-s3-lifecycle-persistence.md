# Phase P1.2-S3 Lifecycle Persistence

Date: 2026-06-12

## Scope

Server-only canonical lifecycle persistence.

No mobile repo changes. No API payload changes. No route contract changes.

## Worker

- Worker: OpenCode
- Session: `ses_1485a0d99ffeEQbm4L5O5ybwC8`
- Manager note: OpenCode MCP CodeGraph was fixed during this slice. Active config is `%USERPROFILE%\.config\opencode\opencode.json`; `opencode mcp list` now shows `codegraph connected`.

## Server Commit

- `2517907` - `feat: persist event lifecycle status`

## Changed Files

- `Server-2025-Eventing/db/migrations/018_add_lifecycle_status.sql`
- `Server-2025-Eventing/scripts/smoke.lifecycle-persistence.js`
- `Server-2025-Eventing/package.json`
- `Server-2025-Eventing/src/modules/admin/application/service.js`
- `Server-2025-Eventing/src/modules/events/application/service.js`
- `Server-2025-Eventing/src/providers/database/postgres.admin.repository.js`
- `Server-2025-Eventing/src/providers/database/postgres.event.repository.js`

## Migration

Added `events.lifecycle_status` as an additive nullable text column.

Backfill mapping:

- `status=pending` -> `lifecycle_status=submitted`
- `status=active` -> `lifecycle_status=published`
- `status=rejected` -> `lifecycle_status=rejected`
- `status=cancelled` -> `lifecycle_status=cancelled`

Added index:

- `idx_events_lifecycle_status`

## Compatibility Notes

- Legacy `status` and `visibility` columns remain unchanged.
- Existing create flow still returns `status=pending` and `visibility=private`.
- Existing admin approve still returns/writes `status=active` and `visibility=public`.
- Existing reject/cancel legacy behavior is preserved.
- `lifecycleStatus` is intentionally not exposed through existing event payloads.
- Repository mapping strips `lifecycleStatus` if old `raw_data` contains it.
- New lifecycle state is persisted only in the `lifecycle_status` DB column for now.

## DB Round Trip Impact

Zero added request-time DB round trips.

Existing writes include one extra column value in the same insert/update statement.

## SQL Safety Notes

- Existing dynamic field update still uses `FIELD_MAP` whitelist.
- `lifecycleStatus` maps to a fixed `lifecycle_status` column through `FIELD_MAP`.
- Smoke tests use parameterized values for lifecycle backfill checks.
- No request/body/query values are interpolated into SQL.

## Index Plan

`idx_events_lifecycle_status` supports future lifecycle dashboards/admin filters without replacing the existing `status`/`visibility` filters yet.

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:migrate
npm run db:smoke:lifecycle-persistence
npm run ci:check
npm run db:smoke:mobile-contracts
npm run db:smoke:postgres-write-paths
git diff --check
```

Results:

- `npm run db:migrate`: passed; migration `018` already applied after worker run.
- `npm run db:smoke:lifecycle-persistence`: 38 pass, 0 fail.
- `npm run ci:check`: passed.
- `npm run db:smoke:mobile-contracts`: 15 pass, 0 fail, 2 skip.
- `npm run db:smoke:postgres-write-paths`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.

## Next Slice Recommendation

P1.2-S4 can add a real draft flow, but it should be additive:

- Existing mobile create event remains submitted/pending/private.
- Draft flow should require an explicit request flag or separate endpoint.
- Draft events should persist `lifecycle_status=draft`, legacy `status=pending`, and `visibility=private`.
- Do not expose new lifecycle payload fields on existing mobile routes until API versioning/BFF is ready.

