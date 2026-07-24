# Task 06-T1: Organizer Visual Seat Map Editor & Schema Engine

## 1. Goal
Build the visual seat map schema parser, section/row/seat layout generator, and organizer seat map configuration APIs.

## 2. Why
Enables organizers to visually design venue seating charts (stage, sections, rows, seat numbers, VIP zones) and assign pricing per performance.

## 3. Dependencies
- Phase 05 (Payments Engine & Idempotency Foundation).

## 4. Preconditions
- Venue and event management schemas audited during Phase 00.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Creating visual seat map schema parser based on Phase 00 database schema audit.
  - Performance seat map availability endpoint.
  - Web React grid layout component rendering seat status (`AVAILABLE`, `HELD`, `BOOKED`, `BLOCKED`).
  - Organizer manual seat blocking for VIPs/guests.
- **Out-of-Scope:**
  - Inventing migration file names or Knex ORM references before Phase 00 audit.

## 6. Likely Source Modules / Files
- `server/src/modules/` — [Discovery Target: Seatmap controllers & services]
- `web/src/features/seatmap/` — [Discovery Target: React seat map visualizer]

## 7. Contracts / Behavior to Preserve
- Seat status enum values: `AVAILABLE`, `HELD`, `SOLD`, `BLOCKED`.

## 8. Ordered Implementation Steps
1. Audit existing seat and performance tables during Phase 00 before creating schema migrations.
2. Build layout parser in seat map service validating sections, row labels, and seat codes.
3. Implement seat availability API combining static layout with live seat status.
4. Develop React grid visualizer component in web application.
5. Write unit tests for layout parsing and seat status mapping.

## 9. Database / Migration Needs
- Database schema changes to be determined after Phase 00 schema audit.

## 10. Security Requirements
- Only authorized organizer team members can modify venue seat maps.

## 11. Test / Build / Smoke Commands
- Test commands will be selected from `server/package.json` inventoried in Phase 00.

## 12. Acceptance Criteria
- [ ] Seat map layout parses cleanly and maps to performance seats.
- [ ] Interactive Web UI renders section tiers with distinct colors.
- [ ] Organizers can block seats from public sale.

## 13. Rollback / Feature-Flag Strategy
- Enable simple general-admission (non-seated) ticket sales if custom seat map is disabled for an event.

## 14. Required Artifacts / Handoff Report
- Seat map schema definition document and UI component screenshot.

## 15. Blocker Questions
- What is the maximum number of seats supported per single performance layout?
