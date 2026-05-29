# Firebase Exit Plan

Status: draft
Last updated: 2026-05-28
Scope: Server-2025-Eventing first, then both Android apps.

## Goal

Remove Firebase as an application dependency and reduce provider lock-in.

Target architecture:

- Database: PostgreSQL-compatible provider.
- Storage: S3-compatible provider.
- Auth: backend-owned auth.
- Push: notification provider abstraction, likely OneSignal for first adapter.
- Background work: local Node jobs first, later separate worker if needed.

## Current Decision

Use Markdown for planning artifacts because it is smaller than HTML, easy to diff, easy for agents to read, and cheap to summarize later.

## Provider Direction

### Database

Recommended engine: PostgreSQL.

Do not code directly against Supabase, Neon, RDS, or another vendor SDK. Use standard Postgres access through a backend data layer.

Provider candidates:

- Local: Docker Postgres.
- Managed: Neon, Supabase Postgres, AWS RDS, Render, Railway, Fly Postgres.

Decision rule:

- Prefer plain Postgres features.
- Avoid provider-only auth/storage/database APIs in application code.
- Keep connection config in env.

### Storage

Recommended interface: S3-compatible storage.

Provider candidates:

- Cloudflare R2.
- AWS S3.
- Backblaze B2.
- Wasabi.
- MinIO local.

Implementation rule:

- Code depends on `storageProvider`, not directly on AWS/R2.
- Use env for endpoint, bucket, region, access key, secret.
- Use signed URLs or backend-mediated upload.

### Auth

Recommended: backend-owned auth.

Initial auth model:

- Email/password.
- Password hash: argon2.
- Access token: short-lived JWT.
- Refresh token: DB-stored hashed token.
- Roles: user, organizer, admin.
- Session table with revoke/logout support.

Avoid:

- FirebaseAuth.
- Supabase Auth as a hard dependency.
- Provider-specific claims as the main permission model.

### Push Notifications

Recommended first adapter: OneSignal.

Important constraint:

- OneSignal Android still uses FCM as the transport layer underneath.
- This removes Firebase from backend/app business logic, but Android push still requires FCM credentials configured in OneSignal.

Implementation rule:

- Backend code calls `notificationProvider.sendToUsers/sendToTopic`.
- Adapter can be OneSignal now, another provider later.
- Keep mobile payload contract stable: `eventId`, `type`.

### Functions / Background Work

Firebase Functions are not required for the next architecture.

Replacement:

- Keep local Node jobs in `jobs/`.
- Later split to a worker process if needed.
- Firestore triggers must be replaced by explicit service calls, outbox table, or scheduled jobs.

## Architecture Pattern

Use Ports and Adapters with repositories.

Service layer must not import:

- Firebase Admin.
- Firestore `db`.
- Provider SDKs.
- SQL client directly, except inside adapter/repository modules.

Target structure:

```text
src/
  domain/
    events/
    tickets/
    notifications/
    users/
  application/
    services/
    use-cases/
  ports/
    event.repository.js
    ticket.repository.js
    user.repository.js
    notification.repository.js
    storage.provider.js
    notification.provider.js
    auth.token.service.js
  adapters/
    postgres/
    s3/
    onesignal/
  infrastructure/
    db/
    jobs/
    config/
```

This repo may keep the current folder layout at first. The first goal is boundary creation, not a large folder move.

## Phase Plan

### Phase A - Firebase Coupling Audit

Read-only.

Output:

- `Agent Workflows/runs/firebase-exit/phase-a-audit.md`

Checklist:

- Map all backend imports from `config/firebase.config`.
- Map all `db.collection(...)` usages.
- Map all `FieldValue` usages.
- Map all `admin.firestore.FieldPath.documentId()` usages.
- Map all Firebase Auth usages in backend and mobile.
- Map all Firebase Storage usages in backend and mobile.
- Map all Firebase Functions triggers.
- Map all FCM usages and payload contracts.
- List Firestore collections and inferred schemas.

Worker split:

- OpenCode: backend Firebase coupling map.
- Copilot: Android Firebase Auth/Firestore/Storage/FCM usage map.
- Antigravity: schema and migration risk review.
- Codex manager: verify outputs, dedupe, produce final audit.

