# Manager State

## Objective

Execute the Firebase Exit plan with Codex as manager/verifier and local agents as implementers.

## Current Phase

Slices A through F, C6 through C12, M1 through M11, N1, N2, N3-S1 through N3-S5, N4, O1, O2, O4, O5, O6, O7, O8, O9, P1.0, P1.1-A, P1.1-B, P1.1-C, P1.2-S1, P1.2-S2, P1.2-S3, P1.2-S4, and P1.2-S5 are complete on `staging`.

Next phase: P1.2-S6 admin review queue and approve/reject lifecycle guard. Keep dependency vulnerability remediation as a separate security-hardening follow-up before making security scans blocking.

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
- Analytics Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c3-analytics-postgres-verification.md`
- Phase C4 consolidation/provider flip matrix: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c4-consolidation-provider-flip-matrix.md`
- Phase C4 Postgres transaction support verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c4-postgres-transaction-support-verification.md`
- Phase C4 backend auth route verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c4-backend-auth-routes-verification.md`
- Phase C5 storage media upload verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c5-storage-media-upload-verification.md`
- Phase C6 admin Postgres verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c6-admin-postgres-verification.md`
- Phase C7 Postgres provider smoke verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c7-postgres-provider-smoke-verification.md`
- Phase C8 Postgres write paths verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c8-postgres-write-paths-verification.md`
- Phase C9 Firebase-removal blocker audit: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c9-firebase-removal-blocker-audit.md`
- Phase C10 lazy provider loading verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c10-lazy-provider-loading-verification.md`
- Phase C11 environment cutover template: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c11-env-cutover-template.md`
- Phase C12 server Firebase tooling archive verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-c12-server-firebase-tooling-archive-verification.md`
- Phase M1 mobile backend token foundation verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m1-mobile-backend-token-foundation-verification.md`
- Phase M2 mobile auth repository wiring verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m2-mobile-auth-repository-wiring-verification.md`
- Phase M3 backend auth profile and mobile current-user verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m3-backend-auth-profile-and-mobile-current-user-verification.md`
- Phase M4 mobile refresh-token verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m4-mobile-refresh-token-verification.md`
- Phase M5 mobile storage upload path verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m5-mobile-storage-upload-path-verification.md`
- Phase M6 OneSignal external id verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m6-onesignal-external-id-verification.md`
- Phase M7 consolidation and blockers: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m7-consolidation-and-blockers.md`
- Phase M8 generic storage upload verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m8-generic-storage-upload-verification.md`
- Phase M9 mobile OneSignal Kotlin compatibility verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m9-mobile-onesignal-kotlin-compatibility-verification.md`
- Phase M10 OneSignal external-id topic guard verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m10-onesignal-external-id-topic-guard-verification.md`
- Phase M11 checkpoint and next slices: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-m11-checkpoint-and-next-slices.md`
- Phase N1/N2 verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-n1-n2-verification.md`
- Phase N3 Firebase dependency cleanup audit: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-n3-firebase-dependency-cleanup-audit.md`
- Phase N3-S1 to N3-S5 completion: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-n3-s1-s5-completion.md`
- Phase N4 post-N3 cleanup: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-n4-post-n3-cleanup.md`
- Phase O4 structure checkpoint verification: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-o4-structure-checkpoint-verification.md`
- Phase O5 backend setup hardening: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-o5-backend-setup-hardening.md`
- Phase O6 mobile-facing workflow audit: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-o6-mobile-facing-workflow-audit.md`
- Phase O7 mobile contract smokes: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-o7-mobile-contract-smokes.md`
- Phase O8 CI security baseline: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-o8-ci-security-baseline.md`
- Phase O9 pre-business-redesign gap closure: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\firebase-exit\phase-o9-pre-business-redesign-gaps.md`
- Phase P1 business redesign plan: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p1-business-redesign-plan.md`
- Phase P1.0 domain audit: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p1-domain-audit.md`
- Phase P1.1-A RBAC foundation: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p1-1-rbac-foundation.md`
- Phase P1.1-B RBAC route guard pilot: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p1-1-b-rbac-route-guard-pilot.md`
- Phase P1.1-C RBAC guardrail cleanup: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p1-1-c-rbac-guardrail-cleanup.md`
- Phase P1.2-S1 event lifecycle foundation: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p1-2-s1-event-lifecycle-foundation.md`
- Phase P1.2-S2 lifecycle policy smoke: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p1-2-s2-lifecycle-policy-smoke.md`
- Phase P1.2-S3 lifecycle persistence: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p1-2-s3-lifecycle-persistence.md`
- Phase P1.2-S4 draft event flow: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p1-2-s4-draft-event-flow.md`
- Phase P1.2-S5 draft submit workflow: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p1-2-s5-draft-submit-workflow.md`
- Phase P decisions and guardrails: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\runs\business-redesign\phase-p-decisions-and-guardrails.md`
- Security verification gate: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\security-verification-gate.md`
- Server repo: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Dev base branch: `staging`
- `main` is not the integration target; the user will merge manually after the system runs correctly.
- CodeGraph is installed globally and initialized per repo for `Server-2025-Eventing`, `Mobile-2025-Eventing`, and `Mobile-2025-Eventing-Organizer`. Do not use a parent-root graph.

## Manager / Worker Rule

- Codex must not directly implement backend source changes unless the user explicitly approves it.
- Use local agents for implementation, preferably `opencode` via `cmd /c`.
- Use `agy` only when it is available and producing verifiable diffs.
- Prefer continuing existing local worker sessions where practical to avoid repeatedly re-reading the whole source tree.
- If OpenCode and AGY are both unavailable, Codex may use Codex sub-agents as a fallback.
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
- `0af0740` - Add Postgres analytics adapter.
- `6448868` - Add Postgres transaction support.
- `ca2ad2e` - Wire backend auth routes.
- `0f06354` - Wire media storage uploads.
- `b80667e` - Add Postgres admin repository.
- `874d8d1` - Add Postgres provider smoke.
- `8aedc00` - Add Postgres write path smoke.
- `97c733d` - Lazy load provider selectors.
- `8e2437c` - Archive Firebase migration tooling.
- `7427306` - Support backend auth organizer role.
- `a7c9f1d` - Create profile for backend auth users.
- `c6fa22a` - Target OneSignal notifications by external id.
- `0b40153` - Add generic storage upload route.
- `e1df578` - Stabilize ngrok and local search runtime.
- `be9f6ce` - Skip OneSignal topic sync in external id mode.
- `a9ace1d` - Add logging and error handling foundation.
- `073a97f` - Harden tickets and payments request handling.
- `5cf3f99` - Harden events and organizer request handling.
- `0a0b9a5` - Centralize provider environment config.
- `5612b3d` - Split events service helpers.
- `e3cc9f4` - Harden auth users and media routes.
- `c80d1fd` - Split auth and tickets service helpers.
- `8ef1268` - Split organizer and users service helpers.
- `2ee6a1b` - Add structured error smoke checks.
- `4e45ff5` - Add mobile contract smoke checks.
- `0e5a680` - Add report-only security baseline.
- `ec4d406` - Persist attendee address profile field.
- `9db60ba` - Keep Elasticsearch mappings on empty reindex.
- `2cc328a` - Add RBAC foundation.
- `5892c4d` - Wire RBAC role guards.
- `04f653d` - Align RBAC guards with shared errors.
- `1cbbbf4` - Add event lifecycle foundation.
- `a868364` - Add event lifecycle policy smoke.
- `2517907` - Persist event lifecycle status.

## Integrated Mobile Commits

- Attendee `Mobile-2025-Eventing`: `95f0f4f` - Save attendee pre-refactor work.
- Attendee `Mobile-2025-Eventing`: `348744a` - Add backend token fallback foundation.
- Attendee `Mobile-2025-Eventing`: `58cfa30` - Wire attendee auth to backend fallback.
- Attendee `Mobile-2025-Eventing`: `bbeac36` - Use backend token for attendee current user.
- Attendee `Mobile-2025-Eventing`: `0c9cb03` - Refresh backend access token on 401.
- Attendee `Mobile-2025-Eventing`: `07c07d8` - Upload attendee event media through backend.
- Attendee `Mobile-2025-Eventing`: `ce6ffd7` - Register attendee push targets with OneSignal.
- Attendee `Mobile-2025-Eventing`: `fdb8226` - Pin OneSignal SDK for Kotlin compatibility.
- Attendee `Mobile-2025-Eventing`: `8477517` - Preserve nearby event distance.
- Organizer `Mobile-2025-Eventing-Organizer`: `a05cfc2` - Save organizer pre-refactor work.
- Organizer `Mobile-2025-Eventing-Organizer`: `4e6e2b3` - Add backend token fallback foundation.
- Organizer `Mobile-2025-Eventing-Organizer`: `5ed4650` - Wire organizer auth to backend fallback.
- Organizer `Mobile-2025-Eventing-Organizer`: `2e88509` - Use backend token for organizer current user.
- Organizer `Mobile-2025-Eventing-Organizer`: `0684fb1` - Refresh backend access token on 401.
- Organizer `Mobile-2025-Eventing-Organizer`: `54aaece` - Register organizer push targets with OneSignal.
- Organizer `Mobile-2025-Eventing-Organizer`: `04fe094` - Pin OneSignal SDK for Kotlin compatibility.
- Organizer `Mobile-2025-Eventing-Organizer`: `43096cc` - Show organizer operation results.
- Organizer `Mobile-2025-Eventing-Organizer`: `e4e03b4` - Allow organizers to cancel events.
- Organizer `Mobile-2025-Eventing-Organizer`: `53f662b` - Add organizer logout all devices.

## Mobile Rewrite Notes

- Attendee backup branch before rewrite: `codex/backup-attendee-staging-before-rewrite-20260530`.
- Organizer backup branch before rewrite: `codex/backup-organizer-staging-before-rewrite-20260530`.
- Mobile history was rewritten so user pre-refactor work is committed before Firebase Exit mobile commits.
- Attendee `.kotlin/errors/errors-1764516985770.log` remains untracked and intentionally uncommitted.

## Current Plan Summary

Checkpoint 2026-06-03:

- Existing attendee Firebase accounts can log in through `/auth/firebase-exchange`.
- Existing organizer Firebase accounts can log in through `/auth/firebase-exchange` with `role=organizer`.
- Attendee and organizer protected flows were smoke-tested on device by the user and recovered to pre-refactor behavior.
- Payment flow recovered after migration `015_add_ticket_payment_fields.sql`.
- OneSignal push works in local/dev with `NOTIFICATION_PROVIDER=onesignal` and `ONESIGNAL_TARGET_MODE=external_id`.
- Current uncommitted generated artifacts to exclude: attendee `.kotlin/errors/*.log`, organizer `.kotlin/`, organizer `.idea/deploymentTargetSelector.xml`.
- Remaining tracked work before Firebase dependency cleanup: media public URL/R2, OneSignal dashboard/subscription evidence, Firebase runtime-path cleanup audit.
- N1 backend media public URL/R2 path is verified: local fallback URL returns 200, R2 provider upload/read/public/delete passes, and authenticated `POST /storage/upload` to R2 returns a readable public URL.
- N2 OneSignal verification is complete: external-id mapping exists, the test Android device has one enabled subscription, and OneSignal message evidence shows `successful=1`, `failed=0`.
- Remaining tracked work: device-test attendee event-media upload to R2, then run N3 Firebase runtime-path cleanup audit.
- N3 read-only audit is complete. Server normal provider boot does not load Firebase, but Firebase remains required by `/auth/firebase-exchange` and mobile Firebase Auth compatibility.
- Corrected N3 blockers: backend generic storage upload already exists; remaining storage blocker is mobile profile/organizer wiring. OneSignal still requires FCM transport credentials, while direct mobile FCM token/service logic can be removed only after a dedicated device-tested slice.

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
- Status: foundation and backend route wiring complete; mobile auth migration/profile linking is deferred.

Slice E:

- Add S3-compatible storage port and adapter.
- Status: complete as additive boundary and media multipart upload wiring; existing JSON media upload behavior remains stable.

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
- security gate completed after implementation:
  - functional check
  - OWASP Top 10 scan
  - CI/CD tool scan when configured, including Trivy where practical
  - hardening review
  - attacker mindset
  - defense design

## Next Exact Step

Post-P1.1-A checkpoint and P1 business redesign execution:

- O9 mobile-facing gaps are closed and committed on `staging`.
- Phase P1 business redesign plan is saved and treats web as a full Eventing product, not only an admin panel.
- P1.0 read-only domain audit is saved.
- P1.1-A Auth/RBAC/Staff foundation is complete on the server.
- P1.1-B RBAC route-guard pilot is complete on the server.
- User decisions are now recorded in `phase-p-decisions-and-guardrails.md`.
- P1.1-C cleanup is complete.
- Next action is P1.2 Event Lifecycle Foundation with canonical lifecycle states and legacy mobile-compatible status mapping.
- Keep `npm run db:smoke:mobile-contracts` as the guardrail before and after business behavior changes.
- Keep dependency remediation as a tracked security-hardening follow-up before security scans become blocking.
- Use CodeGraph before broad repo exploration when assigning worker tasks; run `codegraph sync .` after each worker edit.
- OpenCode worker prompts must explicitly require CodeGraph MCP first, then grep/read only for confirmation. The active OpenCode config path is `%USERPROFILE%\.config\opencode\opencode.json`; `opencode mcp list` should show `codegraph connected`.

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
- Phase C3 analytics verification passed for 8 Analytics documents: migrations applied, Firebase-to-Postgres sync completed, final comparison matched 8 with 0 missing and 0 different. Exact shape check passed for `evt_haanh_show_dalat_2026`.
- Phase C4 consolidation review completed: provider flip matrix saved, global `DATABASE_PROVIDER=postgres` remains blocked by admin repository, and ticket/event/promotion/analytics transaction shims must be fixed before broad write-path flips.
- Phase C4 transaction support verification passed: real Postgres transaction helper added, rollback/commit smoke passed, and tickets/events/promotions/analytics compare scripts still pass.
- Phase C4 backend auth route verification passed: register/login/refresh/logout/logout-all smoke passed against local Postgres with `AUTH_PROVIDER=backend`; invalid backend bearer token returns 403; revoked refresh tokens return 401; smoke output redacts database password and access/refresh tokens.
- Phase C5 storage media upload verification passed: existing JSON media route remains intact, multipart image/video upload path uses storage provider, local storage upload/read smoke passed, unsupported multipart mimetype returns 400, and full server JS syntax scan passed.
- Phase C6 admin Postgres verification passed: events sync copied 23 events, admin pending compare matched 2 pending Firebase events with 0 missing and 0 different, and full server JS syntax scan passed.
- Phase C7 Postgres provider smoke passed: server booted with `DATABASE_PROVIDER=postgres`, `AUTH_PROVIDER=backend`, and `STORAGE_PROVIDER=local`; `/`, `/events`, `/profiles`, and `/admin/events/pending` returned expected basic shapes; full server JS syntax scan passed.
- Phase C8 write-path verification passed: admin approve/reject synthetic Postgres write paths passed, transaction/storage/provider/auth regression smokes passed, events/admin compares still matched Firebase, and full server JS syntax scan passed.
- Phase C9 audit completed: remaining Firebase runtime blocker is static provider loading; migration/sync/compare scripts and Firebase adapters still intentionally require Firebase; mobile auth/storage/push migration remains outside server-only scope.
- Phase C10 lazy provider loading passed: provider selectors now lazy-load only active providers; Postgres/backend/OneSignal lazy smoke proved Firebase modules are not loaded for that env; regression smokes and default selector require passed.
- Phase C11 env cutover template completed: local/dev env values and cmd verification sequence documented without committing real production secrets; S3-compatible env names aligned with current adapter.
- Phase C12 server archive completed: Firebase sync/compare scripts and legacy Firebase Functions moved under `archive/`; package scripts still work; lazy/provider smoke and archived compare commands passed.
- Phase M1 mobile backend token foundation completed: backend auth now supports optional `organizer` registration role; attendee and organizer mobile apps now have backend token stores and interceptors that prefer backend JWT tokens while preserving Firebase ID token fallback. Mobile compile remains blocked before Kotlin compilation by Mapbox Maven 401 Unauthorized.
- Phase M2 mobile auth repository wiring completed: attendee and organizer email/password auth now try backend auth first, save backend tokens, and fall back to Firebase Auth plus Firestore. Mobile compile remains blocked before Kotlin compilation by Mapbox Maven 401 Unauthorized.
- Phase M3 backend-auth profile/current-user completed: server auth register/login creates missing Postgres user profiles, `/users/me` smoke passes for backend users, and both mobile apps can resolve current user from backend JWT before Firebase fallback. Mobile compile remains blocked before Kotlin compilation by Mapbox Maven 401 Unauthorized.
- Phase M4 mobile refresh-token handling completed: attendee and organizer OkHttp interceptors now refresh expired backend access tokens through `POST /auth/refresh`, save returned backend tokens, retry the original request once, and keep Firebase token fallback available. `git diff --check` passed for both mobile repos. Mobile compile remains blocked before Kotlin compilation by Mapbox Maven 401 Unauthorized.
- Phase M5 attendee backend media upload completed: attendee event gallery media upload now tries backend multipart `POST /events/{eventId}/media` first, then falls back to Firebase Storage plus existing JSON media registration. `git diff --check` passed. Mobile compile remains blocked before Kotlin compilation by Mapbox Maven 401 Unauthorized.
- Phase M6 OneSignal external id registration completed: server direct notification targets can use backend user ids in OneSignal external id mode; attendee and organizer initialize OneSignal behind an app-id guard, call `OneSignal.login(user.id)` at startup for backend-auth users, preserve FCM token registration through existing `fcmToken`, and call `OneSignal.logout()` on sign out. Server syntax check passed. Mobile compile remains blocked before Kotlin compilation by Mapbox Maven 401 Unauthorized.
- Phase M7 consolidation completed: Mapbox Maven 401 remains the mobile compile blocker even though both mobile repos contain a hardcoded Mapbox downloads token; token is likely invalid or no longer authorized. Firebase packages/config must not be removed yet because mobile Firebase auth/storage/messaging fallback paths are still active, OneSignal delivery needs a real app id/device smoke, and organizer/profile storage still lacks a generic backend upload replacement.
- Phase M8 generic backend storage upload completed: server now exposes authenticated `POST /storage/upload` multipart upload through the active storage provider, defaults to local storage for smoke verification, and returns key/url metadata for mobile callers. Node syntax checks and `node scripts\smoke.storage.js` passed.
- Phase M9 mobile compile unblock completed: both mobile apps now pin OneSignal SDK to `5.6.1` instead of the dynamic `[5.6.1,5.9.99]` range that resolved to Kotlin 2.2 metadata dependencies. Attendee and organizer `gradlew.bat :app:compileDebugKotlin` passed after the change.
- Phase M10 OneSignal external-id topic guard completed: backend no longer calls OneSignal topic/tag APIs with legacy FCM tokens when `ONESIGNAL_TARGET_MODE=external_id`; provider guard smoke, profile update/follow/unfollow runtime smoke, and `npm run db:smoke:auth` passed.
- Phase M11 checkpoint completed: `opencode` verification-worker audited current diff read-only, server migration `015_add_ticket_payment_fields.sql` was applied, organizer compile/install passed, OneSignal was confirmed working by runtime device test, and the next task split is N1 media public URL/R2, N2 OneSignal subscription evidence, N3 Firebase cleanup audit.
- Phase N1 completed: OpenCode added a local fallback public read route and storage metadata methods; manager verified local public reads plus direct and authenticated HTTP R2 upload/read/delete paths.
- Phase N2 completed: OneSignal API shows three identified Android subscriptions for the backend external ID, one currently enabled subscription on `SM-A526B`, and one successful API message with zero failures.
- Phase N3 audit completed: OpenCode performed a read-only three-repo audit; manager verified remaining imports, confirmed lazy Postgres/backend/OneSignal boot does not load Firebase, corrected storage and OneSignal/FCM classifications, and recorded ordered cleanup slices N3-S1 through N3-S5.
- Phase N3-S1 through N3-S5 completed: direct mobile Firebase SDK usage and backend runtime Firebase providers/config/tooling were removed; `/auth/firebase-exchange` and `firebase-admin` are gone; provider selectors default to backend/postgres/onesignal and reject Firebase values; legacy auth migration, backend auth, storage, Postgres provider/write paths, domain smokes, full JS syntax scan, both Android clean compiles, and diff checks passed. Android Google Services config remains intentionally for OneSignal/FCM transport.
- Final N3 device smoke confirmed by user on 2026-06-05: media works and attendee/organizer flows work as before the refactor. Local/dev auth users were reset to backend password `123456` with `scrypt` hashes to support post-Firebase login verification.
- CodeGraph setup completed on 2026-06-05: package `@colbymchenry/codegraph` v0.9.9 is installed globally, Codex CLI and OpenCode MCP integration are installed globally, and per-repo indexes are up to date. Elasticsearch is Docker-hosted in container `es01` on `localhost:9200`; current local health is yellow because the single-node cluster has one replica shard unassigned.
- Phase N4 cleanup completed: admin routes are protected again, local PostgreSQL has 0 remaining Firebase Storage URL references after cleanup scan, Elasticsearch was rebuilt from PostgreSQL with 18 indexed events, and ignored local Firebase artifacts were removed from the server workspace.
- Phase O1 observability/infra scaffold completed: server JSONL logger, `/metrics`, Prometheus/Grafana/Loki/Promtail/Node Exporter compose config, Terraform example scaffold, Ansible scaffold, CMD log-tail scripts, and CodeGraph resync are complete. Ansible syntax check remains unverified because Ansible is not installed on the Windows host.
- Phase O2 auth moduleization completed: `src/modules/auth` now owns auth routes/controller/service, while old route/controller/service paths remain compatibility shims. Auth routes and payloads are unchanged; auth smoke, CI check, diff check, and CodeGraph resync passed.
- Phase O2 server moduleization completed: every current server route/controller/service domain now has a `src/modules/<domain>` boundary with old paths kept as compatibility shims. Completed modules: admin, analytics, auth, events, featuredProfile, media, notifications, organizer, payments, promotions, reviews, storage, tickets, users, venues. Final CI check, domain smokes, diff check, and CodeGraph status passed.
- Phase O3 deep Modular Monolith plan recorded only. No O3 code implementation is active. The next implementation must proceed slice-by-slice: alias bootstrap, module public route mounts, shared layer, low-risk pilot layering, medium modules, core modules, event/ticket/payment modules, media/storage/organizer/admin modules, legacy import cleanup, then legacy shim archive.
- Phase O4 structure checkpoint completed on 2026-06-09: Docker Postgres and Elasticsearch were running, migrations were already applied, full backend smoke sequence passed, Elasticsearch reindexed 18 events, attendee compile/install passed, organizer compile/install passed after retrying install alone, server CodeGraph was synced and up to date, server working tree was clean, and tag `backend-refactor-structure-complete` was created at commit `07565ad`.
- Phase O5-S1 through O5-S4 completed on 2026-06-09: console bridge now mirrors existing console output into `logs/app.log`, request ids are attached to responses and HTTP logs, shared errors/global error middleware/asyncHandler are in place, request validation middleware and env config foundation are in place, and tickets/payments are the first controller pilot using validation plus typed errors. Verification passed: full backend smoke sequence, validation runtime probe, CodeGraph sync. Server commits: `a9ace1d`, `073a97f`.
- Phase O5-S5 through O5-S9 completed on 2026-06-09: events/organizer/auth/users/media routes and controllers now use shared validation/error handling where safe, provider env access is centralized through shared config getters, events/auth/tickets/organizer/users services were split into helpers/policies/builders, and structured error smoke coverage was added. Verification passed: `git diff --check`, `npm run ci:check`, `npm run db:smoke:structured-errors`, `npm run db:smoke:auth`, `npm run db:smoke:events`, `npm run db:smoke:organizer_profiles`, `npm run db:smoke:users`, `npm run db:smoke:media`, `npm run db:smoke:storage-media`, `npm run db:smoke:tickets`, `npm run db:smoke:transactions`, `npm run db:smoke:postgres-write-paths`, `npm run db:smoke:notifications`, and CodeGraph sync/status. Final server CodeGraph stats: 285 files, 1,269 nodes, 1,512 edges, index up to date. Server commits: `5cf3f99`, `0a0b9a5`, `5612b3d`, `e3cc9f4`, `c80d1fd`, `8ef1268`, `2ee6a1b`.
- Phase O6 mobile-facing workflow audit completed on 2026-06-09: OpenCode workers audited attendee and organizer app API dependencies, O5 worker verification passed, and manager corrected false positives against current source. Confirmed guardrails: auth response shape, `/users/me` mobile field mapping, event list/search/nearby wrapper, recommendations bare array, organizer my-events `{data:[...]}`, QR check-in legacy error shape, media JSON plus multipart support, ticket/payment write path. Confirmed gaps: attendee address not persisted on profile update, nearby `distanceKm` discarded by mobile, organizer attendee import result ignored, organizer broadcast sent count ignored, organizer cancel-event server capability unused, logout-all unused.
- Phase O7 mobile contract smoke completed on 2026-06-11: `scripts/smoke.mobile-contracts.cjs` protects auth response shape, `/users/me`, event list/search/nearby wrappers, recommendations bare array, organizer my-events `{data:[...]}`, QR invalid legacy error shape, media JSON route/access-control path, and ticket/payment entry points. Verification passed: `node --check scripts\smoke.mobile-contracts.cjs`, `git diff --check`, `npm run ci:check`, and `npm run db:smoke:mobile-contracts` with 13 pass, 0 fail, 2 skip. Smoke-created `mobile_contract_%@test.com` rows were verified clean from `auth_users`, `user_profiles`, and `auth_tokens`.
- Phase O8 CI security baseline completed on 2026-06-11: server CI now has a report-only `security-baseline` job with blocking checkout/setup/install and non-blocking scan steps for `npm audit` and pinned Trivy filesystem scan. Verification passed: `git diff --check`, `npm run ci:check`, and CodeGraph sync. `npm run security:audit` intentionally exits nonzero with current known findings: 44 total vulnerabilities, including 14 high and 1 critical. Local Trivy CLI is not installed; GitHub Actions uses `aquasecurity/trivy-action@0.28.0`.
- Phase O9 pre-business-redesign gap closure completed on 2026-06-11: attendee address persistence, attendee nearby `distanceKm`, organizer import/broadcast result display, organizer cancel-event UX, organizer logout-all, and Elasticsearch empty-index mapping guard are complete. Verification passed: server `npm run ci:check`, `npm run search:reindex`, `npm run db:smoke:mobile-contracts` with 15 pass/0 fail/2 skip, attendee `gradlew.bat :app:compileDebugKotlin`, organizer `git diff --check`, organizer `gradlew.bat :app:compileDebugKotlin`, and CodeGraph sync after each organizer edit.
- Phase P1 business redesign plan opened on 2026-06-11: web is defined as a full Eventing product surface for attendees, organizers, and admins. The plan records BFF-style API boundaries, modular-monolith-first architecture, auth/RBAC priority, event/ticket/payment/notification/search/cache/security domains, Ticketbox/Eventbrite references, shadcn web direction, and P1.0 read-only domain audit as the immediate next step.
- Phase P1.0 domain audit completed on 2026-06-11: OpenCode audited backend and mobile dependencies read-only; AGY mobile audit was attempted but returned no report and made no changes. The saved audit confirms Auth/RBAC/Staff is the required P1.1 starting point, followed by event lifecycle, ticket/order/seat concurrency, payment/finance, notification outbox, search projection, cache/realtime, web surfaces, promotion/membership, social/reviews, and security/compliance.
- Phase P1.1-A RBAC foundation completed on 2026-06-11: OpenCode implemented additive server RBAC tables, PostgreSQL repository, authz middleware helpers, `event:cancel` permission, and `scripts/smoke.rbac.js`; manager review fixed smoke dotenv/user cleanup scope and required conflict-return semantics. Verification passed: JS syntax checks, `git diff --check`, `npm run ci:check`, `npm run db:migrate`, `npm run db:smoke:rbac` with 29 pass/0 fail, and `npm run db:smoke:mobile-contracts` with 15 pass/0 fail/2 skip.
- Phase P1.1-B RBAC route-guard pilot completed on 2026-06-11: OpenCode wired `isAdmin` and `isOrganizer` through shared RBAC role helper while preserving `ADMIN_UID`, legacy organizer role support, and existing route imports. Verification passed: JS syntax checks, `git diff --check`, `npm run ci:check`, `npm run db:smoke:authz-middleware` with 23 pass/0 fail, `npm run db:smoke:mobile-contracts` with 15 pass/0 fail/2 skip, and CodeGraph sync/status.
- Phase P decision checkpoint recorded on 2026-06-12: target event lifecycle is `draft/submitted/approved/published/rejected/cancelled`; organizer model is organization/team based; web is a full Eventing product; ticket/order/payment target includes orders, order items, payment attempts, ticket issuance, seat map, payout/refund later; notification target is Observer first with push/email/Socket.IO channels; search moves to domain event/outbox after lifecycle; Redis/promotion/membership/social/AI are deferred as documented. New guardrails require shared errors/logger, DB query budget reporting, index planning, SQL parameterization/whitelisting, security review, and visualization artifacts.
- Phase P1.1-C RBAC guardrail cleanup completed on 2026-06-12: OpenCode continued the P1.1-B session, added shared error class usage and shared logger usage to RBAC/admin/organizer guard paths through a `sendLegacyError` compatibility helper, preserved exact legacy response bodies, added no DB calls and no SQL, and manager verification passed `npm run ci:check`, `npm run db:smoke:mobile-contracts`, `git diff --check`, and CodeGraph sync/status.
- Phase P1.2-S1 event lifecycle foundation completed on 2026-06-12: OpenCode continued the Phase P backend session, added canonical lifecycle constants/mappings/predicates while preserving legacy `pending/active/rejected/cancelled` status and `public/private/unlisted` visibility behavior, parameterized lifecycle SQL constants after manager review, added lifecycle smoke coverage, and manager verification passed `npm run ci:check`, `npm run db:smoke:mobile-contracts` with 15 pass/0 fail/2 skip, `npm run db:smoke:postgres-write-paths`, and `git diff --check`.
- Phase P1.2-S2 lifecycle policy smoke completed on 2026-06-12: OpenCode added a narrow adoption of `isPublicDetailVisible` in event detail, intentionally left ES indexing behavior unchanged for `active+unlisted`, added DB-free lifecycle policy smoke coverage to `ci:check`, and manager verification passed `npm run ci:check`, `npm run db:smoke:mobile-contracts` with 15 pass/0 fail/2 skip, `npm run db:smoke:events`, and `git diff --check`.
- Phase P1.2-S3 lifecycle persistence completed on 2026-06-12: OpenCode added migration `018_add_lifecycle_status.sql`, backfilled legacy `pending` to canonical `submitted`, persisted lifecycle transitions internally on create/approve/reject/cancel, kept `lifecycleStatus` out of existing payloads/raw_data, added lifecycle persistence smoke coverage, and manager verification passed `npm run db:migrate`, `npm run db:smoke:lifecycle-persistence` with 38 pass/0 fail, `npm run ci:check`, `npm run db:smoke:mobile-contracts` with 15 pass/0 fail/2 skip, `npm run db:smoke:postgres-write-paths`, and `git diff --check`.
- Phase P1.2-S4 draft event flow completed on 2026-06-12: OpenCode used CodeGraph MCP first, added an explicit `saveAsDraft: true` creation path that persists `lifecycle_status=draft` while preserving legacy `status=pending` and `visibility=private`, kept default create as submitted/pending/private, avoided exposing `lifecycleStatus` or `saveAsDraft` in existing payloads, skipped draft push notification side effects, and manager verification passed `npm run db:migrate`, changed-file `node --check`, `npm run db:smoke:draft-events` with 28 pass/0 fail, `npm run db:smoke:lifecycle-persistence` with 38 pass/0 fail, `npm run ci:check`, `npm run db:smoke:mobile-contracts` with 15 pass/0 fail/2 skip, `npm run db:smoke:postgres-write-paths`, and `git diff --check`.
- Phase P1.2-S5 draft submit workflow completed on 2026-06-12: OpenCode added `POST /events/:eventId/submit-draft`, moved ownership/lifecycle checks into the event service using a minimal parameterized lifecycle/ownership repository lookup, enforced draft-to-submitted with `isTransitionAllowed`, explicitly preserved legacy `status=pending` and `visibility=private`, kept lifecycle fields out of existing payload/raw_data, and manager verification passed `npm run db:migrate`, changed-file `node --check`, `npm run db:smoke:draft-submit` with 24 pass/0 fail, `npm run db:smoke:draft-events` with 28 pass/0 fail, `npm run db:smoke:lifecycle-persistence` with 38 pass/0 fail, `npm run ci:check`, `npm run db:smoke:mobile-contracts` with 15 pass/0 fail/2 skip, `npm run db:smoke:postgres-write-paths`, and `git diff --check`.
