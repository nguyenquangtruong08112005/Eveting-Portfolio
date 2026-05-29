# Firebase Exit Phase A Audit

Status: draft verified by manager
Date: 2026-05-28
Scope:

- Server-2025-Eventing
- Mobile-2025-Eventing
- Mobile-2025-Eventing-Organizer

## Local Agent Runs

### OpenCode

Task: backend Firebase coupling audit.

Result:

- Read backend files.
- Tried to read `.env` and `functions/.env`; permission was auto-rejected.
- Second run only acknowledged the task and did not return a usable audit.

Manager action:

- Did not trust OpenCode as final audit output.
- Re-verified backend coupling with read-only `rg` commands.

### GitHub Copilot CLI

Task: mobile Firebase coupling audit.

Result:

- Produced a detailed mobile audit.
- Unexpectedly wrote `FIREBASE_AUDIT_REPORT.md` at workspace root instead of only printing output.
- Appears to have added `/.kotlin` to `Mobile-2025-Eventing/.gitignore`.

Manager action:

- Treat the root report as an agent artifact outside convention.
- Do not treat the `.gitignore` change as approved implementation.
- Use Copilot findings only after checking key paths with read-only search.

### Antigravity

Task: schema/migration risk review.

Result:

- Command returned empty stdout.
- Created `.antigravitycli/` metadata at workspace root.

Manager action:

- Do not use Antigravity output for decisions in this run.

## Verification Commands

Read-only checks used by manager:

```powershell
rg -n 'firebase\.config|firebase-admin|firebase-functions|db\.collection|FieldValue|admin\.firestore|auth\.' `
  -g '!node_modules/**' -g '!functions/node_modules/**' -g '!.git/**'

rg -n 'db\.collection' `
  -g '!node_modules/**' -g '!functions/node_modules/**' -g '!.git/**'

rg -n 'arrayUnion|arrayRemove|increment|FieldPath\.documentId|onDocumentWritten|firebase-functions' `
  -g '!node_modules/**' -g '!functions/node_modules/**' -g '!.git/**'

rg -n 'FirebaseAuth|FirebaseFirestore|FirebaseStorage|FirebaseMessaging|FirebaseMessagingService|google-services|firebase-auth|firebase-firestore|firebase-storage|firebase-messaging' `
  Mobile-2025-Eventing Mobile-2025-Eventing-Organizer `
  -g '!**/build/**' -g '!**/.gradle/**' -g '!**/.git/**'