### Phase B - Backend Data Boundary

Goal: service code stops depending directly on Firebase.

Do not change database provider yet.

Checklist:

- Create repository ports for users, events, tickets, notifications, promotions, venues, media, reviews, analytics.
- Implement Firestore adapters behind these ports.
- Move Firestore-specific query/chunk/FieldValue logic into adapters.
- Keep REST response shapes unchanged.
- Keep mobile contracts unchanged.
- Add small tests/scripts for pure mappers and payload builders.

Merge rule:

- One module at a time.
- No broad folder move in the same patch as behavior changes.

### Phase C - Postgres Schema

Goal: define target relational schema before runtime switch.

Checklist:

- Design tables for users, sessions, events, tickets, notifications, promotions, venues, featured_profiles, reviews, event_media, analytics.
- Define indexes for common queries.
- Define constraints for status fields.
- Define JSONB fields only where the shape is naturally flexible.
- Decide how to model ticket types and event location.
- Create migration files.
- Create seed/import script skeleton.

### Phase D - Postgres Adapter

Goal: run backend against Postgres through the same repository ports.

Checklist:

- Add Postgres connection module.
- Add transaction/unit-of-work helper.
- Implement repository adapters.
- Add adapter-level tests or scripts for key flows.
- Support local Docker Postgres.
- Keep Firestore adapter available until migration is verified.

### Phase E - Data Migration

Goal: move existing Firebase data into Postgres.

Checklist:

- Export Firestore data.
- Transform documents into relational rows.
- Validate row counts per collection/table.
- Validate sample user, event, ticket, notification flows.
- Validate ticket inventory and payment state.
- Validate notification history.
- Prepare rollback plan.

### Phase F - Backend-Owned Auth

Goal: replace FirebaseAuth.

Checklist:

- Add password hash field.
- Add sessions/refresh_tokens table.
- Add register/login/refresh/logout endpoints.
- Add auth middleware based on backend JWT.
- Add role checks for user/organizer/admin.
- Migrate existing Firebase UID references to backend user IDs or keep UID as legacy external ID during transition.
- Update mobile auth repositories after backend endpoints are ready.

### Phase G - S3-Compatible Storage

Goal: replace Firebase Storage.

Checklist:

- Create storage provider port.
- Implement S3-compatible adapter.
- Add local MinIO option.
- Move upload/delete/signed-url logic behind backend API.
- Migrate existing object paths.
- Keep stored media references provider-neutral.

### Phase H - Notification Provider

Goal: replace direct FCM backend dependency.

Checklist:

- Create notification provider port.
- Implement OneSignal adapter.
- Map existing topics or user IDs to OneSignal external IDs/tags.
- Keep payload keys `eventId` and `type`.
- Preserve notification DB records separately from push delivery.
- Add provider-independent delivery logs.

### Phase I - Remove Firebase

Goal: remove Firebase from runtime code.

Checklist:

- Remove backend `firebase-admin` dependency after adapters are no longer used.
- Remove `config/firebase.config.js` from active imports.
- Remove Firebase Functions.
- Remove Android Firebase Auth/Firestore/Storage dependencies.
- Keep only what is strictly needed for push transport if OneSignal still requires Android FCM credentials.
- Update docs and env examples.

## Risk Register

- Mobile contract break: keep REST DTOs and notification payloads stable until mobile migration is ready.
- Auth migration risk: user IDs, roles, and refresh token handling can lock users out.
- Ticket/payment consistency: payment callback and ticket inventory need transactions/idempotency.
- Notification duplicate delivery: add outbox/delivery log before high-volume sending.
- Storage migration risk: broken image/media URLs.
- Provider lock-in risk: avoid direct Supabase/R2/OneSignal calls outside adapters.
- Deployment order: backend adapters first, data migration second, mobile auth/storage changes last.

## Current Phase Gate

Phase 1 eventing helper can remain server-only and should be closed before starting Firebase Exit implementation.

Do not mix Firebase Exit changes into the current Phase 1 branch unless the change is documentation-only.

## Next Action

Run Phase A read-only audit with local agents.

Manager responsibilities:

- Assign local agents.
- Review and merge audit outputs.
- Decide exact DB/storage/provider stack.
- Create Phase B implementation task split.

