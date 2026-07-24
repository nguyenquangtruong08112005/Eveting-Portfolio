# Task 08-T2: Event Moderation & Platform Quality Control

## 1. Goal
Implement the Admin Event Moderation & Quality Control workspace (`/admin/moderation`), supporting event publishing approvals, content flagging, and category/venue governance.

## 2. Why
Ensures public events meet platform quality standards and prevents illegal, spammy, or offensive content from being published.

## 3. Dependencies
- Task `08-T1` (Organizer Verification & KYC Workflow).

## 4. Preconditions
- Admin role authenticated.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `GET /admin/events/pending` — Lists events awaiting publication approval.
  - `POST /admin/events/:id/approve` — Approves event, publishing to search index.
  - `POST /admin/events/:id/reject` — Rejects event with moderation notes.
  - `POST /admin/events/:id/delist` — Force delists published event due to policy violations.
  - User reporting endpoint (`POST /events/:id/report`) allowing attendees to flag questionable events.
  - Admin report queue (`/admin/moderation/reports`).
- **Out-of-Scope:**
  - Automated AI vision content filtering.

## 6. Likely Source Modules / Files
- `server/src/modules/admin/` — [Discovery Target: Admin event moderation controllers]
- `web/src/app/admin/moderation/page.tsx` — [Discovery Target: Admin moderation dashboard UI]

## 7. Contracts / Behavior to Preserve
- Event status values: `DRAFT`, `PENDING_APPROVAL`, `PUBLISHED`, `REJECTED`, `DELISTED`.

## 8. Ordered Implementation Steps
1. Create PostgreSQL migration for `event_reports` table.
2. Implement `AdminModerationService` handling approval, rejection, and emergency delisting.
3. Update Elasticsearch outbox trigger to index only `PUBLISHED` events.
4. Develop Admin Moderation UI in `web/src/app/admin/moderation/page.tsx`.
5. Write unit tests for moderation state machine and report handling.

## 9. Database / Migration Needs
- PostgreSQL migration `071_create_event_reports_table.sql`.

## 10. Security Requirements
- Admin role enforcement on all moderation routes.
- Audit log record created for every event approval, rejection, or delisting.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `npm run build` (in `web/`)

## 12. Acceptance Criteria
- [ ] Submitted event transitions to `PENDING_APPROVAL` status.
- [ ] Admin approval updates status to `PUBLISHED` and triggers Elasticsearch index outbox event.
- [ ] Admin force delisting removes event from search index immediately.

## 13. Rollback / Feature-Flag Strategy
- Environment flag `AUTO_APPROVE_EVENTS=true` auto-approves events for rapid testing environments.

## 14. Required Artifacts / Handoff Report
- Moderation workflow test execution log.

## 15. Blocker Questions
- Should organizers be allowed to appeal a rejected event submission directly within the platform?
