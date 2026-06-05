# Phase O3 - Deep Modular Monolith Plan

Date: 2026-06-05

Status: plan only. No implementation in this phase checkpoint.

## Goal

Evolve the current `src/modules/<domain>` structure into a stricter Modular Monolith with clear module boundaries:

```txt
src/
  modules/
    <domain>/
      api/
      application/
      domain/
      infrastructure/
      index.js
  shared/
```

Also migrate runtime imports to `@/` aliases and remove the need for legacy `src/controllers`, `src/services`, and `src/routes` folders after verification.

## Current Baseline

Phase O2 completed:

- Every current route/controller/service domain has a `src/modules/<domain>` boundary.
- Old `src/controllers`, `src/services`, and `src/routes` files are compatibility shims.
- `src/app.js` still mounts routes through those legacy shim paths.
- Internal module files still use relative imports like `../../middleware/...`.

## Rules

- Do not change API contracts.
- Do not change request bodies.
- Do not change response bodies.
- Do not change route paths.
- Do not change socket/event/topic names.
- Do not change database schema.
- Do not change provider behavior.
- Do not change env var names.
- Do not change payment, push, storage, auth, or mobile-facing behavior.
- Do not remove legacy shim folders until all runtime imports no longer depend on them.
- Do not do all module layering in one huge diff.

## Alias Rule

Target import style:

```js
require('@/modules/auth')
require('@/shared/middleware/auth.middleware')
require('@/providers/database/event.repository')
```

Avoid inside server runtime code:

```js
require('../...')
require('../../...')
```

Implementation note:

- This is CommonJS, so `@/` needs a runtime resolver.
- Prefer a tiny local bootstrap, not a dependency:
  - `src/bootstrap/register-module-alias.js`
  - patch `Module._resolveFilename` for requests starting with `@/`
  - load it from root `app.js` before requiring `src/app.js`
  - load it from scripts that import `src/*` if needed

## Target Module Layout

For each module:

```txt
src/modules/<domain>/
  api/
    routes.js
    controller.js
    validator.js    # only if this domain owns validators
  application/
    service.js
    usecases/       # add only when real complexity exists
  domain/
    constants/
    policies/
    events/
  infrastructure/
    repositories/
    providers/
  index.js
```

Keep empty folders with `.gitkeep` only if the next slice needs them.

## Public API Rule

Other modules should import another module only through its `index.js` public API:

```js
const notifications = require('@/modules/notifications');
```

Avoid:

```js
require('@/modules/notifications/infrastructure/providers/onesignal.provider')
require('@/modules/notifications/application/service')
```

Exception:

- During migration, a temporary deep import is allowed only when replacing it would change behavior or create a circular dependency risk.
- Each exception must be documented in the slice report.

## Slice Plan

### O3-S0 - Planning And Guardrails

Scope:

- No code changes except docs.
- Record this plan.
- Confirm O2 baseline and current dirty state.

Verification:

- `git status --short`

Status:

- Complete.

### O3-S1 - Alias Bootstrap Only

Scope:

- Add `src/bootstrap/register-module-alias.js`.
- Root `app.js` loads alias bootstrap before `require('./src/app.js')`.
- Convert only `src/app.js` imports to `@/`.
- Keep legacy route shims in place.
- No module folder reshaping yet.

Worker:

- `agy` or `opencode`.

Verification:

- `node --check app.js src/app.js src/bootstrap/register-module-alias.js`
- `npm run ci:check`
- `npm run db:smoke:auth`
- `npm run db:smoke:events`
- `git diff --check`

Commit:

- `refactor: add server module alias bootstrap`

### O3-S2 - Route Mounts Use Module Public APIs

Scope:

- Update `src/app.js` to mount routers from module public APIs:
  - `require('@/modules/auth').router`
  - `require('@/modules/users').router`
  - etc.
- Do not remove `src/routes` yet.
- Ensure every module `index.js` exports `router`, `controller`, and `service` where relevant.

Verification:

- `npm run ci:check`
- `npm run db:smoke:auth`
- `npm run db:smoke:events`
- `npm run db:smoke:storage-media`
- `npm run db:smoke:notifications`
- `git diff --check`

Commit:

- `refactor: mount routes from module public APIs`

### O3-S3 - Shared Layer

Scope:

- Create:
  - `src/shared/config`
  - `src/shared/middleware`
  - `src/shared/utils`
  - `src/shared/logger`
  - `src/shared/errors`
- Move only truly shared framework-neutral or cross-cutting files.
- Keep compatibility shims for old paths if many imports still use them.
- Use `@/shared/...` imports for moved files.

Do not move business logic into `shared`.

Verification:

- `npm run ci:check`
- `npm run db:smoke:auth`
- `npm run db:smoke:events`
- `npm run db:smoke:storage-media`
- `git diff --check`

Commit:

- `refactor: introduce shared server layer`

### O3-S4 - Low-Risk Module Layering Pilot

Recommended pilot domain:

- `venues`

Reason:

- Small surface.
- Already has repository pattern.
- Smoke test exists.
- Low coupling compared to events/tickets/payments.

Scope:

- Move:
  - `venues.routes.js` -> `modules/venues/api/routes.js`
  - `venue.controller.js` -> `modules/venues/api/controller.js`
  - `venue.service.js` -> `modules/venues/application/service.js`
