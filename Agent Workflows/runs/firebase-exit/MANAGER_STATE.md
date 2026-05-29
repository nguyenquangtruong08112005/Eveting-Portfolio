# Manager State

## Objective

Execute the Firebase Exit plan with Codex as manager/verifier and local agents as implementers.

## Current Phase

Slice A: provider ports/interfaces with no behavior change.

## Source Of Truth

- Plan: `D:\01_university\year3\semester-5\mobile\final\Agent Workflows\firebase-exit-plan.md`
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

## Current Plan Summary

Slice A:

- Add provider ports/interfaces with Firebase still active.
- No behavior change.
- Keep API payloads, routes, event names, notification payload fields, and mobile behavior stable.

Slice B:

- Pick one small domain, preferably `venues` or `notifications`.
- Lock repository contract and make it PostgreSQL-ready.

Slice C:

- Add PostgreSQL schema and adapter.

Slice D:

- Add backend JWT/session auth with password hashing, refresh tokens, and role model.

Slice E:

- Add S3-compatible storage port and adapter.

Slice F:

- Switch push provider to OneSignal facade.
- Note: Android still needs FCM transport configured underneath OneSignal.

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

Assign `opencode` the next bounded Slice A prompt:

- server-only
- no mobile repo edits
- no package changes
- reduce remaining direct Firebase usage in one small controller/service/job area
- keep behavior and payloads stable
- run `git diff --check` and `node --check` on changed JS files
- return changed files, compatibility notes, verification output, and risks