```

## Backend Firebase Coupling

### Central Config

| File | Usage | Migration concern |
| --- | --- | --- |
| `Server-2025-Eventing/config/firebase.config.js` | Initializes Firebase Admin, exports `admin`, `db`, `auth`, `FieldValue` | This is the current provider root. Replace with adapter composition, not another global DB singleton. |

### Auth Middleware

| File | Usage | Migration concern |
| --- | --- | --- |
| `middleware/auth.middleware.js` | `auth.verifyIdToken(idToken)`, then reads `Users/{uid}` | Must become backend JWT verification plus user/session lookup in Postgres. |
| Routes using `verifyAuthToken` | Many routes depend on Firebase token middleware | Route contracts can stay, but token format and middleware internals must change. |

### Direct Firestore Usage

High-coupling backend files:

- `services/event.service.js`
- `services/ticket.service.js`
- `services/user.service.js`
- `services/organizer.service.js`
- `services/notification.service.js`
- `services/notification-event.helper.js`
- `services/admin.service.js`
- `services/promotion.service.js`
- `services/featuredProfile.service.js`
- `services/media.service.js`
- `services/review.service.js`
- `services/venue.service.js`
- `services/analytics.service.js`
- `jobs/reminder.job.js`
- `controllers/payment.controller.js`
- `controllers/media.controller.js`
- `controllers/review.controller.js`
- `controllers/organizer.controller.js`
- `controllers/featuredProfile.controller.js`
- seed scripts.

Migration concern:

- Services and controllers directly query Firestore.
- Repository boundary should be introduced before changing DB.
- Controllers should not keep DB checks long term.

### Firestore Collections Found

| Collection | Current usage | Postgres direction |
| --- | --- | --- |
| `Users` | Auth profile, roles, fcmTokens, following, history | `users`, `user_roles`, `user_push_tokens`, `user_follows`, `user_event_history` |
| `Events` | Event CRUD, search source, organizer event list, recommendations | `events`, `event_categories`, `event_tags`, `event_featured_profiles`, `event_locations` |
| `Tickets` | Purchases, check-in, payment state, attendee list | `tickets`, with transaction-safe inventory updates |
| `Notifications` | In-app notifications | `notifications`, plus optional delivery/outbox tables |
| `Analytics` | Revenue/check-ins/ticket type stats | `event_analytics` or derived read model |
| `Promotions` | Promo codes, usage count | `promotions`, `promotion_redemptions` |
| `Venues` | Venue catalog and embedded event venue data | `venues` |
| `FeaturedProfiles` | Artist/organizer profiles, followers | `featured_profiles`, `profile_followers` |
| `Reviews` | Event reviews and user info lookup | `reviews` |
| `EventMedia` | Event media records | `event_media`, storage provider neutral object keys |

### Firestore-Specific Operations

| Operation | Files | Migration concern |
| --- | --- | --- |
| `FieldValue.arrayUnion` | `user.service.js`, `organizer.service.js` | Replace with join tables or SQL array updates. Prefer join tables. |
| `FieldValue.arrayRemove` | `user.service.js` | Replace with delete from join table. |
| `FieldValue.increment` | `user.service.js`, `ticket.service.js`, `organizer.service.js` | Replace with SQL atomic updates inside transactions. |
| `admin.firestore.FieldPath.documentId()` | `notification-event.helper.js`, `organizer.service.js` | Replace with `WHERE id = ANY($1)` queries. |
| nested map update like `ticketTypes.${type}.available` | `ticket.service.js` | Prefer normalized ticket type table or transactional JSONB update. |

### Firebase Functions

| File | Usage | Replacement |
| --- | --- | --- |
| `functions/index.js` | `onDocumentWritten("Events/{eventId}")` syncs events to Elasticsearch | Replace with explicit service call, outbox table, or local worker job. |

Current functions are not required for the migration path if local jobs/outbox are accepted.

## Mobile Firebase Coupling

### Shared Android Dependencies

Both mobile repos include:

- Google services Gradle plugin.
- `firebase-auth`.
- `firebase-firestore`.
- `firebase-messaging`.
- Firebase Storage dependency.
- `google-services.json`.

### Auth

| File area | Usage | Migration target |
| --- | --- | --- |
| `di/AppModule.kt` | Provides `FirebaseAuth`, `FirebaseFirestore`, `FirebaseStorage` | Provide backend auth/session manager and storage API client. |
| `data/auth/AuthRepositoryImpl.kt` | Firebase email/password, social credential login, auth state listener, email verification/reset | Replace with backend `/auth/*` endpoints and backend-owned session storage. |
| `di/NetworkModule.kt` | OkHttp uses FirebaseAuth/current token | Replace with backend access token provider and refresh flow. |
| ViewModels | Use Firebase auth errors and auth state | Replace error mapping and state source. |

### Storage

| File area | Usage | Migration target |
| --- | --- | --- |
| `UserRepositoryImpl.kt` | FirebaseStorage for avatar/cover uploads | Use backend signed URL or backend upload endpoint. |
| post/event media flows | Firebase Storage object paths and download URLs | Store provider-neutral object key and public/signed URL from backend. |

### Push

| File area | Usage | Migration target |
| --- | --- | --- |
| `MainActivity.kt` | Reads `FirebaseMessaging.getInstance().token` and sends token to backend | Replace with OneSignal player/subscription ID registration. |
| `MyFirebaseMessagingService.kt` | Handles FCM data payload `eventId` and notification display | Replace with OneSignal notification opened/received handlers while preserving `eventId` and `type` payload. |
| `AuthRepositoryImpl.kt` | Gets FirebaseMessaging token on sign out | Replace with OneSignal unsubscribe/delete token flow. |

Note:

- OneSignal Android still requires FCM credentials underneath for Android delivery, but app/business logic can stop using Firebase Messaging APIs directly.

## Phase B Repository Ports

Top backend ports to create first:

1. `userRepository`
   - Owns users, roles, push tokens, follows, user history.
   - Blocks auth migration and notification migration.

2. `eventRepository`
   - Owns event CRUD, venue/profile lookups needed by event service.
   - Reduces largest god-service coupling.

3. `ticketRepository`
   - Owns ticket purchase, check-in, inventory, payment state.
   - Needs transaction design before Postgres switch.

4. `notificationRepository`
   - Owns in-app notification records.
   - Pairs with notification provider/outbox later.

5. `promotionRepository`
   - Owns promo lookup and redemption counters.
   - Needed for ticket purchase transaction consistency.

Also needed soon:

- `mediaRepository`
- `venueRepository`
- `featuredProfileRepository`
- `analyticsRepository`

## Migration Risks

### P0

- Auth migration can lock users out if Firebase UID, roles, email verification, and token refresh are not mapped carefully.
- Ticket purchase/payment/check-in flows need SQL transactions and idempotency before replacing Firestore increments.
- Storage migration can break images/media if object keys and URL strategy are not preserved.

### P1

- Elasticsearch sync currently depends on Firestore trigger or service-side writes; provider switch must choose one authoritative indexing path.
- Notification delivery can duplicate without outbox/delivery log.
- `Users.fcmTokens`, follows, and history arrays should become normalized tables.
- Firestore nested maps for ticket types need a clear Postgres model.

### P2

- Some Firebase dependencies may remain in mobile only for push transport if using OneSignal Android.
- Seed scripts and local function scripts need replacement or deletion.
- Root and mobile worktrees are already dirty; migration work needs isolated branches/workspaces.

## Phase B Worker Split

Use local agents only.

### OpenCode

Branch:

- `agent/opencode-phase-b-user-notification-ports`

Scope:

- Create backend ports for users and notifications.
- Implement Firestore adapters behind those ports.
- Refactor only `user.service.js`, `notification.service.js`, `notification-event.helper.js` if assigned.

### GitHub Copilot CLI

Branch:

- `agent/copilot-phase-b-mobile-auth-map`

Scope:

- Read-only or docs-only first.
- Produce exact mobile auth/storage migration task list.
- No Android implementation until backend auth endpoints exist.

### Antigravity

Branch:

- `agent/agy-phase-b-schema-design`

Scope:

- Draft Postgres schema proposal and transaction boundaries.
- No production code unless explicitly assigned later.

### Codex Manager

Scope:

- Verify agent outputs.
- Prevent broad rewrites.
- Keep Phase 1 eventing branch separate from Firebase Exit branches.

## Manager Verdict

PASS to continue with Phase B planning.

BLOCK for implementation until:

- accidental local-agent artifacts are handled,
- root report is moved or ignored,
- mobile `.gitignore` change is either accepted or reverted by explicit decision,
- exact Phase B branch names and write scopes are confirmed.

