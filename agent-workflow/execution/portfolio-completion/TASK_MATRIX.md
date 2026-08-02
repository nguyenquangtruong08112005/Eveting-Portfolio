# Portfolio Completion Program — Task Status Matrix

| Phase | Task ID | Task Description | Status |
| :--- | :--- | :--- | :--- |
| **00 Baseline** | `00-T1` | Codegraph Audit & Environment Baseline Freeze | `COMPLETED` |
| | `00-T2` | API Contract & Schema Inventory (Route Aliases & Validation Audit) | `COMPLETED` |
| **01 Auth** | `01-T1` | Google & Facebook OAuth Integration (`auth_identities`) | `COMPLETED (Manual OAuth Setup Required)` |
| | `01-T2` | Email Verification, Activation & Redirect Flow | `COMPLETED` |
| | `01-T3` | Session Management, Rotating Refresh & CSRF Defense | `COMPLETED` |
| **02 Security** | `02-T1` | Public API Security Boundary & RBAC Ownership Enforcement | `COMPLETED` |
| | `02-T2` | Rate Limiting, CORS & Cloudflare WAF Hardening | `COMPLETED` |
| | `02-T3` | Mobile Attestation & App Integrity Design | `COMPLETED` |
| **03 Data** | `03-T1` | Deterministic Vietnam Data Seeding & Relational Scaling | `COMPLETED` |
| | `03-T2` | Media Asset Licensing, Demo Policy & Elasticsearch Indexing | `COMPLETED` |
| **04 Infra** | `04-T1` | Outbox Pattern Verification & Elasticsearch Auto-Reindexing | `COMPLETED` ^[migration 064 applied; outbox/idempotency timestamps TIMESTAMPTZ] |
| | `04-T2` | Redis Caching, Rate Limiter & Idempotency Storage Setup | `COMPLETED` ^[Cache smoke passed (normal Redis + forced MemoryCache fallback)] |
| | `04-T3` | Outbox Worker & Dead Letter Queue (retry, DLQ, manual requeue CLI, retention) | `COMPLETED` ^[Phase 04 outbox smoke 61/0; retention cron 02:30 Asia/Ho_Chi_Minh, 7d, batch 500; TIMESTAMPTZ; migration 064] |
| | `04-T4` | Cache Namespace Helpers (gzip64, SCAN invalidation, MemoryCache fallback, invalidation hooks) | `COMPLETED` ^[Cache smoke passed (normal + forced fallback)] |
| **05 Payments** | `05-T1` | Core Idempotency Engine (`idempotency_keys` Spec) | `COMPLETED` ^[Migration 065 additive-only not executed; explicit Idempotency-Key header; canonical nested object hashing array-order preserved; exact replay HIT 422 mismatch 409 in-progress 409 cross-principal global key no payload leak; 5xx scoped key release; ticket/payment route middleware after validation+ownership; smoke 20/0 passed 2026-07-27; web uuid crypto.randomUUID on 4 mutations; attendee+organizer Retrofit Header on tickets/book + payments/create-order; web lint 0 errors; both android compileDebugKotlin successful] |
| | `05-T2` | ZaloPay Gateway Integration, Refund & Payout Safeguards | `IMPLEMENTED - RUNTIME VERIFICATION PENDING` ^[T2A: check-status FOR UPDATE lock + race smoke 40/0; T2B: attendee 3s×8 polling + pending-confirmation UI; T2C: check-status idempotency wiring; T2D: simulated payout foundation with migrations 066-069, AES-256-GCM bank encryption, eligibility 7-day hold 100K min, first/high 10M+ admin approval gate, simulated provider; T2E-1: weekly batch Sunday 00:00 Asia/Ho_Chi_Minh + 5-min reconciliation cron; T2E-2: organizer GET/PUT payout APIs + admin list/approve endpoints. Server d3ad9c3 24a06b7 c1626b2, web 769da37, mobile-organizer 28ab1fd. Smokes: foundation 19/0, automation 16/0, API 28/0. Web lint 0 errors + prod build passed. Mobile-organizer compile clean. Pending: local ngrok + deployed staging ZaloPay sandbox transaction/callback verification. Refund workflow deferred by approved scope.] |
| **06 Seatmap** | `06-T1` | Organizer Visual Seat Map Editor & Schema Engine | `TECHNICALLY COMPLETED - PRODUCT ACCEPTANCE REOPENED` ^[Migrations 070-072 and concurrency invariants remain verified. The generic seeded grid must not be shown for every event. Decision 06-D1: implement organizer-authored layouts before exposure, or hide seat selection until a valid authored layout exists.] |
| | `06-T2` | Seat Hold TTL & Database Transactional Locking | `COMPLETED` ^[holdPerformanceSeats with FOR UPDATE + UNIQUE(performance_id,seat_id); 10-min TTL verified; HELD-before-payment/SOLD-only-after-payment invariants hold; seat-release-worker job present; seat.contract.js defines HE LD/SOLD/BLOCKED transitions] |
| | `06-T3` | Concurrency Race-Condition Testing & Auto-Release Worker | `COMPLETED` ^[100-way HTTP same-seat race passes: 1 success / 99 SEAT_ALREADY_RESERVED (409) / 834ms / 120 req/s; DB: 1 reserved, 1 held; hold audit: 1 active. Seat-release worker in jobs/seat-release-worker.js with --once flag.] |
| **07 Organizer** | `07-T1` | Event Builder, Address Dictionary & Attendee Qs | `COMPLETED` ^[Migration 073 applied; event_custom_questions, order_attendees, vietnam_locations tables verified; event-builder smoke + DB smoke both passed] |
| | `07-T2` | Ticket Rules, Vouchers & Promotion Engine | `COMPLETED` ^[Migration 078 applied; smoke.promotions-phase07: 15/0 (fractional floor, cap, deterministic quote, non-stackable, concurrency limit-one, per-user order limit, idempotent retry, usage cap, release). Migration 040 (merge vouchers into promotions) already applied.] |
| | `07-T3` | Organizer Payment Profile, Bank Details & Tax Verification | `COMPLETED` ^[Migration 067, 077 applied; organizer-slice smoke: [PASS] payment profile masked/requires KYC, verified eligible, bank change invalidates KYC, encrypted at rest. Bank-account migration smoke: 15/0 (clean-schema, idempotent re-apply, legacy schema, schema shape)] |
| | `07-T4` | Dashboard Analytics, Order Management & Check-in Suite | `COMPLETED` ^[Migration 076 applied; analytics tables, check-in tracking present; duplicate QR check-in prevented; malformed QR preserves 400 {valid:false,error:INVALID_TICKET}; organizer-slice smoke: staff can scan assigned team ticket type] |
| | `07-T5` | Team Management & Granular RBAC Permissions | `COMPLETED` ^[Migration 075 applied; organizer-slice smoke: one user holds different role in team B, cross-team permission denied; RBAC team tables, 12+ granular permissions] |
| | `07-T6` | Legacy Featured Artist & Famous Profile implementation | `SUPERSEDED BY 08-T5` ^[Migration 074 and profile/event-link smoke remain technical evidence only. Organizer ownership/editing model is rejected: a Studio belongs to a Featured Profile company or authorized representative, not an event organizer.] |
| | `07-T7` | Phase 07.1 Manual-QA Regression Remediation | `PLANNED - BLOCKING` ^[Checkout idempotency/attendee payload, event map fallback, organizer context/finance/team regressions. Must pass before Phase 08 implementation begins.] |
| **08 Admin** | `08-T1` | Organizer Verification & KYC Workflow | `PLANNED` |
| | `08-T2` | Event Moderation & Platform Quality Control | `PLANNED` |
| | `08-T3` | Financial Oversight, Payout Approval & Refund Review | `PLANNED` |
| | `08-T4` | System Audit Logs, Feature Flags & Observability | `PLANNED` |
| | `08-T5` | Featured Profile Studio Ownership, Verification & Event-Link Approval | `PLANNED` ^[Profile company/representative owns identity and Studio; organizer may request event association only; admin approves verification, Studio activation, and custom category publication.] |
| **09 Web UX** | `09-T1` | Bo Cong Thuong Removal & Portfolio Demo Disclosures | `PLANNED` |
| | `09-T2` | Web Consistency, Form Validation & Responsive Flow Polish | `PLANNED` |
| | `09-T3` | Voucher Picker, Featured Profiles, Tag Input, R2 Media Upload & Vietnam Geo Data | `PLANNED` |
| **10 Mobile** | `10-T1` | Android Attendee & Organizer App UX Audit | `PLANNED` |
| | `10-T2` | Mobile Auth Migration & API Contract Synchronization | `PLANNED` |
| **11 Docs** | `11-T1` | Portfolio README Showcase & Developer Setup Manual | `PLANNED` |
| | `11-T2` | Architecture Diagrams (C4, Threat Model, ERD, Sequence) | `PLANNED` |
| **12 Release** | `12-T1` | Git Branching Strategy & GitHub Actions CI/CD Pipeline | `PLANNED` |
| | `12-T2` | Terraform IaC Review Gate & Immutable Image Rollout | `PLANNED` |
| **13 Gate** | `13-T1` | Automated Security Scans (OWASP, Trivy, IaC Audit) | `PLANNED` |
| | `13-T2` | End-to-End Verification & Release Sign-off | `PLANNED` |

## Phase 04 Residual Risk

The legacy `outbox` table uses composite primary key `(id, created_at)`; UUID IDs are assumed globally unique. Deferred schema hardening — promoting a natural-key unique constraint or formal `REFERENCES` chain — requires explicit later approval and is not part of this phase. No production deployment verification is claimed.

## Phase 06-07 Residual Risks

- **Rate limiter interference**: 100-way seat concurrency test requires `SKIP_RATE_LIMIT=true` to avoid 429 before seat logic.
- **Seat hold TTL (10 min)**: Server-side worker only; no Redis-based TTL fallback for hold expiration.
- **Bank encryption key rotation**: AES-256-GCM key rotation is manual; no automatic re-key scheduled.
- **Featured-artist smoke**: Lightweight; full CRUD lifecycle not stress-tested.
- **Organizer UI styling**: Views compile but visual/styling polish deferred to Phase 09 (Web UX).
- **Idempotency in-progress regression**: Migration 079 (allow in-progress responses) applied; confirmed idempotency smoke 20/0 passes.
