# Phase C4 Consolidation & Provider Flip Matrix

## 1. Completed Domains

The following table summarizes the status of the database and service domains across Firebase and PostgreSQL implementations:

| Domain | Firebase Adapter | PostgreSQL Adapter | Migration File | Status / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Venues** | `firebase.venue.repository.js` | `postgres.venue.repository.js` | `001_create_venues.sql` | **Ready**. Fully verified, complete parity. |
| **Notifications** | `firebase.notification.repository.js` | `postgres.notification.repository.js` | `003_create_notifications.sql` | **Ready**. Schema migrated, verified. |
| **Media** | `firebase.media.repository.js` | `postgres.media.repository.js` | `004_create_event_media.sql` | **Ready**. Schema migrated, verified. |
| **Promotions** | `firebase.promotion.repository.js` | `postgres.promotion.repository.js` | `005_create_promotions.sql` | **Ready** (with caveats). Writes are functional but lack atomic SQL transactions. |
| **Reviews** | `firebase.review.repository.js` | `postgres.review.repository.js` | `006_create_reviews.sql`<br>`007_add_review_user_snapshot.sql` | **Ready**. Schema migrated, verified. |
| **Users** | `firebase.user.repository.js` | `postgres.user.repository.js` | `008_create_user_profiles.sql`<br>`009_add_user_raw_data.sql` | **Ready** (with caveats). Fully synced and verified. |
| **Tickets** | `firebase.ticket.repository.js` | `postgres.ticket.repository.js` | `011_create_tickets.sql` | **Ready** (with caveats). Parity verified. Write path transactions are stubbed and run sequentially. |
| **Events** | `firebase.event.repository.js` | `postgres.event.repository.js` | `010_create_events.sql` | **Ready** (with caveats). Write path updates bypass transaction safety. |
| **Organizer Profiles** | `firebase.organizer.repository.js` | `postgres.organizer.repository.js` | `013_create_organizer_profiles.sql` | **Ready**. Schema migrated, verified. |
| **Featured Profiles** | `firebase.featuredProfile.repository.js` | `postgres.featuredProfile.repository.js` | `012_create_featured_profiles.sql` | **Ready**. Schema migrated, verified. |
| **Analytics** | `firebase.analytics.repository.js` | `postgres.analytics.repository.js` | `014_create_analytics.sql` | **Ready**. Schema migrated, verified. |
| **Admin** | `firebase.admin.repository.js` | *None* | *None* | **Blocked**. No PG schema or adapter exists. Selector throws if `DATABASE_PROVIDER` is set to `postgres`. |
| **Auth** | `firebase.auth.provider.js` | `postgres.auth.repository.js` | `002_create_auth_tables.sql` | **Partially Ready**. Repository and schema exist, but backend endpoints (register, login, refresh) are not wired. |
| **Storage** | *None* (Client uploads direct) | `providers/storage/` (`local`, `s3`) | *None* | **Partially Ready**. Core storage classes exist, but upload routes/middleware are not wired. |
| **Notifications Push** | `firebase.provider.js` | `onesignal.provider.js` | *None* | **Partially Ready**. OneSignal code exists, but mobile registration sync and push flow verification are pending. |

---

## 2. Provider Environment Matrix

The system dynamically switches provider modes on boot using the following environment variables:

| Environment Variable | Allowed Values | Default | Purpose / Fallback Behavior |
| :--- | :--- | :--- | :--- |
| `DATABASE_PROVIDER` | `firebase`, `postgres` | `firebase` | **Global Database Selection**. Controls database driver for all domains unless overridden by domain-specific variables. |
| `AUTH_PROVIDER` | `firebase`, `backend` | `firebase` | **Authentication Service Selection**. If `backend`, middleware uses local HS256 JWT decoding instead of Firebase RS256 token verification. |
| `NOTIFICATION_PROVIDER` | `firebase`, `onesignal` | `firebase` | **Push Notification Dispatcher**. Controls whether push events route via Firebase Admin FCM or the OneSignal API. |
| `STORAGE_PROVIDER` | `local`, `s3` | `local` | **Media Storage Provider**. Selects between local in-memory mock storage and an AWS S3/Cloudflare R2 storage provider. |
| `DATABASE_URL` | *String* | *Unset* | **PostgreSQL Connection String**. Must be set if any domain database is set to `postgres`. |

