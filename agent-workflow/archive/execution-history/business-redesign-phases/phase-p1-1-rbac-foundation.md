# Phase P1.1-A - Auth/RBAC/Staff Foundation

Date: 2026-06-11

## Status

Complete on `Server-2025-Eventing` branch `staging`.

Server commit:

- `2cc328a` - `feat: add rbac foundation`

## Scope

Implemented an additive RBAC/organization staff foundation without changing current mobile-facing contracts, routes, payloads, or existing role compatibility.

Changed server files:

- `db/migrations/017_create_rbac_tables.sql`
- `src/providers/database/postgres.rbac.repository.js`
- `src/providers/database/rbac.repository.js`
- `src/shared/middleware/authz.middleware.js`
- `scripts/smoke.rbac.js`
- `package.json`

## Added

- Normalized RBAC tables:
  - `roles`
  - `permissions`
  - `role_permissions`
  - `organizations`
  - `organization_memberships`
  - `audit_logs`
- Legacy compatibility with `auth_users.roles TEXT[]`.
- RBAC repository selector and PostgreSQL adapter.
- Additive authz middleware helpers:
  - `requireRole`
  - `requirePermission`
  - `requireOrganizationRole`
  - `auditLog`
- Default system roles:
  - `user`
  - `organizer`
  - `admin`
  - `staff`
  - `manager`
- Default permissions for event, ticket, user, organization, analytics, media, and review moderation.
- `event:cancel` permission so organizer cancellation can be modeled separately from raw `event:delete`.
- `npm run db:smoke:rbac`.

## Compatibility Notes

- Existing `auth_users.roles` remains the active compatibility source.
- No existing route has been rewired to the new authz middleware yet.
- No mobile API response shape was changed.
- No organizer/admin behavior was changed in this slice.
- `event:delete` remains admin-only in the default seed; organizer receives `event:cancel`.

## Verification

Commands run:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
node --check src\providers\database\postgres.rbac.repository.js
node --check src\providers\database\rbac.repository.js
node --check src\shared\middleware\authz.middleware.js
node --check scripts\smoke.rbac.js
git diff --check
npm run ci:check
npm run local:infra
npm run db:migrate
npm run db:smoke:rbac
npm run db:smoke:mobile-contracts
```

Results:

- JavaScript syntax checks passed.
- `git diff --check` passed.
- `npm run ci:check` passed.
- Migration `017_create_rbac_tables.sql` applied successfully.
- `npm run db:smoke:rbac` passed with 29 pass, 0 fail.
- `npm run db:smoke:mobile-contracts` passed with 15 pass, 0 fail, 2 skip.

## Risks / Follow-Up

- The new authz middleware is intentionally unused until the next slice.
- Next route-wiring slice must not replace all authorization at once.
- Audit logging currently records JSON response flows via `res.json`; routes using other response methods need later review before making audit mandatory.
- Organization membership roles are stored as text in this foundation; deeper permission override semantics should be designed before exposing staff management UI.

## Recommended Next Slice

P1.1-B should wire RBAC into a small, high-value route surface:

1. Admin route guard: replace or wrap current admin checks with `requireRole('admin')` while preserving response codes.
2. Organizer route pilot: apply `requireRole('organizer', 'admin')` and, where organization/event ownership exists, prepare `requireOrganizationRole` usage without changing payloads.
3. Add smoke checks for forbidden/allowed access on selected admin and organizer endpoints.
4. Keep `npm run db:smoke:mobile-contracts` as the contract guard after every route change.
