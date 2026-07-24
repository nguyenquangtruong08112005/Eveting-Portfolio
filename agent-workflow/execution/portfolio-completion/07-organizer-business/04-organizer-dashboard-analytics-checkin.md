# Task 07-T4: Dashboard Analytics, Order Management & Check-in Suite

## 1. Goal
Implement the complete organizer business intelligence, sales analytics, order management, CSV export, customer email broadcasting, and event check-in suite (`PO-idea.md` #9, #10, #11, #12, #13, #14).

## 2. Why
Provides organizers with real-time operational visibility into ticket sales, page traffic conversion, attendee check-in progress, and customer communications.

## 3. Dependencies
- Task `07-T3` (Organizer Payment Profile, Bank Details & Tax Verification).

## 4. Preconditions
- Orders, tickets, and check-in tables populated.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **Overall Revenue Dashboard (`PO-idea.md` #11):** Performance switcher, Total Revenue, Tickets Sold count, Sales timeline chart, Ticket sales breakdown table (Type, Price, Sold, Locked, Sell Rate %) with drill-down detailed revenue modal per row.
  - **Analytics Tab (`PO-idea.md` #12):** Click count, Unique visitors, Purchase conversion rate (Bought / Page Access ratio), Access timeline chart, Traffic source breakdown (Direct, Facebook, Zalo, Google, Referral).
  - **Order Management (`PO-idea.md` #13):** Filter by performance, search bar, order list table (Order ID, Created At, Customer Name, Total Value, Payment Method, Status), CSV report export (`GET /organizer/events/:id/orders/export`), Batch email broadcast (`POST /organizer/events/:id/orders/send-email`).
  - **Check-in Suite (`PO-idea.md` #14):** Performance filter, Checked-in vs Sold ratio progress bar, Joined event count, Exited event count, Ticket type check-in ratio table.
- **Out-of-Scope:**
  - Real-time video camera feed analysis.

## 6. Likely Source Modules / Files
- `server/src/modules/analytics/` — [Discovery Target: Organizer analytics & report query service]
- `server/src/modules/checkin/` — [Discovery Target: Check-in API service]
- `web/src/features/organizer/dashboard/` — [Discovery Target: React organizer dashboard suite]

## 7. Contracts / Behavior to Preserve
- `GET /organizer/events/:id/analytics` schema format.

## 8. Ordered Implementation Steps
1. Build SQL aggregation queries in `AnalyticsService` calculating revenue, sales velocity, traffic sources, and conversion ratios.
2. Build CSV export stream handler using `json2csv` / fast stream pipeline.
3. Build batch email broadcast worker processing recipient queues safely.
4. Implement Check-in API (`POST /checkin/scan`) validating ticket QR signature and updating `checkin_status`.
5. Develop React Dashboard views (Overall, Analyze, Orders, Check-in) in `web/src/features/organizer/dashboard/` using Recharts.
6. Write unit and integration tests for analytics aggregations and check-in state transitions.

## 9. Database / Migration Needs
- PostgreSQL migration `067_create_event_traffic_logs_and_checkins.sql` with indices on `event_traffic_logs(event_id, source)` and `checkins(ticket_id)`.

## 10. Security Requirements
- Ensure organizer can access only analytics and order records for events they own.
- Check-in staff role restricted to check-in endpoints.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `npm run build` (in `web/`)

## 12. Acceptance Criteria
- [ ] Overall revenue dashboard correctly aggregates sales per ticket type.
- [ ] Analytics tab displays traffic access source breakdown and conversion rate.
- [ ] CSV export generates valid downloadable CSV containing order details.
- [ ] Batch email endpoint successfully queues emails to selected attendees.
- [ ] Scanning valid ticket QR marks status `CHECKED_IN` and updates check-in ratio bar.

## 13. Rollback / Feature-Flag Strategy
- Cache analytics responses for 60 seconds if live aggregation queries cause database load spikes.

## 14. Required Artifacts / Handoff Report
- Analytics dashboard test suite report and exported sample CSV file.

## 15. Blocker Questions
- Should duplicate check-in scans trigger a warning sound/modal on the mobile check-in app?
