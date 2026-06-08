# Phase O5 - Backend Setup Hardening

Date: 2026-06-09

## Goal

Harden backend setup before business-domain redesign:

- Make logging and request correlation reliable.
- Add a shared error-handling foundation.
- Add a shared request-validation foundation.
- Start centralizing environment/config access.
- Reduce duplicated controller `try/catch` in a bounded pilot scope.

## Worker Execution

Implementation was delegated to local workers:

- Agy: O5-S1/S2 logging, request id, global error foundation.
- OpenCode: O5-S1/S2 review/fix, then O5-S3/S4 validation/config plus tickets/payments pilot.

Codex manager responsibilities:

- Reviewed diffs.
- Fixed worker issues through worker follow-up prompts.
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

## Verification

Commands run:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
npm run ci:check
npm run db:smoke:tickets
npm run db:smoke:transactions
npm run db:smoke:postgres-write-paths
```

Full backend smoke was also run:

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

- All commands passed.
- `ci:check` syntax checked 251 JS files.
- Lazy provider smoke passed.
- Postgres provider/write-path/domain smokes passed.
- Elasticsearch reindexed 18 events.
- Runtime validation probe passed:
  - `POST /tickets/book` with `quantity:null` and `promoCode:null` did not fail validation and reached service-level 404 for missing event.
  - `POST /payments/create-order` without `ticketId` returned structured 400.

CodeGraph:

```cmd
codegraph sync .
codegraph status .
```

Result:

- Files: 263
- JavaScript files: 251
- Nodes: 1,163
- Edges: 1,397
- Index up to date.

## Remaining Setup Work

Do before deep business redesign:

1. O5-S5: extend `asyncHandler` + typed errors to events and organizer controllers.
2. O5-S6: centralize remaining env/config for auth, storage, notification, weather, database providers.
3. O5-S7: add route validation for events, organizer, auth, users, media.
4. O5-S8: split long service files into use-cases/helpers/policies:
   - events
   - auth
   - organizer
   - tickets
   - users
5. O5-S9: add contract/smoke checks for structured error responses on mobile-facing routes.

## Notes

- Successful response payloads and route paths were not changed.
- Error response shape changed only for opted-in routes and `AppError` paths.
- ZaloPay callback contract remains unchanged because ZaloPay expects `return_code` and `return_message`.
