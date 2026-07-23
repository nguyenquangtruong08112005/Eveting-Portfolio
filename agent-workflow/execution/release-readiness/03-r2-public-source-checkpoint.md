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

1. Run server contract smoke after the local API is started.
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

## R2 Progress

| Item | Status | Evidence |
|---|---|---|
| Web BFF alias gap | Done | Server commit `55c5953` adds `/api/web/users`, `/api/web/notifications`, `/api/web/promotions`, `/api/web/storage`, and `/api/web/venues` |
| Alias syntax check | Done | `node --check src/app.js` passed |
| Live mobile contract smoke | Done | `npm.cmd run db:smoke:mobile-contracts` passed: 17 pass, 0 fail, 0 skip |
| Android attendee compile | Done | `gradlew.bat :app:compileDebugKotlin` passed |
| Android organizer compile | Done | `gradlew.bat :app:compileDebugKotlin` passed |
| ADB device verification | Done | `adb devices -l` shows `R5CR30TM9VB` / `SM_A526B` |
| Attendee device install | Done | `gradlew.bat :app:installDebug` installed on `SM-A526B - 14` |
| Organizer device install | Done | `gradlew.bat :app:installDebug` installed on `SM-A526B - 14` |

## R3 CI Baseline Progress

| Item | Status | Evidence |
|---|---|---|
| Root CI | Done | `.github/workflows/ci.yml` now checks root docs, server syntax/Docker, web lint/build/Docker, Android compile report-only, and Trivy report-only |
| YAML validation | Done | Local `py` YAML parse passed |
| DB-backed smokes in CI | Deferred | Needs service-backed Postgres/Redis/Elasticsearch wiring to avoid flaky public CI |
| Android CI strictness | Deferred | Jobs are report-only until public-safe SDK credentials and Gradle properties are finalized |

## R7 Public Source Progress

| Item | Status | Evidence |
|---|---|---|
| Env templates | Done | Added root `.env.example`, `server/.env.example`, and `web/.env.example` with placeholders/local defaults |
| README env pointer | Done | Root README points readers to env templates before provider-backed features |
| Child repo evidence links | Done | Root README links server and both mobile history repos under `nguyenquangtruong08112005`; web has no separate remote configured |
| Secret-pattern scan | Done | Android `app/google-services.json` is untracked/ignored in both mobile repos; checked-in example files replace real config |

## R5/R6 Deploy Progress

| Item | Status | Evidence |
|---|---|---|
| EC2 app deploy role | Done | Added Ansible `app` role to render compose/env, pull ECR images, run migrations, and restart containers |
| Manual AWS workflow | Done | `deploy-aws.yml` build/pushes ECR images and can run Ansible app deploy with `run_ansible=true` |
| GitHub Actions SSH key setup | Done | Deploy workflow writes `EC2_SSH_PRIVATE_KEY` to `~/.ssh/eventing_ec2`; inventory example references that path |
| Deploy docs | Done | `deploy/README.md` documents GitHub Actions → ECR → EC2 Docker Compose pull/up |
| Local deploy validation | Partial | YAML parse passed; `ansible-playbook` is not installed locally, so Ansible syntax check is deferred to CI/runner |

## Public-Release Decision Needed

Both Android apps currently track Firebase/Google client config:

- `mobile-attendee/app/google-services.json`
- `mobile-organizer/app/google-services.json`

These files are client-side configuration, not server-side secrets, but public repos should either:

1. keep them public and restrict the Google API key/OAuth clients in Google Cloud/Firebase, or
2. untrack them, commit `google-services.example.json`, and require local/CI setup to provide the real file.

Decision: untrack the real files, keep local copies ignored, commit `google-services.example.json`, and make root CI copy examples for report-only Android compile.
