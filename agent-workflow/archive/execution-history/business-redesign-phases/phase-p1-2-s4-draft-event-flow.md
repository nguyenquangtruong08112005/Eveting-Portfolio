# Phase P1.2-S4 Draft Event Flow

Date: 2026-06-12

## Scope

Server-only additive draft creation path for events.

No mobile repo changes. No existing API payload shape changes. No route contract changes for callers that do not send the new flag.

## Worker

- Worker: OpenCode
- Session: `ses_1485a0d99ffeEQbm4L5O5ybwC8`
- CodeGraph usage: worker used CodeGraph MCP first for event create flow exploration, then read exact files for confirmation.

## Server Commit

- `09cc36e` - `feat: add draft event creation flag`

## Changed Files

- `Server-2025-Eventing/package.json`
- `Server-2025-Eventing/scripts/smoke.draft-events.js`
- `Server-2025-Eventing/src/modules/events/application/service.js`

## Behavior

Default create behavior is unchanged:

- No `saveAsDraft` flag means internal `lifecycle_status=submitted`.
- Legacy `status=pending` and `visibility=private` are preserved.
- Existing response payload does not expose `lifecycleStatus` or `saveAsDraft`.

Explicit draft behavior:

- `saveAsDraft: true` creates internal `lifecycle_status=draft`.
- Legacy `status=pending` and `visibility=private` are preserved for mobile compatibility.
- Existing response payload does not expose `lifecycleStatus`.
- Draft create skips the current artist/topic push notification side effect.

## Compatibility Notes

- `POST /events` currently has no body validator, so `saveAsDraft` reaches the existing controller/service path.
- Public listing/search/nearby behavior remains protected by existing `active/public` filtering; draft and submitted pending/private events are not public.
- Existing mobile and organizer callers that do not send `saveAsDraft` keep the previous submitted/pending/private behavior.
- No lifecycle field is exposed to mobile-facing payloads.

## DB Round Trip Impact

Zero added request-time DB round trips.

The new flag changes only the `lifecycle_status` value included in the existing event insert.

## SQL Safety Notes

- No new SQL interpolation was added.
- Smoke cleanup and assertions use parameterized queries.
- The persistence path still relies on repository field mapping from the prior lifecycle slice.

## Index Plan

No new index was added in this slice.

Draft queries can use the existing `idx_events_lifecycle_status` index from migration `018_add_lifecycle_status.sql`.

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:migrate
node --check src\modules\events\application\service.js
node --check scripts\smoke.draft-events.js
npm run db:smoke:draft-events
npm run db:smoke:lifecycle-persistence
npm run ci:check
npm run db:smoke:mobile-contracts
npm run db:smoke:postgres-write-paths
git diff --check
```

Results:

- `npm run db:migrate`: passed; all migrations already applied.
- `node --check` on changed JS files: passed.
- `npm run db:smoke:draft-events`: 28 pass, 0 fail.
- `npm run db:smoke:lifecycle-persistence`: 38 pass, 0 fail.
- `npm run ci:check`: passed.
- `npm run db:smoke:mobile-contracts`: 15 pass, 0 fail, 2 skip.
- `npm run db:smoke:postgres-write-paths`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.

## Next Slice Recommendation

P1.2-S5 should add the next lifecycle workflow boundary:

- Organizer can submit a draft for review through an explicit action.
- Existing update event behavior remains compatible.
- Admin approve/reject keeps using canonical lifecycle internally.
- Add smoke coverage for draft -> submitted and invalid lifecycle transitions.
