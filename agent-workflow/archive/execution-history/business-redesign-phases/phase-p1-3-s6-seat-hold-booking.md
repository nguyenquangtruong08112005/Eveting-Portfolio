# Phase P1.3-S6: Seat Hold Booking Pilot

Date: 2026-06-12

## Scope

Integrate seat holds and bookings into the ticketing application service layer, connecting database-backed holds with fallback Redis caches and realtime WebSocket updates.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: OpenCode
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `f314e318ea1b03677a10be9f6ced802a2f245f31` (represented by short hash `f314e31`) - `feat(backend): wire database-backed seat holds to booking service and add concurrent seat booking smoke test`

## Changed Files

- `Server-2025-Eventing/src/modules/tickets/application/service.js`
- `Server-2025-Eventing/scripts/smoke.seat-booking.js` [NEW]
- `Server-2025-Eventing/scripts/smoke.concurrent-seat-booking.js` [NEW]

## Behavior

- **`holdSeat`**: Updated to run inside a database transaction. Removes expired holds on the targeted seat, checks for active holds or active sold tickets, inserts a hold record into `seat_holds`, and falls back to Redis cache/WebSocket broadcasts.
- **`releaseSeat`**: Transactionally releases active seat holds, evicts cache, and emits Socket.IO updates.
- **`bookHeldSeats`**: Transactionally checks hold ownership and expiration, converts holds to `'sold'`, blocks the seat in the structural `seats` table, creates tickets/orders, and cleans up caches.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node scripts/smoke.seat-booking.js
node scripts/smoke.concurrent-seat-booking.js
npm run db:smoke:mobile-contracts
npm run ci:check
```

Results:
- `smoke.seat-booking.js`: 11 pass, 0 fail.
- `smoke.concurrent-seat-booking.js`: pass.
- `db:smoke:mobile-contracts`: 17 pass, 0 fail.
- `ci:check`: pass.
