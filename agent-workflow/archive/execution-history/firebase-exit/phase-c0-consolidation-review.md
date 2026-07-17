# Phase C0 Consolidation Review

Date: 2026-05-29
Scope: `Server-2025-Eventing/staging` diff against `main`
Reviewer: Codex manager/verifier plus read-only `opencode` review

## Diff Scope

- Base: `main`
- Head: `staging`
- Changed files: 62
- Diff size: about 4676 insertions and 1616 deletions
- Main integrated server commits reviewed:
  - provider/repository boundaries
  - PostgreSQL venue adapter/schema
  - backend auth foundation
  - S3-compatible storage boundary
  - OneSignal notification provider

## Verification Run

Commands:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
rg -n -e config/firebase.config -e firebase-admin services controllers jobs middleware -g *.js
node -e "<full node --check walker outside node_modules>"
```

Results:

- `git diff --check`: pass.
- Full syntax check: pass, 100 JavaScript files.
- Direct Firebase imports in `services`, `controllers`, `jobs`, `middleware`: none.
- Root and server worktrees were clean before Phase C docs were added.

## Confirmed Current State

- Runtime defaults preserve current behavior:
  - `DATABASE_PROVIDER=firebase`
  - `AUTH_PROVIDER=firebase`
  - `NOTIFICATION_PROVIDER=firebase`
  - `STORAGE_PROVIDER=local`
- Firebase is still present in provider/adapters and config.
- Firebase has not been removed from runtime dependencies.
- Mobile contracts have not been changed.

## Blockers Before Provider Flip

### C0-B1: Global `DATABASE_PROVIDER=postgres` breaks non-venue repositories

Severity: blocker for local/dev provider flip

Current issue:

- `venue.repository.js` supports `postgres`.
- Other repository selectors only support `firebase`.
- If the app boots with `DATABASE_PROVIDER=postgres`, non-venue repositories throw at require-time.

Impact:

- We cannot safely run the full server with only venues flipped to PostgreSQL.

Required action:

- Add per-domain provider override for venues, e.g. `VENUE_DATABASE_PROVIDER=postgres`, while keeping global `DATABASE_PROVIDER=firebase`.
- Keep defaults unchanged.

### C0-B2: No migration runner

Severity: blocker for repeatable local PostgreSQL testing

Current issue:

- SQL files exist under `db/migrations`.
- There is no safe runner to apply them to local Postgres.

Required action:

- Add an opt-in migration runner.
- It must not run automatically on default app boot.
- It should create a migrations ledger and apply SQL files in order.

### C0-B3: Backend auth foundation is not wired to routes

Severity: expected deferred blocker for auth flip

Current issue:

- `services/auth.service.js` and backend auth provider exist.
- No auth routes/controller are wired yet.
- Existing Firebase auth remains the default.

Required action:

- Do not flip `AUTH_PROVIDER=backend` yet.
- Wire backend auth routes only in Phase C4.

### C0-B4: Backend auth role loading still goes through user repository selector

Severity: blocker for backend-auth flip

Current issue:

- `middleware/auth.middleware.js` verifies token through `providers/auth`.
- It then loads roles from `providers/database/user.repository`.
- `user.repository.js` currently only maps Firebase.

Required action:

- Before enabling backend auth, either add a PostgreSQL user-role adapter or route backend JWT role loading through the auth repository.

### C0-B5: OneSignal provider cannot use current mobile `fcmToken` values as-is

Severity: blocker for OneSignal real switch, not a blocker while Firebase remains default

Current issue:

- Current mobile/server contract stores `fcmToken`.
- OneSignal provider expects OneSignal subscription IDs by default, or external IDs with `ONESIGNAL_TARGET_MODE=external_id`.

Required action:

- Keep `NOTIFICATION_PROVIDER=firebase` until mobile sends OneSignal subscription IDs or backend maps users by external ID.
- Phase C6 must include real OneSignal app/mobile migration testing.

## High-Risk Items To Fix Or Track

### C0-H1: PostgreSQL venue `createVenue` uses upsert

Current issue:

- Firebase adapter `.set()` overwrites a doc id.
- PostgreSQL adapter uses `ON CONFLICT DO UPDATE`.

Decision:

- Accept for now because it matches Firebase `.set()` overwrite behavior closely enough for generated venue IDs.
- Revisit if admin/manual venue IDs are introduced.

### C0-H2: `event.service.js` admin check uses organizer role

Current issue:

- `const isAdmin = requestingUser.roles?.includes('organizer')`.
- This appears pre-existing or not caused by Firebase exit, but it is now visible.

Required action:

- Fix in a later behavior bugfix slice, not inside the provider flip unless tests cover it.

### C0-H3: Payment controller passes unused ZaloPay transaction id

Current issue:

- `confirmTicketPayment(ticketId, zpTransId)` passes an extra arg.
- Service currently accepts only `ticketId`.

Required action:

- Defer unless payment state migration needs transaction IDs.

## Next Action

Start Phase C1a with local agent implementation:

- Add `VENUE_DATABASE_PROVIDER` override.
- Add opt-in migration runner for `db/migrations`.
- Add a minimal venue repository smoke script that can run with `VENUE_DATABASE_PROVIDER=postgres`.
- Do not flip global defaults.
- Do not change mobile-facing routes or payloads.
