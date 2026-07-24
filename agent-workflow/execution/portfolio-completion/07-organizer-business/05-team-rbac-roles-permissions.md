# Task 07-T5: Team Management & Granular RBAC Permissions

## 1. Goal
Implement the organizer team management suite and 12-granular permission RBAC model (`PO-idea.md` #16).

## 2. Why
Enables organizers to delegate operational tasks to team members (Managers, Check-in Staff) with strictly scoped permissions.

## 3. Dependencies
- Task `07-T4` (Dashboard Analytics, Order Management & Check-in Suite).

## 4. Preconditions
- User authentication and organizer team tables active.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **Roles (`PO-idea.md` #16):**
    1. `ADMIN` (Full control over team and event).
    2. `MANAGER` (Operations, marketing, orders, editing).
    3. `CHECK_IN_STAFF` (Limited to ticket scanning and check-in reports for assigned performances/ticket types).
  - **12 Granular Permissions:**
    `SCAN_TICKETS`, `VIEW_CHECKIN_REPORTS`, `MANAGE_TEAM`, `MANAGE_SEATMAP`, `VIEW_ORDERS`, `SEND_CUSTOMER_EMAIL`, `EXPORT_ORDER_REPORTS`, `VIEW_REVENUE`, `VIEW_ANALYTICS`, `MARKETING_OPERATIONS`, `MANAGE_VOUCHERS`, `EDIT_EVENT`.
  - Performance and ticket-type scoping for `CHECK_IN_STAFF`.
  - Team member invitation flow (`POST /organizer/team/invite`).
- **Out-of-Scope:**
  - Third-party LDAP / Active Directory integration.

## 6. Likely Source Modules / Files
- `server/src/middleware/organizerRbac.js` — [Discovery Target: Granular team permission check middleware]
- `server/src/modules/teams/` — [Discovery Target: Team membership & invitation controllers]
- `web/src/features/organizer/team/` — [Discovery Target: Team management UI]

## 7. Contracts / Behavior to Preserve
- `requireTeamPermission(permission)` middleware enforcing permission verification.

## 8. Ordered Implementation Steps
1. Create PostgreSQL migrations for `organizer_teams`, `team_members`, and `team_member_permissions` tables.
2. Implement `organizerRbac` middleware evaluating team role and specific permission flags.
3. Build team invitation endpoint sending email invite token to prospective staff member.
4. Develop Team Management UI in `web/src/features/organizer/team/`.
5. Write unit tests verifying permission rejection for unauthorized staff endpoints.

## 9. Database / Migration Needs
- PostgreSQL migration `068_create_organizer_team_rbac.sql`.

## 10. Security Requirements
- Check-in staff accounts restricted strictly to scanning and assigned check-in reports; blocked from viewing total revenue or exporting customer PII.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `node server/scripts/smoke/smoke.team-rbac.js`

## 12. Acceptance Criteria
- [ ] Organizer Admin can invite new team members and assign custom permission sets.
- [ ] Check-in staff attempting to view revenue API receives HTTP 403 Forbidden.
- [ ] Check-in staff successfully scans tickets for their assigned performance.

## 13. Rollback / Feature-Flag Strategy
- Default team members to read-only `MANAGER` role if granular permission check throws an unhandled exception.

## 14. Required Artifacts / Handoff Report
- Team RBAC permission test matrix.

## 15. Blocker Questions
- Should team members be allowed to belong to multiple organizer organizations simultaneously?
