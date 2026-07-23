# R2 Public Source Checkpoint

> Date: 2026-07-23  
> Scope: root docs/config after R0/R1 source stabilization  
> Status: IN PROGRESS

## Current Repo State

| Area | State |
|---|---|
| Root | Documentation/config cleanup in progress |
| `server` | Clean after payment/event/ticket/seed fixes |
| `web` | Clean after contract and lint fixes |
| `mobile-attendee` | Clean after IDE metadata cleanup |
| `mobile-organizer` | Clean after pending-event envelope fix |

## Completed Release-Readiness Work

1. R0 dirty diff audit completed and committed.
2. Server CodeGraph was initialized/synced during the audit.
3. R1 contract P0 fixes completed:
   - web accepts raw or wrapped recommendation payloads.
   - web search accepts server pagination envelope.
   - organizer mobile accepts admin pending-event envelope.
4. Server, web, and organizer mobile compile/lint gates passed for the changed areas.

## Public-Source Cleanup Decisions

| Item | Decision |
|---|---|
| `.zcode/` | Ignore as local agent/tool cache |
| `TEST_ACCOUNTS.md` | Keep only as local/demo credential documentation, never reuse for production |
| QA bug reports | Commit when they are public-safe and useful as release evidence |
| Raw product ideas | Keep as backlog input; normalize before presenting as public roadmap |
| Secrets | Keep in local `.env`; publish only `.env.example` |

## Next R2 Tasks

1. Add or document `/api/web/*` aliases for web-only BFF consistency.
2. Run `server/scripts/smoke/smoke.mobile-contracts.cjs` while local API is running.
3. Clean remaining lint warnings where cheap and low-risk.
4. Add `.env.example` coverage for server/web/mobile-facing configuration.
5. Prepare CI baseline:
   - server syntax/smoke
   - web lint/type/build
   - Android compile where feasible
   - Trivy report-only scan

## R2 Stop Conditions

1. Stop if GitHub auth or remotes are not under `nguyenquangtruong08112005`.
2. Stop before deleting user-created local artifacts unless explicitly approved.
3. Stop before pushing or publishing the repository.
