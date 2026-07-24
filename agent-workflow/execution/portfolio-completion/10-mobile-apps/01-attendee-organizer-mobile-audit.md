# Task 10-T1: Android Attendee & Organizer App UX Audit

## 1. Goal
Audit the Android Attendee (`mobile-attendee/`) and Organizer (`mobile-organizer/`) Jetpack Compose codebases, reviewing UI components, navigation graphs, state management, and offline/error handling.

## 2. Why
Ensures native Android mobile applications adhere to modern Android Material 3 design standards and maintain operational parity with the web platform.

## 3. Dependencies
- Phase 09 (Web UX Polish, Security Hardening & Demo Disclosures).

## 4. Preconditions
- Android project Gradle build scripts readable in `mobile-attendee/` and `mobile-organizer/`.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Auditing Jetpack Compose screens, ViewModels, and Retrofit network services.
  - Verifying Material 3 theme colors, typography, and dark mode support.
  - Reviewing error state handling (snackbar notifications, retry buttons on network failure).
  - Checking QR scanner camera permission handling in `mobile-organizer`.
- **Out-of-Scope:**
  - Developing iOS Swift/SwiftUI applications.

## 6. Likely Source Modules / Files
- `mobile-attendee/app/src/main/java/` — [Discovery Target: Attendee app Android source]
- `mobile-organizer/app/src/main/java/` — [Discovery Target: Organizer app Android source]

## 7. Contracts / Behavior to Preserve
- Existing Android package names (`com.eventing.attendee` and `com.eventing.organizer`).

## 8. Ordered Implementation Steps
1. Inspect Gradle build files (`build.gradle.kts`) and update dependencies to stable versions.
2. Audit ViewModels (`AuthViewModel`, `EventViewModel`, `CheckInViewModel`) for proper state handling (`UiState.Loading`, `UiState.Success`, `UiState.Error`).
3. Verify Retrofit API client configuration, base URL management, and OkHttp interceptors.
4. Test Jetpack Compose screen rendering on multiple Android emulator screen densities (Phone vs Tablet).
5. Document mobile audit findings in `ANDROID_APP_AUDIT.md`.

## 9. Database / Migration Needs
- Room local SQLite database migration check (if offline caching used).

## 10. Security Requirements
- Ensure no hardcoded secret keys or API credentials exist in `BuildConfig` or Kotlin source files.

## 11. Test / Build / Smoke Commands
- `./gradlew test` (in `mobile-attendee/` and `mobile-organizer/`)
- `./gradlew assembleDebug` (in `mobile-attendee/` and `mobile-organizer/`)

## 12. Acceptance Criteria
- [ ] Both Android applications compile cleanly without build errors.
- [ ] UI screens adhere to Material 3 design guidelines.
- [ ] Network failures display clean error snackbars with retry triggers.

## 13. Rollback / Feature-Flag Strategy
- Revert Gradle dependency updates if breaking API changes occur in AndroidX libraries.

## 14. Required Artifacts / Handoff Report
- `ANDROID_APP_AUDIT.md` document and Gradle build execution log.

## 15. Blocker Questions
- Are any custom native C++ libraries (JNI) used in the Android QR scanner implementation?
