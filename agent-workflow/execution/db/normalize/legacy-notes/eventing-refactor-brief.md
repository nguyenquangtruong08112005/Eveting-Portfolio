# Eventing Refactor Brief

Project family:

- `Mobile-2025-Eventing`: user Android app.
- `Mobile-2025-Eventing-Organizer`: organizer Android app.
- `Server-2025-Eventing`: Node/Express backend and Firebase Functions.

## Main Problem

The backend needs a major refactor. Current code is fast-built and tightly coupled:

- Service files query Firebase directly.
- Service files mix business logic, persistence, notification sending, Elasticsearch indexing, payment state transitions, and response shaping.
- There is little module boundary and little explicit design pattern.
- Some files behave like god classes.
- Event contracts are raw strings spread across backend and mobile apps.
- Firebase was previously used on Blaze but is now on Spark/free, so some assumptions and integrations may be unstable or unavailable.

## Backend Refactor Goals

- Separate domain/business logic from Firebase/Firestore implementation details.
- Introduce explicit modules around events, tickets, notifications, payments, analytics, search indexing, and users.
- Centralize event/notification constants and payload builders.
- Keep mobile-facing API and FCM contracts backward compatible during early phases.
- Remove duplicated Elasticsearch indexing paths after verifying which writer is authoritative.
- Add idempotency where duplicate delivery is likely: broadcast, update/cancel notifications, reminders, and payment callbacks.
- Add small verification scripts/tests around pure builders before deeper architecture work.

## Eventing Risks

- Changing FCM `data.type`, `eventId`, notification DTOs, ticket statuses, or event statuses can silently break mobile behavior.
- Approval/update/cancel can race with Elasticsearch indexing.
- Firestore notification writes and FCM multicast are not idempotent by default.
- Cron reminders currently need a sent marker or equivalent dedupe strategy.
- Deployment order matters: backend must remain compatible with existing Android builds.

## Early Fixes To Consider Before Refactor

- `reminder.job.js` imports only `{ db }` but uses `admin.firestore...`; cron path can crash when it finds users.
- `admin.service.js` builds `artist_${featuredProfileIds}` from an array, while create event loops `artist_${artistId}`.

## Suggested Phases

1. Server-only notification/event helper with unchanged external payloads.
2. Choose one Elasticsearch writer and remove duplicate indexing.
3. Stabilize backend constants/schema for notification types, event statuses, ticket statuses, and topics.
4. Clean Android DTO/contract duplication after backend contract is stable.