### Domain-Specific Database Overrides
The following overrides take precedence over the global `DATABASE_PROVIDER` configuration:
* `VENUE_DATABASE_PROVIDER`
* `EVENT_DATABASE_PROVIDER`
* `ANALYTICS_DATABASE_PROVIDER`
* `FEATURED_PROFILE_DATABASE_PROVIDER`
* `MEDIA_DATABASE_PROVIDER`
* `NOTIFICATION_DATABASE_PROVIDER`
* `ORGANIZER_DATABASE_PROVIDER`
* `PROMOTION_DATABASE_PROVIDER`
* `REVIEW_DATABASE_PROVIDER`
* `TICKET_DATABASE_PROVIDER`
* `USER_DATABASE_PROVIDER`

> [!WARNING]
> Setting the global `DATABASE_PROVIDER=postgres` without setting `ADMIN_DATABASE_PROVIDER` (which does not support a postgres adapter) will cause `admin.repository.js` to crash the server on startup. Always override individual domains instead of setting the global variable at this stage.

---

## 3. Safe Local/Dev Flip Order

To safely migrate from Firebase to Postgres in development and testing environments, toggle providers using the following sequence:

```mermaid
graph TD
    A[Step 1: Read-Heavy DB Domains] --> B[Step 2: Simple Write DB Domains]
    B --> C[Step 3: Core Transactional DB Domains]
    C --> D[Step 4: Auth Route & Middleware Flip]
    D --> E[Step 5: Storage Upload Flip]
    E --> F[Step 6: OneSignal Push Flip]
    F --> G[Step 7: Global Database Flip]
```

1. **Step 1: Read-Heavy DB Domains** (Safe because they have no complex transactional interdependencies):
   * `VENUE_DATABASE_PROVIDER=postgres`
   * `FEATURED_PROFILE_DATABASE_PROVIDER=postgres`
   * `MEDIA_DATABASE_PROVIDER=postgres`
   * `REVIEW_DATABASE_PROVIDER=postgres`
2. **Step 2: Simple Write DB Domains** (Isolated write paths):
   * `NOTIFICATION_DATABASE_PROVIDER=postgres`
   * `ORGANIZER_DATABASE_PROVIDER=postgres`
3. **Step 3: Core Transactional DB Domains** (Keep on Firebase or verify together under careful transactional observation):
   * `USER_DATABASE_PROVIDER=postgres`
   * `EVENT_DATABASE_PROVIDER=postgres`
   * `TICKET_DATABASE_PROVIDER=postgres`
   * `PROMOTION_DATABASE_PROVIDER=postgres`
   * `ANALYTICS_DATABASE_PROVIDER=postgres`
4. **Step 4: Auth Flip** (`AUTH_PROVIDER=backend`): Flip after auth controllers/routes are fully written in Phase C4.
5. **Step 5: Storage Flip** (`STORAGE_PROVIDER=s3`): Flip after upload endpoint routes are wired in Phase C5.
6. **Step 6: Push Notification Flip** (`NOTIFICATION_PROVIDER=onesignal`): Flip after OneSignal integration tests are complete in Phase C6.
7. **Step 7: Global Database Flip** (`DATABASE_PROVIDER=postgres`): Only set this global variable once the `admin` repository selector is rewritten to support a Postgres fallback, or after the `admin` service is deprecated.

---

## 4. Blocked Write Paths & Transaction Risks

During our consolidation review, we identified several critical design flaws and risks on the staging branch:

### A. Non-Atomic SQL Transactions (Race Conditions & Overselling)
In `postgres.ticket.repository.js`, `runTransaction` is implemented as:
```javascript
const runTransaction = async (callback) => {
    return callback({}); // Empty/mock transaction wrapper
};
```
In `postgres.event.repository.js`, `getEventInTransaction` and `updateEventInTransaction` ignore the transaction argument completely and run queries directly on the connection pool (`postgres.client.query`).
* **Consequence**: The ticket booking transaction in `ticket.service.js` (which fetches event capacity, validates availability, checks promotion codes, creates tickets, decrements inventory, and increments promo usages) **does not execute inside an SQL transaction block** (`BEGIN`/`COMMIT`).
* **Risk**: Concurrent purchase requests will suffer from race conditions. Two requests can read the same available count of `1`, both proceed, and successfully write tickets, leading to overselling. Furthermore, if ticket insertion succeeds but updating event capacity fails, the database is left in an inconsistent state (partial write).

### B. Admin Service Boot Crash Block
Because `providers/database/admin.repository.js` has no postgres repository definition:
```javascript
const repositories = { firebase: firebaseAdminRepository };
const providerName = process.env.DATABASE_PROVIDER || 'firebase';
```
Setting `DATABASE_PROVIDER=postgres` causes `repositories['postgres']` to be undefined, throwing `Database provider "postgres" is not supported for admin` on boot, even if other domains override their settings.

