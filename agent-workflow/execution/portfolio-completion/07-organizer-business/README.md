# Phase 07: Organizer Business Suite (from PO-idea.md)

## Overview
Phase 07 implements the full business suite for event organizers specified in `PO-idea.md`: Multi-step Event Builder with Vietnam address dictionary, custom attendee registration questions, ticket sales rules, private/public event visibility, custom email messages for buyers, organizer banking/tax profile verification, comprehensive sales/analytics/check-in dashboards, Team RBAC permissions, voucher/promotions engine, and the Featured Star Artist Studio.

## Deliverables
- Event Builder APIs & Web UI supporting Vietnam administrative location dictionary.
- Attendee custom question generator (text, single-choice, multi-choice checkbox).
- Ticket rules engine (min/max limits, sale windows, early bird).
- Organizer bank account, tax ID, and red invoice profile submission.
- Business intelligence dashboard (Revenue charts, Ticket sales tables, Conversion rates, Access sources, Check-in ratios, Batch email broadcast).
- Organizer Team RBAC (Admin, Manager, Check-in Staff) with 12 granular permissions.
- Promotion/Voucher program engine (Public modal vs Private code, usage limits, ticket scope).
- Featured Artist / Famous Profile Studio.

## Tasks
1. [`01-event-builder-address-questions.md`](01-event-builder-address-questions.md) — Event Builder, Address Dictionary & Attendee Qs
2. [`02-ticket-rules-vouchers-promotions.md`](02-ticket-rules-vouchers-promotions.md) — Ticket Rules, Vouchers & Promotion Engine
3. [`03-organizer-payment-bank-tax.md`](03-organizer-payment-bank-tax.md) — Organizer Payment Profile, Bank Details & Tax Verification
4. [`04-organizer-dashboard-analytics-checkin.md`](04-organizer-dashboard-analytics-checkin.md) — Dashboard Analytics, Order Management & Check-in Suite
5. [`05-team-rbac-roles-permissions.md`](05-team-rbac-roles-permissions.md) — Team Management & Granular RBAC Permissions
6. [`06-featured-artist-star-studio.md`](06-featured-artist-star-studio.md) — Featured Artist & Famous Profile Star Studio

## Verification Evidence (2026-07-28)

### Smoke Tests
| Test | Result |
|---|---|
| smoke.phase07-event-builder.js | PASS |
| smoke.phase07-event-artist-db.sql (psql) | PASS |
| smoke.phase07-organizer-slice.js | PASS (10 assertions: team RBAC, check-in, payment profile, KYC, encryption) |
| smoke.phase07-featured-artist.js | PASS |
| smoke.promotions-phase07.js | PASS (15 assertions: fractional floor, cap, deterministic quote, non-stackable, concurrency limit-one, per-user limit, idempotent retry, usage cap, release) |
| smoke.order-checkout-contract.js | PASS |
| smoke.aggregate-payment.js | PASS |
| smoke.mobile-contracts.cjs | PASS 16/0 |
| smoke.migration-bank-accounts.js | PASS 15/0 |

### Migrations Applied
| Migration | Purpose |
|---|---|
| 067 | Bank accounts encrypted payload (clean + legacy schema) |
| 070 | Extend seat layouts |
| 071 | Create performance seats |
| 072 | Link performance seat holds |
| 073 | Event builder address questions |
| 074 | Featured artist profiles |
| 075 | Organizer team RBAC |
| 076 | Organizer analytics check-in |
| 077 | Organizer payment profiles |
| 078 | Promotion voucher business rules |
| 079 | Allow in-progress idempotency responses |

### Invariants Verified
- [x] Event builder creates events with custom questions and Vietnam address dictionary
- [x] Voucher business rules enforced (non-stackable, usage caps, per-user limits, concurrent limit-one)
- [x] Promotions use deterministic quoting (no trusted discount input accepted)
- [x] Organizer payment profiles masked, encrypted at rest, KYC-verified
- [x] Bank account change invalidates KYC (increments revision)
- [x] Team RBAC: staff scans assigned ticket type; cross-team permission denied; one user holds different role per team
- [x] Featured artist profiles created and retrieved
- [x] Duplicate QR check-in prevented; malformed QR returns legacy 400 DTO
- [x] Private events not leaked to public browse/search (mobile contract verified)
- [x] Order checkout contract handles mixed ticket types atomically

### Web Checks
- [x] test:unit — all 6 test suites pass
- [x] lint — 0 errors, 6 warnings (pre-existing)
- [x] build (next build) — compiled + TS check passed
- [x] Organizer workspace compiles: artists/, check-in/, dashboard/, events/, finance/, promotions/, team/, venues/ views
- [x] Checkout uses /api/web/orders/* pattern
- [x] Seat selection components compile (SeatGrid, seat-layout, BookingDetails)

### Residual Risks
- Phase 07 smokes require SKIP_RATE_LIMIT=true for concurrent booking tests
- featured-artist smoke lightweight; full CRUD lifecycle not stress-tested
- Organizer UI views compile but visual/styling review deferred to Phase 09 (Web UX)
- Check-in QR verification uses JWT; ticket model transition from HELD→SOLD via payment only (web never calls public seat-confirm)
