# Phase M11 Checkpoint And Next Slices

Date: 2026-06-03
Branch: `staging`
Mode: Codex manager/verifier, local agents implement.

## Checkpoint Status

- Backend database provider is running on PostgreSQL for local/dev.
- Backend auth provider is running with backend JWT/session.
- Existing attendee Firebase accounts can log in through `/auth/firebase-exchange`.
- Existing organizer Firebase accounts can log in through `/auth/firebase-exchange` with `role=organizer`.
- Attendee protected flows recovered after auth bridge:
  - `/users/me`
  - `/users/me/tickets`
  - `/tickets/book`
  - `/events/recommendations`
  - follow/unfollow
  - notifications list
- Organizer protected flows recovered after organizer auth bridge:
  - `/organizer/me`
  - `/organizer/me/stats`
  - `/organizer/me/events`
  - `/promotions/organizer`
- Payment flow recovered after applying migration `015_add_ticket_payment_fields.sql`.
- OneSignal works in local/dev with backend `NOTIFICATION_PROVIDER=onesignal` and `ONESIGNAL_TARGET_MODE=external_id`.
- User smoke-tested core attendee and organizer flows and confirmed behavior is stable compared with before the refactor.

## Current Uncommitted Diff Scope

Server:

- `controllers/auth.controller.js`
- `middleware/auth.middleware.js`
- `providers/database/firebase.user.repository.js`
- `providers/database/postgres.auth.repository.js`
- `providers/database/postgres.user.repository.js`
- `routes/auth.routes.js`
- `routes/events.routes.js`
- `services/auth.service.js`
- `db/migrations/015_add_ticket_payment_fields.sql`

Attendee mobile:

- `app/src/main/java/com/tdtuer/eventing/constants/Constraints.kt`
- `app/src/main/java/com/tdtuer/eventing/data/auth/AuthRepositoryImpl.kt`
- `app/src/main/java/com/tdtuer/eventing/data/network/EventApiService.kt`
- `app/src/main/java/com/tdtuer/eventing/data/network/model/AuthDtos.kt`
- `app/src/main/java/com/tdtuer/eventing/di/NetworkModule.kt`
- `app/src/main/java/com/tdtuer/eventing/ui/screens/auth/signin/SignInViewModel.kt`
- `app/src/main/java/com/tdtuer/eventing/ui/screens/auth/signup/SignUpViewModel.kt`
- `app/src/main/res/values/mapbox_access_token.xml`

Organizer mobile:

- `app/src/main/java/com/tdtuer/eventing_organizer/constants/Constraints.kt`
- `app/src/main/java/com/tdtuer/eventing_organizer/data/auth/AuthRepositoryImpl.kt`
- `app/src/main/java/com/tdtuer/eventing_organizer/data/network/AuthApiService.kt`
- `app/src/main/java/com/tdtuer/eventing_organizer/data/network/model/AuthDtos.kt`
- `app/src/main/java/com/tdtuer/eventing_organizer/di/NetworkModule.kt`
- `app/src/main/res/values/mapbox_access_token.xml`

Do not include in checkpoint commits unless explicitly approved:

- `Mobile-2025-Eventing/.kotlin/errors/*.log`
- `Mobile-2025-Eventing-Organizer/.kotlin/`
- `Mobile-2025-Eventing-Organizer/.idea/deploymentTargetSelector.xml`

## Verification Completed

Server:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
node --check controllers\auth.controller.js
node --check services\auth.service.js
node --check providers\database\postgres.auth.repository.js
node --check providers\database\postgres.user.repository.js
git diff --check
npm run db:migrate
```

Result:

- JS syntax checks passed.
- `git diff --check` passed with CRLF warnings only.
- Migration `015_add_ticket_payment_fields.sql` applied.
- Tickets table contains:
  - `zalo_app_trans_id`
  - `payment_status`
  - `last_payment_attempt`

Organizer mobile:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer
gradlew.bat :app:compileDebugKotlin
gradlew.bat :app:installDebug
git diff --check
```

Result:

- Kotlin compile passed.
- Debug APK installed on connected device.
- `git diff --check` passed.

Attendee mobile:

- Previously compiled and installed successfully after OneSignal/Kotlin pin and auth bridge.
- User confirmed core attendee flows work on device after the latest fixes.

## Compatibility Notes

- `/auth/firebase-exchange` is a compatibility bridge, not the final auth architecture.
- Mobile apps still use Firebase sign-in as fallback/bridge for existing users.
- OneSignal Android delivery still depends on FCM transport configured inside OneSignal.
- Backend push is no longer directly coupled to FCM when `NOTIFICATION_PROVIDER=onesignal`.
- Existing notification payload fields must remain stable:
  - `eventId`
  - `type`
  - title/body fields.
- Current mobile `BASE_URL` is a local ngrok value and should not be treated as final production config.
- `mapbox_access_token.xml` contains public `pk.*` tokens only; secret `sk.*` should remain outside source.

## Risks To Track

- JWT-only current-user behavior can log users out if backend token refresh fails.
- Existing tokens issued before role updates can still lack `organizer`; users must log in again to get a fresh token.
- Media upload can create DB rows whose local/public file path is not resolvable, causing `/public/event-media/...` 404.
- R2 is not configured as the active storage provider yet.
- Firebase packages/config cannot be removed while mobile auth, storage fallback, and messaging fallback still use Firebase.
- Direct Firebase imports are still allowed only in adapter/provider or intentional compatibility bridge paths.

## Next Task Split

### N1 - Media Public URL And R2 Cutover

Owner: local implementation worker.

Goal:

- Fix media public URL/read path first.
- Then configure S3-compatible storage provider for R2 or MinIO.
- Keep old Firebase/local URL fallback until verified.

Scope:

- Server storage provider and media URL generation.
- Attendee/organizer media display and upload URL handling if needed.

Verification:

- Upload image from attendee event media.
- Returned URL opens successfully from phone.
- `GET /events/:eventId/media` returns URL that loads.
- `git diff --check`.
- `node --check` on changed server JS.
- Mobile compile only if mobile files change.

### N2 - OneSignal Subscription Verification

Owner: manager/verifier, worker only if code changes are required.

Goal:

- Confirm OneSignal dashboard has the device subscription.
- Confirm external id equals backend `user.id`.
- Confirm server push produces a OneSignal delivery log.

Scope:

- No code change unless dashboard/runtime evidence shows missing registration.

Verification:

- Dashboard `Audience > Users/Subscriptions`.
- Server log contains `OneSignal multicast sent`.
- Device receives push.

### N3 - Firebase Dependency Cleanup Audit

Owner: read-only worker first.

Goal:

- Produce exact remaining Firebase runtime paths by repo.
- Separate removable server Firebase from mobile-required Firebase.

Scope:

- Server direct imports.
- Attendee Firebase Auth/Storage/Messaging usage.
- Organizer Firebase Auth/Storage/Messaging usage.
- Gradle/package dependencies.

Verification:

- `rg -n "Firebase|firebase|firebase-admin|FirebaseAuth|FirebaseFirestore|FirebaseMessaging|FirebaseStorage"`.
- No removals until each replacement path is implemented and device-tested.

## Next Exact Step

Run N1 with a local implementation worker:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final
opencode run --dir "D:\01_university\year3\semester-5\mobile\final" "<bounded N1 prompt>"
```

Manager must verify the worker diff before accepting it.
