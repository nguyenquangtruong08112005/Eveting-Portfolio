# Manager State

## Objective

Refactor backend eventing and prepare full Firebase exit with provider boundaries before changing infrastructure.

## Current Phase

Phase B planning/first implementation slice.

## Scope

- Server-first.
- Keep mobile API/event/notification contracts unchanged.
- Do not migrate PostgreSQL, S3-compatible storage, OneSignal, or backend auth in the first slice.
- First safe slice: push notification provider boundary around existing FCM behavior.

## Repos And Branches

- `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
  - `staging` is the current development base branch.
  - `main` should not receive merges until the user manually decides the system runs correctly.
  - `manager/phase1-eventing-integration` exists and is ahead of `main` with Phase 1 eventing helper work.
- `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing`
  - `staging` is checked out.
  - The working tree has existing uncommitted mobile changes; do not commit or revert without explicit review.
- `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer`
  - `staging` is checked out.
  - The working tree has an existing uncommitted organizer edit; do not commit or revert without explicit review.
- `D:\01_university\year3\semester-5\mobile\final\.agent-workspaces\server-agy-phaseb-provider-ports`
  - branch: `agent/agy-phase-b-provider-ports`
  - clean at last verification.

## Worker Status

- Use `agy` interactive with `Gemini 3.5 Flash (Medium)`.
- Avoid `agy -p` for implementation in this workspace: it accepted the selected model and auto-approved edits, but produced no git diff.
- Avoid Gemini CLI, OpenCode, and GitHub Copilot unless explicitly re-approved.
- Use only agents that produce verifiable git diffs; skip failing/no-output agents instead of retrying repeatedly.

## Verified Facts

- CodeGraph was initialized in the AGY Phase B clone and status was OK.
- `.codegraph/` is excluded in the clone git info exclude.
- AGY print mode logs showed `Gemini 3.5 Flash (Medium)` selected, but no file changes landed.
- Later AGY output appears to have created a small server notification provider boundary directly in `Server-2025-Eventing` on `staging`: `services/fcm.service.js` plus `providers/notification/*`.
- `git diff --check` and `node --check` passed for that server notification-provider slice.

## Next Exact Step

Run AGY interactive in the clone:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\.agent-workspaces\server-agy-phaseb-provider-ports
agy --prompt-interactive "Implement Phase B Slice 1 in the current workspace only. Server-only. Do not touch mobile repos. Do not change API payloads, route contracts, event names, notification payload fields, or mobile-facing behavior. Do not edit package.json unless strictly unavoidable. Use Windows cmd-compatible commands only: dir, type, findstr, git. Do not use grep. Goal: add a tiny push notification provider boundary around existing FCM behavior in CommonJS style. Keep Firebase behavior intact behind the adapter. Verification: run git diff --check and node --check only on changed JS files. Return changed files, compatibility notes, verification results, and risks."
```

## Manager Verification

After AGY finishes:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\.agent-workspaces\server-agy-phaseb-provider-ports
git status --short --branch
git diff --stat
git diff --check
git diff
```

Then run `node --check` on changed `.js` files only.
