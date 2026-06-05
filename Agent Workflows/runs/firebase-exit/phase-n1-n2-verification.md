# Phase N1 N2 Verification

Date: 2026-06-05
Branch: `staging`
Mode: local worker implements; Codex manager verifies.

## N1 - Media Public URL And R2 Cutover

Status: complete for backend storage/upload/read path.

Worker implementation:

- `app.js`
  - Added `GET /public/:key(*)` for local-storage fallback URLs.
- `providers/storage/local.js`
  - Added `getObjectMetadata`.
- `providers/storage/s3.js`
  - Added `getObjectMetadata` using S3 `HeadObject`.

Compatibility:

- Existing upload response fields are unchanged.
- Existing R2 public URLs still point directly to `S3_PUBLIC_URL_BASE`.
- Local fallback URLs now resolve instead of returning 404 for objects that still exist in the running local provider.
- Previously lost in-memory local objects cannot be recovered.

Manager verification:

```text
R2 direct provider smoke:
- upload: passed
- HeadObject metadata: text/plain
- getObjectBuffer: matched
- public URL GET: 200
- delete: passed

Local fallback route smoke:
- GET /public/event-media/test/a.jpg: 200
- Content-Type: image/jpeg
- body matched

Authenticated HTTP upload to R2:
- POST /storage/upload: 201
- returned key prefix: correct
- returned URL uses S3_PUBLIC_URL_BASE
- public URL GET: 200
- body matched
- cleanup delete: passed
```

Static verification:

- `node --check app.js`: passed.
- `node --check providers/storage/local.js`: passed.
- `node --check providers/storage/s3.js`: passed.
- `git diff --check`: passed with CRLF warnings only.

Remaining device verification:

- Upload a real attendee event-media image.
- Confirm `GET /events/:eventId/media` returns the R2 URL.
- Confirm the image loads on the phone.

## N2 - OneSignal Subscription Verification

Status: complete.

Configuration:

- `NOTIFICATION_PROVIDER=onesignal`
- `ONESIGNAL_TARGET_MODE=external_id`
- App ID and REST API key are configured.
- Both Android apps call `OneSignal.login(user.id)`.

OneSignal API evidence:

```text
subscriptions: 3
identified subscriptions: 3
external IDs: all mapped to the same backend user ID
enabled AndroidPush subscriptions: 1
disabled historical AndroidPush subscriptions: 2
device: SM-A526B
Android: 14
OneSignal SDK: 5.6.1
```

Message evidence:

```text
messages found: 1
successful: 1
failed: 0
```

Conclusion:

- OneSignal external-id registration works.
- OneSignal has an active Android subscription for the connected test device.
- OneSignal API push delivery has succeeded.
- Historical disabled subscriptions are expected after reinstall/re-registration and are not a blocker.

## Next Phase

N3 Firebase dependency cleanup audit:

- Read-only first.
- Enumerate remaining Firebase runtime paths in server, attendee, and organizer.
- Classify each path as removable, compatibility bridge, Android transport requirement, or blocked by missing replacement.
- Do not remove Firebase dependencies until replacements are implemented and device-tested.
