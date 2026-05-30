# Phase M2 Mobile Auth Repository Wiring Verification

## Scope

- Attendee mobile repo: `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing`
- Organizer mobile repo: `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer`
- Branch: `staging`
- Worker: `opencode`

## Integrated Commits

- Attendee mobile: `ef651d8` - `Wire attendee auth to backend fallback`
- Organizer mobile: `4a42cef` - `Wire organizer auth to backend fallback`

## Implemented Changes

Attendee mobile:

- `AuthRepositoryImpl.signUp` now tries backend `POST /auth/register` first.
- Mobile role `attendee` is mapped to backend role `user`.
- Backend role `user` is mapped back to mobile domain role `attendee`.
- On backend auth success, access and refresh tokens are saved to `TokenStore`.
- On backend failure, the existing Firebase Auth plus Firestore sign-up path remains as fallback.
- `AuthRepositoryImpl.signIn` now tries backend `POST /auth/login` first and falls back to Firebase sign-in.
- `signOut` clears backend tokens in addition to existing FCM removal and Firebase sign-out.
- Added a dedicated auth response DTO so backend `{ id, email, name, roles }` is not parsed through the existing profile `UserDto`.

Organizer mobile:

- `AuthRepositoryImpl.signUp` now tries backend `POST /auth/register` first with `role=organizer`.
- On backend auth success, access and refresh tokens are saved to `TokenStore`.
- On backend failure, the existing Firebase Auth plus Firestore sign-up path remains as fallback.
- `AuthRepositoryImpl.signIn` now tries backend `POST /auth/login` first and falls back to Firebase sign-in.
- `signOut` clears backend tokens in addition to existing FCM removal and Firebase sign-out.
- Added backend roles parsing for organizer auth responses.

## Verification Commands

Attendee:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing
git diff --check
gradlew.bat :app:compileDebugKotlin
```

Result:

- `git diff --check` passed.
- Compile is blocked at `:app:checkDebugAarMetadata` because Mapbox Maven returns 401 Unauthorized before Kotlin compilation.

Organizer:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer
git diff --check
gradlew.bat :app:compileDebugKotlin
```

Result:

- `git diff --check` passed.
- Compile is blocked at `:app:checkDebugAarMetadata` because Mapbox Maven returns 401 Unauthorized before Kotlin compilation.

## Dirty Working Tree Notes

Attendee mobile still has pre-existing dirty changes unrelated to M2. The pre-existing `getCurrentUserId()` hunk in `AuthRepository.kt` and `AuthRepositoryImpl.kt` was intentionally left unstaged and uncommitted.

Organizer mobile still has pre-existing dirty `EditEventScreen.kt`, left unstaged and uncommitted.

## Compatibility Notes

- Firebase email/password auth remains fallback.
- Firebase Google/Facebook social auth was not changed.
- Mobile API payloads and route paths were not removed.
- Backend JWT token use is now possible through the existing OkHttp interceptor from M1.

## Remaining Work

- Resolve Mapbox Maven credentials so mobile compile reaches Kotlin.
- Add backend-auth current-user/session state so `getCurrentUser()` is not Firebase-only.
- Add refresh-token handling for 401 responses.
- Decide whether Firebase email/password fallback should remain during migration or be disabled after backend auth is verified.
