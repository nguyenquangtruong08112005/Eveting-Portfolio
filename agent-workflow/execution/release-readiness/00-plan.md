# RELEASE-READINESS — Portfolio Public Release Plan

> Updated: 2026-07-22  
> Status: DRAFT / NEXT ACTIVE PROGRAM  
> Goal: make Eventing clean, consistent across web + mobile, CI/CD-ready, deployable to one AWS EC2 instance through Cloudflare, and safe to publish as a portfolio monorepo.

## 1. Owner Decisions

| Decision | Value |
|---|---|
| Project type | Public portfolio project |
| Repository model | One public monorepo |
| Child repo evidence | README must link old/child repos as evidence/history |
| GitHub owner | `nguyenquangtruong08112005` only |
| Stop condition | If any GitHub auth/remote points to another account, stop and ask user to log in |
| Deploy target | One AWS EC2 instance |
| Deploy reason | Portfolio demo, not production |
| Runtime | Docker / Docker Compose |
| Cloudflare | DNS/proxy/TLS in front of EC2 |
| Include mobile apps publicly | Yes |

## 2. Hard Rule

No new feature work until the current dirty source changes are audited and either committed, split, or removed.

Current dirty areas observed on 2026-07-22:

- root: untracked workflow/docs/artifacts
- `server`: significant modified backend source
- `web`: significant modified frontend source
- `mobile-attendee`: `.idea/*` deletions only
- `mobile-organizer`: clean

## 3. Target End State

The public monorepo should look credible to a reviewer:

```text
eventing/
  server/
  web/
  mobile-attendee/
  mobile-organizer/
  deploy/
  scripts/
  agent-workflow/
  README.md
  DEMO.md
  docker-compose.yml
  docker-compose.app.yml
```

The README must clearly explain:

- what Eventing is
- why it exists
- architecture overview
- screenshots/demo flows
- local setup
- Docker setup
- deployed demo URL
- test accounts
- CI/CD status
- old child repo links:
  - server repo
  - attendee mobile repo
  - organizer mobile repo
  - web repo if it exists separately

## 4. Phase R0 — Dirty Diff Audit And Commit Split

Worker: OpenCode for read-only audit. Codex manager verifies.

Goal: understand the current uncommitted source changes before any implementation.

Tasks:

1. Audit root untracked files.
2. Audit `server` diff.
3. Audit `web` diff.
4. Audit `mobile-attendee` `.idea` deletions.
5. Confirm `mobile-organizer` is clean.
6. Classify each change:
   - keep
   - split into commit
   - move to later
   - discard after explicit approval only
7. Produce commit split proposal.

Verification:

```cmd
git status --short --branch
git -C server status --short --branch
git -C web status --short --branch
git -C mobile-attendee status --short --branch
git -C mobile-organizer status --short --branch
```

Prompt:

```text
READ ONLY. Audit current dirty diffs for release-readiness. Use CodeGraph first in server if available. Do not edit files. Repos: root, server, web, mobile-attendee, mobile-organizer. Classify every modified/untracked/deleted file into keep/split/later/discard-needs-approval. Explain which phase each change appears to belong to, likely risk, and proposed commit split. Check whether any change affects web/mobile contract consistency. Return concise report only. Do not run build/test that creates artifacts.
```

## 5. Phase R1 — Contract Consistency Across Web And Mobile

Worker: OpenCode backend + web. AGY only for Android if mobile source must change.

Goal: make web and mobile consume consistent backend contracts.

Core shared flows:

- auth login/register/refresh
- current user
- event list/search/nearby/detail
- organizer event CRUD/list
- ticket booking
- payment create-order/status
- my tickets
- ticket detail / QR
- media upload/read

Tasks:

1. Document current response shapes.
2. Add backend contract fixtures or OpenAPI-lite docs.
3. Add smoke tests for mobile-facing and web-facing flows.
4. Normalize web API client to match backend DTOs.
5. Avoid breaking existing mobile contracts.

Definition of done:

- Web and mobile can login and read the same event/ticket domain consistently.
- Contract smoke tests protect the shared flows.

## 6. Phase R2 — Codebase Cleanup Gate

