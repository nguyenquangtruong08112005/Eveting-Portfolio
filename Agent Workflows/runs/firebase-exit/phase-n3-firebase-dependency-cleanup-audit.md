# Phase N3 Firebase Dependency Cleanup Audit

Date: 2026-06-05
Branch: `staging`
Mode: read-only worker audit plus manager verification.

## Result

N3 audit is complete. Do not remove Firebase as one large change.

Current runtime providers:

- Database: PostgreSQL.
- Backend authentication: backend JWT/session.
- Push provider: OneSignal external-id.
- Storage provider: S3-compatible Cloudflare R2.

Firebase is still required for compatibility paths in both Android apps and for `/auth/firebase-exchange` on the server.

CodeGraph was not used because no CodeGraph CLI/index is currently available in the workspace. Audit used scoped source search and runtime provider smoke verification.

## Verified Server State

`node scripts\smoke.lazy-providers.js` passed:

- Backend auth provider loaded.
- OneSignal notification provider loaded.
- All PostgreSQL repository selectors loaded.
- No Firebase configuration, provider, or repository module loaded during normal provider boot.

Direct Firebase runtime dependency outside provider boundaries:

- `services/auth.service.js`
  - Directly imports `providers/auth/firebase.auth.provider`.
  - Required by `/auth/firebase-exchange`.
  - Classification: `COMPATIBILITY_BRIDGE`.

Firebase server components:

| Component | Classification | Removal condition |
|---|---|---|
| `providers/database/firebase.*.repository.js` | `REMOVABLE_NOW`, but retain temporarily as rollback | PostgreSQL smoke for all domains remains green after checkpoint commit |
| `providers/notification/firebase.provider.js` | `REMOVABLE_NOW`, but retain temporarily as rollback | OneSignal device push and message evidence remain green |
| `providers/auth/firebase.auth.provider.js` | `COMPATIBILITY_BRIDGE` | Mobile no longer sends Firebase ID tokens |
| `config/firebase.config.js` and `serviceAccountKey.json` | `COMPATIBILITY_BRIDGE` | Firebase exchange and all Firebase adapters are removed |
| `firebase-admin` package | `COMPATIBILITY_BRIDGE` | No server runtime path imports Firebase configuration |
| `archive/firebase-migration/` and archived Functions | `REMOVABLE_NOW` from runtime, retain as historical tooling until final cleanup | Migration rollback/archive retention decision |
| `.firebaserc`, `firebase.json`, `functions/` logs/env | `REMOVABLE_NOW` after confirming Firebase Functions are decommissioned | No Firebase deploy workflow remains |

## Verified Mobile State

### Safe Removals

Both attendee and organizer:

- `FirebaseFirestore` is injected into `AuthRepositoryImpl` but not used.
- Firebase Analytics dependency has no explicit API usage.
- Firebase Crashlytics buildtools dependency has no explicit API usage.

Attendee only:

- `PostEventViewModel.kt` contains an unused FirebaseAuth import.

Classification: `REMOVABLE_NOW`.

Verification gate:

- Both apps compile.
- Email/password, Google, Facebook, current-user, refresh-token, logout, attendee and organizer protected flows remain green.

### Storage Blocker

Both apps still use `FirebaseStorage` in `UserRepositoryImpl.uploadImage`.

Affected flows:

- Attendee avatar and cover upload.
- Attendee event-media Firebase fallback.
- Organizer avatar/cover upload.
- Organizer create/edit event banner, thumbnail, video, and post images.

Backend `POST /storage/upload` already exists and R2 upload/read is verified.

Classification: `BLOCKED_MISSING_REPLACEMENT` only at the mobile wiring layer.

Required replacement:

- Add a mobile multipart client for `POST /storage/upload`.
- Replace `UserRepositoryImpl.uploadImage` implementation while keeping its return contract.
- Device-test every affected flow.
- Then remove Firebase Storage DI, dependency, and bucket constant.

### Push / FCM Distinction

Both apps:

- OneSignal initializes and calls `OneSignal.login(user.id)`.
- Direct `FirebaseMessaging.getInstance().token` remains in startup and logout flows.
- Attendee registers custom `MyFirebaseMessagingService`.

