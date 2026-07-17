# Phase M4 Mobile Refresh Token Verification

## Scope

- Repos:
  - `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing`
  - `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer`
- Branch: `staging`
- Contract rule: mobile-facing routes, payload fields, and Firebase fallback behavior stay compatible.

## Worker Split

- Attendee app: delegated to `opencode`; Codex reviewed, verified, and committed.
- Organizer app: delegated to `agy` for first pass, then `opencode` for cleanup; Codex reviewed, verified, and committed.

## Integrated Commits

- Attendee `Mobile-2025-Eventing`: `0c9cb03` - Refresh backend access token on 401.
- Organizer `Mobile-2025-Eventing-Organizer`: `0684fb1` - Refresh backend access token on 401.

## Boundary Added

- Both mobile apps now keep backend access-token preference with Firebase ID token fallback.
- Both OkHttp interceptors detect a backend `401` response and try one refresh-token exchange through `POST /auth/refresh`.
- The refresh request uses a bare `OkHttpClient` inside the interceptor to avoid Retrofit/auth-client recursion.
- On refresh success:
  - save the returned backend access token
  - save the returned refresh token when present
  - retry the original request once with a retry marker
- Auth endpoints are excluded from refresh retry to avoid refresh/login/register loops.

## Compatibility Notes

- No mobile API route names were changed.
- No event names, notification payload fields, or mobile JSON response contracts were intentionally changed.
- Firebase Auth remains available as a fallback during migration.
- Attendee keeps the existing backend token fallback foundation and adds refresh behavior only when the backend token expires.
- Organizer keeps the existing backend token fallback foundation and adds refresh behavior only when the backend token expires.

## Verification

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

- The refresh flow still needs a real device/emulator API smoke after Mapbox dependency access is fixed.
- Mobile logout/session-expiry UX should be checked manually because token clearing paths now include refresh failure.
- The attendee repo still has an untracked Gradle diagnostic file: `.kotlin/errors/errors-1764516985770.log`; it is intentionally not committed.

## Next Step

Phase M5 should wire the mobile storage upload path to the backend media upload route while preserving the existing URL-based media submission behavior as fallback.