Worker: OpenCode for backend and web; AGY for Android only if needed.

Goal: make the code reasonable before public release.

Backend cleanup:

- reduce long services by extracting policies/builders/helpers
- keep controllers thin
- keep repositories provider-specific
- remove duplicate error handling
- remove hidden direct side effects from CRUD services where practical
- ensure shared logger/errors/validation are used

Web cleanup:

- normalize API client
- centralize env constants
- centralize auth/session behavior
- remove duplicated loading/error UI patterns
- make checkout/tickets/events consistent

Mobile cleanup:

- remove tracked IDE metadata if approved
- keep Android compile green
- avoid broad UI refactors unless a flow is broken

## 7. Phase R3 — CI Baseline

Worker: OpenCode.

Goal: GitHub Actions that prove the project is buildable.

Minimum CI jobs:

- root sanity
- server syntax + smokes
- server Docker build
- web typecheck/build
- attendee Android compile if feasible
- organizer Android compile if feasible
- dependency/security report
- Trivy filesystem scan report

GitHub Actions direction:

- Build Docker images with `docker/build-push-action`.
- Push images to GHCR for release/demo branches.
- Use report-only security scans first; make blocking later.

## 8. Phase R4 — Docker And Local Demo Runtime

Worker: OpenCode.

Goal: one command can run local demo infra and app stack.

Containers:

- backend
- Postgres
- Elasticsearch
- web
- optional reverse proxy

Commands:

```cmd
npm run local:infra
npm run local:app
npm run local:down
```

Definition of done:

- backend health works
- web can call backend
- Android app can call backend through LAN/ngrok/manual URL
- seed data exists for demo

## 9. Phase R5 — AWS EC2 Demo Deploy

Worker: OpenCode for scripts/docs. User provides AWS credentials/console actions.

Goal: deploy portfolio demo on one EC2 instance.

Recommended instance:

- Minimum realistic: `t3.medium` or `t4g.medium` if ARM images are handled.
- Avoid `t3.small` if Elasticsearch runs on the same box; it may work but will feel unstable.
- For smoother demo: `t3.large` short-term, then stop instance when not demoing.

One-instance demo layout:

```text
EC2
  Docker Compose
    backend
    web
    postgres
    elasticsearch
    reverse-proxy
```

Security:

- SSH restricted to your IP.
- App exposed through Cloudflare only if possible.
- Keep secrets in EC2 `.env`, not Git.
- Do not publish real secrets.

## 10. Phase R6 — Cloudflare Connection

Worker: OpenCode for docs/config templates. User configures Cloudflare.

Goal: put Cloudflare in front of EC2.

Cloudflare direction:

- DNS A record to EC2 public IP, proxied.
- Full Strict TLS.
- Origin protection:
  - preferred: Cloudflare Tunnel, or
  - restrict EC2 security group to Cloudflare IP ranges for HTTP/HTTPS, or
  - Authenticated Origin Pulls later.

Reason: Cloudflare docs warn that direct origin access can bypass Cloudflare if the origin IP is reachable.

## 11. Phase R7 — Public Source Cleanup

Worker: OpenCode read/write after approval.

Goal: make repo safe and professional before public push.

Checklist:

- remove secrets
- rotate exposed keys if any
- add `.env.example`
- audit `.gitignore`
- remove generated logs/artifacts
- clean `.idea` tracking decision
- add license
- add screenshots
- add demo video/gif if practical
- add architecture diagram
- add old child repo links in README
- confirm GitHub remote/account is `nguyenquangtruong08112005`

Stop condition:

- If `gh auth status` or any `git remote -v` shows another account, stop and ask user to log in.

## 12. Phase R8 — Public Push And Release

Worker: Codex manager only after explicit user approval.

Tasks:

1. Create/confirm GitHub public repo under `nguyenquangtruong08112005`.
2. Push `staging` or release branch.
3. Verify GitHub Actions.
4. Create initial release tag.
5. Update README with public demo URL.

No push without explicit user approval.

## 13. Immediate Next Action

Run Phase R0 read-only dirty diff audit.

Do not implement new source changes until R0 is complete.
