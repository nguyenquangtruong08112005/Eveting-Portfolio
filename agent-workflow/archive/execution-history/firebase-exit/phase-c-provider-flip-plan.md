# Phase C Provider Flip Plan

Status: active
Created: 2026-05-29
Scope: `Server-2025-Eventing` first. Mobile contracts remain frozen until backend compatibility is proven.

## Objective

Move from additive Firebase-exit boundaries to real local/dev provider flips, then expand PostgreSQL/auth/storage/push coverage until Firebase can be removed safely.

## Rules

- Codex is manager/verifier.
- Local agents implement code, preferably `opencode` via `cmd /c`.
- Server-only until a phase explicitly says mobile migration.
- Keep `main` untouched. Integrate on `staging`.
- Do not change REST payloads, route contracts, event names, notification payload keys, or current mobile behavior without an explicit migration phase.
- Commit every passing slice separately.

## Phase C0 - Consolidation Review

Goal: review all A-F changes as one system before flipping providers.

Actions:

- Review `Server-2025-Eventing/staging` diff against pre-refactor baseline/main.
- Verify no direct Firebase imports remain in `services`, `controllers`, `jobs`, or `middleware`.
- Verify provider defaults still preserve current runtime behavior:
  - `DATABASE_PROVIDER=firebase`
  - `AUTH_PROVIDER=firebase`
  - `NOTIFICATION_PROVIDER=firebase`
  - `STORAGE_PROVIDER=local`
- Verify package additions:
  - `pg`
  - `@aws-sdk/client-s3@3.800.0`
  - `@aws-sdk/s3-request-presigner@3.800.0`
- Record risks and blockers before any provider flip.

Exit criteria:

- Review artifact saved.
- Working tree clean.
- Full syntax check passes.

## Phase C1 - Local PostgreSQL Harness

Goal: create a repeatable local/dev way to run migrations and seed data.

Actions:

- Detect available local tools: Docker, psql, existing Postgres service.
- Add minimal migration runner if missing.
- Add seed/export script for `venues` only.
- Keep scripts opt-in and safe; no automatic destructive reset.
- Do not require Firebase credentials to boot default server path.

Exit criteria:

- Local Postgres can be started or connected.
- `001_create_venues.sql` and auth migration can run against local DB.
- Seed data for `venues` exists.

## Phase C2 - First Provider Flip: Venues To PostgreSQL

Goal: flip `venues` to PostgreSQL in local/dev only and compare payloads.

Actions:

- Run current Firebase venue adapter payload capture if Firebase credentials are available.
- Seed equivalent venue rows into PostgreSQL.
- Run `DATABASE_PROVIDER=postgres` for venue repository smoke checks.
- Compare:
  - `getAllVenues`
  - `getVenueById`
  - `getVenueRawById`
  - `createVenue`
- Confirm response shape compatibility.

Exit criteria:

- Payload comparison artifact saved.
- Any incompatibility is fixed or explicitly deferred.
- No mobile contract change.

## Phase C3 - Expand PostgreSQL Domains

Goal: move the rest of backend state behind PostgreSQL adapters.

Order:

1. `notifications`
2. `media`
3. `promotions`
4. `reviews`
5. `users`
6. `tickets`
7. `events`
8. `organizer_profiles`
9. `featured_profiles`
10. `analytics_events`

Actions per domain:

- Define contract/return shape.
- Add migration/schema.
- Add PostgreSQL adapter.
- Add seed/fixture or smoke script.
- Compare Firebase adapter output vs PostgreSQL adapter output where possible.

Exit criteria per domain:

- Adapter exists.
- Syntax check passes.
- Payload compatibility check passes or discrepancy is documented.

## Phase C4 - Backend Auth Route Wiring

Goal: expose backend auth safely while preserving Firebase compatibility.

Actions:

- Add backend register/login/refresh/logout routes behind existing route style.
- Add middleware path for backend JWT.
- Add migration field for `legacy_firebase_uid` if needed.
- Add user migration/import plan from Firebase users.
- Keep Firebase auth acceptance during compatibility window.

Exit criteria:

- Backend auth flow works locally.
- Existing Firebase-token protected routes still work unless explicitly flipped.
- Role model supports user, organizer, admin.

## Phase C5 - Storage Upload/Read Wiring

Goal: let backend own media upload/read through provider-neutral storage.

Actions:

- Add upload route using existing auth/authorization.
- Store provider-neutral object keys in DB.
- Return URLs compatible with current mobile display needs.
- Support MinIO/R2/S3 via S3-compatible adapter.
- Keep old client-supplied media URL path until mobile migration is complete.

Exit criteria:

- Upload/read/delete smoke passes locally.
- Existing media gallery payload remains compatible.

## Phase C6 - OneSignal Real App Test

Goal: validate OneSignal delivery with a real app/provider config.

Actions:

- Configure OneSignal app.
- Confirm Android FCM transport is configured inside OneSignal.
- Decide target mode:
  - subscription IDs, or
  - external user IDs.
- Test multicast and topic/tag flow.
- Plan mobile token migration from `fcmToken` to OneSignal subscription/external ID.

Exit criteria:

- OneSignal API smoke succeeds.
- Payload keys such as `eventId` and `type` remain unchanged.
- Mobile migration task list is ready.

## Phase C7 - Firebase Removal

Goal: remove Firebase only after all runtime paths are flipped and verified.

Actions:

- Verify no active backend path uses Firebase auth, Firestore, storage, or direct FCM.
- Remove Firebase config/dependency only after replacement providers are default.
- Keep Android FCM configuration only through OneSignal, not backend Firebase Admin.

Exit criteria:

- Firebase Admin dependency removed from backend.
- Server boots and verified flows pass without Firebase credentials.
