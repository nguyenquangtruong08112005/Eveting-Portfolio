# Phase O5 - Backend Setup Hardening

Date: 2026-06-09

## Goal

Harden backend setup before business-domain redesign:

- Make logging and request correlation reliable.
- Add a shared error-handling foundation.
- Add a shared request-validation foundation.
- Centralize provider environment/config access.
- Reduce duplicated controller `try/catch`.
- Extend validation/error handling to the main mobile-facing modules.
- Split the largest services into smaller helpers, policies, and builders without changing route or payload contracts.
- Add structured error smoke coverage.

## Worker Execution

Implementation was delegated to local workers:

- Agy: O5-S1/S2 logging, request id, global error foundation.
- OpenCode: O5-S1/S2 review/fix, then O5-S3/S4 validation/config plus tickets/payments pilot.
- OpenCode: O5-S5 events/organizer controller hardening.
- OpenCode: O5-S6 provider environment config centralization.
- Agy: O5-S8 events service split.
- OpenCode: O5-S7 auth/users/media hardening and auth error normalization.
- OpenCode: O5-S8 auth/tickets and organizer/users service splits.
- OpenCode: O5-S9 structured error smoke checks.

Codex manager responsibilities:

- Assigned bounded worker prompts.
- Reviewed diffs.
- Sent worker follow-up prompts for issues found during review.
- Ran verification.
- Committed passing slices.
- Synced CodeGraph.

## Completed Slices

### O5-S1/S2 Logging And Error Foundation

Commit:

- `a9ace1d chore: add logging and error handling foundation`

Changes:

- Existing `console.log`, `console.info`, `console.warn`, `console.error`, and `console.debug` are bridged through `src/shared/logger`.
- Console output still prints in development.
- Console output is mirrored to `logs/app.log`.
- Logger uses `AsyncLocalStorage` for request context.
- `observabilityMiddleware` now attaches `x-request-id` and `x-correlation-id`.
- HTTP logs include request id.
- Added shared error classes in `src/shared/errors`.
- Added `asyncHandler`.
- Added global `notFoundHandler` and `globalErrorHandler`.

Runtime probe:

- `console.log` grew `logs/app.log`.
- `GET /missing-o5-probe` returned structured 404 with `requestId`.
- `x-request-id` was preserved from request to response.

### O5-S3/S4 Validation And Config Pilot

Commit:

- `073a97f refactor: harden tickets and payments request handling`

Changes:

- Added `src/shared/middleware/validateRequest.middleware.js`.
- Added `src/shared/config/env.config.js`.
- Added `BadGatewayError` and `ServiceUnavailableError`.
- `tickets` controller now uses `asyncHandler`.
- `tickets` routes validate `eventId`, `ticketType`, optional `quantity`, optional `promoCode`, and `ticketId`.
- `quantity` and `promoCode` allow omitted or `null` values for mobile compatibility.
- `tickets` service maps business errors to typed errors:
  - invalid quantity: 400
  - missing event/ticket/ticket type: 404
  - sold out/promotion issues: 409
  - forbidden ticket access: 403
- `payments` controller now uses `asyncHandler` for create-order and manual check.
- `payments` routes validate `ticketId` for create-order.
- ZaloPay callback response contract remains unchanged.
- ZaloPay config reads through shared config.
- ZaloPay API failures map to 502/503 where identifiable.

### O5-S5 Events And Organizer Hardening

Commit:

- `5cf3f99 refactor: harden events and organizer request handling`

Changes:

- Events and organizer controllers now use shared `asyncHandler` where safe.
- Events and organizer routes gained request validation for query/body/params.
- Service/controller paths use typed errors where the mobile-facing contract allows it.
- `/organizer/check-in-qr` intentionally keeps the legacy `{ valid: false, error: "INVALID_TICKET" }` error shape.

### O5-S6 Provider Env Config Centralization

Commit:

- `0a0b9a5 refactor: centralize provider environment config`

Changes:

- Provider config reads now flow through `src/shared/config/env.config.js`.
- Auth, storage, notification, database/provider selectors, weather, admin, and auth middleware use shared config accessors.
- Config values are read lazily through getters so smoke tests can mutate `process.env` safely.

### O5-S8 Events Service Split

Commit:

- `5612b3d refactor: split events service helpers`

Changes:

- Split events service helpers under:
  - `src/modules/events/application/helpers`
  - `src/modules/events/application/policies`
  - `src/modules/events/application/query-builders`
