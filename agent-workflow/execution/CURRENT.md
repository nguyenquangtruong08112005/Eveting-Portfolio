# CURRENT — Active execution pointer

> **Updated:** 2026-07-24

## Active program

| Field | Value |
|---|---|
| Program | **PORTFOLIO-COMPLETION** |
| Status | **PLANNED** |
| Hub | [portfolio-completion/](portfolio-completion/) |
| Plan | [portfolio-completion/README.md](portfolio-completion/README.md) |
| Immediate next | Phase 00 Task `00-T1`: Codegraph Audit & Environment Baseline Freeze |

## Workspace Repositories & Components

The monorepo contains the following canonical workspace folders:
- `server/` — Backend API & Services
- `web/` — Next.js Web Application
- `mobile-attendee/` — Native Android Attendee Application
- `mobile-organizer/` — Native Android Organizer Application

## Program History

| Program | Location | Status |
|---|---|---|
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

Old folder names + pre-remake tags: [`../../../archive/legacy-folder-names-2026-07/README.md`](../../../archive/legacy-folder-names-2026-07/README.md)
