# CURRENT — Active execution pointer

> **Updated:** 2026-07-27

## Active program

| Field | Value |
|---|---|
| Program | **PORTFOLIO-COMPLETION** |
| Status | **IN_PROGRESS** |
| Hub | [portfolio-completion/](portfolio-completion/) |
| Plan | [portfolio-completion/README.md](portfolio-completion/README.md) |
| Phase 00 Status | **COMPLETED** ([00-baseline/BASELINE_STATE.md](portfolio-completion/00-baseline/BASELINE_STATE.md), [00-baseline/ENVIRONMENT_VARIABLE_FREEZE.md](portfolio-completion/00-baseline/ENVIRONMENT_VARIABLE_FREEZE.md), [00-baseline/API_CONTRACT_INVENTORY.md](portfolio-completion/00-baseline/API_CONTRACT_INVENTORY.md)) |
| Immediate next | Phase 05 Task `05-T2`: ZaloPay Gateway Integration, Refund & Payout Safeguards |
| External Blockers | See [portfolio-completion/OPEN_QUESTIONS.md](portfolio-completion/OPEN_QUESTIONS.md) (Q01: Google OAuth Client IDs, Q02: Facebook App credentials, Q03: Play Integrity Service Account) |

## Workspace Repositories & Components

The monorepo contains the following canonical workspace folders:
- `server/` — Backend API & Services
- `web/` — Next.js Web Application
- `mobile-attendee/` — Native Android Attendee Application
- `mobile-organizer/` — Native Android Organizer Application

## Program History

| Program | Location | Status |
|---|---|---|
| Baseline Phase 00 | [portfolio-completion/00-baseline/](portfolio-completion/00-baseline/) | COMPLETED (Audit, Env Freeze & Contract Inventory) |
| Release Readiness | [release-readiness/](release-readiness/) | Superseded by PORTFOLIO-COMPLETION |
| Database Integrity | [db/integrity/](db/integrity/) | Completed (Migrations 031–036) |
| Database Normalize | [db/normalize/](db/normalize/) | Completed (Migrations 037–046) |
| Database Finish | [db/finish/](db/finish/) | Completed (Migrations 047–060) |

## Verification Commands

To verify database state and backend baseline:

```bash
cd server
npm run db:migrate
```

## Git & Release Policy

- Working branch: `staging`.
- Target release branch: `main`.
- Commit convention: Conventional Commits with no scopes, for example `fix: ...`, `feat: ...`, `refactor: ...`, `docs: ...`.
- Deploy policy: Automated CI checks on PR; reviewed Terraform plan before apply; Ansible container deployment over AWS SSM. No direct push to `main`.

## Archive

Completed execution plans & history: [`../../../archive/legacy-folder-names-2026-07/README.md`](../../../archive/legacy-folder-names-2026-07/README.md)
