# Task 00-T2: API Contract & Schema Inventory

## 1. Goal
Document all active REST endpoints, route aliases (`/api/web/auth/*`, `/api/mobile/auth/*`, `/auth/*`), Request/Response schemas, validation libraries (`express-validator`), and error formats exposed by the backend.

## 2. Why
Ensures frontend and mobile applications do not suffer breaking changes during backend security and feature refactoring.

## 3. Dependencies
- Task `00-T1` (Codegraph Audit & Baseline Freeze).

## 4. Preconditions
- Express application routes readable in `server/src/`.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Cataloging all Express route paths, exact route aliases (`/api/web/auth/*` vs `/api/mobile/auth/*`), HTTP methods, authentication levels, and response payloads.
  - Auditing backend validation libraries (inventorying `express-validator` usage across Express modules).
  - Documenting standard error payload structure (`{ error: string, message: string, statusCode: number }`).
- **Out-of-Scope:**
  - Modifying route signatures or API response shapes.
  - Mandating Zod in Express (preserving `express-validator` unless Phase 00 approves a migration).

## 6. Likely Source Modules / Files
- `server/src/app.js` — [Discovery Target: Express app entrypoint & route registration]
- `server/src/routes/` — [Discovery Target: Express route definitions]
- `server/src/middleware/` — [Discovery Target: Validation and middleware stack]
- `web/src/services/apiClient.ts` — [Discovery Target: Web API consumption client]

## 7. Contracts / Behavior to Preserve
- Standard JSON envelope structure across all endpoints.
- Mobile API endpoint URIs used by `mobile-attendee` and `mobile-organizer`.

## 8. Ordered Implementation Steps
1. Parse `server/src/app.js` and extract all registered router modules and aliases.
2. Document web route prefixes (`/api/web/auth/*`) and mobile route prefixes (`/api/mobile/auth/*` or versioned `/api/v1/auth/*`).
3. Audit validation patterns in controllers to confirm `express-validator` usage.
4. Document standard successful response formats and status codes (200, 201, 204).
5. Document standard error status codes (400, 401, 403, 404, 409, 422, 500).

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- Verify sensitive fields (e.g. `password_hash`, `refresh_token`) are excluded from all baseline response schemas.

## 11. Test / Build / Smoke Commands
- Test commands will be selected from `server/package.json` inventoried in Task 00-T1.

## 12. Acceptance Criteria
- [ ] Comprehensive API Endpoint Catalog document created detailing web and mobile route aliases.
- [ ] Confirmed validation library baseline (`express-validator`).
- [ ] Confirmed zero sensitive credential exposure in API response models.

## 13. Rollback / Feature-Flag Strategy
- N/A.

## 14. Required Artifacts / Handoff Report
- API Contract Inventory Markdown Specification.

## 15. Blocker Questions
- Are any API routes using non-standard envelope formats or custom legacy headers?
