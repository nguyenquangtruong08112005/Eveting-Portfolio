# Task 00-T1: Codegraph Audit & Environment Baseline Freeze

## 1. Goal
Audit the monorepo source tree (`server/`, `web/`, `mobile-attendee/`, `mobile-organizer/`), map component dependencies, inventory package scripts, and freeze baseline environment variables.

## 2. Why
Establishes a known-good baseline, preventing regressions during upcoming authentication, payment, and concurrency refactors.

## 3. Dependencies
None (Initial Task).

## 4. Preconditions
- Monorepo accessible on working branch `staging`.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Auditing file structures, exported modules, package scripts, and dependencies across all apps.
  - Documenting active `.env.example` templates and default configuration constants.
- **Out-of-Scope:**
  - Modifying application code or changing environment variable names.

## 6. Likely Source Modules / Files
- `server/package.json` — [Discovery Target: Server dependencies & package scripts]
- `web/package.json` — [Discovery Target: Web dependencies & package scripts]
- `mobile-attendee/app/build.gradle.kts` — [Discovery Target: Attendee App dependencies]
- `mobile-organizer/app/build.gradle.kts` — [Discovery Target: Organizer App dependencies]
- `.env.example`, `server/.env.example`, `web/.env.example` — [Discovery Target: Environment templates]

## 7. Contracts / Behavior to Preserve
- Existing package script names in `package.json` across all projects.
- Existing environment variable keys and fallback defaults.

## 8. Ordered Implementation Steps
1. Run structural audit scripts on `server/`, `web/`, and mobile apps.
2. Inventory package scripts in `server/package.json` and `web/package.json` before executing commands in later phases.
3. Compare `.env.example` across `server/` and `web/` to ensure no undocumented variables exist.
4. Record baseline commit hashes and create `BASELINE_STATE.md`.

## 9. Database / Migration Needs
- No schema changes required. Inspect existing `server/db/migrations` list.

## 10. Security Requirements
- Verify no real secrets or credentials are present in repository tracking.

## 11. Test / Build / Smoke Commands
- Commands to execute will be inventoried from `package.json` during this task.

## 12. Acceptance Criteria
- [ ] Comprehensive inventory of all services, package scripts, and dependencies documented.
- [ ] Verified clean working state across all monorepo directories.
- [ ] No untracked secrets in `.env.example` files.

## 13. Rollback / Feature-Flag Strategy
- N/A (Documentation & Audit task only).

## 14. Required Artifacts / Handoff Report
- Monorepo dependency and package script inventory document.

## 15. Blocker Questions
- Are any legacy shims in `server/src/archive/` still referenced by active routes?
