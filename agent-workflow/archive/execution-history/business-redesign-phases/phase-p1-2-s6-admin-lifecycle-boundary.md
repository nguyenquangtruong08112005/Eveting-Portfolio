# Phase P1.2-S6 Admin Lifecycle Boundary

Date: 2026-06-12

## Scope

Server-only admin review queue and approve/reject lifecycle guard.

No mobile repo changes. Admin route paths and success response shapes are preserved.

## Worker

- Worker: OpenCode
- Session: `ses_1485a0d99ffeEQbm4L5O5ybwC8`
- CodeGraph rule: prompt required CodeGraph MCP first; manager reviewed final diff, requested stricter legacy-null fallback, and verified the result.

## Server Commit

- `d3e6c8e` - `feat: guard admin event lifecycle review`

## Changed Files

- `Server-2025-Eventing/package.json`
- `Server-2025-Eventing/scripts/smoke.admin-lifecycle.js`
- `Server-2025-Eventing/src/modules/admin/api/controller.js`
- `Server-2025-Eventing/src/modules/admin/application/service.js`
- `Server-2025-Eventing/src/providers/database/postgres.admin.repository.js`

## Behavior

- Admin pending queue now includes only submitted events:
  - Explicit `lifecycle_status=draft` rows are excluded.
  - `lifecycle_status=submitted` rows are included.
  - Legacy/null lifecycle rows are included only when legacy `status=pending`.
- Admin approve/reject now enforce submitted-only review:
  - Explicit draft events cannot be approved/rejected.
  - Submitted events can be approved/rejected.
  - Legacy/null lifecycle pending rows can still be approved/rejected for compatibility.
  - Legacy/null lifecycle active rows do not pass the fallback guard.
- Admin approve still returns `{ success: true, message: "Event approved and published." }`.
- Admin reject still returns `{ success: true, message: "Event rejected." }`.
- `lifecycleStatus` remains internal and is not added to payload/raw_data.

## DB Round Trip Impact

Admin approve adds one minimal lifecycle/ownership read before the existing event read/update/index flow.

Admin reject adds one minimal lifecycle/ownership read before the existing update/delete-index flow.

Admin pending queue remains one paginated query.

## SQL Safety Notes

- Pending queue query is parameterized and filters with constants.
- Lifecycle guard lookup reuses the existing parameterized event lifecycle/ownership repository helper.
- Event updates continue through the existing field whitelist.
- No user input is interpolated into SQL.

## Index Plan

No new index was added.

The existing `idx_events_lifecycle_status` supports future submitted-only admin review filtering. The current query combines legacy `status=pending` with `lifecycle_status IS NULL OR lifecycle_status=submitted` for compatibility.

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:migrate
node --check src\modules\admin\api\controller.js
node --check src\modules\admin\application\service.js
node --check src\providers\database\postgres.admin.repository.js
node --check scripts\smoke.admin-lifecycle.js
npm run db:smoke:admin-lifecycle
npm run db:smoke:draft-submit
npm run db:smoke:postgres-write-paths
npm run db:smoke:lifecycle-persistence
npm run db:smoke:draft-events
npm run ci:check
npm run db:smoke:mobile-contracts
git diff --check
```

Results:

- `npm run db:migrate`: passed; all migrations already applied.
- Changed-file `node --check`: passed.
- `npm run db:smoke:admin-lifecycle`: 38 pass, 0 fail.
- `npm run db:smoke:draft-submit`: 24 pass, 0 fail.
- `npm run db:smoke:postgres-write-paths`: passed.
- `npm run db:smoke:lifecycle-persistence`: 38 pass, 0 fail.
- `npm run db:smoke:draft-events`: 28 pass, 0 fail.
- `npm run ci:check`: passed.
- `npm run db:smoke:mobile-contracts`: 15 pass, 0 fail, 2 skip.
- `git diff --check`: passed with LF/CRLF warnings only.

## Next Slice Recommendation

P1.3 should move from event lifecycle into ticket/order/payment foundation:

- Add order, order item, payment attempt, and ticket issuance model plan/smoke first.
- Preserve existing `POST /tickets/book`, `GET /tickets/:id`, and payment route contracts.
- Keep seat-map implementation as a follow-up slice after order state is explicit.
