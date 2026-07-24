# CURRENT — Active execution pointer

> **Updated:** 2026-07-25

## Active program

| Field | Value |
|---|---|
| Program | **PORTFOLIO-COMPLETION** |
| Status | **IN_PROGRESS** |
| Hub | [portfolio-completion/](portfolio-completion/) |
| Plan | [portfolio-completion/README.md](portfolio-completion/README.md) |
| Phase 00 Status | **COMPLETED** ([00-baseline/BASELINE_STATE.md](portfolio-completion/00-baseline/BASELINE_STATE.md), [00-baseline/ENVIRONMENT_VARIABLE_FREEZE.md](portfolio-completion/00-baseline/ENVIRONMENT_VARIABLE_FREEZE.md), [00-baseline/API_CONTRACT_INVENTORY.md](portfolio-completion/00-baseline/API_CONTRACT_INVENTORY.md)) |
| Phase 03 Status | **COMPLETED FOR LOCAL DEMO READINESS** ([03-data-seeding/VERIFICATION_REPORT.md](portfolio-completion/03-data-seeding/VERIFICATION_REPORT.md)) — Phase 03 data seeding deliverables are complete for local demo readiness while the broader program still has earlier auth/security phases (Phase 01 Auth, Phase 02 Security) planned for subsequent execution. |
| Immediate next | Phase 01 Task `01-T1`: Google & Facebook OAuth Integration (`auth_identities`) |
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
| Data Seeding Phase 03 | [portfolio-completion/03-data-seeding/](portfolio-completion/03-data-seeding/) | COMPLETED FOR LOCAL DEMO READINESS (Deterministic Seed, Policy & Search Indexing) |
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