- Add `domain/` and `infrastructure/` folders only if needed.
- Update `modules/venues/index.js`.
- Use `@/` imports.
- Keep old shim paths until O3-S9.

Verification:

- `npm run db:smoke:venues`
- `npm run ci:check`
- `git diff --check`

Commit:

- `refactor: layer venues module`

### O3-S5 - Medium Module Layering Batch

Domains:

- `featuredProfile`
- `promotions`
- `reviews`
- `analytics`

Scope:

- Apply `api/application/domain/infrastructure` structure.
- Convert internal imports to `@/`.
- Preserve old shims.

Verification:

- `npm run db:smoke:featured_profiles`
- `npm run db:smoke:promotions`
- `npm run db:smoke:reviews`
- `npm run db:smoke:analytics`
- `npm run ci:check`
- `git diff --check`

Commit:

- `refactor: layer read and crud modules`

### O3-S6 - Core User/Auth/Notification Layering

Domains:

- `auth`
- `users`
- `notifications`

Scope:

- Move route/controller to `api`.
- Move service/usecase logic to `application`.
- Move notification provider helper boundaries to `infrastructure/providers` where safe.
- Public notification module should expose send/create/follow-notification operations used by other modules.
- Avoid circular dependency between users and notifications.

Verification:

- `npm run db:smoke:auth`
- `npm run db:smoke:users`
- `npm run db:smoke:notifications`
- `npm run ci:check`
- `git diff --check`

Commit:

- `refactor: layer auth users and notifications modules`

### O3-S7 - Events/Tickets/Payments Layering

Domains:

- `events`
- `tickets`
- `payments`

Scope:

- Move API layer first.
- Move service logic to `application`.
- Keep repositories/providers under existing global providers unless moving them is fully behavior-safe.
- Payment/ZaloPay integration should be isolated under `payments/infrastructure/providers` only if no contract changes are required.
- Ticket/payment transaction behavior must be verified.

Verification:

- `npm run db:smoke:events`
- `npm run search:reindex`
- `npm run db:smoke:tickets`
- `npm run db:smoke:transactions`
- `npm run db:smoke:auth`
- `npm run ci:check`
- `git diff --check`

Commit:

- `refactor: layer events tickets and payments modules`

### O3-S8 - Media/Storage/Organizer/Admin Layering

Domains:

- `media`
- `storage`
- `organizer`
- `admin`

Scope:

- Move route/controller/service into layers.
- Storage provider adapters can remain under global `providers/storage` until a separate provider-local migration.
- Organizer/admin imports should use module public APIs where safe.

Verification:

- `npm run db:smoke:media`
- `npm run db:smoke:storage-media`
- `npm run db:smoke:organizer_profiles`
- `npm run db:smoke:analytics`
- `npm run db:smoke:auth`
- `npm run ci:check`
- `git diff --check`

Commit:

- `refactor: layer media storage organizer and admin modules`

### O3-S9 - Remove Legacy Shim Runtime Dependency

Scope:

- Scan all runtime code for:
  - `@/routes`
  - `@/controllers`
  - `@/services`
  - `../routes`
  - `../controllers`
  - `../services`
- Replace runtime imports with module public APIs.
- Do not delete legacy folders yet.

Verification:

- Full smoke suite:
  - `npm run ci:check`
  - `npm run db:smoke:auth`
  - `npm run db:smoke:events`
  - `npm run db:smoke:users`
  - `npm run db:smoke:tickets`
  - `npm run db:smoke:transactions`
  - `npm run db:smoke:storage-media`
  - `npm run db:smoke:notifications`
  - `npm run db:smoke:venues`
  - `npm run search:reindex`
- `git diff --check`

Commit:

- `refactor: replace legacy shim imports`

### O3-S10 - Archive Legacy Shim Folders

Scope:

- Move:
  - `src/controllers`
  - `src/services`
  - `src/routes`
- To:
  - `archive/legacy-shims/src/controllers`
  - `archive/legacy-shims/src/services`
  - `archive/legacy-shims/src/routes`
- Keep `src/routes/index.js` only if `src/app.js` still needs root route; otherwise move it too and replace root route in `src/app.js`.

Verification:

- Full smoke suite from O3-S9.
- `rg` must show no runtime imports from archived shims.
- `codegraph sync . && codegraph status .`

Commit:

- `refactor: archive legacy route controller service shims`

## Worker Prompt Template

```txt
Implement O3-SX in Server-2025-Eventing only. Do not touch mobile repos. Do not commit. Do not stage DB.txt deletion if present.

Goal: <slice goal>.

Rules:
- Preserve all API routes, request bodies, response bodies, env names, DB schema, provider behavior, payment behavior, push payloads, storage behavior, and mobile-facing behavior.
- Use CommonJS.
- Use @/ imports for src-root imports.
- Do not use ../ or ../../ inside src/modules after this slice unless documented as a temporary exception.
- Cross-module calls should use module public APIs where behavior-safe.
- Keep old shims until the specified archive slice.

Verification:
<commands>

Return changed files, boundary changes, temporary dependency exceptions, verification results, and risks.
```

## Stop Conditions

Stop and report instead of continuing if:

- A route response changes.
- A smoke test fails.
- A circular module dependency appears.
- Alias resolver breaks scripts.
- Worker attempts to modify mobile repos.
- Worker attempts to stage or commit.
