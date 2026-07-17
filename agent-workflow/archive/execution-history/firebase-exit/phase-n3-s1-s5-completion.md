# Phase N3-S1 to N3-S5 Completion

Date: 2026-06-05
Branch: `staging`
Role split: local workers implemented; Codex manager verified and documented.

## Status

N3-S1 through N3-S5 are complete for the local/dev Firebase Exit target.

Final device smoke was confirmed by the user on 2026-06-05:

- media upload/read works
- attendee and organizer flows behave as before the Firebase cleanup refactor

Active providers:

- Auth: backend JWT/session.
- Database: PostgreSQL.
- Storage: S3-compatible provider, verified with local and prior R2 checks.
- Push: OneSignal external-id.

Intentional exception:

- Android still keeps Google Services config because OneSignal Android uses FCM as the transport layer.

## Completed Slices

- N3-S1: removed unused mobile Firebase dependencies and stale Firebase references.
- N3-S2: mobile profile/media upload paths use backend generic storage upload.
- N3-S3: direct mobile FCM token/service logic was removed; OneSignal remains.
- N3-S4: backend-owned auth replaced Firebase compatibility bridge; Google/Facebook/password reset/email verification routes are backend-owned.
- N3-S5: server Firebase providers/config/tooling and `/auth/firebase-exchange` were removed; provider selectors now default to backend/postgres/onesignal and reject Firebase provider values.

## Manager Review Notes

- OpenCode reviewed the `role=organizer` social-login concern. It is consistent with the existing self-service organizer registration contract and auth smoke coverage, so no source change was made.
- Existing organizer role flows are preserved.
- Legacy migration preserves legacy profile IDs for password reset and social login.
- Blank-email legacy profiles are intentionally skipped and require manual data remediation if still needed.
- `uuid` is now an explicit dependency because it was previously transitive through Firebase Admin.

## Verification Commands Passed

Server:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
npm run db:migrate
npm run db:smoke:lazy-providers
npm run db:smoke:auth
node scripts\smoke.auth.hardened.js
npm run db:smoke:legacy-migration
npm run db:smoke:postgres-provider
npm run db:smoke:postgres-write-paths
npm run db:smoke:transactions
npm run db:smoke:storage-media
node scripts\smoke.storage.js
npm run db:smoke:venues
npm run db:smoke:notifications
npm run db:smoke:media
npm run db:smoke:promotions
npm run db:smoke:reviews
npm run db:smoke:users
npm run db:smoke:events
npm run db:smoke:tickets
npm run db:smoke:analytics
npm run db:smoke:organizer_profiles
npm run db:smoke:featured_profiles
node --check services\auth.service.js
node --check scripts\smoke.auth.hardened.js
node --check scripts\smoke.legacy-migration.js
git diff --check
```

Mobile:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing
gradlew.bat clean :app:compileDebugKotlin
git diff --check

cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer
gradlew.bat clean :app:compileDebugKotlin
git diff --check
```

Firebase runtime checks:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git grep -n "config/firebase.config" -- "*.js"
git grep -n "firebase-admin" -- package.json package-lock.json "*.js"
git grep -n "auth/firebase-exchange" -- "*.js" "*.kt"
npm ls firebase-admin --depth=0
npm ls uuid --depth=0

cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing
git grep -n -i firebase -- "app/src/main/**" app/build.gradle.kts gradle/libs.versions.toml

cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer
git grep -n -i firebase -- "app/src/main/**" app/build.gradle.kts gradle/libs.versions.toml
```

Observed results:

- Firebase config/admin/exchange greps returned no matches.
- Mobile app source/build catalog Firebase grep returned no matches in both apps.
- `npm ls firebase-admin --depth=0` shows the package is absent.
- `npm ls uuid --depth=0` shows `uuid@14.0.0`.
- Full JS syntax scan checked 121 JS files successfully.
- PostgreSQL container `mobile-eventing-postgres` was running on port `55432`.

## Residual Non-Blocking Items

- `serviceAccountKey.json`, `functions/`, and `firebase-debug.log` may still exist as ignored local files. They are not tracked/runtime dependencies; delete manually only when rollback/debug is no longer needed.
- One historical organizer profile image URL still points to `firebasestorage.googleapis.com`; migrate old media URLs as a separate data cleanup task.
- One blank-email legacy profile cannot be auto-migrated without an email.
- `routes/admin.routes.js` still has auth middleware commented out. This is a separate security hardening task, not an N3 Firebase runtime blocker.
- If the apps are reinstalled on a device that still has old local auth state, clear app data and log in again with backend credentials. Local/dev auth users were reset to backend password `123456` with `scrypt` hashes for verification.
