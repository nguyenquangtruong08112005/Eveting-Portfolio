# Phase C9 Firebase-Removal Blocker Audit

This audit evaluates the current integration status on `staging` for the `Server-2025-Eventing` project, enumerates all remaining Firebase dependencies, classifies them, identifies safe local/dev flips, details critical blockers before complete removal of `firebase-admin`, and details mobile application integration blockers.

---

## 1. Enumerate & Classify Remaining Firebase Usages

The following list documents all files containing direct Firebase Admin SDK imports (`require('firebase-admin')`), Firebase Cloud Functions hooks, or imports from `config/firebase.config.js` in the `Server-2025-Eventing` workspace:

### 1.1 Adapters
These modules bridge the application provider boundaries to the Firebase/Firestore/FCM backend:
* **Firebase Config:**
  * [firebase.config.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/config/firebase.config.js) — Initializes `firebase-admin` and exports the `admin`, `db`, `auth`, and `FieldValue` objects.
* **Authentication Provider:**
  * [firebase.auth.provider.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/auth/firebase.auth.provider.js) — Implements Firebase Token verification and user retrieval.
* **Database/Repository Adapters:**
  * [firebase.admin.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.admin.repository.js)
  * [firebase.analytics.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.analytics.repository.js)
  * [firebase.event.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.event.repository.js)
  * [firebase.featuredProfile.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.featuredProfile.repository.js)
  * [firebase.media.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.media.repository.js)
  * [firebase.notification.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.notification.repository.js)
  * [firebase.organizer.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.organizer.repository.js)
  * [firebase.promotion.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.promotion.repository.js)
  * [firebase.review.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.review.repository.js)
  * [firebase.ticket.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.ticket.repository.js)
  * [firebase.user.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.user.repository.js)
  * [firebase.venue.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/firebase.venue.repository.js)
* **Notification Provider:**
  * [firebase.provider.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/notification/firebase.provider.js) — Directly invokes `admin.messaging()` to send multicast messages, send to topics, and manage topic subscriptions.
* **Firebase Cloud Functions Adapter:**
  * [index.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/functions/index.js) — The Firebase Cloud Functions entrypoint linking Firestore events collection writes to the Elasticsearch client.

### 1.2 Migration, Sync, and Compare Scripts
These scripts located in the `scripts/` directory compare and sync data between Firebase Firestore and PostgreSQL:
* **Comparison Scripts:**
  * [compare.admin.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.admin.firebase-postgres.js)
  * [compare.analytics.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.analytics.firebase-postgres.js)
  * [compare.events.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.events.firebase-postgres.js)
  * [compare.featured_profiles.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.featured_profiles.firebase-postgres.js)
  * [compare.notifications.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.notifications.firebase-postgres.js)
  * [compare.organizer_profiles.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.organizer_profiles.firebase-postgres.js)
  * [compare.promotions.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.promotions.firebase-postgres.js)
  * [compare.reviews.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.reviews.firebase-postgres.js)
  * [compare.tickets.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.tickets.firebase-postgres.js)
  * [compare.users.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.users.firebase-postgres.js)
  * [compare.venues.firebase-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/compare.venues.firebase-postgres.js)
* **Synchronization Scripts:**
  * [sync.analytics.firebase-to-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/sync.analytics.firebase-to-postgres.js)
  * [sync.events.firebase-to-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/sync.events.firebase-to-postgres.js)
  * [sync.featured_profiles.firebase-to-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/sync.featured_profiles.firebase-to-postgres.js)
  * [sync.notifications.firebase-to-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/sync.notifications.firebase-to-postgres.js)
  * [sync.organizer_profiles.firebase-to-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/sync.organizer_profiles.firebase-to-postgres.js)
  * [sync.promotions.firebase-to-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/sync.promotions.firebase-to-postgres.js)
  * [sync.reviews.firebase-to-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/sync.reviews.firebase-to-postgres.js)
  * [sync.tickets.firebase-to-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/sync.tickets.firebase-to-postgres.js)
  * [sync.users.firebase-to-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/sync.users.firebase-to-postgres.js)
  * [sync.venues.firebase-to-postgres.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/sync.venues.firebase-to-postgres.js)