- Extracted event mappers, nearby-event helper, notification sender, venue handling, weather helper, update policy, recommendation query builder, and search query builder.
- Kept public route behavior and successful response payloads stable.

### O5-S7 Auth Users Media Hardening

Commit:

- `e3cc9f4 refactor: harden auth users and media routes`

Changes:

- Auth, users, and media routes/controllers now use shared validation and `asyncHandler` where safe.
- Auth service business failures now use shared `AppError` subclasses instead of plain `Error + statusCode`.
- Revoked refresh tokens return a consistent unauthorized error code in smoke coverage.

### O5-S8 Auth Tickets Organizer Users Service Splits

Commits:

- `c80d1fd refactor: split auth and tickets service helpers`
- `8ef1268 refactor: split organizer and users service helpers`

Changes:

- Auth helpers:
  - token helper
  - email helper
  - profile helper
- Ticket helpers:
  - ticket mappers
  - QR-code helper
  - promotion validator helper
- Organizer helpers:
  - attendee helper
  - profile helper
  - stats helper
  - import/export helper
  - notification helper
- Users helpers:
  - FCM compatibility helper
  - profile helper

### O5-S9 Structured Error Smoke

Commit:

- `2ee6a1b test: add structured error smoke checks`

Changes:

- Added `scripts/structured-errors.smoke.cjs`.
- Added `npm run db:smoke:structured-errors`.
- Covered:
  - missing route structured 404
  - invalid events nearby query structured 400
  - invalid auth login payload structured 400
  - unauthenticated `/users/me` unauthorized contract
  - legacy organizer QR invalid-ticket contract

## Verification

Representative commands run across O5:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
npm run ci:check
npm run db:smoke:structured-errors
npm run db:smoke:auth
npm run db:smoke:events
npm run db:smoke:organizer_profiles
npm run db:smoke:users
npm run db:smoke:media
npm run db:smoke:storage-media
npm run db:smoke:tickets
npm run db:smoke:transactions
npm run db:smoke:postgres-write-paths
npm run db:smoke:notifications
```

Full backend smoke was also run earlier in O5:

```cmd
npm run db:migrate &&
npm run ci:check &&
npm run db:smoke:postgres-provider &&
npm run db:smoke:postgres-write-paths &&
npm run db:smoke:venues &&
npm run db:smoke:notifications &&
npm run db:smoke:media &&
node scripts\smoke.storage.js &&
npm run db:smoke:storage-media &&
npm run db:smoke:promotions &&
npm run db:smoke:reviews &&
npm run db:smoke:users &&
npm run db:smoke:events &&
npm run db:smoke:tickets &&
npm run db:smoke:transactions &&
npm run db:smoke:analytics &&
npm run db:smoke:featured_profiles &&
npm run db:smoke:organizer_profiles &&
npm run search:reindex
```

Results:

- All commands above passed.
- Final `ci:check` syntax checked 272 JS files.
- Lazy provider smoke passed.
- Postgres provider/write-path/domain smokes passed.
- Elasticsearch reindexed 18 events.
- Runtime validation probe passed:
  - `POST /tickets/book` with `quantity:null` and `promoCode:null` did not fail validation and reached service-level 404 for missing event.
  - `POST /payments/create-order` without `ticketId` returned structured 400.
- Structured error smoke passed:
  - `GET /nonexistent` structured 404.
  - `GET /events/nearby?lat=abc&lon=1` structured 400.
  - `POST /auth/login` missing password structured 400.
  - `GET /users/me` unauthorized contract.
  - `POST /organizer/check-in-qr` legacy invalid-ticket contract.

CodeGraph:

```cmd
codegraph sync .
codegraph status .
```

Result:

- Files: 285
- JavaScript files: 273
- YAML files: 12
- Nodes: 1,269
- Edges: 1,512
- Index up to date.

## Status

O5 is complete.

Residual cleanup that is not blocking O5:

1. Audit minor dead computations and unused constants during the next service-quality pass.
2. Continue moving module internals toward the recorded O3 modular-monolith plan slice by slice.
3. Before changing business behavior, run a mobile-facing workflow audit and record expected payloads/screens.

## Notes

- Successful response payloads and route paths were not changed.
- Error response shape changed only for opted-in routes and `AppError` paths.
- ZaloPay callback contract remains unchanged because ZaloPay expects `return_code` and `return_message`.
- Organizer QR check keeps its legacy invalid-ticket payload shape for mobile compatibility.
