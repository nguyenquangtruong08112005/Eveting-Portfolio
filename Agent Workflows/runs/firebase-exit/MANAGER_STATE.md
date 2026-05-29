# Manager State

## Objective

Execute the Firebase Exit plan with Codex as manager/verifier and local agents as implementers.

## Current Phase

Slices A, B, C, D foundation, E, and F are complete on `Server-2025-Eventing/staging`.

Next phase: Phase C1a local PostgreSQL harness and venue-only provider flip support.

## Source Of Truth

- Plan: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\firebase-exit-plan.md`
- Phase C plan: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c-provider-flip-plan.md`
- Phase C0 review: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c0-consolidation-review.md`
- Server repo: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Dev base branch: `staging`
- `main` is not the integration target; the user will merge manually after the system runs correctly.

## Manager / Worker Rule

- Codex must not directly implement backend source changes unless the user explicitly approves it.
- Use local agents for implementation, preferably `opencode` via `cmd /c`.
- Use `agy` only when it is available and producing verifiable diffs.
- Skip any agent that has no result, quota failure, capacity failure, or no diff.
- Codex responsibilities: assign bounded prompts, review diffs, run verification, commit passing slices, update this state file.

## Repos And Branches

- `Server-2025-Eventing`
  - branch: `staging`
  - active Firebase Exit integration branch.
- `Mobile-2025-Eventing`
  - branch: `staging`
  - has pre-existing uncommitted mobile changes; do not commit or revert without explicit review.
- `Mobile-2025-Eventing-Organizer`
  - branch: `staging`
  - has pre-existing uncommitted organizer edit; do not commit or revert without explicit review.

## Integrated Server Commits

- `2849ee7` - Introduce notification provider boundary.
- `07807ae` - Introduce media database repository boundary.
- `394a071` - Introduce featured profile repository boundary.
- `7d4fe6f` - Introduce analytics and venue repository boundaries.
- `4265f12` - Introduce notification and review repository boundaries.
- `c04cd18` - Introduce auth provider and user role repository.
- `73c9568` - Introduce promotion repository boundary.
- `6bc6e89` - Introduce ticket and event controller repositories.
- `f5b9b48` - Extract reminder notification repositories.
- `7437386` - Extract admin service repositories.
- `f688130` - Extract user service repository operations.
- `5e91b1b` - Extract ticket service repository operations.
- `9dac8c4` - Extract organizer service repository operations.
- `c255d0b` - Extract event service repository operations.
- `7efd9f5` - Harden venue repository contract.
- `866f37b` - Add Postgres venue adapter and schema.
- `ed06463` - Add backend auth foundation.
- `860113e` - Add storage provider boundary.
- `73ab05f` - Add OneSignal notification provider.

## Current Plan Summary

Slice A:

- Add provider ports/interfaces with Firebase still active.
- No behavior change.
- Keep API payloads, routes, event names, notification payload fields, and mobile behavior stable.
- Status: complete for `services/`, `controllers/`, `jobs/`, and `middleware`.

Slice B:

- Pick one small domain, preferably `venues` or `notifications`.
- Lock repository contract and make it PostgreSQL-ready.
- Status: complete for `venues`.

Slice C:

- Add PostgreSQL schema and adapter.
- Status: complete for `venues`; Firebase remains available and default unless provider config is changed.

Slice D:

- Add backend JWT/session auth with password hashing, refresh tokens, and role model.
- Status: foundation complete; route/controller switch is deferred.

Slice E:

- Add S3-compatible storage port and adapter.
- Status: complete as additive boundary; no media route behavior changed.

Slice F:

- Switch push provider to OneSignal facade.
- Note: Android still needs FCM transport configured underneath OneSignal.
- Status: complete as provider option; Firebase remains default.

## Verification Baseline

For every code slice:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git status --short --branch
git diff --stat
git diff --check
node --check <changed-js-files>
```

Then review:

- no mobile-facing payload drift
- no route contract drift
- no event/topic/name drift
- no new direct Firebase import outside adapters/providers unless intentionally deferred
- no package changes unless explicitly required by the slice

## Next Exact Step

Assign `opencode` Phase C1a:

- server-only
- add `VENUE_DATABASE_PROVIDER` override while keeping global default behavior unchanged
- add opt-in migration runner for `db/migrations`
- add minimal venue PostgreSQL smoke/seed script if it can stay non-destructive
- no mobile repo edits
- no route or payload changes
- verify with `git diff --check`, `node --check`, default provider smoke, and require smoke with `VENUE_DATABASE_PROVIDER=postgres`

## Latest Verification

After `73ab05f`:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
rg -n config/firebase.config services controllers jobs middleware
rg -n firebase-admin services controllers jobs middleware
cmd /c "for /f "delims=" %f in ('rg --files -g "*.js" -g "!node_modules/**"') do @node --check "%f""
```

Results:

- no direct `config/firebase.config` import in `services`, `controllers`, `jobs`, or `middleware`
- no direct `firebase-admin` import in `services`, `controllers`, `jobs`, or `middleware`
- full server JS syntax check outside `node_modules` passed
- no `npm test` script exists in `Server-2025-Eventing/package.json`
- Slice D verification passed: `git diff --check`, `node --check` on changed auth files, and auth provider functional check for password hashing, refresh token boolean verification, and JWT signing/verification.
- Slice E verification passed: storage require-smoke with no env, S3 env validation, and AWS SDK package pin check.
- Slice F verification passed: OneSignal require-smoke with no env, default Firebase provider check, and mocked payload-shape check for subscription/external-id modes.
