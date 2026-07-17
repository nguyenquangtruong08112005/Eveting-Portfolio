# Phase M8 Generic Storage Upload Verification

## Scope

- Repo: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Branch: `staging`
- Slice: backend generic storage upload route.

## Worker Split

- Implementation: `agy`
- Review, verification, commit, and documentation: Codex manager

## Integrated Commit

- Server `Server-2025-Eventing`: `0b40153` - Add generic storage upload route.

## Route Contract

```http
POST /storage/upload
Authorization: Bearer <access-token>
Content-Type: multipart/form-data
```

Form fields:

- `file`: required single file.
- `purpose`: optional, accepted values are `profile`, `event`, `media`, `misc`; unknown values fall back to `misc`.

Response fields:

- `key`
- `url`
- `contentType`
- `originalName`
- `size`

## Behavior

- Uses the active backend storage provider from `providers/storage`.
- Defaults to `STORAGE_PROVIDER=local` when no storage provider is configured.
- Supports image and video uploads only.
- Rejects missing file, unsupported MIME type, and files larger than 10 MB.
- Namespaces keys by purpose and authenticated user id.
- Does not modify existing `/events/:eventId/media` behavior.

## Verification

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check app.js
node --check controllers\storage.controller.js
node --check routes\storage.routes.js
node --check services\storage.service.js
node --check scripts\smoke.storage.js
node scripts\smoke.storage.js
```

Result:

- `git diff --check` passed.
- Node syntax checks passed for all changed JS files.
- `node scripts\smoke.storage.js` passed with `STORAGE_PROVIDER=local`.

## Compatibility Notes

- Existing event media multipart route remains unchanged.
- Existing JSON media route remains unchanged.
- No mobile-facing existing payload fields were changed.
- S3/R2 credentials are not required for local verification.

## Residual Risks

- Route-level Express auth was not hit in smoke because the smoke intentionally bypasses auth and validates service/controller behavior directly.
- S3/R2 provider behavior still needs a configured bucket and provider credentials.
- Mobile apps still need a later slice to call this route for profile image and organizer create/edit media uploads.

## Next Step

Phase M9 should wire mobile profile/organizer media upload use cases to `POST /storage/upload`, with Firebase Storage as fallback until device testing passes.