OneSignal external-id and delivery are verified. OneSignal Android still requires FCM credentials configured in the OneSignal dashboard.

Classification:

- Direct app FCM token registration and custom Firebase messaging service: `REMOVABLE_NOW` only through a dedicated device-tested slice.
- FCM transport credentials inside OneSignal: `ANDROID_ONESIGNAL_TRANSPORT_REQUIRED`.

Verification gate:

- Foreground, background, and terminated-app push delivery.
- Notification tap/deep-link behavior.
- Logout/login and account-switch subscription behavior.
- OneSignal dashboard still shows one enabled subscription for the active account.

### Authentication Blocker

Both apps still use Firebase Auth for:

- Existing Firebase-account compatibility.
- Google credential sign-in.
- Facebook credential sign-in.
- Email verification.
- Password reset.
- Firebase ID token exchange to backend JWT.

Additional coupling:

- FirebaseAuth injected into network interceptor for forced sign-out.
- Attendee HomeViewModel signs FirebaseAuth out directly.
- Organizer ViewModels map Firebase-specific exceptions.
- Verification screen uses a Firebase packaged resource.
- `FirebaseApp.initializeApp`, `google-services.json`, and Google Services plugin remain.

Classification: `COMPATIBILITY_BRIDGE`.

Required replacement:

- Backend Google token verification and backend session issuance.
- Backend Facebook token verification and backend session issuance.
- Backend email verification and password reset.
- Mobile backend-only auth repository.
- Replace Firebase-specific UI errors/resource.

## Ordered Implementation Slices

### N3-S1 - Remove Unused Mobile Firebase Dependencies

Risk: low.

Scope:

- Both apps: remove unused Firestore injection/provider/dependency.
- Both apps: remove unused Firebase Analytics and Crashlytics buildtools dependencies.
- Attendee: remove unused FirebaseAuth import from `PostEventViewModel`.

Verification:

- `gradlew.bat :app:compileDebugKotlin` in both apps.
- Install both debug apps.
- Smoke login/current-user/logout.

### N3-S2 - Wire Mobile Generic Storage Upload

Risk: medium.

Scope:

- Both apps: route `UserRepositoryImpl.uploadImage` through backend `POST /storage/upload`.
- Preserve the existing `Result<String>` URL contract.
- Remove Firebase Storage only after all affected flows pass.

Verification:

- Attendee avatar, cover, and event media.
- Organizer avatar, cover, create-event, and edit-event media.
- Confirm returned URLs use R2 and load from phone.

### N3-S3 - Remove Direct Mobile FCM Logic

Risk: medium.

Scope:

- Remove redundant direct FCM token registration.
- Remove attendee custom Firebase messaging service if OneSignal covers required foreground/tap behavior.
- Keep OneSignal SDK and FCM credentials configured in OneSignal.

Verification:

- Push in foreground/background/terminated states.
- Tap/deep-link.
- Logout/login/account switching.

### N3-S4 - Replace Firebase Auth Compatibility Bridge

Risk: high.

Scope:

- Backend Google/Facebook authentication endpoints.
- Backend email verification/password reset.
- Mobile backend-only authentication.
- Remove `/auth/firebase-exchange` only after existing users can migrate safely.

Verification:

- Existing account login.
- New account registration.
- Google/Facebook sign-in.
- Email verification/password reset.
- Refresh/logout/logout-all.
- Attendee and organizer roles.

### N3-S5 - Final Server Firebase Removal

Risk: medium after N3-S4 passes.

Scope:

- Remove Firebase database adapters and notification provider.
- Remove Firebase auth provider and exchange route.
- Remove Firebase config, service account, package, CLI configs, and obsolete tooling.
- Change provider selector defaults so missing env does not silently select Firebase.

Verification:

- Full JS syntax scan.
- Lazy-provider smoke.
- PostgreSQL domain smokes.
- Auth smoke.
- Storage/R2 smoke.
- OneSignal delivery smoke.
- Server boot with zero Firebase imports loaded.

## Next Exact Step

Assign a local implementation worker `N3-S1` only.

Do not combine N3-S1 with storage, push, auth, or server Firebase removal.
