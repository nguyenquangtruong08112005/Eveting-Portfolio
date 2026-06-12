# Phase P1.2-S1 Event Lifecycle Foundation

Date: 2026-06-12

## Scope

Server-only lifecycle foundation for future business redesign.

No mobile repo changes. No route contract changes. No API payload changes. No provider/package dependency changes.

## Worker

- Worker: OpenCode
- Session: `ses_1485a0d99ffeEQbm4L5O5ybwC8`
- Manager role: review diff, reject unsafe SQL interpolation pattern, request one follow-up fix, run verification, commit passing slice.

## Server Commit

- `1cbbbf4` - `feat: add event lifecycle foundation`

## Changed Files

- `Server-2025-Eventing/src/modules/events/domain/event-lifecycle.js`
- `Server-2025-Eventing/scripts/smoke.event-lifecycle.js`
- `Server-2025-Eventing/package.json`
- `Server-2025-Eventing/scripts/reindex.elasticsearch.js`
- `Server-2025-Eventing/src/modules/admin/application/service.js`
- `Server-2025-Eventing/src/modules/events/application/service.js`
- `Server-2025-Eventing/src/modules/events/application/query-builders/recommendation-query.builder.js`
- `Server-2025-Eventing/src/providers/database/postgres.admin.repository.js`
- `Server-2025-Eventing/src/providers/database/postgres.event.repository.js`

## Added Boundary

- Added canonical lifecycle constants:
  - `draft`
  - `submitted`
  - `approved`
  - `published`
  - `rejected`
  - `cancelled`
- Preserved legacy mobile/backend status values:
  - `pending`
  - `active`
  - `rejected`
  - `cancelled`
- Preserved legacy visibility values:
  - `public`
  - `private`
  - `unlisted`
- Added mapping helpers:
  - `canonicalToLegacyStatus`
  - `legacyToCanonicalStatus`
  - `canonicalToVisibility`
- Added transition and visibility helpers:
  - `isTransitionAllowed`
  - `isPublicDetailVisible`
  - `isPublicListingVisible`
  - `isSearchable`

## Compatibility Notes

- Organizer event creation still writes `status=pending` and `visibility=private`.
- Admin approve still writes `status=active` and `visibility=public`.
- Admin reject still writes `status=rejected`.
- Event cancellation still writes `status=cancelled`.
- Public list/search/nearby/reindex behavior still targets `status=active` and `visibility=public`.
- Event detail behavior remains compatible with current service behavior: cancelled events are hidden; public events are detail-visible; unlisted events require an authenticated requester.
- Mobile-facing smoke still passes with 15 pass, 0 fail, 2 skip.

## Manager Review Fixes

Initial worker diff used template interpolation for lifecycle constants in SQL. Manager rejected that pattern because Phase P guardrails require parameterized PostgreSQL queries and a consistent prepared-statement style.

OpenCode follow-up changed those queries to `$N` parameters in:

- `postgres.event.repository.js`
- `postgres.admin.repository.js`
- `scripts/reindex.elasticsearch.js`

The worker also replaced the ambiguous `isPubliclyVisible` helper with separate detail/listing predicates.

## DB Round Trip Impact

Zero added DB round trips.

This slice only centralizes constants and preserves existing query count. The parameterized SQL uses the same predicates as the previous literal-string SQL.

## SQL Safety Notes

- Lifecycle constants are passed as pg parameters, not interpolated into SQL templates.
- No request/body/query values are interpolated.
- No dynamic sort or column interpolation was introduced.
- Index plan unchanged because predicates remain `status`, `visibility`, `date`, and `geohash` as before.

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run ci:check
npm run db:smoke:mobile-contracts
npm run db:smoke:postgres-write-paths
git diff --check
```

Results:

- `npm run ci:check`: passed.
- `scripts/smoke.event-lifecycle.js`: 68 pass, 0 fail.
- `scripts/smoke.authz-middleware.js`: 23 pass, 0 fail.
- `scripts/smoke.lazy-providers.js`: passed.
- `npm run db:smoke:mobile-contracts`: 15 pass, 0 fail, 2 skip.
- `npm run db:smoke:postgres-write-paths`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.

## Next Slice Recommendation

P1.2-S2 should be a small lifecycle adoption slice, not a deep rewrite:

- Replace remaining local event status/visibility literals only where it is clearly behavior-preserving.
- Add domain policy tests around organizer/admin lifecycle paths.
- Do not add new lifecycle columns yet.
- Do not change mobile payloads.