### 1.3 Blockers Classified By Category

| Block Category | Files Involved | Description |
|---|---|---|
| **Default Provider & Runtime Blockers** | [firebase.config.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/config/firebase.config.js)<br>[admin.repository.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/database/admin.repository.js) (and all other repo selection index files)<br>[index.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/auth/index.js)<br>[index.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/notification/index.js) | Registry files require Firebase modules *statically and unconditionally*. When booting the app with a clean environment (no `serviceAccountKey.json` or without `firebase-admin` installed), the server crashes on import, even if PostgreSQL/backend providers are selected. |
| **Auth Blockers** | [firebase.auth.provider.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/auth/firebase.auth.provider.js)<br>[auth.middleware.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/middleware/auth.middleware.js) | Restricts backend login verification flow to Firebase ID tokens unless client apps transition to standard JWT-based auth routes. |
| **Push Blockers** | [firebase.provider.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/notification/firebase.provider.js) | Directly manages device registration tokens and broadcasts via the FCM Admin client. |
| **Storage Blockers** | *None in backend runtime.* Storage uses `local` or `s3` abstraction. | The backend is clean of Firebase Storage coupling. The `local` provider is in-memory/dev-only; production should use S3-compatible storage with a public URL or CDN configuration. |

---

## 2. Environment Variables & Safety Fills

### 2.1 Variables Ready for Flipping in Local/Dev

The following options can be declared in the server's `.env` config file to decouple database queries and auth handling from Firebase during development:

```cmd
# 1. Flip all database queries to local/Docker PostgreSQL
DATABASE_PROVIDER=postgres

# 2. Flip authorization to backend password hashing, refresh sessions, and JWT
AUTH_PROVIDER=backend

# 3. Use in-memory local media storage for smoke/dev only
STORAGE_PROVIDER=local

# 4. Route push delivery requests to OneSignal REST API
NOTIFICATION_PROVIDER=onesignal
```

### 2.2 Variables Required to Support the Flips

Flipping the values above requires specifying the following environment parameters in [Server-2025-Eventing/.env](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/.env):

* **PostgreSQL Connection URI:**
  `DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev`
* **JWT Signing Secret:**
  `ACCESS_TOKEN_SECRET=your_dev_jwt_secret_key_at_least_256_bits_long`
* **OneSignal App Registration Keys (if using OneSignal):**
  `ONESIGNAL_APP_ID=your_onesignal_app_id`
  `ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key`

---

## 3. Server-Side Blockers Before Removing `firebase-admin`

Before removing the `firebase-admin` dependency from [package.json](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/package.json), the following issues must be resolved:

1. **Statically Loaded Providers:**
   The index files (`providers/database/*.js`, `providers/auth/index.js`, and `providers/notification/index.js`) must be refactored to lazily resolve modules. For example:
   ```javascript
   // Instead of static const firebaseProvider = require('./firebase.x');
   // Resolve requirements conditionally based on the active provider
   ```
2. **Firebase Cloud Functions Deprecation:**
   The [functions/](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/functions) folder hosts code targeting the Google Cloud runtime. This directory, along with its separate [package.json](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/functions/package.json) dependency list, must be deleted once Postgres-based index syncing is introduced for Elasticsearch (e.g. database triggers or event-driven sync jobs).
3. **Data Synchronizers Cleanup:**
   The 21 scripts under [scripts/](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts) must be retired or isolated once Firestore-to-PostgreSQL migration is finalized and verified in production.

---

## 4. Mobile Integration Blockers

Both Android applications contain hardcoded dependencies on Firebase SDKs. Removing the backend's Firebase Admin footprint without client adaptations will break core paths.

