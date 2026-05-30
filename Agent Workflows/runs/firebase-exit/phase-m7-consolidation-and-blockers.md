# Phase M7 Consolidation And Blockers

## Scope

- Root docs only.
- No source code changes in this phase.
- Repos checked:
  - `Server-2025-Eventing`
  - `Mobile-2025-Eventing`
  - `Mobile-2025-Eventing-Organizer`

## Current Integrated State

- Server Firebase Exit backend slices A-F and C1-C12 are complete on `staging`.
- Mobile migration slices M1-M6 are complete on `staging`.
- Root state and artifact docs are current through M6.

## Compile Blocker

Both mobile repos fail before Kotlin compilation at:

```cmd
gradlew.bat :app:compileDebugKotlin
```

Failure point:

- task: `:app:checkDebugAarMetadata`
- dependency host: `https://api.mapbox.com/downloads/v2/releases/maven`
- HTTP result: `401 Unauthorized`

Observed config:

- Attendee `settings.gradle.kts` contains a Mapbox Maven repository with username `mapbox` and a hardcoded secret token.
- Organizer `settings.gradle.kts` contains the same Mapbox Maven repository with username `mapbox` and a hardcoded secret token.
- Despite the token being present, Mapbox Maven rejects requests with 401, so the token is likely expired, revoked, malformed for downloads, or not allowed to download SDK artifacts.

## Remaining Firebase Runtime References

Mobile still intentionally contains Firebase references as migration fallback:

- Firebase Auth:
  - social login fallback
  - Firebase ID token fallback in network interceptors
  - verification/deep-link paths
- Firestore:
  - fallback user profile reads/writes in auth repositories
- Firebase Storage:
  - profile image and organizer event banner/thumbnail/video upload fallback
- Firebase Messaging:
  - FCM token registration fallback
  - attendee `MyFirebaseMessagingService`
  - OneSignal Android transport dependency still requires FCM configured under OneSignal

This means Firebase cannot be fully removed from mobile yet without additional replacement work.

## Remaining Server Risks

- Direct user notifications now support `NOTIFICATION_PROVIDER=onesignal` plus `ONESIGNAL_TARGET_MODE=external_id`, but this needs a real OneSignal app id and configured Android FCM credentials for end-to-end device delivery.
- OneSignal topic/tag behavior still needs a dedicated follow/unfollow migration slice. Current server topic code is preserved for FCM fallback and not fully validated for OneSignal tags.
- The server can run without Firebase in Postgres/backend/local/OneSignal-style modes only after env is configured correctly and archived Firebase migration scripts are not invoked.

## Next Actions

1. Replace or refresh the Mapbox downloads token outside the Firebase Exit source refactor path.
2. Re-run attendee:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing
gradlew.bat :app:compileDebugKotlin
```

3. Re-run organizer:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer
gradlew.bat :app:compileDebugKotlin
```

4. Configure real OneSignal app ids in both mobile apps and configure FCM credentials inside OneSignal dashboard.
5. Run device/emulator push smoke:
   - login backend user
   - verify `OneSignal.login(user.id)` binds External ID
   - verify Firebase Messaging fallback still sends `fcmToken`
   - send server direct notification with `NOTIFICATION_PROVIDER=onesignal` and `ONESIGNAL_TARGET_MODE=external_id`
6. Plan next implementation slice:
   - either OneSignal tags/topic follow-unfollow support
   - or generic backend storage upload route for profile images and organizer create/edit event media

## Manager Decision

Do not remove Firebase packages/config yet.

Reason:

- mobile compile is blocked by Mapbox 401
- Firebase social/auth/storage/messaging fallback paths are still active
- OneSignal device delivery has not been tested with a real app id
- organizer event media still depends on Firebase Storage until a generic backend storage upload path exists
