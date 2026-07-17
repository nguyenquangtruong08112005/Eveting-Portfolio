# Phase P1.3-S5: Seat Map Schema Foundation

Date: 2026-06-12

## Scope

Introduce the schema and repository methods for database-backed seat holding and booking to support reserved seating configurations.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: OpenCode
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `6f399c09c9ce05342a781298c19b5fa155abce8a` (represented by short hash `6f399c0`) - `feat(backend): implement idempotent bookings, inventory row-locks, and seat hold schema foundation`

## Changed Files

- `Server-2025-Eventing/db/migrations/027_create_seat_holds.sql` [NEW]
- `Server-2025-Eventing/src/providers/database/seat.contract.js`
- `Server-2025-Eventing/src/providers/database/postgres.seat.repository.js`
- `Server-2025-Eventing/scripts/smoke.seat-holds.js` [NEW]

## Behavior

- **Database Migration**: Added the `seat_holds` table to track temporary holds on seats, containing `expires_at`, `status` (`'held'`, `'sold'`), and user/event relations.
- **Index Protection**: Created a unique partial index `idx_active_seat_holds ON seat_holds (event_id, seat_id) WHERE (status = 'held')` to prevent two concurrent transactions from successfully holding the same seat at the same time. Added index on `expires_at` for quick cleanup.
- **Seat Repository**: Implemented handlers for creating seat holds, checking active holds, releasing expired holds, converting holds to sold status, and listing seats with current statuses.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node scripts/smoke.seat-holds.js
npm run ci:check
```

Results:
- `smoke.seat-holds.js`: pass.
- `ci:check`: pass.
