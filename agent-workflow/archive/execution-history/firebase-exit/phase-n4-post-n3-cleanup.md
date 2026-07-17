# Phase N4 Post-N3 Cleanup

Status: complete on 2026-06-05.

## Scope

- Package/checkpoint current N3 diff.
- Protect admin routes after backend auth cutover.
- Clean old Firebase Storage URL references from local PostgreSQL data.
- Verify Elasticsearch rebuild path after Firebase seed scripts were removed.
- Remove local ignored Firebase artifacts from the server workspace.

## Changes

- Server admin routes now apply `verifyAuthToken` and `isAdmin`.
- Added `scripts/cleanup.firebase-urls.js`.
  - Default mode reports Firebase Storage URL references.
  - Explicit cleanup mode supports `--cleanup --apply-null` for nullable URL columns.
- `scripts/reindex.elasticsearch.js` documents that it rebuilds from PostgreSQL and warns if stale Firebase seed scripts reappear.
- Local ignored Firebase artifacts removed:
  - `Server-2025-Eventing/serviceAccountKey.json`
  - `Server-2025-Eventing/firebase-debug.log`
  - `Server-2025-Eventing/functions/.env`
  - `Server-2025-Eventing/functions/firebase-debug.log`
  - empty `Server-2025-Eventing/functions/`

## Verification

- `node scripts/cleanup.firebase-urls.js`
  - initial scan found 6 Firebase Storage URL references.
  - follow-up scan after cleanup found 0 references.
- `npm run search:reindex`
  - Elasticsearch connected to Docker-hosted `localhost:9200`.
  - reindexed 18 events into index `events`.
- `curl -s http://localhost:9200/events/_count`
  - returned `{"count":18,...}`.
- Admin middleware mock smoke passed:
  - `ADMIN_UID` user passed.
  - non-admin user returned 403.
- `git diff --check` passed.
- `node --check` passed for:
  - `routes/admin.routes.js`
  - `middleware/admin.middleware.js`
  - `scripts/cleanup.firebase-urls.js`
  - `scripts/reindex.elasticsearch.js`
- Firebase runtime scan:
  - server direct Firebase runtime imports/routes are absent outside cleanup detection text.
  - attendee and organizer direct Firebase SDK references are absent in app source/build catalog.

## Notes

- Elasticsearch health is `yellow`, expected for the current single-node Docker setup with an unassigned replica shard.
- Android Google Services config remains intentionally because OneSignal Android still uses FCM transport underneath OneSignal.
