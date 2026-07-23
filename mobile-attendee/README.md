# Mobile-2025-Eventing (Consumer)

Android attendee app for AuraEvents.

## Portfolio V1 flows

| Flow | Notes |
|---|---|
| Sign up / Sign in | JWT via backend |
| Browse events | List + detail (offline cache when available) |
| Book / pay | Ticket booking + payment entry points |
| My tickets / QR | Ticket list and detail |
| Profile | View / edit profile |
| Reviews | Post-event review when eligible |

## User-facing errors (Phase E)

Technical failures are mapped through `helpers/UserFacingErrors.kt` before UI state.

- Repositories throw/return `UserFacingException` with safe messages (no raw HTTP codes).
- ViewModels use `Throwable.toUserMessage()` / `UserFacingErrors.toUserMessage(...)`.
- Unit tests: `app/src/test/.../UserFacingErrorsTest.kt`

```bash
# From project root (requires Android SDK / Gradle)
cd Mobile-2025-Eventing
./gradlew :app:testDebugUnitTest --tests "com.tdtuer.eventing.helpers.UserFacingErrorsTest"
```

## Backend

Point the app base URL at `Server-2025-Eventing` (see network module / BuildConfig).