### 4.1 Mobile-Attendee Application (`Mobile-2025-Eventing`)
* **Auth System:**
  * [AuthRepositoryImpl.kt](file:///D:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing/app/src/main/java/com/tdtuer/eventing/data/auth/AuthRepositoryImpl.kt) uses `FirebaseAuth` directly for creation, login, Google/Facebook credential providers, and sign-out.
  * [NetworkModule.kt](file:///D:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing/app/src/main/java/com/tdtuer/eventing/di/NetworkModule.kt) captures Firebase session ID tokens via `FirebaseAuth.getInstance().currentUser?.getIdToken()`.
* **Push Notifications:**
  * [MyFirebaseMessagingService.kt](file:///D:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing/app/src/main/java/com/tdtuer/eventing/service/MyFirebaseMessagingService.kt) inherits from `FirebaseMessagingService` to capture FCM broadcast payloads.
* **Storage Uploads:**
  * [UserRepositoryImpl.kt](file:///D:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing/app/src/main/java/com/tdtuer/eventing/data/repository/UserRepositoryImpl.kt) imports `FirebaseStorage` to upload user profile pictures.

### 4.2 Mobile-Organizer Application (`Mobile-2025-Eventing-Organizer`)
* **Auth System:**
  * [AuthRepositoryImpl.kt](file:///D:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing-Organizer/app/src/main/java/com/tdtuer/eventing_organizer/data/auth/AuthRepositoryImpl.kt) has matching `FirebaseAuth` direct dependencies.
  * [NetworkModule.kt](file:///D:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing-Organizer/app/src/main/java/com/tdtuer/eventing_organizer/di/NetworkModule.kt) relies on Firebase ID tokens.
* **Storage Uploads:**
  * [UserRepositoryImpl.kt](file:///D:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing-Organizer/app/src/main/java/com/tdtuer/eventing_organizer/data/repository/UserRepositoryImpl.kt) writes media files directly to the Google Firebase bucket.

> [!NOTE]
> **OneSignal Android FCM Transport Note:**
> Under OneSignal delivery, the mobile app code does not directly manage `FirebaseMessaging`. However, the OneSignal Android SDK *still requires* the FCM transport channel to dispatch messages through Google Play Services. Consequently, the Firebase project setup, client `google-services.json` metadata, and FCM dashboard configurations inside OneSignal must remain active.

---

## 5. Next Implementation Checklist & Roadmap

- [ ] **Phase 1: Implement Lazy Loading in Server Provider Registries**
  - Refactor all index exports in `Server-2025-Eventing/providers/database/*.repository.js` to dynamically load repository files only when needed, preventing crashes when Firebase files are missing or unconfigured.
  - Refactor [providers/auth/index.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/auth/index.js) and [providers/notification/index.js](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/providers/notification/index.js) to resolve dependencies conditionally.
- [ ] **Phase 2: Secure Environment Flips**
  - Add the `ACCESS_TOKEN_SECRET` and Postgres credential values into the server's `.env` configuration template.
  - Assert that all database tests execute and verify local development stability using `DATABASE_PROVIDER=postgres`, `AUTH_PROVIDER=backend`, and `STORAGE_PROVIDER=local`.
- [ ] **Phase 3: Clean up Scripts & Decommission Cloud Functions**
  - Delete or archive the [Server-2025-Eventing/functions/](file:///D:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/functions/) directory after replacement jobs exist.
  - Move Firebase comparison/migration scripts out of runtime deployment or into an archive folder after production migration is finalized.
- [ ] **Phase 4: Mobile Applications Client Migration**
  - Integrate an OkHttp Auth interceptor in the mobile `NetworkModule` to append backend access tokens.
  - Re-route mobile authentication requests from direct Firebase interactions to custom login/registration endpoints.
  - Adapt media uploads to use multi-part media requests towards the backend API instead of targeting Google Cloud storage buckets directly.
  - Configure the OneSignal SDK in client packages and retire direct Firebase token listeners.
- [ ] **Phase 5: Final Cleanup**
  - Uninstall `firebase-admin` from `Server-2025-Eventing/package.json` only after all runtime and migration blockers above are resolved.
  - Keep `geofire-common` unless geospatial search is rewritten; it is used by `services/event.service.js` and is not a Firebase Admin dependency.
  - Delete `config/firebase.config.js` and `serviceAccountKey.json`.
