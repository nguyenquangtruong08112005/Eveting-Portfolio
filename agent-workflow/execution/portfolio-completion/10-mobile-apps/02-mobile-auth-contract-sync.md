# Task 10-T2: Mobile Auth Migration & API Contract Synchronization

## 1. Goal
Migrate mobile auth handling to secure storage (Android `EncryptedSharedPreferences` / `KeyStore`), implement token refresh interceptors, and synchronize mobile DTO models with backend API contracts.

## 2. Why
Secures authentication tokens on mobile devices against extraction and ensures zero contract drift between Android Retrofit clients and backend Express controllers.

## 3. Dependencies
- Task `10-T1` (Android Attendee & Organizer App UX Audit).

## 4. Preconditions
- Backend authentication and API contracts finalized (Phases 01 & 02).

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `TokenManager` using `EncryptedSharedPreferences` for storing JWT Access Token and Refresh Token securely on Android.
  - OkHttp `AuthInterceptor` injecting `Authorization: Bearer <token>` header on mobile endpoints (`/api/mobile/*`).
  - OkHttp `Authenticator` handling HTTP 401 response by automatically calling `/api/mobile/auth/refresh` and retrying failed request.
  - Transport boundary relies on explicit mobile routes (`/api/mobile/*`) or content negotiation established in Phase 00, **not** on untrusted client headers.
  - Updating Retrofit DTO data classes (`UserDto`, `EventDto`, `OrderDto`, `TicketDto`) to match backend Express JSON shapes.
  - Mobile Play Integrity attestation token header injection (`X-App-Integrity-Token`).
- **Out-of-Scope:**
  - Android biometrics (Fingerprint/FaceID) requirement.

## 6. Likely Source Modules / Files
- `mobile-attendee/app/src/main/java/com/eventing/attendee/data/network/` — [Discovery Target: Retrofit client & interceptors]
- `mobile-organizer/app/src/main/java/com/eventing/organizer/data/network/` — [Discovery Target: Retrofit client & interceptors]

## 7. Contracts / Behavior to Preserve
- Exact match of JSON property keys (`@SerializedName("field_name")`) between Kotlin DTOs and Node.js backend responses.

## 8. Ordered Implementation Steps
1. Add `androidx.security:security-crypto` dependency to Android `build.gradle.kts`.
2. Implement `EncryptedTokenStorage` class securing JWT tokens in Android KeyStore.
3. Build OkHttp `RefreshTokenAuthenticator` interceptor handling transparent 401 token refresh on mobile routes.
4. Audit all Retrofit interface methods against backend endpoint catalog.
5. Write unit tests for TokenManager and Retrofit request interceptors.

## 9. Database / Migration Needs
- None (Client-side token storage).

## 10. Security Requirements
- Access tokens stored in EncryptedSharedPreferences backed by Android KeyStore master key.
- Never log plain JWT tokens or credentials in `Logcat`.

## 11. Test / Build / Smoke Commands
- Test commands will be selected from Gradle build scripts in Phase 00 discovery — [Proposed Command].

## 12. Acceptance Criteria
- [ ] Auth tokens stored encrypted on Android device.
- [ ] Expired access token triggers automatic background refresh without user logout.
- [ ] 100% of Retrofit API calls successfully deserialize backend JSON responses.

## 13. Rollback / Feature-Flag Strategy
- Fallback to standard SharedPreferences in debug builds if KeyStore hardware abstraction layer fails on older emulators.

## 14. Required Artifacts / Handoff Report
- Mobile auth synchronization verification log and Retrofit contract audit report — [Proposed Artifact].

## 15. Blocker Questions
- Minimum Android SDK API level supported (e.g. API level 24 / Android 7.0+)?
