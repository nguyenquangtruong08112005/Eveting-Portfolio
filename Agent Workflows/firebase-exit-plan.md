# Firebase Exit Plan

Status: active manager plan
Last updated: 2026-05-29
Scope: `Server-2025-Eventing` first; mobile contracts change only after backend compatibility is proven.

## Goal

Remove Firebase from backend application logic and later from runtime dependencies, while keeping the current mobile-facing API, event names, notification payload fields, and behavior stable during backend slices.

Target architecture:

- DB: PostgreSQL schema behind repository ports.
- Storage: S3-compatible port; first adapter may be AWS S3, Cloudflare R2, or MinIO.
- Auth: backend-owned JWT/session auth with password hashing, refresh tokens, and role model.
- Push: OneSignal facade; Android still needs FCM transport configured underneath OneSignal.
- Migration: backend provider boundaries first, dual-read/write if needed, then mobile contract changes later.

## Non-Negotiables

- No service/controller should depend directly on Firebase Admin, Firestore `db`, Firebase Storage, or provider SDKs after its slice is migrated.
- Keep REST payloads, route contracts, event names, queue/topic names, and notification payload fields stable until a planned mobile migration.
- Keep provider-specific code inside adapters/repositories only.
- Prefer small commits per slice; verify each slice before assigning the next one.
- Codex acts as manager/verifier. Local agents implement code; Codex reviews diffs, runs verification, and integrates.

## Target Ports

- `providers/database/*.repository.js`
  - Firebase adapters now.
  - PostgreSQL adapters later.
- `providers/storage/*`
  - S3-compatible interface.
  - First adapters: MinIO local plus one deploy target, likely Cloudflare R2 or AWS S3.
- `providers/auth/*`
  - Password hashing.
  - Access JWT.
  - Refresh token/session persistence.
  - Role checks: user, organizer, admin.
- `providers/notification/*`
  - Current Firebase FCM adapter.
  - Later OneSignal adapter.

## Slice Plan

### Slice A - Provider Ports, No Behavior Change

Goal: add provider boundaries while Firebase remains the active implementation.

Scope:

- Notification provider port around current FCM behavior.
- Repository ports for low-risk direct Firestore usage.
- Auth provider port around current Firebase token verification.
- No PostgreSQL, S3, OneSignal, or backend auth switch yet.

Current status:

- Done: notification provider boundary.
- Done: media repository boundary.
- Done: featured profile repository boundary.
- Done: analytics and venue repository boundaries.
- Done: notification and review repository boundaries.
- Done: auth provider and user role repository.
- Done: promotion repository boundary.
- Pending verification: ticket/event controller repository extraction from payment/organizer controllers.

Verification:

- `git diff --check`
- `node --check` on changed JS files
- Diff review for payload compatibility and direct Firebase import reduction

### Slice B - Repository Layer For One Small Domain

Goal: complete one domain end-to-end with a stable repository contract that can later receive a PostgreSQL adapter.

Recommended domain: `venues` or `notifications`.

Scope:

- Define repository method names and return shapes for the chosen domain.
- Keep Firestore adapter as current runtime.
- Add mapper helpers only if they prevent response-shape drift.
- Add focused verification scripts/tests if the repo already has a test pattern.

Exit criteria:

- Chosen domain service/controller imports only repository/provider ports.
- Return payloads remain compatible with current mobile apps.
- Repository contract can be implemented by PostgreSQL without exposing Firestore concepts.

### Slice C - PostgreSQL Schema + Adapter

Goal: introduce PostgreSQL as a real target database behind the repository pattern.

Scope:

- Add schema/migrations for the chosen Slice B domain first, then expand.
- Recommended tables:
  - `users`
  - `user_sessions`
  - `organizer_profiles`
  - `events`
  - `venues`
  - `tickets`
  - `ticket_types`
  - `notifications`
  - `reviews`
  - `promotions`
  - `media_assets`
  - `featured_profiles`
  - `analytics_events`
- Add indexes for query paths currently used by controllers/services.
- Add PostgreSQL adapter for the Slice B domain.
- Keep Firebase adapter available.

Migration mode:

- Start with local Postgres or Docker Postgres.
- Use dual-read/write only where needed for live migration safety.
- Do not flip production provider until row-count and sample-flow verification pass.

### Slice D - Backend Auth

Goal: replace FirebaseAuth with backend-owned auth.

Scope:

- Password hashing: argon2 or bcrypt.
- Access token: short-lived JWT.
- Refresh token: hashed token stored in DB.
- Session table with revoke/logout.
- Role model: user, organizer, admin.
- Middleware reads backend JWT and loads user/role from repository.

Migration rules:

- Preserve existing user IDs or store Firebase UID as `legacy_firebase_uid` during transition.
- Do not force mobile auth contract changes until backend endpoints are ready and tested.
- Add compatibility window where old Firebase auth can still be accepted if needed.

### Slice E - Storage Adapter

Goal: replace Firebase Storage with provider-neutral S3-compatible storage.

Scope:

- Create `storageProvider` port.
- Implement S3-compatible adapter.
- Prefer MinIO for local verification.
- Deploy adapter can target Cloudflare R2 or AWS S3.
- Store provider-neutral object keys in DB, not Firebase URLs as canonical state.

Migration rules:

- Copy existing objects before switching reads.
- Keep old URLs readable during transition or add rewrite/lookup compatibility.
- Verify media upload, delete, and signed/read URL flows.

### Slice F - Push Provider Switch

Goal: switch backend push delivery from direct FCM to OneSignal facade.

Scope:

- Keep notification DB records independent from push delivery.
- Implement OneSignal adapter behind existing notification provider port.
- Map user IDs/topics to OneSignal external IDs/tags.
- Preserve payload keys such as `eventId` and `type`.

Important note:

- OneSignal for Android still uses FCM as the underlying transport.
- This removes direct backend FCM coupling, but Android push still needs FCM credentials configured in OneSignal.

## Migration Order

1. Finish Slice A provider boundaries on server only.
2. Choose one small domain for Slice B and lock its repository contract.
3. Add PostgreSQL schema and adapter for that domain.
4. Run Firebase and PostgreSQL adapters side-by-side in local/dev.
5. Add dual-read/write only where live migration risk requires it.
6. Move backend auth behind JWT/session while keeping mobile contract compatibility.
7. Move storage behind S3-compatible provider.
8. Switch push delivery to OneSignal facade.
9. Change mobile contracts only after backend compatibility and migration checks pass.
10. Remove Firebase runtime dependencies after no active code path uses Firebase except Android FCM transport under OneSignal.

## Risk Checklist

- Contract drift: compare response payloads before/after each slice.
- Ordering: ticket/payment/event updates need transaction-aware PostgreSQL design.
- Duplicate delivery: notification outbox/delivery log needed before OneSignal switch.
- Idempotency: payment callbacks and push delivery need stable idempotency keys.
- Auth lockout: keep migration compatibility for existing Firebase users.
- Storage broken links: migrate object references and keep compatibility for old URLs.
- Deployment order: backend boundaries first, adapters second, provider flips last, mobile changes after backend is stable.

## Current Manager Instruction

Use local implementation agents for code changes, preferably `opencode` with `cmd /c`.

Codex manager responsibilities:

- Assign small prompts.
- Verify diffs and compatibility.
- Run verification commands.
- Commit passing slices to `staging`.
- Update `Agent Workflows/runs/firebase-exit/MANAGER_STATE.md` after each integrated slice.
