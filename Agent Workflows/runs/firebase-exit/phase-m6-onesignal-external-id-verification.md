# Phase M6 OneSignal External ID Verification

## Scope

- Server repo: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Attendee repo: `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing`
- Organizer repo: `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer`
- Branch: `staging`

## Reference

- OneSignal Android SDK setup: `https://documentation.onesignal.com/docs/android-sdk-setup`
- Relevant setup points used:
  - Android SDK dependency: `com.onesignal:OneSignal:[5.6.1, 5.9.99]`
  - Initialize in the Android `Application` class with `OneSignal.initWithContext(...)`
  - Use `OneSignal.login(userId)` for External ID
  - Use `OneSignal.logout()` on logout
  - Android push delivery still requires FCM configured in the OneSignal dashboard

## Worker Split

- Server implementation: `agy`
- Attendee implementation: `agy`, cleanup by `opencode`, final targeted fix by `agy`
- Organizer implementation: `agy`
- Review, verification, commits, and documentation: Codex manager

## Integrated Commits

- Server `Server-2025-Eventing`: `c6fa22a` - Target OneSignal notifications by external id.
- Attendee `Mobile-2025-Eventing`: `ce6ffd7` - Register attendee push targets with OneSignal.
- Organizer `Mobile-2025-Eventing-Organizer`: `54aaece` - Register organizer push targets with OneSignal.

## Boundary Added

Server:

- Direct user notification target selection now switches to backend user ids only when:
  - `NOTIFICATION_PROVIDER=onesignal`
  - `ONESIGNAL_TARGET_MODE=external_id`
- Firebase default behavior remains unchanged.
- OneSignal subscription id mode remains unchanged.
- Existing FCM topic subscription code remains in place for migration fallback.

Mobile:

- Added OneSignal Android SDK dependency to attendee and organizer apps.
- Added guarded OneSignal initialization in each existing `MyApp`.
- Added `ONESIGNAL_APP_ID` placeholder in each app constants file.
- Startup push registration now resolves current user through the existing auth usecase, so backend-auth users can be registered.
- Startup push registration calls `OneSignal.login(user.id)` best-effort and then still sends the Firebase Messaging token via existing `UpdateUserRequest(fcmToken=...)`.
- Sign out calls `OneSignal.logout()` best-effort while preserving existing FCM token removal and auth cleanup.

## Compatibility Notes

- No API routes were renamed.
- Existing `fcmToken` payload field remains unchanged.
- `MyFirebaseMessagingService` remains in attendee app.
- Firebase Messaging remains as fallback because OneSignal Android still depends on FCM transport.
- OneSignal is disabled by default until `ONESIGNAL_APP_ID` is set to a real app id.

## Verification

Server:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check services\notification-event.helper.js
```

Result:

- `git diff --check` passed.
- `node --check services\notification-event.helper.js` passed.

Attendee:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing
git diff --check
gradlew.bat :app:compileDebugKotlin
```

Result:

- `git diff --check` passed.
- Gradle was blocked before Kotlin compilation at `:app:checkDebugAarMetadata` because the Mapbox Maven repository returned `401 Unauthorized`.

Organizer:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer
git diff --check
gradlew.bat :app:compileDebugKotlin
```

Result:

- `git diff --check` passed.
- Gradle was blocked before Kotlin compilation at `:app:checkDebugAarMetadata` because the Mapbox Maven repository returned `401 Unauthorized`.

## Residual Risks

- Kotlin compile and Hilt graph generation still need verification after Mapbox Maven credentials are fixed.
- OneSignal delivery needs a real OneSignal app id and FCM credentials configured in the OneSignal dashboard before device testing.
- Topic notifications in OneSignal mode still need a later dedicated check because the current safe slice only makes direct user notifications work through External ID.

## Next Step

Phase M7 should be a consolidation pass:

- fix Mapbox Maven credential access so mobile Kotlin compile can run
- run mobile compile on attendee and organizer
- run backend smoke with `NOTIFICATION_PROVIDER=onesignal` and `ONESIGNAL_TARGET_MODE=external_id`
- review all Firebase runtime references and decide the next removal blocker
