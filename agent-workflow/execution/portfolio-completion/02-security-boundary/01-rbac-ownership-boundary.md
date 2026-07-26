# Task 02-T1: Public API Security Boundary & RBAC Ownership Enforcement

## 1. Goal
Implement authorization boundaries enforcing user roles (`admin`, `organizer`, `attendee`), team permissions, resource ownership checks, and backend input validation using `express-validator`.

## 2. Why
Prevents Broken Object Level Authorization (BOLA / IDOR) and privilege escalation vulnerabilities (OWASP API Top 10 #1 & #5).

## 3. Dependencies
- Phase 01 (Authentication & Identity).

## 4. Preconditions
- User roles and team permissions available on `req.user` after auth middleware.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `requireRole('admin' | 'organizer' | 'attendee')` middleware.
  - `requireOwnership(model, idParam)` middleware ensuring `resource.organizer_id === req.user.id` or `resource.user_id === req.user.id`.
  - Input validation using `express-validator` schemas (or shared backend validation middleware as inventoried in Phase 00) for request body, query, and path parameters.
  - Parameterized database queries across all SQL operations.
- **Out-of-Scope:**
  - Mandating Zod in Express (preserving `express-validator` unless Phase 00 code audit approves migration).

## 6. Likely Source Modules / Files
- `server/src/middleware/auth.js` — [Discovery Target: RBAC & Ownership middleware]
- `server/src/middleware/validation.js` — [Discovery Target: express-validator middleware]
- `server/src/modules/events/` — [Discovery Target: Event authorization & validation]

## 7. Contracts / Behavior to Preserve
- Standard HTTP status code responses: HTTP 401 Unauthorized, HTTP 403 Forbidden.

## 8. Ordered Implementation Steps
1. Refactor `requireRole` to accept single role or array of authorized roles.
2. Build `requireOwnership` helper supporting `Event`, `Order`, `Ticket`, and `Venue` resources.
3. Attach `express-validator` middleware to Express route definitions returning HTTP 400 with field validation errors.
4. Audit database queries to verify 100% parameterization (`$1, $2`).
5. Write unit tests for authorization boundaries.

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- Strict parameterized SQL queries (`$1, $2`).
- No internal system error stack traces exposed in HTTP 400/403 responses.

## 11. Test / Build / Smoke Commands
- Test commands will be selected from `server/package.json` inventoried in Phase 00.

## 12. Acceptance Criteria
- [x] Organizer A attempting to update Organizer B's event receives HTTP 403. (Verified in `npm run db:smoke:rbac-ownership`)
- [x] Attendee attempting to access Admin endpoint receives HTTP 403. (Verified in `npm run db:smoke:rbac-ownership`)
- [x] Invalid payload parameters rejected with HTTP 400 `express-validator` error payload. (Verified in `npm run db:smoke:rbac-ownership`)

## 13. Rollback / Feature-Flag Strategy
- Revert middleware changes via Git commit if valid request flows are blocked.

## 14. Required Artifacts / Handoff Report
### Authorization Test Execution Matrix

| Test ID | Boundary Check / Scenario | Expected Result | Execution Evidence / Verification | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AUTHZ-01** | `requireRole` single role (`admin`) vs attendee | HTTP 403 Forbidden | `npm run db:smoke:rbac-ownership` (Test 1) | **PASSED** |
| **AUTHZ-02** | `requireRole` multi-role (`admin`, `organizer`) vs organizer | HTTP 200 / Next() | `npm run db:smoke:rbac-ownership` (Test 1) | **PASSED** |
| **AUTHZ-03** | Attendee accessing `/admin` endpoints | HTTP 403 Forbidden | `npm run db:smoke:rbac-ownership` (Test 2) | **PASSED** |
| **AUTHZ-04** | Unauthenticated user accessing protected route | HTTP 401 Unauthorized | `npm run db:smoke:rbac-ownership` (Test 3) | **PASSED** |
| **AUTHZ-05** | Organizer A attempting to mutate Organizer B Event | HTTP 403 Forbidden | `npm run db:smoke:rbac-ownership` (Test 4) | **PASSED** |
| **AUTHZ-06** | Organizer B mutating their own Event | HTTP 200 / Next() | `npm run db:smoke:rbac-ownership` (Test 4) | **PASSED** |
| **AUTHZ-07** | Admin bypass policy on Event ownership | Next() (Allowed) | `npm run db:smoke:rbac-ownership` (Test 4) | **PASSED** |
| **AUTHZ-08** | Non-owner attempting to mutate Venue | HTTP 403 Forbidden | `npm run db:smoke:rbac-ownership` (Test 5) | **PASSED** |
| **AUTHZ-09** | Non-owner attempting to view/access Ticket details | HTTP 403 Forbidden | `npm run db:smoke:rbac-ownership` (Test 5) | **PASSED** |
| **AUTHZ-10** | Non-owner attempting to access Order details | HTTP 403 Forbidden | `npm run db:smoke:rbac-ownership` (Test 5) | **PASSED** |
| **AUTHZ-11** | `express-validator` invalid request payload | HTTP 400 Bad Request | `npm run db:smoke:rbac-ownership` (Test 6) | **PASSED** |
| **AUTHZ-12** | PostgreSQL SQL query parameterization audit | 0 unsafe interpolations | `npm run db:audit:sql-params` (89 queries scanned) | **PASSED** |

## 15. Blocker Questions
- Are platform Admins permitted to edit organizer events directly, or view only?
  - *Resolved:* Admins have explicit, minimal bypass capability on `requireOwnership` by default.
