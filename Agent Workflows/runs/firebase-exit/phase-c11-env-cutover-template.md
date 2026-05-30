# Phase C11 Environment Cutover Template

This document provides the environment cutover template for the local/development setup to flip the `Server-2025-Eventing` application backend provider away from Firebase to PostgreSQL, custom backend authentication, local/S3 media storage, and OneSignal notifications.

---

## Critical Warning

> [!WARNING]
> **DO NOT remove Firebase packages (`firebase-admin`), config files, or adapters yet!**
> 
> The following remaining dependencies are blockers and will break the application and build process if removed prematurely:
> 1. **Mobile Clients (`Mobile-2025-Eventing` and `Mobile-2025-Eventing-Organizer`)**:
>    - Attendee app Auth implementation [AuthRepositoryImpl.kt](file:///D:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing/app/src/main/java/com/tdtuer/eventing/data/auth/AuthRepositoryImpl.kt) and Organizer app Auth implementation [AuthRepositoryImpl.kt](file:///D:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing-Organizer/app/src/main/java/com/tdtuer/eventing_organizer/data/auth/AuthRepositoryImpl.kt) still directly call the Firebase Client SDK.
>    - Media uploads in both apps depend directly on Firebase Storage buckets.
>    - Notification token management and payload handling rely on Firebase Cloud Messaging (FCM). Even after switching backend delivery to OneSignal, Android delivery still needs FCM configured under OneSignal.
> 2. **Cloud Functions**:
>    - The [functions/](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/functions) folder targets Google Cloud Functions runtime with its own [package.json](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/functions/package.json) and remains a blocker until Elasticsearch index sync adapters are written.
> 3. **Sync & Compare Tools**:
>    - Firebase sync/compare scripts in the [scripts/](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts) folder depend on the Firebase Admin SDK to perform comparative data assertion and migration pipelines.

---

## 1. Environment Cutover Block (`.env`)

Add or replace the following entries in your local [Server-2025-Eventing/.env](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/.env) file:

```ini
# ==============================================================================
# Phase C11 Local/Dev Cutover Environment Settings
# ==============================================================================

# --- Active Providers Selection ---
# Instructs runtime selector registries to skip Firebase and load Postgres/backend/OneSignal/Local
DATABASE_PROVIDER=postgres
AUTH_PROVIDER=backend
STORAGE_PROVIDER=local
NOTIFICATION_PROVIDER=onesignal

# --- Database Settings ---
# PostgreSQL connection string for the local development database
DATABASE_URL=postgres://[db_user]:[db_password]@[db_host]:[db_port]/[db_name]

# --- Backend JWT Auth Settings ---
# Secret key used for signing JSON Web Tokens. Must be a secure random 256-bit string.
ACCESS_TOKEN_SECRET=[secure_random_base64_or_hex_jwt_secret_at_least_256_bits]

# --- OneSignal Push Notification Settings ---
# App Identifier and API key for OneSignal notification deliveries
ONESIGNAL_APP_ID=[onesignal_app_id_uuid]
ONESIGNAL_REST_API_KEY=[onesignal_rest_api_key]

# --- S3-Compatible Storage Settings (Alternative for STORAGE_PROVIDER=s3) ---
# Config parameters used if STORAGE_PROVIDER is flipped to 's3' instead of 'local'
S3_ACCESS_KEY_ID=[s3_access_key_id]
S3_SECRET_ACCESS_KEY=[s3_secret_access_key]
S3_REGION=[s3_region_name]
S3_BUCKET=[s3_bucket_name]
S3_ENDPOINT=[s3_endpoint_url_if_using_r2_or_minio]
S3_PUBLIC_URL_BASE=[optional_public_cdn_or_bucket_base_url]
```

---

## 2. Verification Checklist & Command Sequence

These commands are strictly **Windows CMD-compatible** and do not use PowerShell or bash features. Run these commands from the `Server-2025-Eventing` directory.

### Verification Options

#### Option A: Session-wide Variable Verification (Recommended)
This approach sets variables for the current CMD window session, avoiding inline command length limits.

```cmd
cd /d "D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing"

:: Set environment overrides
set DATABASE_PROVIDER=postgres
set AUTH_PROVIDER=backend
set STORAGE_PROVIDER=local
set NOTIFICATION_PROVIDER=onesignal
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev
set ACCESS_TOKEN_SECRET=your_dev_jwt_secret_key_at_least_256_bits_long
set ONESIGNAL_APP_ID=your_onesignal_app_id
set ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key

:: 1. Run migrations to verify Postgres schema status
npm run db:migrate

:: 2. Verify dynamic/lazy loading of provider selectors
npm run db:smoke:lazy-providers

:: 3. Run Postgres Repository connectivity smoke test
npm run db:smoke:postgres-provider

:: 4. Verify user authentication flow and password hashing
npm run db:smoke:auth

:: 5. Verify database transactional writes
npm run db:smoke:postgres-write-paths

:: 6. Verify domain repositories under PostgreSQL
npm run db:smoke:venues
npm run db:smoke:notifications
npm run db:smoke:media
npm run db:smoke:storage-media

:: 7. Verify sync/compare parity asserts (will load Firebase for comparison check)
npm run db:compare:events
npm run db:compare:admin
```

#### Option B: Inline Command Chain (One-Liner)
Useful for automated scripts where session persistence is undesirable. Note the omission of spaces surrounding the `&&` to prevent trailing whitespace in variable values.

```cmd
cd /d "D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing"

set DATABASE_PROVIDER=postgres&&set AUTH_PROVIDER=backend&&set STORAGE_PROVIDER=local&&set NOTIFICATION_PROVIDER=onesignal&&set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&set ACCESS_TOKEN_SECRET=your_dev_jwt_secret_key_at_least_256_bits_long&&set ONESIGNAL_APP_ID=your_onesignal_app_id&&set ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key&&npm run db:migrate&&npm run db:smoke:lazy-providers&&npm run db:smoke:postgres-provider&&npm run db:smoke:auth&&npm run db:smoke:postgres-write-paths&&npm run db:smoke:venues&&npm run db:smoke:notifications&&npm run db:smoke:media&&npm run db:smoke:storage-media&&npm run db:compare:events&&npm run db:compare:admin
```

---

## 3. Post-Cutover Status Checklist

- [ ] Run `db:migrate` and check that all Postgres schemas are updated.
- [ ] Confirm `db:smoke:lazy-providers` passes (meaning the server runs without loading Firebase Admin configurations when `postgres`/`backend`/`onesignal` are active).
- [ ] Confirm database reads/writes (`db:smoke:postgres-provider`, `db:smoke:postgres-write-paths`) execute successfully.
- [ ] Verify standard backend password hashing (`db:smoke:auth`) functions as expected.
- [ ] Ensure that S3/MinIO upload tests pass if using the remote storage configurations.
