# Phase O7 - Mobile Contract Smokes

Date: 2026-06-11

## Goal

Protect the mobile-facing contracts captured in Phase O6 before any deeper business-domain redesign.

Scope:

- `Server-2025-Eventing`
- Server-only smoke coverage for attendee and organizer API response shapes.
- No mobile contract changes.

## Worker Task

OpenCode implemented the smoke harness and hardening changes.

Manager corrections required before acceptance:

- QR invalid-body contract must require HTTP `400`; `500` must not pass.
- Smoke-created users must be cleaned from local PostgreSQL on success and failure.
- Cleanup must use actual table names from migrations:
  - `sessions.user_id`
  - `auth_tokens.email`
  - `user_profiles.email`
  - `auth_users.email`

## Server Changes

- Added `npm run db:smoke:mobile-contracts`.
- Added `scripts/smoke.mobile-contracts.cjs`.
- Hardened the no-interest recommendation path so `/events/recommendations` still returns HTTP `200` with a bare array when Elasticsearch search fallback fails.

## Contract Coverage

The smoke covers:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /users/me`
- `GET /events`
- `GET /events/search`
- `GET /events/nearby`
- `GET /events/recommendations`
- `GET /organizer/me/events`
- `POST /organizer/check-in-qr` invalid legacy error shape
- `GET /events/:eventId/media`
- `POST /events/:eventId/media` JSON body/access-control path
- `POST /tickets/book`
- conditional `GET /tickets/:ticketId`
- conditional `POST /payments/create-order`

## Verification

Commands run from `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`:

```cmd
node --check scripts\smoke.mobile-contracts.cjs
git diff --check
npm run ci:check
npm run db:smoke:mobile-contracts
```

Results:

- `node --check` passed.
- `git diff --check` passed. Git printed only the existing LF-to-CRLF warning for `src/modules/events/application/service.js`.
- `npm run ci:check` passed.
- `npm run db:smoke:mobile-contracts` passed with `13 PASS`, `0 FAIL`, `2 SKIP`.

Skipped checks:

- `GET /tickets/:ticketId`
- `POST /payments/create-order`

Reason: current local DB did not contain a bookable ticket configuration for the default `KNOWN_EVENT_ID`. The route entry and booking error path were still exercised. A full payment provider flow remains staging/provider-dependent.

DB cleanup verification:

```cmd
auth_users mobile_contract_%@test.com: 0
user_profiles mobile_contract_%@test.com: 0
auth_tokens mobile_contract_%@test.com: 0
```

## Residual Risks

- Ticket/payment contract smoke is partial until a deterministic bookable seed event is added.
- Elasticsearch index mapping can still be empty after local resets; O7 now protects the mobile-facing recommendations contract with a Postgres fallback.
- The smoke intentionally validates contract shape, not full business correctness.

## Next Step

Proceed to O8: CI/CD security baseline with `npm audit`, Trivy where practical, and security gate documentation wired into the server CI path.
