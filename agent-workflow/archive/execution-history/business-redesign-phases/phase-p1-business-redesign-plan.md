# Phase P1 - Eventing Business Redesign Plan

Date: 2026-06-11

## Purpose

Plan the next product/business redesign phase after Firebase Exit and O9 stabilization.

Important correction: the future web app is not only an admin panel. It is a full Eventing web product similar in direction to Ticketbox/Eventbrite:

- attendee web experience: browse, search, book, pay, manage tickets, reviews, social/discovery
- organizer web experience: create/manage events, tickets, seating, marketing, reports, staff, reminders
- admin web experience: platform moderation, organizer verification, fraud/spam review, finance/compliance

No implementation starts in this phase until the business and architecture contracts are written and reviewed.

## Current Baseline

- Firebase Exit, provider decoupling, Postgres migration, storage provider, OneSignal, mobile auth, O5 hardening, O6 mobile-facing audit, O7 contract smokes, O8 CI security baseline, and O9 pre-business-redesign fixes are complete on `staging`.
- Backend is a modular monolith. Keep this as the default architecture for now.
- Do not split microservices yet. First, stabilize bounded modules, data ownership, events/outbox, caching, and contracts.
- Existing guardrail before/after every business slice:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
npm run ci:check
npm run db:smoke:mobile-contracts
```

## Product Surfaces

### 1. Attendee Mobile

Existing Android attendee app. Keep API compatibility unless a migration phase explicitly changes mobile contracts.

### 2. Organizer Mobile

Existing Android organizer app. Keep for scanning/check-in and lightweight organizer operations.

TicketBox reference: the organizer mobile app supports order/customer/check-in management, QR/barcode scan, offline scan, and manual ticket code check-in.

### 3. Attendee Web

New full web product, not admin-only.

Expected capabilities:

- browse/search events
- event detail pages
- seat map / time slots / ticket options
- checkout/payment
- my tickets
- profile/preferences
- reviews after event
- social discovery
- membership/promotion usage

### 4. Organizer Web

New full organizer dashboard.

Expected capabilities:

- event creation and lifecycle management
- schedule/frequency/recurring events
- seat map/ticket tier setup
- attendee import/export
- check-in analytics
- marketing tools
- reminder and notification settings
- staff/RBAC
- promotion/campaign management
- finance/payout reports
- business profile/license verification

### 5. Admin Web

New platform operations surface.

Expected capabilities:

- organizer verification
- event approval/moderation
- AI-assisted spam/fraud review
- payment/refund/payout oversight
- compliance documents
- support/audit logs
- platform-level campaigns and feature flags

## Frontend Direction

Use Next.js for the web app unless a later audit rejects it.

Use shadcn/ui for the first web implementation:

- initialize non-interactively with `npx shadcn@latest init -d`
- use `new-york` style for admin/organizer dashboards
- use shadcn primitives for tables, dialogs, forms, alerts, sheets, tabs, dropdown menus, badges, skeletons
- use `AlertDialog` for destructive operations
- avoid one-off raw button/input/select components when shadcn primitives exist

The user mentioned "taste skill"; no local Codex skill with that exact name is currently available. If this refers to a design/plugin tool, discover it before web implementation starts.

## Backend API Strategy For Mobile And Web

Adopt a BFF-like boundary without immediately creating separate deployable services.

Recommended route shape inside the same modular monolith:

```text
/api/mobile/*       mobile-stable API contracts
/api/web/*          attendee web API
/api/organizer/*    organizer dashboard API
/api/admin/*        admin web API
/api/public/*       public catalog/search/event pages
```

Rationale:

- mobile and web need different payload density, pagination, caching, and authentication behavior
- admin/organizer dashboards need aggregate views that should not leak into mobile contracts
- BFF can start as module route layers inside the same Express app, not a separate microservice
- core domain modules remain shared underneath

Backend module layers:

```text
api/controller -> application service -> domain policy -> repository/port -> provider adapter
                                     -> domain events/outbox
                                     -> cache/search/projection adapters
```

Rule: business services should not directly call Elasticsearch, Socket.IO, mail, OneSignal, or Redis. They should publish domain events and update core state transactionally.

## Architecture Decision

### Keep Modular Monolith First

Use one backend deployment while the domain is still changing.

Do not split microservices until these are true:

- module boundaries are stable
- each module has clear data ownership
- events/outbox exist
- idempotency and transaction behavior are tested
- monitoring/logging are usable
- deployment/migration process is reliable

### Add Event/Outbox Before Microservices

Use domain events and an outbox table first:

- `ticket.booked`
- `ticket.payment_pending`
- `ticket.paid`
- `ticket.cancelled`
- `event.submitted`
- `event.approved`
- `event.rejected`
- `event.cancelled`
- `review.created`
- `organizer.verified`
- `promotion.applied`

Consumers:

- notification dispatcher
- email dispatcher
- in-app notification writer
- Socket.IO broadcaster
- Elasticsearch projector
- analytics projector
- audit log writer

## Phase P1 Problem Domains

### P1.0 Business Domain Audit

Goal: write the actual target model before code changes.

Scope:

- event lifecycle
- ticket lifecycle
- payment lifecycle
- organizer business verification
- admin moderation
- promotion/campaign model
- notification model
- review/social model
- finance and payout model

Deliverable:

- `phase-p1-domain-audit.md`
- state diagrams for event, ticket, payment
- current-code gap matrix

Verification:

- no code changes
- compare current API/mobile workflows against target workflows

### P1.1 Auth, RBAC, Staff, And Session Model

Goal: make auth a strong foundation.

Problems:

- auth must support attendee, organizer owner, organizer staff, admin, support/moderator
- organizer staff need limited permissions
- web should not expose long-lived sensitive tokens carelessly
- mobile still needs refresh-token flow

Design:

- keep current backend auth short-term
- model after Keycloak/OIDC concepts: clients, roles, scopes, sessions, token rotation, revocation
- decide later whether to integrate Keycloak or keep self-managed auth

Must define:

- role table
- permission table
- organization membership table
- session/device table
- password reset and email verification policy
- admin/staff audit logs

Verification:

- auth smoke expanded for role matrix
- access-control tests for attendee/organizer/staff/admin
- OWASP auth/access-control review

### P1.2 Event Lifecycle And Organizer Configuration

Goal: support real organizer operations before advanced ticketing.

Problems:

- organizer config is too thin
- notification/reminder settings are missing
- event frequency/recurring/timed-entry variants are not modeled
- compliance/license/business profile needs are unclear

Reference:

- Eventbrite timed entry supports multiple time slots for tours/classes/exhibitions.
- Eventbrite reserved seating supports seating sections and ticket tiers.

Must model:

- organizer profile
- business profile and verification documents
- event draft/submitted/approved/rejected/published/cancelled/completed states
- event schedule: one-time, recurring, multi-slot/timed-entry
- reminder settings
- notification preferences
- staff assignment

Verification:

- event state transition tests
- organizer API contract tests
- mobile compatibility smoke

### P1.3 Ticketing, Seats, Holds, And Concurrency

Goal: prevent overselling and support reserved seating.

Problems:

- seat selection/seat map is not handled
- two people buying one seat/ticket needs transaction safety
- group booking/share bill is missing
- "my tickets" needs stronger lifecycle model

Must model:

- event venue map
- section, row, seat
- ticket type/tier
- inventory bucket
- seat hold with TTL
- order
- order item
- ticket
- ticket transfer/share bill/group booking

Concurrency design:

- Postgres transaction
- row-level lock for seat/inventory
- idempotency key for booking/payment
- hold expiration job

Verification:

- concurrent booking test
- duplicate payment callback test
- QR check-in replay test

### P1.4 Payment, Commission, Refund, And Payout

Goal: define the money flow.

Open business questions:

- money goes directly to organizer or platform escrow?
- platform commission percent/fixed fee?
- refund policy?
- payout schedule?
- who pays payment gateway fee?
- what happens when event is cancelled?

Must model:

- payment provider
- payment intent/order
- payment transaction
- refund
- payout
- platform fee
- organizer balance
- settlement report

Provider direction:

- keep ZaloPay short-term
- add provider port for additional payment methods
- support idempotent webhook processing

Verification:

- payment webhook signature test
- idempotency test
- payout math tests
- audit log checks

### P1.5 Notification Platform

Goal: replace direct notification calls with Observer/Event pattern.

Problems:

- push/mail/in-app/socket concerns should not live inside CRUD services
- reminders need organizer-level configuration
- in-app notification should sync across devices

Design:

```text
business action -> domain event -> outbox -> dispatcher -> channel handlers
```

Channels:

- OneSignal push
- email
- in-app notification table
- Socket.IO realtime

Must model:

- notification template
- notification preference
- reminder schedule
- notification delivery log
- channel status/retry

Verification:

- event published once
- each channel idempotent
- retry and DLQ behavior
- email sent on ticket purchase/payment
- Socket.IO update reaches logged-in web/mobile session

### P1.6 Redis Cache And Realtime Sync

Goal: improve read performance and multi-device freshness without corrupting source of truth.

Cache use cases:

- event list/search page metadata
- event detail
- featured profiles
- organizer dashboard summary
- admin moderation counts
- rate-limit/session support if needed

Pattern:

- cache-aside for read-heavy stable data
- explicit invalidation on domain events
- never cache payment authority state unless designed carefully

Realtime:

- Socket.IO for web and potentially mobile
- publish updates for notification, ticket status, event changes
- not a replacement for Postgres

Verification:

- cache hit/miss tests
- invalidation tests
- stale data acceptance per endpoint

### P1.7 Search And Elasticsearch Projection

Goal: remove CRUD service responsibility for search synchronization.

Problem:

- service code currently still mixes CRUD and Elasticsearch sync/projection concerns in places.

Design:

- search index is a projection
- updates flow through domain event/outbox
- reindex script remains for rebuilds
- event service should not directly know Elasticsearch client

Verification:

- CRUD path writes DB and outbox
- projector updates Elasticsearch
- reindex produces same searchable fields
- API falls back gracefully if search is unavailable

### P1.8 Promotion, Membership, And Marketing

Goal: rebuild promotion business correctly.

Problems:

- current promotion model is business-incomplete
- membership affects pricing/benefits
- organizer marketing tools are missing

Must model:

- campaign
- voucher/code
- discount rule
- eligibility rule
- usage limit
- funding owner: platform vs organizer
- membership tier
- benefit
- referral/affiliate if needed
- marketing segment

Organizer tools:

- audience segments
- promo code generation
- email/push campaign
- event reminder campaign
- conversion reports

Verification:

- promotion eligibility tests
- usage limit race tests
- ticket price calculation tests

### P1.9 Social, Review, Discovery, And Recommendation

Goal: make event discovery meaningful.

Problems:

- preferences/recommendations are thin
- review should happen after event attendance
- social discovery is undefined

Features:

- attendee interests
- follow organizer/artist/profile
- reviews after event only
- find nearby friends/attendees if privacy allows
- services around events
- traffic updates in addition to weather

Verification:

- privacy settings
- review eligibility
- recommendation explainability baseline
- location permission handling

### P1.10 Admin Web And AI Moderation

Goal: move admin to web and add moderation assistance.

Admin web is part of full Eventing web, not the whole web product.

AI use cases:

- spam event application detection
- suspicious organizer profile flagging
- duplicate event detection
- missing license/compliance document detection
- policy checklist assistant

Design:

- AI suggests, admin decides
- store AI score, reasons, model/version, prompt/version
- never auto-approve high-risk events without human review

Verification:

- moderation queue tests
- AI response schema validation
- audit trail for AI-assisted decisions
- prompt injection review for organizer-submitted content

### P1.11 Security, Ticket Safety, And Compliance

Goal: protect ticket/payment flows and business data.

Must cover:

- QR replay protection
- short-lived ticket validation tokens
- one-time check-in state transition
- payment webhook signature and idempotency
- least privilege RBAC
- audit log
- sensitive data redaction
- organizer business documents
- copyright/license documents
- platform policy around event legality

Verification gate:

- Functional check
- OWASP Top 10 scan
- Broken access-control review
- Injection review
- CSRF review for web
- SSRF review for external URLs/webhooks
- sensitive data exposure review
- dependency scan with npm audit and Trivy in CI
- attacker mindset review
- defense design notes

## Recommended Implementation Order

Do not implement all domains at once.

1. P1.0 Domain audit and target workflow diagrams.
2. P1.1 Auth/RBAC/staff foundation.
3. P1.2 Event lifecycle and organizer configuration.
4. P1.3 Ticketing seats/holds/concurrency.
5. P1.4 Payment/commission/payout.
6. P1.5 Notification platform with outbox/Observer pattern.
7. P1.7 Search projection cleanup.
8. P1.6 Redis cache and realtime sync.
9. P1.10 Web app foundation: attendee web + organizer web + admin web shell.
10. P1.8 Promotion/membership/marketing.
11. P1.9 Social/reviews/recommendations/services/traffic.
12. P1.11 Security/compliance hardening pass before final demo.

Reasoning:

- auth and roles affect every later feature
- event/ticket/payment are the core business transaction
- notification/search/cache should follow domain events, not drive the domain
- web UI should be built after backend contracts for core flows are clear

## Worker Split

Codex manager:

- keeps plan and progress docs
- assigns scoped worker tasks
- reviews diffs
- runs verification
- commits only passing slices

OpenCode worker:

- backend audits and implementation
- schema/repository/service refactors
- smoke tests
- API/BFF route work

AGY worker:

- Android/Kotlin changes
- future Next.js/shadcn web UI implementation if it handles frontend well
- UI flow implementation after backend contracts are stable

Security worker/pass:

- OWASP and dependency review
- payment/ticket threat modeling
- auth/RBAC review

## Research Notes

- BFF: create separate backend/API layer for each frontend interface when web/mobile/admin have different needs. Source: Microsoft Azure Architecture Center, Backends for Frontends pattern.
- Eventbrite reserved seating: seating chart maker, seating sections, ticket tiers. Use as reference for P1.3.
- Eventbrite timed entry: multiple time slots within a single day. Use as reference for recurring/timed-entry events.
- TicketBox organizer mobile: organizer app supports order/customer/check-in management, QR/barcode scanning, offline scan, manual ticket code check-in. Use as reference for organizer mobile scope.
- Redis cache-aside/write-through: use cache-aside for read-heavy endpoints and explicit invalidation through domain events.
- Keycloak/OIDC: use as reference model for clients, roles, sessions, token lifecycle, and standards-based auth.

## Definition Of Ready For Implementation

A P1 slice can start implementation only when it has:

- current behavior audit
- target behavior written
- route/API contract decision
- schema/data migration plan
- mobile/web compatibility decision
- verification commands
- rollback/deployment notes
- worker scope

## Immediate Next Step

Run P1.0 read-only domain audit:

- inspect backend modules and DB schema for event/ticket/payment/promotion/notification/auth
- inspect attendee and organizer app screens that depend on these flows
- write state diagrams and gap matrix
- do not implement code

