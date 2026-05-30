# Phase M1 Mobile Backend Token Foundation Verification

## Scope

- Server repo: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Attendee mobile repo: `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing`
- Organizer mobile repo: `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer`
- Branch: `staging` in all three repos.

## Worker

- Implementation worker used: `opencode`
- `agy` paused because quota/capacity was not reliable.
- Codex role: manager/verifier, diff review, selected commits, progress artifact.

## Integrated Commits

- Server: `7427306` - `Support backend auth organizer role`
- Attendee mobile: `b1ca179` - `Add backend token fallback foundation`
- Organizer mobile: `a197660` - `Add backend token fallback foundation`

## Implemented Changes

Server:

- `POST /auth/register` accepts optional `role`.
- Allowed registration roles are `user` and `organizer`.
- Missing role defaults to `user`.
- Invalid role such as `admin` returns 400.
- Existing auth response shape stays stable: `accessToken`, `refreshToken`, `user`.

Attendee mobile:

- Added backend token store backed by DataStore.
- Added backend auth DTOs.
- Added `auth/register`, `auth/login`, `auth/refresh`, and `auth/logout` Retrofit methods.
- OkHttp auth interceptor now prefers backend access token and falls back to Firebase ID token.
- Firebase auth behavior remains available.

Organizer mobile:

- Added backend token store backed by DataStore.
- Added backend auth DTOs and `AuthApiService`.
- OkHttp auth interceptor now prefers backend access token and falls back to Firebase ID token.
- Firebase auth behavior remains available.

## Verification Commands

Server:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
findstr /R /N "[^ -~]" controllers\auth.controller.js services\auth.service.js scripts\smoke.auth.js
git diff --check
node --check controllers\auth.controller.js
node --check services\auth.service.js
node --check scripts\smoke.auth.js
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:smoke:auth&&npm run db:smoke:lazy-providers&&npm run db:smoke:postgres-provider
```

Result: passed.

Attendee mobile:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing
git diff --check
gradlew.bat :app:compileDebugKotlin
```

Result:

- `git diff --check` passed.
- Kotlin compile did not reach Kotlin compilation. It is blocked at `:app:checkDebugAarMetadata` because Mapbox Maven returns 401 Unauthorized.

Organizer mobile:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer
git diff --check
gradlew.bat :app:compileDebugKotlin
```

Result:

- `git diff --check` passed.
- Kotlin compile did not reach Kotlin compilation. It is blocked at `:app:checkDebugAarMetadata` because Mapbox Maven returns 401 Unauthorized.

## Dirty Working Tree Notes

Attendee mobile has pre-existing uncommitted changes unrelated to M1. They were not committed by this slice.

Organizer mobile has pre-existing uncommitted `EditEventScreen.kt`. It was not committed by this slice.

## Compatibility Notes

- No mobile route payload was removed.
- Firebase ID token fallback remains in both mobile interceptors.
- Backend token storage is additive.
- Backend role support is additive for organizer registration and defaults to existing `user` behavior.

## Remaining Work

Next mobile slice:

- Wire attendee `AuthRepositoryImpl` email/password login and registration to backend auth, behind a safe fallback path.
- Wire organizer `AuthRepositoryImpl` login and registration to backend auth with `role=organizer`.
- Save backend tokens into `TokenStore`.
- Keep Firebase social login as fallback until mobile auth behavior is verified.
- Add refresh-token handling for 401 responses or explicit session refresh.
- Resolve Mapbox Maven credentials before compile can validate Kotlin changes.