### C. Stale JSONB `raw_data` Divergence
The row mapper functions (such as `rowToFirebaseDoc` in `postgres.user.repository.js` and `postgres.event.repository.js`) return the `raw_data` JSONB column immediately if it is present:
```javascript
if (row.raw_data) {
  if (includeId) return { id: row.id, ...row.raw_data };
  return row.raw_data;
}
```
* **Risk**: If any process, manual SQL script, or database trigger updates a structured column (such as `email`, `roles`, or `points`) without syncing the modification inside the `raw_data` JSONB structure, the application will continue to read stale data, ignoring the updated SQL columns.

---

## 5. Exact Verification Commands to Run

Use the following commands from `Server-2025-Eventing` directory to migrate the local database, populate data, and run verification routines.

### A. Environment Preparation
Ensure a local Postgres instance is running and set your shell variables:
```powershell
# Set environment variables for PowerShell (Windows)
$env:DATABASE_URL="postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev"
```

### B. Run Database Migrations
Execute the migration tool to verify that all 14 SQL schemas apply cleanly:
```powershell
npm run db:migrate
```

### C. Run Verification Scripts for Each Domain
To verify each Postgres adapter's parity with the current Firebase implementation, run the sync, smoke, and compare tasks:

```powershell
# 1. Venues
npm run db:sync:venues
$env:VENUE_DATABASE_PROVIDER="postgres"
npm run db:smoke:venues
npm run db:compare:venues

# 2. Users
npm run db:sync:users
$env:USER_DATABASE_PROVIDER="postgres"
npm run db:smoke:users
npm run db:compare:users

# 3. Events
npm run db:sync:events
$env:EVENT_DATABASE_PROVIDER="postgres"
npm run db:smoke:events
npm run db:compare:events

# 4. Tickets
npm run db:sync:tickets
$env:TICKET_DATABASE_PROVIDER="postgres"
# Note: TICKET_SMOKE_ID must match a valid ticket ID (e.g. from sync output)
$env:TICKET_SMOKE_ID="tkt_41bf7544-59f5-4275-b6d4-08cdae30f2ad"
npm run db:smoke:tickets
npm run db:compare:tickets

# 5. Reviews
npm run db:sync:reviews
$env:REVIEW_DATABASE_PROVIDER="postgres"
npm run db:smoke:reviews
npm run db:compare:reviews

# 6. Promotions
npm run db:sync:promotions
$env:PROMOTION_DATABASE_PROVIDER="postgres"
npm run db:smoke:promotions
npm run db:compare:promotions

# 7. Featured Profiles
npm run db:sync:featured_profiles
$env:FEATURED_PROFILE_DATABASE_PROVIDER="postgres"
npm run db:smoke:featured_profiles
npm run db:compare:featured_profiles

# 8. Organizer Profiles
npm run db:sync:organizer_profiles
$env:ORGANIZER_DATABASE_PROVIDER="postgres"
npm run db:smoke:organizer_profiles
npm run db:compare:organizer_profiles

# 9. Analytics
npm run db:sync:analytics
$env:ANALYTICS_DATABASE_PROVIDER="postgres"
npm run db:smoke:analytics
npm run db:compare:analytics

# 10. Notifications
npm run db:sync:notifications
$env:NOTIFICATION_DATABASE_PROVIDER="postgres"
npm run db:smoke:notifications
npm run db:compare:notifications

# 11. Media
$env:MEDIA_DATABASE_PROVIDER="postgres"
npm run db:smoke:media
```

---

## 6. Next Implementation Task Recommendation

### Phase C4 Action: Backend Auth Route Wiring & Database Transaction Safety

1. **Transaction Safety Overhaul (High Priority)**:
   * Modify the Postgres client driver (`postgres.client.js`) to support client-scoped queries by exposing a mechanism to acquire a dedicated transaction client (e.g. `const client = await pool.connect()`).
   * Rewrite `postgres.ticket.repository.runTransaction` to execute real SQL transaction blocks (`BEGIN`, `COMMIT`, `ROLLBACK`) and pass the active database client as the `transaction` parameter.
   * Update the query execution in other repositories (e.g. `postgres.event.repository.js`, `postgres.promotion.repository.js`) to check for the presence of the active client in the transaction argument and execute queries using that client rather than the global connection pool.
2. **Backend Authentication Routes**:
   * Implement endpoints `/auth/register`, `/auth/login`, `/auth/refresh`, and `/auth/logout` in a new file `routes/auth.routes.js`.
   * Implement password validation, JWT token issuance, and session recording inside `controllers/auth.controller.js` by utilizing the interfaces provided in `postgres.auth.repository.js` and `backend.auth.provider.js`.
   * Register the new auth routes in `routes/index.js` and update `app.js`.
