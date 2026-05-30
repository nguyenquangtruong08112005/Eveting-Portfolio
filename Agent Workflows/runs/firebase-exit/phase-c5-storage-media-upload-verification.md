# Phase C5 Storage Media Upload Verification

## Scope

- Server repo only: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Branch: `staging`
- Server commit: `0f06354` - `Wire media storage uploads`
- Mobile repos were not changed.

## Implemented Boundary

- Existing JSON path is preserved:
  - `POST /events/:eventId/media`
  - body remains `{ mediaItems: [{ url, type, caption }] }`
- Added additive multipart support on the same route when files are sent.
- Multipart files are uploaded through `providers/storage`.
- Storage keys use `event-media/<eventId>/<uuid>.<ext>`.
- Stored media records continue using the existing `url`, `type`, `caption`, `createdAt`, `userId`, and `eventId` shape.
- Local and S3 storage adapters now expose `getObjectBuffer` for bounded read verification.
- Unsupported multipart mimetypes return 400 before upload; only `image/*` and `video/*` are accepted.

## Verification Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check controllers\media.controller.js
node --check routes\media.routes.js
node --check services\media.service.js
node --check providers\storage\local.js
node --check providers\storage\s3.js
node --check scripts\smoke.storage-media.js
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
npm run db:smoke:storage-media
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
for /f "delims=" %f in ('rg --files -g "*.js" -g "!node_modules/**"') do @node --check "%f"
```

Result: passed.

## Smoke Coverage

- Local storage provider uploads a buffer.
- Local storage provider returns a public URL string.
- Local storage provider reads the same buffer back by key.
- Media service builds image and video records from file buffers.
- Media service preserves captions.
- Media service preserves file extensions in generated storage URLs.
- Media service calls `createEventMediaBatch` with the generated media records.
- Controller rejects unsupported multipart mimetype with 400.

## Compatibility Notes

- Existing mobile JSON upload behavior remains the default when no files are sent.
- Existing gallery read payload shape remains unchanged.
- S3-compatible provider remains opt-in through `STORAGE_PROVIDER=s3`.
- Local provider is for smoke/dev validation; production media serving should use S3-compatible public URL or CDN configuration.

## Remaining Risks

- Local provider public URLs are development placeholders; they are not a production serving strategy.
- Multipart route still requires the existing auth and attendee/organizer permission checks.
- S3/R2/MinIO should be tested with real bucket credentials before provider flip in deployment.
- Stored URLs remain the public contract; no separate storage key column has been added yet.

## Next Step

Phase C6 global provider flip blockers:

- implement or scope admin repository Postgres adapter so `DATABASE_PROVIDER=postgres` is no longer blocked by admin routes
- run full compare/smoke matrix with provider-specific env
- keep Firebase available until the deployment order is proven
