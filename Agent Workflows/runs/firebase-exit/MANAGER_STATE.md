# Manager State

## Objective

Execute the Firebase Exit plan with Codex as manager/verifier and local agents as implementers.

## Current Phase

Slices A, B, C, D foundation, E, and F are complete on `Server-2025-Eventing/staging`.

Next phase: Phase C3 expand PostgreSQL domains, next domain `analytics_events`.

## Source Of Truth

- Plan: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\firebase-exit-plan.md`
- Phase C plan: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c-provider-flip-plan.md`
- Phase C0 review: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c0-consolidation-review.md`
- Venues Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c1-c2-venues-postgres-verification.md`
- Notifications Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c3-notifications-postgres-verification.md`
- Media Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c3-media-postgres-verification.md`
- Promotions Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c3-promotions-postgres-verification.md`
- Reviews Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c3-reviews-postgres-verification.md`
- Users Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c3-users-postgres-verification.md`
- Events Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c3-events-postgres-verification.md`
- Tickets Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c3-tickets-postgres-verification.md`
- Featured Profiles Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c3-featured-profiles-postgres-verification.md`
- Organizer Profiles Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c3-organizer-profiles-postgres-verification.md`
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
- `1e3003e` - Add venue Postgres flip harness.
- `5e8e2af` - Add venue seed and compare scripts.
- `ea12b69` - Add Postgres notification adapter.
- `998583b` - Add Postgres media adapter.
- `0b02a5e` - Add Postgres promotion adapter.
- `a027202` - Add Postgres review adapter.
- `8177014` - Add Postgres user adapter.
- `7bc1b0b` - Add Postgres event adapter.
- `a3f27e7` - Add Postgres ticket adapter.
- `704e0b6` - Add Postgres featured profile adapter.
- `8efc318` - Add Postgres organizer profile adapter.

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

Assign `agy` Phase C3 analytics events:

- server-only
- no mobile repo edits
- add PostgreSQL analytics schema/adapter behind existing analytics repository contracts
- keep Firebase default
- do not change organizer dashboard stats payloads or analytics route payloads
- preserve event analytics ids, ticket/revenue counters, daily sales, views, and raw analytics summary shape
- add smoke/compare script if feasible
- verify with `git diff --check`, `node --check`, migration on local Postgres, and payload compatibility checks

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
- Phase C1/C2 verification passed for venues: local Postgres container, migrations applied, Firebase-to-Postgres venue sync completed, final comparison matched 9 venues with 0 missing and 0 different.
- Phase C3 notification verification passed for `user_alice`: migration applied, Firebase-to-Postgres sync completed, final comparison matched 2 notifications with 0 missing and 0 different.
- Phase C3 media verification passed at adapter/schema smoke level: migration applied and `getEventMediaPage` returned valid empty pagination shape. Full media flip is blocked until tickets/events/users PostgreSQL coverage exists.
- Phase C3 promotions verification passed for organizer read path: migration applied, Firebase-to-Postgres sync completed for 3 organizer promotions, final comparison matched 3 with 0 missing and 0 different. Do not use in ticket/payment flows yet due transaction boundary limitation.
- Phase C3 reviews verification passed for `evt_vdf_hcm_2025`: migration applied, Firebase-to-Postgres sync completed for 2 reviews, final comparison matched 2 with 0 missing and 0 different. Full review write-path flip is blocked until tickets/events/users PostgreSQL coverage exists.
- Phase C3 users verification passed for 3 Firebase Auth users: migrations applied, Firebase-to-Postgres sync completed, final comparison matched 3 with 0 missing and 0 different. Do not globally flip user write paths yet; event coverage is next.
- Phase C3 events verification passed for 23 Firestore events: migrations applied, Firebase-to-Postgres sync completed, final comparison matched 23 with 0 missing and 0 different. Public page projection also matched Firebase selected fields. Ticket coverage is next.
- Phase C3 tickets verification passed for 23 Firestore tickets: migrations applied, Firebase-to-Postgres sync completed, final comparison matched 23 with 0 missing and 0 different. Paid and attendee method shapes matched Firebase for `evt_haanh_show_dalat_2026`. Featured profile coverage is next.
- Phase C3 featured profile verification passed for 16 FeaturedProfiles: migrations applied, Firebase-to-Postgres sync completed, final comparison matched 16 with 0 missing and 0 different. Organizer profile coverage is next.
- Phase C3 organizer profile verification passed for 1 organizer profile: migrations applied, repeated Firebase-to-Postgres sync completed without duplicate organizer roles, users compare still matched 3, organizer compare matched 1. Analytics coverage is next.
