# Phase O9 - Pre-Business-Redesign Gap Closure

Date: 2026-06-11

## Scope

Close the concrete mobile-facing gaps found in Phase O6 before starting deeper business redesign.

## Completed Slices

- O9-S1 server attendee address persistence:
  - Commit: `Server-2025-Eventing` `ec4d406 fix: persist attendee address profile field`
  - `/users/me` update now persists `address` through Postgres `user_profiles.raw_data`.
  - Mobile contract smoke validates `PUT /users/me` address round-trip and field preservation.

- O9-S2 attendee nearby distance preservation:
  - Commit: `Mobile-2025-Eventing` `8477517 fix: preserve nearby event distance`
  - Nearby event `distanceKm` is mapped from API DTO to domain/cache and preserved in offline fallback.

- O9-S3 organizer import/broadcast result display:
  - Commit: `Mobile-2025-Eventing-Organizer` `43096cc fix: show organizer operation results`
  - Import attendees now reads `successCount`, `failCount`, and first import error.
  - Broadcast now displays backend `sentTo` count when available.
  - Null/legacy bodies still fall back to generic success messages.

- O9-S4 organizer cancel-event UX:
  - Commit: `Mobile-2025-Eventing-Organizer` `e4e03b4 feat: allow organizers to cancel events`
  - Dashboard event cards expose a guarded cancel action for active/pending events.
  - The action confirms before calling existing backend `DELETE /events/{eventId}` and refreshes organizer data after success.

- O9-S5 organizer logout-all hardening:
  - Commit: `Mobile-2025-Eventing-Organizer` `53f662b feat: add organizer logout all devices`
  - Settings exposes a confirmed "Sign Out All Devices" action.
  - The app calls existing backend `POST /auth/logout-all`; local tokens and OneSignal session are cleared only after backend success.

- O9-S6 Elasticsearch empty-index mapping guard:
  - Commit: `Server-2025-Eventing` `9db60ba fix: keep elasticsearch mappings on empty reindex`
  - `npm run search:reindex` now creates explicit mappings even when PostgreSQL has zero active public events.
  - This prevents recommendations/search sort failures caused by missing `date` mapping on empty indexes.

## Verification

Server:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
npm run ci:check
npm run search:reindex
npm run db:smoke:mobile-contracts
```

Result:

- `npm run ci:check`: pass.
- `npm run search:reindex`: pass; Elasticsearch index is created empty with mappings when no active public events exist.
- `npm run db:smoke:mobile-contracts`: pass with 15 PASS, 0 FAIL, 2 SKIP.
- The prior Elasticsearch `No mapping found for [date]` error did not recur after the mapping fix.

Mobile attendee:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing
gradlew.bat :app:compileDebugKotlin
```

Result: pass.

Mobile organizer:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer
git diff --check
gradlew.bat :app:compileDebugKotlin
```

Result: pass for O9-S3, O9-S4, and O9-S5. CodeGraph was synced after each organizer slice.

## Residual Follow-Ups

- `npm run security:audit` still reports known dependency vulnerabilities from Phase O8. This remains a security-hardening follow-up before security scans become blocking.
- Full payment provider behavior still requires a live ZaloPay staging/provider check; mobile contract smoke only validates the route boundary safely with current local data.
- Business redesign can start from the current `staging` checkpoint, but should preserve the mobile-facing contracts covered by `npm run db:smoke:mobile-contracts`.
