# Mobile-2025-Eventing-Organizer

Android organizer / staff app for AuraEvents.

## Portfolio V1 flows

| Flow | Notes |
|---|---|
| Organizer auth | Register/login as organizer |
| Dashboard | Events list, revenue summary |
| Create / edit event | Draft submit path |
| Admin moderation | Approve/reject (admin role) |
| QR scanner / check-in | Staff check-in |
| Stats | Per-event stats |

## User-facing errors (Phase E)

Same pattern as consumer app:

- `helpers/UserFacingErrors.kt` maps HTTP codes, JSON `error.message`, and network exceptions.
- Auth + event repositories and major ViewModels use the mapper so screens never show `code: 401` / `errorBody` dumps.

```bash
cd Mobile-2025-Eventing-Organizer
./gradlew :app:testDebugUnitTest --tests "com.tdtuer.eventing_organizer.helpers.UserFacingErrorsTest"
```
