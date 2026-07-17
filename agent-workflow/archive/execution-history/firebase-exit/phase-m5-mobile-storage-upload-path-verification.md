# Phase M5 Mobile Storage Upload Path Verification

## Scope

- Repo: `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing`
- Branch: `staging`
- Slice: attendee event gallery media upload only.
- Out of scope: organizer create/edit event banner, thumbnail, and video uploads because the backend currently accepts those event fields as URLs and does not yet expose a generic pre-event media upload route.

## Worker Split

- Implementation: `agy`
- Review, verification, commit, and documentation: Codex manager

## Integrated Commit

- Attendee `Mobile-2025-Eventing`: `07c07d8` - Upload attendee event media through backend.

## Boundary Added

- Added a Retrofit multipart method for `POST /events/{eventId}/media`.
- Added `EventRepository.uploadEventMediaMultipart(eventId, uri)`.
- Added `UploadEventMediaMultipartUseCase`.
- Updated attendee `PostEventViewModel.onMediaSelected` to:
  - try backend multipart upload first
  - reload media on success
  - fall back to existing Firebase Storage upload plus JSON `postEventMedia` path on backend multipart failure

## Compatibility Notes

- Existing JSON `POST /events/{eventId}/media` behavior remains intact.
- Existing Firebase Storage upload path remains as fallback.
- Existing route names and mobile event media payload fields remain unchanged.
- Existing UI state behavior is preserved as closely as possible: upload spinner, reload-after-success, and previous fallback error text are retained.

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

## Residual Risks

- Kotlin compile and Hilt graph generation still need verification after Mapbox dependency access is fixed.
- The multipart upload reads the selected media URI into memory before sending; current backend upload limit is 10 MB, so this is acceptable for the current slice but should be revisited for larger video upload support.
- Organizer event banner/thumbnail/video upload still uses Firebase Storage because the backend does not yet provide a generic storage upload route for media that is needed before an event id exists.

## Next Step

Phase M6 should wire mobile push registration to OneSignal subscription/external id while keeping current FCM token registration as a migration fallback.
