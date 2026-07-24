# Phase 06: Seat-Map Engine & High-Concurrency Locking

## Overview
Phase 06 delivers the complete interactive seat-map system, featuring an organizer visual seat map editor, multi-performance support, section/row/seat layout definitions, temporary seat holds with TTL expiration, PostgreSQL database-level unique constraints & transaction locking (ultimate source of truth), Redis acceleration, race-condition concurrency tests, and an automated payment expiry hold release worker.

## Deliverables
- Visual seat map layout schema engine (JSON grid layout parser).
- Seat hold reservation endpoint (`POST /events/:id/seats/hold`) with 10-minute TTL.
- Database transaction locking (`SELECT ... FOR UPDATE`) & UNIQUE constraint (`performance_id`, `seat_id`).
- Automated background worker releasing expired seat holds.
- Concurrency test suite simulating high parallel seat reservation contention.

## Tasks
1. [`01-seatmap-schema-editor.md`](01-seatmap-schema-editor.md) — Organizer Visual Seat Map Editor & Schema Engine
2. [`02-seat-hold-ttl-transactions.md`](02-seat-hold-ttl-transactions.md) — Seat Hold TTL & Database Transactional Locking
3. [`03-concurrency-race-tests.md`](03-concurrency-race-tests.md) — Concurrency Race-Condition Testing & Auto-Release Worker
