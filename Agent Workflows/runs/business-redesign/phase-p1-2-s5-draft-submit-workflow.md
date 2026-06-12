# Phase P1.2-S5 Draft Submit Workflow

Date: 2026-06-12

## Scope

Server-only explicit organizer draft submission workflow.

No mobile repo changes. No existing route response shape changes. Existing create/update/cancel behavior remains compatible.

## Worker

- Worker: OpenCode
- Session: `ses_1485a0d99ffeEQbm4L5O5ybwC8`
- CodeGraph rule: prompt required CodeGraph MCP first; manager reviewed final diff and smoke behavior.

## Server Commit

- `1d86b9f` - `feat: add draft submit workflow`

## Changed Files

- `Server-2025-Eventing/package.json`
- `Server-2025-Eventing/scripts/smoke.draft-submit.js`
- `Server-2025-Eventing/src/modules/events/api/controller.js`
- `Server-2025-Eventing/src/modules/events/api/routes.js`
- `Server-2025-Eventing/src/modules/events/application/service.js`
- `Server-2025-Eventing/src/providers/database/postgres.event.repository.js`

## Route Added

```txt
POST /events/:eventId/submit-draft
```

The route requires backend auth and delegates ownership/transition checks to the event service.

## Behavior

- Organizer owner can submit a draft event for review.
- Internal lifecycle transition is `draft -> submitted`.
- Legacy fields are explicitly preserved as `status=pending` and `visibility=private`.
- Existing event response data does not expose `lifecycleStatus`.
- Non-owner receives a typed forbidden response.
- Missing event receives a typed not-found response.
- Non-draft events receive a typed bad-request response.
- Submitted draft remains invisible in public listing/search because it is still pending/private.

## DB Round Trip Impact

New submit-draft request uses three request-time DB operations:

1. Read minimal lifecycle/ownership row by event id.
2. Update `lifecycle_status`, `status`, `visibility`, and `last_updated_at`.
3. Read event by id for the legacy-compatible response shape.

The route avoids `getEventById` ownership probing in the controller, so it does not load venue or featured profile data just to authorize the lifecycle action.

## SQL Safety Notes

- New lifecycle/ownership lookup is parameterized: `WHERE id = $1`.
- Existing `updateEvent` still uses the `FIELD_MAP` column whitelist.
- No request/body/query value is interpolated into SQL.
- `lifecycleStatus` is excluded from `raw_data` by repository merge rules.

## Index Plan

No new index was added.

The existing `idx_events_lifecycle_status` from migration `018_add_lifecycle_status.sql` remains sufficient for lifecycle filters and future admin review queues.

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:migrate
node --check src\modules\events\api\controller.js
node --check src\modules\events\api\routes.js
node --check src\modules\events\application\service.js
node --check src\providers\database\postgres.event.repository.js
node --check scripts\smoke.draft-submit.js
npm run db:smoke:draft-submit
npm run db:smoke:draft-events
npm run db:smoke:lifecycle-persistence
npm run ci:check
npm run db:smoke:mobile-contracts
npm run db:smoke:postgres-write-paths
git diff --check
```

Results:

- `npm run db:migrate`: passed; all migrations already applied.
- Changed-file `node --check`: passed.
- `npm run db:smoke:draft-submit`: 24 pass, 0 fail; estimated request/test DB round trips documented as 18.
- `npm run db:smoke:draft-events`: 28 pass, 0 fail.
- `npm run db:smoke:lifecycle-persistence`: 38 pass, 0 fail.
- `npm run ci:check`: passed.
- `npm run db:smoke:mobile-contracts`: 15 pass, 0 fail, 2 skip.
- `npm run db:smoke:postgres-write-paths`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.

## Next Slice Recommendation

P1.2-S6 should close the admin review boundary:

- Admin pending/review queue should use `lifecycle_status=submitted`, not all legacy `status=pending` rows.
- Draft events must not appear in admin review queues until submitted.
- Admin approve/reject should enforce submitted-only lifecycle transitions internally.
- Existing admin/mobile-compatible response shapes should remain unchanged.
