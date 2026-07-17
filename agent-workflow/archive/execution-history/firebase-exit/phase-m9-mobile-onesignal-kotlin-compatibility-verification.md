# Phase M9 - Mobile OneSignal Kotlin Compatibility Verification

## Scope

- Attendee app: `Mobile-2025-Eventing`
- Organizer app: `Mobile-2025-Eventing-Organizer`
- Fix mobile compile regression after Mapbox credentials allowed Gradle to reach Kotlin compilation.

## Root Cause

Both mobile apps used a dynamic OneSignal dependency range:

```kotlin
implementation("com.onesignal:OneSignal:[5.6.1,5.9.99]")
```

Gradle resolved the range to `com.onesignal:OneSignal:5.9.2`, which pulled OpenTelemetry/OkHttp 5.x dependencies compiled with Kotlin metadata 2.2. The apps currently use Kotlin `2.0.21`, so `:app:compileDebugKotlin` failed with incompatible Kotlin metadata and an internal compiler diagnostic around `MainActivity`.

## Change

- Pin OneSignal SDK to `5.6.1` in both apps.
- Do not touch Mapbox key files or `settings.gradle.kts`.
- Do not change API payloads, route contracts, push payload fields, or backend behavior.

## Verification

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing
gradlew.bat :app:dependencyInsight --dependency okhttp --configuration debugRuntimeClasspath
gradlew.bat :app:dependencyInsight --dependency kotlin-stdlib --configuration debugRuntimeClasspath
gradlew.bat :app:compileDebugKotlin
git diff --check -- app\build.gradle.kts

cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer
gradlew.bat :app:compileDebugKotlin
git diff --check -- app\build.gradle.kts
```

Results:

- Attendee `dependencyInsight okhttp` no longer resolves OneSignal/OpenTelemetry to OkHttp `5.2.1`; active OkHttp remains `4.11.0`.
- Attendee `:app:compileDebugKotlin` passed.
- Organizer `:app:compileDebugKotlin` passed.
- `git diff --check -- app\build.gradle.kts` passed in both mobile repos.
- Remaining Kotlin output is warning-only deprecation noise from existing Compose/Hilt/Java APIs.

## Commits

- Attendee: `fdb8226` - `Pin OneSignal SDK for Kotlin compatibility`
- Organizer: `04fe094` - `Pin OneSignal SDK for Kotlin compatibility`

## Notes

- User Mapbox credential edits remain uncommitted.
- Gradle/Kotlin generated `.kotlin` error logs remain untracked and intentionally uncommitted.
- OneSignal still needs real app id/device verification later; this phase only unblocks compilation.
