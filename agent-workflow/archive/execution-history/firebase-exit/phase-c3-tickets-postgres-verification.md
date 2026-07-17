# Phase C3 Tickets Postgres Verification

Date: 2026-05-29

## Scope

- Server repo only: `Server-2025-Eventing`
- Branch: `staging`
- Commit: `a3f27e7` - `Add Postgres ticket adapter`
- Domain: tickets

## Changes Verified

- Added PostgreSQL `tickets` schema with typed columns plus `raw_data`.
- Added Postgres ticket repository behind `TICKET_DATABASE_PROVIDER` / `DATABASE_PROVIDER`.
- Firebase remains default.
- Added tickets sync, smoke, and compare scripts.
- Preserved ticket raw payload shape for payment/QR fields.

## Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check providers\database\postgres.ticket.repository.js && node --check providers\database\ticket.repository.js && node --check scripts\sync.tickets.firebase-to-postgres.js && node --check scripts\smoke.tickets.js && node --check scripts\compare.tickets.firebase-postgres.js
findstr /R /N "[^ -~]" db\migrations\011_create_tickets.sql providers\database\postgres.ticket.repository.js scripts\sync.tickets.firebase-to-postgres.js scripts\smoke.tickets.js scripts\compare.tickets.firebase-postgres.js providers\database\ticket.repository.js package.json
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:migrate&&npm run db:sync:tickets&&set TICKET_SMOKE_ID=tkt_41bf7544-59f5-4275-b6d4-08cdae30f2ad&&npm run db:smoke:tickets&&npm run db:compare:tickets
```

## Results

- `git diff --check`: passed.
- `node --check`: passed for changed JS files.
- ASCII scan: passed.
- Migration: skipped 001-011 after prior local application.
- Sync: found 23 Firebase Firestore tickets and synced 23 tickets.
- Smoke:
  - provider: `postgres`
  - `getTicketById("tkt_41bf7544-59f5-4275-b6d4-08cdae30f2ad")`: found.
  - `getTicketsByUserId("72CmoZjZYIgEzS89yPORpQehoF52")`: returned 6 tickets.
  - `getAttendeeTicketsByEventId("evt_haanh_show_dalat_2026")`: returned 6 attendee tickets.
  - `getPaidTicketsByEventId("evt_haanh_show_dalat_2026")`: returned 4 paid tickets.
- Compare:
  - matched: 23
  - missing in postgres: 0
  - missing in firebase: 0
  - different: 0
  - `getTicketById`: match for `tkt_41bf7544-59f5-4275-b6d4-08cdae30f2ad`
  - `getPaidTicketsByEventId`: method shape matched for 4 tickets.
  - `getAttendeeTicketsByEventId`: method shape matched for 6 tickets.

## Compatibility Notes

- Ticket raw/read payload shape is preserved with `raw_data`.
- Payment and QR fields such as `paymentStatus`, `lastPaymentAttempt`, `zaloAppTransId`, and `qrCode` are preserved through raw data.
- Firebase remains the default provider.
- Transaction wrappers are compatibility shims; full payment/event inventory atomicity should be reviewed before globally flipping ticket write paths.

## Next Domain

Proceed to featured profiles. Event `featuredProfileIds`, user follow/unfollow, and profile discovery still depend on Firebase profile documents.
