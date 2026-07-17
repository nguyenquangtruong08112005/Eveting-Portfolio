# Phase P1.2-S2 Lifecycle Policy Smoke

Date: 2026-06-12

## Scope

Server-only lifecycle adoption after P1.2-S1.

No mobile repo changes. No route contract changes. No API payload changes. No DB schema changes. No package dependency changes.

## Worker

- Worker: OpenCode
- Session: `ses_1485a0d99ffeEQbm4L5O5ybwC8`
- Manager role: bounded prompt, diff review, verification, commit, docs update.

## Server Commit

- `a868364` - `test: add event lifecycle policy smoke`

## Changed Files

- `Server-2025-Eventing/package.json`
- `Server-2025-Eventing/src/modules/events/application/service.js`
- `Server-2025-Eventing/scripts/smoke.event-lifecycle-policy.js`

## Implementation Notes

- `getEventById` now uses `isPublicDetailVisible(status, visibility)` for the public-detail branch.
- The unlisted authenticated branch remains exactly separate:
  - `visibility=unlisted` still requires a requester.
- Elasticsearch indexing logic was intentionally left unchanged.
  - Current behavior indexes `active + public` and `active + unlisted`.
  - Replacing it with `isSearchable` would exclude `active + unlisted`, so that would be a behavior change.
- Added `db:smoke:event-lifecycle-policy`.
- Added the policy smoke to `ci:check`.

## Compatibility Notes

- Public event detail behavior remains unchanged.
- Public list/search/nearby behavior remains unchanged.
- Existing Elasticsearch indexing behavior remains unchanged.
- Mobile-facing smoke still passes with 15 pass, 0 fail, 2 skip.

## DB Round Trip Impact

Zero added DB round trips.

This slice only swaps one detail visibility check to a pure helper and adds DB-free smoke coverage.

## SQL Safety Notes

- No SQL was added.
- No query interpolation was added.
- Existing P1.2-S1 parameterized lifecycle query pattern is preserved.

## Index Plan

No new indexes.

Existing event query/indexing predicates remain:

- `status`
- `visibility`
- `date`
- `geohash`

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run ci:check
npm run db:smoke:mobile-contracts
npm run db:smoke:events
git diff --check
```

Results:

- `npm run ci:check`: passed.
- `scripts/smoke.event-lifecycle-policy.js`: 32 pass, 0 fail.
- `npm run db:smoke:mobile-contracts`: 15 pass, 0 fail, 2 skip.
- `npm run db:smoke:events`: exit 0; current local data returned 0 event rows for that smoke.
- `git diff --check`: passed with LF/CRLF warning only.

## Next Slice Recommendation

P1.2-S3 should design the first real lifecycle data model step without breaking mobile:

- Add a nullable/additive canonical lifecycle field or transition history only if the migration/backfill story is clear.
- Keep legacy `status` and `visibility` as the mobile-facing source until transition is verified.
- Add an explicit transition service/policy before changing organizer/admin behavior.

