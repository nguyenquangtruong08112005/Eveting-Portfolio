# Task 07-T1: Event Builder, Address Dictionary & Attendee Qs

## 1. Goal
Implement the multi-step Event Builder wizard APIs and Web UI supporting main/banner images, Vietnam administrative location dictionary, custom attendee registration questions, private/public visibility settings, and custom email messages for ticket buyers.

## 2. Why
Fulfills core product specification in `PO-idea.md` (items #1, #3, #4, #5, #6), enabling organizers to create rich, localized event listings in Vietnam.

## 3. Dependencies
- Phase 06 (Seat-Map Engine & High-Concurrency Locking).

## 4. Preconditions
- Category and venue lookup tables seeded with Vietnam data.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `POST /organizer/events` — Multi-step creation payload:
    - **Step 1 (Basic Info):** Main image (`upload hhh chính`), Banner image, Event Title, Category ID (`other` option included), Markdown description with embedded images.
    - **Step 2 (Location):** Vietnam administrative address dictionary selection (Province/City, Ward/District, Venue Name, House Number/Street).
    - **Step 3 (Visibility & Message):** Private vs Public event toggle (`is_private`), Custom email message appended to buyer confirmation email (`message_for_attendee`).
    - **Step 4 (Custom Attendee Questions):** Organizer can configure custom questions (`question_text`, `question_type`: `text`, `single_choice`, `multi_choice`, `is_required`, `options: string[]`).
- **Out-of-Scope:**
  - Live video streaming hosting.

## 6. Likely Source Modules / Files
- `server/src/modules/events/` — [Discovery Target: Event creation service & validation]
- `web/src/features/organizer/event-builder/` — [Discovery Target: React Event Builder wizard]

## 7. Contracts / Behavior to Preserve
- `GET /events/:id` response includes `custom_questions` and localized Vietnam address components.

## 8. Ordered Implementation Steps
1. Create PostgreSQL migrations for `vietnam_locations` (Provinces, Districts, Wards dictionary) and `event_custom_questions` tables.
2. Update `EventService.createEvent()` to handle location dictionary IDs, private visibility flags, and attendee custom questions.
3. Implement `web/src/features/organizer/event-builder/` multi-step form wizard with image drag-and-drop upload and Markdown live preview.
4. Save custom question responses during checkout inside `order_attendees.answers` JSON column.
5. Write unit tests for event creation payload validation and custom question parsing.

## 9. Database / Migration Needs
- PostgreSQL migration `064_create_vietnam_locations_and_custom_questions.sql`.

## 10. Security Requirements
- Input sanitization on Markdown description (prevent XSS injection via `dompurify` / `sanitize-html`).
- Organizer ownership verification on all edit routes.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `npm run build` (in `web/`)

## 12. Acceptance Criteria
- [ ] Event created with Vietnam address dictionary fields (Province, Ward, Street) successfully saved.
- [ ] Private events excluded from public search index (`is_private = true`).
- [ ] Custom attendee questions (Text, Single Choice, Multi-Choice) rendered dynamically during buyer checkout.

## 13. Rollback / Feature-Flag Strategy
- Default `is_private = false` and optional custom questions if question schema parsing encounters errors.

## 14. Required Artifacts / Handoff Report
- Event Builder test execution log and UI screenshot of multi-step wizard.

## 15. Blocker Questions
- Should custom attendee questions be editable after ticket sales have commenced?
