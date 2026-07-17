# AGGREGATE CATALOG — Eventing Platform V1

> **Document ID:** EV-AGG-001
> **Version:** 1.0
> **Status:** 🟡 DRAFT — Awaiting PO Approval
> **Last Updated:** 2026-07-10
> **Dependency:** 09-bounded-context-map.md (FROZEN), 10-context-boundary-review.md (FROZEN), All Phase 1 Documents (00–08)
> **Deliverable #:** Phase 2.2, Item 11
> **Purpose:** Discover and define all Aggregate Roots, internal structures, and ownership mappings for tactical DDD design.

---

## Document Purpose

This document enumerates every **Aggregate Root** within the 11 Frozen Bounded Contexts. For each aggregate it defines: purpose, business invariants, consistency boundary, internal structure (Root, Child Entities, Value Objects, Reference Objects), and cross-context dependencies.

This document is **implementation-independent**. It describes domain concepts, not technical constructs.

> [!CAUTION]
> Strategic DDD artifacts (09-bounded-context-map.md, 10-context-boundary-review.md) are FROZEN. This document operates strictly within frozen boundaries. No context boundary changes are permitted without a formal Change Request.

---

## PO Decisions Register

The following PO decisions were provided as inputs to aggregate discovery and are binding for this design:

| ID | Decision | Impact |
|---|---|---|
| PO-01 | V1 uses Section-Based Seating only | TicketType represents sections (VIP, Standard, etc.). No seat-level granularity. |
| PO-02 | Full Seat Map Editor deferred to V2+ | No SeatMap aggregate needed in V1. |
| PO-03 | Ticket Types represent seating sections | Capacity management at TicketType level only. |
| PO-04 | Capacity at TicketType level only | TicketType aggregate owns capacity counter. |
| PO-05 | RefundRequest is its own Aggregate in Refund BC | Separate aggregate, not embedded in Ticketing. |
| PO-06 | Refund BC owns refund workflow | RefundRequest lifecycle (SM-07) fully within Refund BC. |
| PO-07 | Ticketing–Refund via explicit context relationships | Cross-context communication per frozen relationship R-07/R-08. |
| PO-08 | Settlement granularity: one Settlement per Event | Settlement aggregate scoped per Event. |
| PO-09 | Org-level settlement periods deferred | No multi-event settlement aggregation in V1. |
| PO-10 | Waitlist is independent Aggregate in Ticketing | Not embedded in TicketType. |
| PO-11 | Waitlist lifecycle independent from TicketType | Separate lifecycle management. |
| PO-12 | One review per Attendee per Event | Aligns with BR-REV-03. |
| PO-13 | Submitted reviews may be edited | **Contradicts BR-REV-04 ("No Edit, Delete Only").** See OBS-01. |
| PO-14 | Reviews editable only after Event COMPLETED | New constraint. See OBS-02. |
| PO-15 | Reviews not editable if Org SUSPENDED or Event deleted | New constraint. See OBS-02. |
| PO-16 | Review edit window is configurable | New policy. See OBS-02. |
| PO-17 | Default review edit window: 30 days | Default Platform Policy. See OBS-02. |
| PO-18 | ONGOING Events continue on Org suspension | Aligns with BR-ORG-07 / OBS-16 from BCM. |
| PO-19 | Promotion stays in Pricing & Promotion BC | No boundary change. |
| PO-20 | Discount stacking disabled | Aligns with BR-PRM-03. |
| PO-21 | Pricing pipeline sequence confirmed | Base → Strategy → Promotion → Final. |

---

## Aggregate Summary

### Total: 21 Aggregates + 1 Domain Service

| # | Bounded Context | Aggregate Root | State Machine | Classification | Size |
|---|---|---|---|---|---|
| 1 | BC-01: Identity & Access | **User** | — | Generic | Small |
| 2 | BC-02: Organization | **Organization** | SM-05 | Supporting | Medium |
| 3 | BC-02: Organization | **Invitation** | SM-08 | Supporting | Small |
| 4 | BC-03: Event Management | **Event** | SM-01 | Core | Large |
| 5 | BC-04: Ticketing | **TicketType** | — | Core | Medium |
| 6 | BC-04: Ticketing | **Order** | SM-02 | Core | Medium |
| 7 | BC-04: Ticketing | **Ticket** | SM-03 | Core | Medium |
| 8 | BC-04: Ticketing | **Reservation** | SM-04 | Core | Small |
| 9 | BC-04: Ticketing | **Waitlist** | SM-09 | Core | Medium |
| 10 | BC-05: Pricing & Promotion | **PricingStrategy** | — | Core | Small |
| 11 | BC-05: Pricing & Promotion | **VoucherCode** | — | Core | Small |
| 12 | BC-05: Pricing & Promotion | **GroupDiscount** | — | Core | Small |
| 13 | BC-06: Payment | **Payment** | — | Generic | Medium |
| 14 | BC-07: Refund | **RefundRequest** | SM-07 | Supporting | Medium |
| 15 | BC-08: Settlement | **Settlement** | SM-06 | Supporting | Medium |
| 16 | BC-08: Settlement | **Payout** | SM-10 | Supporting | Small |
| 17 | BC-09: Reviews & Ratings | **Review** | — | Supporting | Small |
| 18 | BC-10: Engagement | **EngagementProfile** | — | Supporting | Small |
| 19 | BC-11: Platform Operations | **AuditLogEntry** | — | Generic | Small |
| 20 | BC-11: Platform Operations | **Notification** | — | Generic | Small |
| 21 | BC-11: Platform Operations | **GovernanceAction** | — | Generic | Small |

| Domain Service | Context | Purpose |
|---|---|---|
| **PricingPipeline** | BC-05: Pricing & Promotion | Stateless orchestration of price calculation across PricingStrategy, VoucherCode, and GroupDiscount aggregates |

### Aggregates per Context

| Context | Count | Aggregates |
|---|---|---|
| BC-01: Identity & Access | 1 | User |
| BC-02: Organization | 2 | Organization, Invitation |
| BC-03: Event Management | 1 | Event |
| BC-04: Ticketing | 5 | TicketType, Order, Ticket, Reservation, Waitlist |
| BC-05: Pricing & Promotion | 3 | PricingStrategy, VoucherCode, GroupDiscount |
| BC-06: Payment | 1 | Payment |
| BC-07: Refund | 1 | RefundRequest |
| BC-08: Settlement | 2 | Settlement, Payout |
| BC-09: Reviews & Ratings | 1 | Review |
| BC-10: Engagement | 1 | EngagementProfile |
| BC-11: Platform Operations | 3 | AuditLogEntry, Notification, GovernanceAction |
| **Total** | **21** | |

---

# PART I — AGGREGATE DEFINITIONS

---

## BC-01: Identity & Access (Generic)

### AGG-01: User

**Purpose:** Represents an individual's identity on the platform. Manages authentication credentials, profile information, and default role assignment.

**Business Responsibility:**
- User registration and identity verification
- Profile management
- Password management
- Account deactivation
- Default role assignment (Attendee on registration)

**Lifecycle Ownership:** No formal state machine. User exists from registration until deactivation. No complex state transitions.

**Business Invariants:**
- INV-01: Every registered User has a unique identity (email or platform ID)
- INV-02: New Users default to the Attendee role (BR-ORG-01)
- INV-03: A deactivated account cannot perform any platform operations

**Transaction Consistency Boundary:** User identity, credentials, and profile must be updated atomically. No cross-aggregate consistency requirements.

**Aggregate Size:** Small — single root entity with profile value objects, no child entities, 1 business rule.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **User** | Aggregate Root | Unique identity representing a platform participant |
| VO | EmailAddress | Value Object | Validated email format, uniqueness enforced |
| VO | UserProfile | Value Object | Display name, avatar, contact information |
| VO | AccountStatus | Value Object | ACTIVE / DEACTIVATED enum |
| PL | UserId | Published Language | Unique identifier consumed by all 10 other contexts |

**Cross-Context Dependencies:** None upstream. User is the identity provider for all contexts (R-01: Published Language).

**External References:** None. User is the root identity — it references no external aggregates.

---

## BC-02: Organization (Supporting)

### AGG-02: Organization

**Purpose:** Represents a business entity that creates and manages Events on the platform. Owns team composition, permission governance, and organizational lifecycle.

**Business Responsibility:**
- Organization registration and approval workflow
- Team member management (add, remove, reassign)
- Permission group governance (Owner, Manager, Staff)
- Organizational status enforcement (suspension/ban effects)
- Event ownership continuity

**Lifecycle Ownership:** SM-05 (Organization Lifecycle)
- States: PENDING_REVIEW → ACTIVE → SUSPENDED → BANNED
- 4 states, 7 transitions
- Terminal state: BANNED

**Business Invariants:**
- INV-04: Organization must be approved before becoming operational (BR-ORG-02)
- INV-05: Organization must always have at least one Owner (BR-ORG-04)
- INV-06: Owner cannot remove themselves without ownership transfer (BR-ORG-03)
- INV-07: An Event belongs to exactly one Organization; no co-hosting (BR-ORG-05)
- INV-08: Events created by removed team members remain with the Organization (BR-ORG-06)
- INV-09: SUSPENDED Organization cannot create events, sell tickets, or receive payouts (BR-ORG-07)
- INV-10: BANNED Organization triggers cancellation of all upcoming events and freezes payouts (BR-ORG-08)

**Transaction Consistency Boundary:** Organization status, team membership list, and permission group assignments must be consistent within a single transaction. Adding/removing a team member must atomically validate the "at least one Owner" invariant.

**Aggregate Size:** Medium — 7 rules, 4-state lifecycle, team members as child entities.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Organization** | Aggregate Root | Business entity with lifecycle and governance |
| Child | TeamMember | Entity | A User assigned to this Organization with a specific PermissionGroup. Has identity (UserId + OrgId). |
| VO | OrganizationProfile | Value Object | Name, description, contact, logo |
| VO | OrganizationStatus | Value Object | SM-05 state enum (PENDING_REVIEW, ACTIVE, SUSPENDED, BANNED) |
| VO | PermissionGroup | Value Object | Enum: Owner, Manager, Staff. Defines capability access. |
| Ref | UserRef | Reference Object | Points to User aggregate (BC-01) via UserId |
| PL | OrganizationId | Published Language | Consumed by Event Management (R-02) |
| PL | OrganizationStatus | Published Language | Consumed by Event Management (R-02), Platform Operations (R-16) |

**Cross-Context Dependencies:**
- Upstream: BC-01 Identity & Access (R-01 — User identity for team members)
- Upstream: BC-11 Platform Operations (R-15 — receives governance action commands)
- Downstream: BC-03 Event Management (R-02 — publishes Organization status)
- Downstream: BC-11 Platform Operations (R-16 — Conformist on Org status)

**External References:** UserRef (BC-01)

---

### AGG-03: Invitation

**Purpose:** Represents a pending team membership offer sent by an Organization Owner to a platform User.

**Business Responsibility:**
- Invitation creation and dispatch
- Acceptance processing (adds TeamMember to Organization)
- Expiration enforcement
- Revocation by Owner

**Lifecycle Ownership:** SM-08 (Invitation Lifecycle)
- States: PENDING → ACCEPTED → EXPIRED → REVOKED
- 4 states, 4 transitions
- Terminal states: ACCEPTED, EXPIRED, REVOKED

**Business Invariants:**
- INV-11: Only Organization Owner can send invitations (SM-08 guard)
- INV-12: Invitee must have an active platform account to accept (SM-08 T2 guard)
- INV-13: An expired or revoked invitation cannot be accepted

**Transaction Consistency Boundary:** Invitation status transitions are atomic. Acceptance triggers a side effect (adding TeamMember to Organization aggregate), which is an eventual consistency boundary between Invitation and Organization aggregates within BC-02.

**Aggregate Size:** Small — 4-state lifecycle, no child entities, straightforward transitions.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Invitation** | Aggregate Root | Time-limited team membership offer |
| VO | InvitationStatus | Value Object | SM-08 state enum |
| VO | PermissionGroup | Value Object | The permission group the invitee will receive upon acceptance |
| VO | ExpirationTimestamp | Value Object | When the invitation automatically expires |
| Ref | OrganizationRef | Reference Object | The Organization sending the invitation |
| Ref | InviterRef | Reference Object | The Owner who sent the invitation (UserRef) |
| Ref | InviteeRef | Reference Object | The target User (UserRef) |

**Cross-Context Dependencies:** None cross-context. Internal to BC-02.

**External References:** UserRef (BC-01) for inviter and invitee.

---

## BC-03: Event Management (Core)

### AGG-04: Event

**Purpose:** Represents a scheduled occasion organized by an Organization, published on the platform for Attendees to discover and attend. The most complex lifecycle in the system.

**Business Responsibility:**
- Event creation with content details (title, description, venue, schedule, category)
- Approval workflow (DRAFT → PENDING_REVIEW → APPROVED/REJECTED)
- Publication and visibility management
- Edit governance (minor pass-through, major re-approval, post-sale lock)
- Cancellation with downstream cascade trigger
- Completion signaling for settlement

**Lifecycle Ownership:** SM-01 (Event Lifecycle)
- States: DRAFT → PENDING_REVIEW → APPROVED / REJECTED → PUBLISHED → ONGOING → COMPLETED → CANCELLED → SUSPENDED
- 9 states, 14 transitions (most complex SM in the system)
- Terminal states: COMPLETED, CANCELLED

**Business Invariants:**
- INV-14: Event must be approved before public visibility (BR-EVT-01)
- INV-15: Major attributes locked after tickets sold (BR-EVT-02)
- INV-16: Minor edits do not trigger re-approval (BR-EVT-03)
- INV-17: Major edits with zero sales revert to PENDING_REVIEW (BR-EVT-04)
- INV-18: Event cancellation triggers auto-refund for all sold tickets (BR-EVT-05)
- INV-19: Only owning Org's authorized roles or Platform Admin can modify/cancel (BR-EVT-06)
- INV-20: Event belongs to exactly one Organization (BR-EVT-07)
- INV-21: Event must have at least one Ticket Type before submission (BR-EVT-08)

**Transaction Consistency Boundary:** Event status, content metadata, and venue/schedule are updated atomically. Cancellation triggers cross-context cascades (Refund, Settlement, Ticketing) that are **eventually consistent** — Event transitions to CANCELLED within its own boundary, and downstream effects propagate asynchronously.

**Aggregate Size:** Large — 8 rules, 9-state lifecycle, 14 transitions, multiple guard conditions.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Event** | Aggregate Root | Scheduled occasion with complex lifecycle |
| VO | EventStatus | Value Object | SM-01 state enum (9 states) |
| VO | Venue | Value Object | Name, address, location details (not a standalone entity in V1) |
| VO | EventCategory | Value Object | Classification label (flat list in V1) |
| VO | EventSchedule | Value Object | Start time, end time, timezone |
| VO | EventMetadata | Value Object | Title, description, banner, FAQ, contact info |
| Ref | OrganizationRef | Reference Object | The owning Organization (BC-02) |
| PL | EventId | Published Language | Consumed by Ticketing, Pricing, Refund, Settlement, Reviews, Engagement |
| PL | EventStatus | Published Language | Consumed by Ticketing (gates sales), Refund (cancellation trigger), Settlement (completion trigger) |

**Cross-Context Dependencies:**
- Upstream: BC-02 Organization (R-02 — gates event creation on Org status)
- Downstream: BC-04 Ticketing (R-03 — publishes Event status for sales gating)
- Downstream: BC-07 Refund (R-09 — Event Cancelled triggers auto-refund)
- Downstream: BC-08 Settlement (R-10 — Event Completed triggers settlement)

**External References:** OrganizationRef (BC-02)

---

## BC-04: Ticketing (Core) — Hub Context

> [!WARNING]
> Ticketing is the **hub context** with 5 aggregates and 7 cross-context relationships. This is the highest-complexity area of the system. Each aggregate is carefully scoped to maintain small consistency boundaries despite the overall context complexity.

### AGG-05: TicketType

**Purpose:** Defines a class of admission within an Event, representing a seating section (VIP, Standard, Economy, Standing per PO-01/03). Owns capacity management and sales window configuration.

**Business Responsibility:**
- Ticket type definition (name, description, section)
- Capacity management (total capacity, available count tracking)
- Sales window enforcement
- Base price configuration (input to Pricing Pipeline)
- Purchase limit definition

**Lifecycle Ownership:** No formal state machine. TicketType is created when Event is in DRAFT, and its availability is governed by the Sales Window and Event status. Implicitly transitions between AVAILABLE / SOLD_OUT based on capacity.

**Business Invariants:**
- INV-22: Tickets only sold for PUBLISHED Events (BR-TKT-01)
- INV-23: Available = Capacity − Issued − CheckedIn − ActiveReservations; cannot go negative (BR-TKT-02)
- INV-24: Sales only within configured Sales Window (BR-TKT-03)
- INV-25: Single active Pricing Strategy per TicketType (BR-PRC-03 — cross-context from Pricing)
- INV-26: Early Bird price must be lower than Base Price (BR-PRC-01 — enforced by Pricing, referenced here)

**Transaction Consistency Boundary:** Capacity counter updates must be atomic. When a Reservation is created, TicketType's available capacity must be decremented in the same consistency boundary. **This is the primary transactional hotspot.** See OBS-04.

**Aggregate Size:** Medium — critical capacity invariant, sales window logic, high write contention on capacity counter.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **TicketType** | Aggregate Root | Section-based admission class with capacity |
| VO | SalesWindow | Value Object | Start time, end time (independently configurable per BR-TKT-03) |
| VO | CapacityCounter | Value Object | Total capacity, current available count |
| VO | PurchaseLimit | Value Object | Max tickets per account per Event (default 10, BR-TKT-09) |
| VO | SectionName | Value Object | Section label (VIP, Standard, Economy, Standing) |
| SK | Money | Shared Kernel | Base Price amount (input to Pricing Pipeline) |
| Ref | EventRef | Reference Object | The Event this TicketType belongs to (BC-03) |

**Cross-Context Dependencies:**
- Upstream: BC-03 Event Management (R-03 — Event status gates ticket sales)
- Upstream: BC-05 Pricing & Promotion (R-04 — PricingStrategy configured per TicketType)
- Downstream: Consumed by Order, Ticket, Reservation, Waitlist within BC-04

**External References:** EventRef (BC-03)

---

### AGG-06: Order

**Purpose:** Represents a purchase transaction where an Attendee buys one or more Tickets for a single Event. The transactional unit of the purchase flow.

**Business Responsibility:**
- Multi-ticket purchase aggregation (single Event only)
- Price lock at purchase time
- Payment initiation and status tracking
- Purchase limit enforcement (per account per Event)

**Lifecycle Ownership:** SM-02 (Order Lifecycle)
- States: PENDING_PAYMENT → CONFIRMED → EXPIRED → CANCELLED
- 4 states, 4 transitions
- Terminal states: CONFIRMED, EXPIRED, CANCELLED

**Business Invariants:**
- INV-27: All tickets in an Order must be for the same Event (BR-TKT-07)
- INV-28: Price locked at purchase time; later changes do not affect existing tickets (BR-TKT-08)
- INV-29: Purchase limit per account per Event enforced at Order creation (BR-TKT-09)
- INV-30: CONFIRMED Order cannot transition to EXPIRED or CANCELLED (SM-02 constraint)
- INV-31: Group Discount requires quantity ≥ configured threshold (BR-PRM-02 — cross-context from Pricing)

**Transaction Consistency Boundary:** Order status, order lines, and total amount are updated atomically. Order confirmation triggers Ticket issuance (AGG-07), which is a within-context consistency concern managed by a domain process.

**Aggregate Size:** Medium — 4-state lifecycle, multi-line structure, price lock invariant.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Order** | Aggregate Root | Purchase transaction for a single Event |
| Child | OrderLine | Entity | One line per TicketType in the order, with quantity and locked price |
| VO | OrderStatus | Value Object | SM-02 state enum |
| VO | PriceLock | Value Object | Snapshot of Final Selling Price at purchase time (immutable after creation) |
| SK | Money | Shared Kernel | Order total, per-line amounts |
| Ref | EventRef | Reference Object | The Event being purchased (BC-03) |
| Ref | UserRef | Reference Object | The purchasing Attendee (BC-01) |
| Ref | TicketTypeRef | Reference Object | Per OrderLine — which TicketType (within BC-04) |

**Cross-Context Dependencies:**
- Upstream: BC-05 Pricing & Promotion (R-04 — Final Selling Price at checkout)
- Downstream: BC-06 Payment (R-05 — Order amount sent for payment processing)
- Upstream: BC-06 Payment (R-06 — Payment result callback updates Order status)

**External References:** EventRef (BC-03), UserRef (BC-01). TicketTypeRef is intra-context.

---

### AGG-07: Ticket

**Purpose:** Represents an individual unit of admission issued to an Attendee after successful payment. Each Ticket has an independent lifecycle for check-in, cancellation, and refund.

**Business Responsibility:**
- Individual admission tracking
- QR code uniqueness and single-scan enforcement
- Check-in processing
- Individual ticket cancellation
- Refund request initiation (sends to Refund BC)
- Non-transferability enforcement

**Lifecycle Ownership:** SM-03 (Ticket Lifecycle)
- States: ISSUED → CHECKED_IN → REFUNDED → CANCELLED
- 4 states, 5 transitions
- Terminal states: CHECKED_IN (normally), REFUNDED, CANCELLED

**Design Decision — Ticket as Separate Aggregate (not child of Order):**
- Ticket has its own independent state machine (SM-03) with transitions that happen long after Order is CONFIRMED
- Individual ticket operations: check-in (TKT-08), cancel (TKT-07), refund request (TKT-09)
- Check-in occurs one ticket at a time at the venue, independently of other tickets in the same Order
- Refund can be requested for individual tickets within a multi-ticket Order
- Loading the entire Order aggregate to check in a single Ticket violates the small-aggregate principle

**Business Invariants:**
- INV-32: Each QR code is unique and can be scanned at most once (BR-TKT-04)
- INV-33: Tickets are non-transferable; ownership cannot change after issuance (BR-TKT-06)
- INV-34: CHECKED_IN ticket cannot be refunded under normal circumstances (SM-03 constraint)
- INV-35: Event cancellation transitions ALL tickets (including CHECKED_IN) to CANCELLED (SM-03 T4/T5)
- INV-36: Price on ticket is permanently recorded from purchase time (BR-TKT-08)

**Transaction Consistency Boundary:** Ticket status transitions are atomic within the Ticket aggregate. Check-in is a single-aggregate operation. Event cancellation affecting all tickets is a bulk operation that must maintain per-ticket consistency — see OBS-05.

**Aggregate Size:** Medium — 4-state lifecycle, QR uniqueness, non-transferable constraint, individually addressable operations.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Ticket** | Aggregate Root | Individual unit of admission with independent lifecycle |
| VO | TicketStatus | Value Object | SM-03 state enum |
| VO | QRCode | Value Object | Unique, immutable, generated at issuance |
| VO | SeatSection | Value Object | Section name from TicketType (snapshot at issuance) |
| SK | Money | Shared Kernel | Locked ticket price (snapshot from PriceLock) |
| Ref | OrderRef | Reference Object | The Order that created this Ticket (within BC-04) |
| Ref | EventRef | Reference Object | The Event for admission (BC-03) |
| Ref | TicketTypeRef | Reference Object | The TicketType this Ticket was issued from (within BC-04) |
| Ref | UserRef | Reference Object | The Attendee who owns this Ticket (BC-01) |

**Cross-Context Dependencies:**
- Downstream: BC-07 Refund (R-07 — initiates refund request)
- Downstream: BC-09 Reviews & Ratings (R-13 — provides attendance verification)
- Downstream: BC-10 Engagement (R-14 — emits check-in/spending facts)

**External References:** EventRef (BC-03), UserRef (BC-01). OrderRef, TicketTypeRef are intra-context.

---

### AGG-08: Reservation

**Purpose:** Represents a temporary hold on ticket inventory during the payment window. Prevents overselling by decrementing available capacity while the Attendee completes payment.

**Business Responsibility:**
- Temporary capacity hold creation
- Automatic expiration enforcement
- Consumption upon successful payment (transitions to CONSUMED)
- Inventory release upon expiration or payment failure

**Lifecycle Ownership:** SM-04 (Reservation Lifecycle)
- States: ACTIVE → CONSUMED → EXPIRED
- 3 states, 3 transitions
- Terminal states: CONSUMED, EXPIRED

**Design Decision — Reservation as Separate Aggregate (not child of Order):**
- Reservation has its own independent state machine (SM-04)
- Expiration is timer-driven, independent of Order actions
- Multiple Reservations may exist per Order (one per TicketType)
- Reservation expiration must release TicketType capacity independently

**Business Invariants:**
- INV-37: Reservation TTL is configurable (default 15 minutes, BR-TKT-05)
- INV-38: ACTIVE Reservation must not persist beyond TTL — auto-expires
- INV-39: Reservation creation must atomically decrement TicketType capacity (see OBS-04)
- INV-40: Reservation expiration must atomically restore TicketType capacity

**Transaction Consistency Boundary:** Reservation status is atomic within itself. However, creation and expiration both require coordinated TicketType capacity updates — this is the **critical cross-aggregate consistency challenge** within BC-04. See OBS-04.

**Aggregate Size:** Small — 3-state lifecycle, simple transitions, but critical capacity coordination.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Reservation** | Aggregate Root | Temporary inventory hold during payment window |
| VO | ReservationStatus | Value Object | SM-04 state enum |
| VO | ReservedQuantity | Value Object | Number of tickets held per TicketType |
| VO | ExpirationTimestamp | Value Object | When reservation auto-expires (created_at + TTL) |
| Ref | TicketTypeRef | Reference Object | The TicketType inventory is held against (within BC-04) |
| Ref | OrderRef | Reference Object | The tentative Order (within BC-04) |
| Ref | UserRef | Reference Object | The Attendee holding the reservation (BC-01) |

**Cross-Context Dependencies:** None cross-context. Internal to BC-04.

**External References:** UserRef (BC-01). TicketTypeRef, OrderRef are intra-context.

---

### AGG-09: Waitlist

**Purpose:** Manages a FIFO queue of Attendees waiting for inventory to become available for a specific TicketType. Independent aggregate per PO-10/PO-11.

**Business Responsibility:**
- Waitlist entry creation (when TicketType is SOLD OUT)
- FIFO ordering enforcement
- Notification dispatch when inventory becomes available
- Time-limited purchase window management
- Automatic progression to next entry on window expiration

**Lifecycle Ownership:** SM-09 (Waitlist Entry Lifecycle)
- States: QUEUED → NOTIFIED → PURCHASED → EXPIRED
- 4 states, 5 transitions
- Terminal states: PURCHASED, EXPIRED

**Business Invariants:**
- INV-41: Waitlist is strictly FIFO — first-in, first-out ordering
- INV-42: Only the next entry in FIFO order receives notification when inventory appears
- INV-43: Notification purchase window is configurable (time-limited)
- INV-44: Expired notification auto-progresses to next QUEUED entry
- INV-45: Event cancellation expires all QUEUED entries (SM-09 T5)

**Transaction Consistency Boundary:** Waitlist ordering and entry status transitions must be atomic within the Waitlist aggregate. Entry progression (QUEUED → NOTIFIED) must maintain FIFO integrity. The Waitlist is scoped per TicketType.

**Aggregate Size:** Medium — FIFO ordering invariant, multi-entry management, configurable windows, potential growth concern.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Waitlist** | Aggregate Root | FIFO queue scoped to a single TicketType |
| Child | WaitlistEntry | Entity | Individual queue entry with status, position, and timestamps |
| VO | EntryStatus | Value Object | SM-09 state enum per entry |
| VO | QueuePosition | Value Object | FIFO position number |
| VO | NotificationWindow | Value Object | Configurable time window for purchase after notification |
| Ref | TicketTypeRef | Reference Object | The TicketType this waitlist serves (within BC-04) |
| Ref | EventRef | Reference Object | The Event (BC-03) |
| Ref | UserRef | Reference Object | Per entry — the waiting Attendee (BC-01) |

**Cross-Context Dependencies:** None cross-context. Internal to BC-04. Waitlist notification may trigger Notification in BC-11 (eventual).

**External References:** EventRef (BC-03), UserRef (BC-01). TicketTypeRef is intra-context.

---

## BC-05: Pricing & Promotion (Core)

### AGG-10: PricingStrategy

**Purpose:** Represents a time-based price adjustment applied to a TicketType. V1 supports Early Bird only (lower price during an initial period, auto-reverts to Base Price when period ends).

**Business Responsibility:**
- Early Bird pricing configuration (start date, end date, discounted price)
- Enforcement that Early Bird price < Base Price
- Single active strategy per TicketType enforcement
- Automatic reversion to Base Price when strategy period ends

**Lifecycle Ownership:** No formal state machine. Strategy is ACTIVE during its configured time window and INACTIVE outside it. Auto-revert is time-driven (BR-PRC-02).

**Business Invariants:**
- INV-46: Early Bird price must be strictly lower than Base Price (BR-PRC-01)
- INV-47: Auto-revert to Base Price when Early Bird period ends (BR-PRC-02)
- INV-48: At most one active Pricing Strategy per TicketType at any time (BR-PRC-03)
- INV-49: Price displayed is always the current effective price after strategy application (BR-PRC-04)

**Transaction Consistency Boundary:** PricingStrategy configuration is atomic. Strategy activation/deactivation is time-driven and does not require transactional coordination with other aggregates.

**Aggregate Size:** Small — time-window configuration, single invariant enforcement.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **PricingStrategy** | Aggregate Root | Time-based price adjustment for a TicketType |
| VO | StrategyType | Value Object | Enum: EARLY_BIRD (V1 only, extensible for future types) |
| VO | ActivePeriod | Value Object | Start date, end date for strategy effectiveness |
| VO | DiscountedPrice | Value Object | The adjusted price during the active period |
| SK | Money | Shared Kernel | Price amounts |
| Ref | TicketTypeRef | Reference Object | The TicketType this strategy applies to (BC-04) |

**Cross-Context Dependencies:**
- Downstream: BC-04 Ticketing (R-04 — provides price adjustment for checkout)

**External References:** TicketTypeRef (BC-04)

---

### AGG-11: VoucherCode

**Purpose:** Represents a code-based promotional discount created by an Organization for a specific Event. Applied at checkout when the Attendee enters a valid code.

**Business Responsibility:**
- Voucher creation with scope (per Event)
- Code validation at checkout
- Usage tracking and limit enforcement
- Validity period enforcement

**Lifecycle Ownership:** No formal state machine. Voucher is valid within its configured period and usage limits.

**Business Invariants:**
- INV-50: Voucher codes are per-Event, scoped to a specific Event (BR-PRM-01)
- INV-51: Only the owning Organization's Marketing Manager can create vouchers (BR-PRM-01)
- INV-52: No discount stacking — voucher cannot combine with Group Discount on same Order (BR-PRM-03)
- INV-53: When both voucher and group discount apply, Best Benefit Selection chooses the greater benefit (BR-PRM-04)

**Transaction Consistency Boundary:** Voucher usage count must be atomically incremented when applied. Concurrent applications of the same voucher code must not exceed usage limits.

**Aggregate Size:** Small — scope validation, usage tracking, code uniqueness.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **VoucherCode** | Aggregate Root | Code-based checkout discount for an Event |
| VO | CodeString | Value Object | The voucher code text (unique within Event scope) |
| VO | DiscountValue | Value Object | Percentage or absolute discount amount |
| VO | UsageLimit | Value Object | Maximum number of times this code can be used |
| VO | UsageCount | Value Object | Current number of successful applications |
| VO | ValidityPeriod | Value Object | Start and end dates for code validity |
| SK | Money | Shared Kernel | Discount amount calculation |
| Ref | EventRef | Reference Object | The Event this voucher is scoped to (BC-03) |
| Ref | OrganizationRef | Reference Object | The Organization that created this voucher (BC-02) |

**Cross-Context Dependencies:**
- Downstream: BC-04 Ticketing (R-04 — voucher discount applied at checkout via PricingPipeline)

**External References:** EventRef (BC-03), OrganizationRef (BC-02)

---

### AGG-12: GroupDiscount

**Purpose:** Represents a quantity-based automatic discount configured per Event. Applied automatically when an Order meets the minimum quantity threshold.

**Business Responsibility:**
- Threshold configuration (minimum quantity for discount)
- Automatic application at checkout when threshold met
- Discount calculation

**Lifecycle Ownership:** No formal state machine. GroupDiscount is a configuration that is evaluated at checkout time.

**Business Invariants:**
- INV-54: Group Discount requires Order quantity ≥ configured minimum threshold (BR-PRM-02)
- INV-55: No discount stacking — group discount cannot combine with voucher on same Order (BR-PRM-03)
- INV-56: Best Benefit Selection applies when both are eligible (BR-PRM-04)

**Transaction Consistency Boundary:** GroupDiscount is a read-only configuration at checkout time. No write contention.

**Aggregate Size:** Small — threshold configuration, no complex lifecycle.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **GroupDiscount** | Aggregate Root | Quantity-based automatic discount for an Event |
| VO | MinQuantityThreshold | Value Object | Minimum number of tickets required to activate |
| VO | DiscountValue | Value Object | Percentage or absolute discount amount |
| SK | Money | Shared Kernel | Discount calculation |
| Ref | EventRef | Reference Object | The Event this discount applies to (BC-03) |

**Cross-Context Dependencies:**
- Downstream: BC-04 Ticketing (R-04 — group discount evaluated at checkout via PricingPipeline)

**External References:** EventRef (BC-03)

---

### Domain Service: PricingPipeline

**Purpose:** Stateless orchestrator that calculates the Final Selling Price by sequentially applying: Base Price → PricingStrategy → Promotion (VoucherCode or GroupDiscount) → Final Selling Price.

**Business Responsibility:**
- Pipeline orchestration (BR-PRC-05)
- No-stacking enforcement (BR-PRM-03)
- Best Benefit Selection when multiple promotions eligible (BR-PRM-04)
- Price transparency — producing breakdown for display (BR-PRC-04)

**This is NOT an aggregate.** It has no state, no lifecycle, and no persistence. It coordinates the three aggregates (PricingStrategy, VoucherCode, GroupDiscount) to produce a calculation result.

**Rules Enforced:** BR-PRC-04 (Price Transparency), BR-PRC-05 (Pricing Pipeline sequence), BR-PRM-03 (No Discount Stacking), BR-PRM-04 (Best Benefit Selection)

> [!NOTE]
> These 4 rules are cross-aggregate rules enforced by the Domain Service rather than individual aggregates. See OBS-03 for the audit implication.

---

## BC-06: Payment (Generic)

### AGG-13: Payment

**Purpose:** Represents the financial transaction for an Order. Processes charges via the payment gateway, calculates commission, and maintains an immutable financial ledger.

**Business Responsibility:**
- Payment processing (charge initiation and result handling)
- Commission calculation (percentage of Final Selling Price)
- Immutable financial ledger maintenance
- Payment idempotency enforcement
- Payment gateway interaction (via ACL — anti-corruption layer)

**Lifecycle Ownership:** No formal state machine. Payment is created when Order initiates payment, and transitions through internal statuses (INITIATED → SUCCEEDED / FAILED). Not modeled as a formal SM because it's driven by external gateway callbacks.

**Business Invariants:**
- INV-57: Commission = Final Selling Price × platform rate (BR-PAY-01)
- INV-58: Commission calculated on discounted price, not Base Price (BR-PAY-08)
- INV-59: Refunds via original payment method only (BR-PAY-03)
- INV-60: All financial transactions are immutable append-only ledger entries (BR-PAY-04)
- INV-61: Duplicate payment attempts must not result in double-charging (BR-PAY-05)

**Transaction Consistency Boundary:** Payment status, ledger entries, and commission records must be consistent within a single transaction. Idempotency key must prevent duplicate charges atomically.

**Aggregate Size:** Medium — idempotency enforcement, immutable ledger, commission calculation, gateway ACL.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Payment** | Aggregate Root | Financial transaction for an Order |
| Child | LedgerEntry | Entity | Immutable financial record (append-only). Each entry has type, amount, timestamp. |
| VO | PaymentStatus | Value Object | INITIATED / SUCCEEDED / FAILED / REFUND_INITIATED / REFUND_COMPLETED |
| VO | Commission | Value Object | Calculated amount (rate × Final Selling Price) |
| VO | IdempotencyKey | Value Object | Unique key preventing duplicate charges |
| VO | GatewayTransactionId | Value Object | External reference from payment gateway (opaque to platform) |
| SK | Money | Shared Kernel | All monetary amounts |
| Ref | OrderRef | Reference Object | The Order being paid for (BC-04) |
| Ref | UserRef | Reference Object | The paying Attendee (BC-01) |

**Cross-Context Dependencies:**
- Upstream: BC-04 Ticketing (R-05 — receives Order amount for processing)
- Downstream: BC-04 Ticketing (R-06 — sends payment result callback)
- Downstream: BC-08 Settlement (R-11 — provides commission records and transaction totals)
- ACL Boundary: Payment Gateway (primary anti-corruption layer, FRZ-09)

**External References:** OrderRef (BC-04), UserRef (BC-01)

---

## BC-07: Refund (Supporting)

### AGG-14: RefundRequest

**Purpose:** Represents a request to return money for a purchased Ticket. Owns the refund eligibility evaluation, approval workflow, and cost allocation policy. Per PO-05, this is its own aggregate in the Refund BC.

**Business Responsibility:**
- Refund eligibility evaluation
- Manual approval workflow (normal refunds)
- Auto-refund processing (event cancellation)
- Cost allocation determination (Platform-fault, Organizer-fault, Force Majeure)
- Refund cutoff period enforcement
- Inventory restoration command (sent to Ticketing)

**Lifecycle Ownership:** SM-07 (Refund Request Lifecycle)
- States: PENDING_REVIEW → APPROVED → REJECTED
- 3 states, 3 transitions
- Terminal states: APPROVED, REJECTED

**Business Invariants:**
- INV-62: Individual refund requests require manual approval by Platform Finance (BR-REF-01)
- INV-63: Event cancellation triggers automatic 100% refund with no manual approval (BR-REF-02)
- INV-64: Platform-fault: Attendee 100% refund, Organizer 100% revenue, Platform bears loss (BR-REF-03)
- INV-65: Organizer-fault: Attendee 100% refund, Organizer no settlement, Platform waives commission (BR-REF-04)
- INV-66: Force majeure: Attendee 100% refund, Organizer no settlement, Platform waives commission (BR-REF-05)
- INV-67: Approved refund restores inventory and may trigger Waitlist notification (BR-REF-06)
- INV-68: Refund requests after cutoff (default 48h before event) require exceptional approval (BR-REF-07)
- INV-69: Post-event normal refunds not accepted (BR-REF-07)

**Transaction Consistency Boundary:** RefundRequest status and cost allocation are atomic within the aggregate. Inventory restoration (INV-67) is a cross-context command to Ticketing (R-08) — eventually consistent. Payment reversal is a cross-context command to Payment — eventually consistent.

**Aggregate Size:** Medium — 7 rules, cost allocation logic, cross-context coordination.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **RefundRequest** | Aggregate Root | Refund evaluation and approval unit |
| VO | RefundStatus | Value Object | SM-07 state enum |
| VO | RefundAmount | Value Object | Amount to be returned (Money) |
| VO | CostAllocation | Value Object | Enum: PLATFORM_FAULT / ORGANIZER_FAULT / FORCE_MAJEURE / ATTENDEE_REQUEST |
| VO | RefundReason | Value Object | Reason classification and description |
| VO | CutoffTimestamp | Value Object | Refund cutoff deadline (configurable, default 48h before event) |
| SK | Money | Shared Kernel | Refund amount calculation |
| Ref | TicketRef | Reference Object | The Ticket being refunded (BC-04) |
| Ref | OrderRef | Reference Object | The Order containing the Ticket (BC-04) |
| Ref | EventRef | Reference Object | The Event (BC-03) |
| Ref | UserRef | Reference Object | The requesting Attendee (BC-01) |

**Cross-Context Dependencies:**
- Upstream: BC-04 Ticketing (R-07 — receives refund request with ticket state)
- Downstream: BC-04 Ticketing (R-08 — sends inventory restoration command)
- Upstream: BC-03 Event Management (R-09 — Event cancellation triggers auto-refund)
- Downstream: BC-08 Settlement (R-12 — provides refund amounts for settlement deduction)

**External References:** TicketRef (BC-04), OrderRef (BC-04), EventRef (BC-03), UserRef (BC-01)

---

## BC-08: Settlement (Supporting)

### AGG-15: Settlement

**Purpose:** Represents the post-event financial aggregation for a single Event (PO-08). Calculates net amount by combining gross revenue, commission deductions, and refund adjustments.

**Business Responsibility:**
- Settlement calculation (Net = Gross − Commission − Refunds)
- Cooling period enforcement
- Settlement review workflow
- Dispute investigation support

**Lifecycle Ownership:** SM-06 (Settlement Lifecycle)
- States: PENDING_CALCULATION → PENDING_REVIEW → APPROVED → UNDER_REVIEW → PAID
- 5 states, 6 transitions
- Terminal state: PAID

**Business Invariants:**
- INV-70: Settlement only after Event COMPLETED and Cooling Period expired (BR-PAY-02, BR-PAY-06)
- INV-71: Cooling Period is configurable (default 7 days, BR-PAY-06)
- INV-72: Settlement formula: Net = Gross Revenue − Commission − Refunds
- INV-73: Commission calculated on discounted price (BR-PAY-08)

**Transaction Consistency Boundary:** Settlement amounts and status transitions are atomic. Gross revenue, commission totals, and refund deductions are aggregated from Payment (R-11) and Refund (R-12) contexts — these inputs are collected before calculation, not in real-time.

**Aggregate Size:** Medium — 5-state lifecycle, financial aggregation, cooling period logic.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Settlement** | Aggregate Root | Post-event financial aggregation per Event |
| Child | SettlementLineItem | Entity | Breakdown by TicketType showing gross, commission, refunds, net |
| VO | SettlementStatus | Value Object | SM-06 state enum |
| VO | CoolingPeriodEnd | Value Object | Timestamp when cooling period expires |
| VO | GrossRevenue | Value Object | Total ticket sales revenue |
| VO | TotalCommission | Value Object | Sum of all commission charges |
| VO | TotalRefunds | Value Object | Sum of all approved refund amounts |
| VO | NetAmount | Value Object | Final amount payable to Organization |
| SK | Money | Shared Kernel | All financial calculations |
| Ref | EventRef | Reference Object | The completed Event (BC-03) |
| Ref | OrganizationRef | Reference Object | The Organization receiving settlement (BC-02) |

**Cross-Context Dependencies:**
- Upstream: BC-03 Event Management (R-10 — Event Completed triggers settlement)
- Upstream: BC-06 Payment (R-11 — provides commission records and transaction totals)
- Upstream: BC-07 Refund (R-12 — provides refund amounts for deduction)

**External References:** EventRef (BC-03), OrganizationRef (BC-02)

---

### AGG-16: Payout

**Purpose:** Represents the transfer of settled funds from the platform to an Organization's bank account. Manual process in V1.

**Business Responsibility:**
- Payout initiation after Settlement approval
- Manual fund transfer tracking
- Payout freeze during Organization suspension

**Lifecycle Ownership:** SM-10 (Payout Lifecycle)
- States: PENDING → COMPLETED
- 2 states, 2 transitions
- Terminal state: COMPLETED

**Business Invariants:**
- INV-74: Payout only after Settlement is APPROVED (BR-PAY-02)
- INV-75: Payout is manually initiated by Platform Finance (BR-PAY-07)
- INV-76: Payouts frozen during Organization suspension (BR-ORG-07)
- INV-77: Already-completed Payouts are not clawed back on Organization ban (Charter 8.10)

**Transaction Consistency Boundary:** Payout status is atomic within itself. Settlement must be APPROVED before Payout can be created — this is a cross-aggregate precondition within BC-08.

**Aggregate Size:** Small — 2-state lifecycle, manual process.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Payout** | Aggregate Root | Fund transfer to Organization |
| VO | PayoutStatus | Value Object | SM-10 state enum |
| VO | PayoutAmount | Value Object | Amount transferred |
| SK | Money | Shared Kernel | Payout amount |
| Ref | SettlementRef | Reference Object | The approved Settlement (within BC-08) |
| Ref | OrganizationRef | Reference Object | The receiving Organization (BC-02) |

**Cross-Context Dependencies:** None additional beyond Settlement's upstream dependencies.

**External References:** OrganizationRef (BC-02). SettlementRef is intra-context.

---

## BC-09: Reviews & Ratings (Supporting)

### AGG-17: Review

**Purpose:** Represents an Attendee's feedback on a completed Event. One review per Attendee per Event (PO-12). Editable within a configurable window per PO decisions 13–17.

**Business Responsibility:**
- Review submission with eligibility verification
- One-per-Attendee-per-Event enforcement
- Review editing within configurable window (PO-13 through PO-17)
- Content moderation support (deletion by author or Platform Operations)

**Lifecycle Ownership:** No formal state machine. Review is SUBMITTED and may be EDITED within the edit window, or DELETED by author/Platform Ops.

**Business Invariants:**
- INV-78: Review only if Attendee has CHECKED_IN or confirmed Order for a COMPLETED Event (BR-REV-01)
- INV-79: Cancelled Events cannot be reviewed (BR-REV-02)
- INV-80: One review per Attendee per Event (BR-REV-03, PO-12)
- INV-81: Reviews may be edited within configurable edit window (PO-13, default 30 days per PO-17). **See OBS-01.**
- INV-82: Reviews editable only after Event reaches COMPLETED state (PO-14)
- INV-83: Reviews NOT editable if Organization is SUSPENDED or Event is deleted/unavailable (PO-15)
- INV-84: Platform Operations can remove reviews violating content policy (BR-REV-05)

**Transaction Consistency Boundary:** Review content and status are atomic within the aggregate. Eligibility checks (CHECKED_IN status, Event COMPLETED) require querying external contexts — these are read-only checks at submission time.

**Aggregate Size:** Small — simple structure, but eligibility and edit-window logic add complexity beyond basic CRUD.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Review** | Aggregate Root | Attendee feedback for a completed Event |
| VO | Rating | Value Object | Numeric rating (e.g., 1–5 scale) |
| VO | ReviewText | Value Object | Textual feedback content |
| VO | SubmissionTimestamp | Value Object | When the review was first submitted |
| VO | EditWindowEnd | Value Object | SubmissionTimestamp + configurable window (default 30 days) |
| VO | LastEditedTimestamp | Value Object | When the review was last edited (null if never edited) |
| Ref | EventRef | Reference Object | The reviewed Event (BC-03) |
| Ref | UserRef | Reference Object | The reviewing Attendee (BC-01) |

**Cross-Context Dependencies:**
- Upstream: BC-04 Ticketing (R-13 — queries attendance verification: CHECKED_IN or confirmed Order)

**External References:** EventRef (BC-03), UserRef (BC-01)

---

## BC-10: Engagement (Supporting)

### AGG-18: EngagementProfile

**Purpose:** Passively records attendance and spending data for an Attendee. Used for future analytics and personalization. No active business logic, no rules, no state machines.

**Business Responsibility:**
- Record attendance facts (which Events attended)
- Record spending amounts
- Provide engagement data for analytics queries

**Lifecycle Ownership:** No state machine. Append-only fact recording.

**Business Invariants:** None. This aggregate enforces no business rules. It is a passive data collector.

**Transaction Consistency Boundary:** Each fact append is independently consistent. No cross-aggregate coordination required.

**Aggregate Size:** Small — simplest aggregate in the system. Zero rules, zero state machines.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **EngagementProfile** | Aggregate Root | Per-Attendee engagement data container |
| Child | AttendanceRecord | Entity | Fact: Attendee attended Event X on Date Y |
| Child | SpendingRecord | Entity | Fact: Attendee spent Amount Z on Event X |
| SK | Money | Shared Kernel | Spending amounts |
| Ref | UserRef | Reference Object | The Attendee (BC-01) |
| Ref | EventRef | Reference Object | Per record — the Event attended/spent on (BC-03) |

**Cross-Context Dependencies:**
- Upstream: BC-04 Ticketing (R-14 — receives check-in and spending facts)

**External References:** UserRef (BC-01), EventRef (BC-03)

---

## BC-11: Platform Operations (Generic)

### AGG-19: AuditLogEntry

**Purpose:** Represents an immutable record of a state change on a critical platform entity. Append-only, no updates or deletes permitted.

**Business Responsibility:**
- Recording state changes on critical entities
- Ensuring audit trail completeness and immutability
- Maintaining required audit fields (Actor, Action, Timestamp, Entity, Previous/New state)

**Lifecycle Ownership:** No state machine. Entries are created and never modified.

**Business Invariants:**
- INV-85: State changes on Event, Order, Ticket, Payment, Payout, Organization, Refund, Settlement must be logged (BR-AUD-01)
- INV-86: Audit entries are immutable — no update or delete (BR-AUD-02)
- INV-87: Every entry must record: Actor, Action, Timestamp, Entity type, Entity ID, Previous state, New state (BR-AUD-03)

**Transaction Consistency Boundary:** Each entry is independently created and immutable. No consistency requirements with other aggregates beyond receiving the correct data.

**Aggregate Size:** Small — append-only, no lifecycle, no transitions.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **AuditLogEntry** | Aggregate Root | Immutable state change record |
| VO | AuditAction | Value Object | Description of the action performed |
| VO | AuditTimestamp | Value Object | When the action occurred |
| VO | EntityReference | Value Object | Type + ID of the affected entity |
| VO | StateTransition | Value Object | Previous state → New state |
| PL | AuditEventFormat | Published Language | Standardized format consumed by all contexts (R-17) |
| Ref | ActorRef | Reference Object | The User or system that performed the action (UserRef from BC-01) |

**Cross-Context Dependencies:**
- Upstream: All contexts (R-17 — receives state change signals in Published Language format)

**External References:** ActorRef (BC-01, UserRef)

---

### AGG-20: Notification

**Purpose:** Represents system-generated messages dispatched to Users. Covers both notification template management and individual notification delivery.

**Business Responsibility:**
- Notification template management (create, update, delete)
- Individual notification creation from template + data
- Notification dispatch tracking

**Lifecycle Ownership:** No formal state machine. Notifications are created and dispatched.

**Business Invariants:** No business rules from Phase 1 documents. Notification behavior is operationally defined.

**Transaction Consistency Boundary:** Each notification is independently created and dispatched. No cross-aggregate consistency requirements.

**Aggregate Size:** Small — template CRUD, message dispatch, no complex logic.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **Notification** | Aggregate Root | System-generated message |
| VO | NotificationChannel | Value Object | Delivery channel (push, email, SMS — platform-dependent) |
| VO | NotificationStatus | Value Object | PENDING / SENT / FAILED |
| VO | MessageContent | Value Object | Rendered message content |
| VO | TemplateReference | Value Object | Reference to the template used for generation |
| Ref | RecipientRef | Reference Object | The target User (BC-01) |

**Cross-Context Dependencies:** None upstream beyond receiving triggers from various contexts.

**External References:** RecipientRef (BC-01, UserRef)

---

### AGG-21: GovernanceAction

**Purpose:** Records platform governance decisions made by Platform Operations (suspend, lift suspension, ban, moderate content). Provides the formal decision record that triggers state changes in target contexts.

**Business Responsibility:**
- Recording governance decisions with reason and evidence
- Triggering suspension/lift/ban commands to Organization BC
- Triggering content moderation commands to Reviews & Ratings BC

**Lifecycle Ownership:** No formal state machine. GovernanceAction is a one-shot decision record.

**Business Invariants:** No specific business rules from Phase 1. Governance triggers are operational commands that invoke frozen rule enforcement in target contexts (BR-ORG-07, BR-ORG-08 enforced by Organization aggregate).

**Transaction Consistency Boundary:** GovernanceAction creation is atomic. Downstream effects (Organization status change, event impacts) are eventually consistent via cross-context commands (R-15).

**Aggregate Size:** Small — decision recording, command initiation.

#### Internal Structure

| Element | Name | Type | Description |
|---|---|---|---|
| Root | **GovernanceAction** | Aggregate Root | Platform governance decision record |
| VO | ActionType | Value Object | SUSPEND / LIFT_SUSPENSION / BAN / MODERATE_CONTENT |
| VO | Reason | Value Object | Justification for the governance action |
| VO | TargetEntity | Value Object | Type + ID of the target (Organization, Review, etc.) |
| VO | DecisionTimestamp | Value Object | When the decision was made |
| Ref | ActorRef | Reference Object | The Platform Admin who made the decision (UserRef from BC-01) |
| Ref | TargetOrganizationRef | Reference Object | Target Organization (BC-02, when applicable) |

**Cross-Context Dependencies:**
- Downstream: BC-02 Organization (R-15 — sends governance commands)

**External References:** ActorRef (BC-01), TargetOrganizationRef (BC-02)

---

# PART II — OWNERSHIP MATRIX

---

## 1. Glossary Term → Aggregate Mapping (48 / 48)

| # | Glossary Term | Domain | Owning Aggregate | Context |
|---|---|---|---|---|
| 1 | Guest | 1 | User | BC-01 |
| 2 | Attendee | 1 | User | BC-01 |
| 3 | Organization | 2 | Organization | BC-02 |
| 4 | Permission Group | 2 | Organization (VO) | BC-02 |
| 5 | Team Member | 2 | Organization (Child Entity) | BC-02 |
| 6 | Organization Suspension | 2 | Organization (State) | BC-02 |
| 7 | Ban | 2 | Organization (State) | BC-02 |
| 8 | Event | 3 | Event | BC-03 |
| 9 | Venue | 3 | Event (VO) | BC-03 |
| 10 | Event Category | 3 | Event (VO) | BC-03 |
| 11 | Ticket Type | 4 | TicketType | BC-04 |
| 12 | Ticket | 4 | Ticket | BC-04 |
| 13 | Capacity | 4 | TicketType (VO) | BC-04 |
| 14 | Sales Window | 4 | TicketType (VO) | BC-04 |
| 15 | Reservation | 4 | Reservation | BC-04 |
| 16 | Reservation Expiration Period | 4 | Reservation (VO) | BC-04 |
| 17 | Purchase Limit | 4 | TicketType (VO) | BC-04 |
| 18 | Check-in | 4 | Ticket (Transition) | BC-04 |
| 19 | QR Code | 4 | Ticket (VO) | BC-04 |
| 20 | Waitlist | 4 | Waitlist | BC-04 |
| 21 | Order | 4 | Order | BC-04 |
| 22 | Base Price | 5 | PricingStrategy (Input) | BC-05 |
| 23 | Pricing Strategy | 5 | PricingStrategy | BC-05 |
| 24 | Early Bird | 5 | PricingStrategy (VO) | BC-05 |
| 25 | Pricing Pipeline | 5 | PricingPipeline (DS) | BC-05 |
| 26 | Final Selling Price | 5 | PricingPipeline (Output) | BC-05 |
| 27 | Voucher Code | 5 | VoucherCode | BC-05 |
| 28 | Group Discount | 5 | GroupDiscount | BC-05 |
| 29 | Best Benefit Selection | 5 | PricingPipeline (DS Logic) | BC-05 |
| 30 | Promotion | 5 | VoucherCode (Umbrella) | BC-05 |
| 31 | Payment | 6 | Payment | BC-06 |
| 32 | Payment Gateway | 6 | Payment (ACL Boundary) | BC-06 |
| 33 | Commission | 6 | Payment (VO) | BC-06 |
| 34 | Refund | 7 | RefundRequest | BC-07 |
| 35 | Refund Cutoff Period | 7 | RefundRequest (VO) | BC-07 |
| 36 | Event Cancellation | 7 | RefundRequest (Trigger) | BC-07 |
| 37 | Force Majeure | 7 | RefundRequest (CostAllocation) | BC-07 |
| 38 | Settlement | 8 | Settlement | BC-08 |
| 39 | Cooling Period | 8 | Settlement (VO) | BC-08 |
| 40 | Payout | 8 | Payout | BC-08 |
| 41 | Review | 9 | Review | BC-09 |
| 42 | Engagement Tracking | 10 | EngagementProfile | BC-10 |
| 43 | Platform Admin | 11 | GovernanceAction (Actor) | BC-11 |
| 44 | Platform Operations | 11 | GovernanceAction (Role) | BC-11 |
| 45 | Platform Finance | 11 | GovernanceAction (Role) | BC-11 |
| 46 | Platform Support | 11 | GovernanceAction (Role) | BC-11 |
| 47 | Audit Log | 11 | AuditLogEntry | BC-11 |
| 48 | Notification | 11 | Notification | BC-11 |

**Coverage: 48 / 48 ✅ — No orphans, no duplicates.**

---

## 2. Capability → Aggregate Mapping (58 / 58)

| # | Capability ID | Name | Primary Aggregate | Context |
|---|---|---|---|---|
| 1 | USR-01 | Register User | User | BC-01 |
| 2 | USR-02 | Authenticate User | User | BC-01 |
| 3 | USR-03 | Manage User Profile | User | BC-01 |
| 4 | USR-04 | Reset Password | User | BC-01 |
| 5 | USR-05 | Deactivate Account | User | BC-01 |
| 6 | ORG-01 | Register Organization | Organization | BC-02 |
| 7 | ORG-02 | Approve Organization | Organization | BC-02 |
| 8 | ORG-03 | Invite Team Member | Invitation | BC-02 |
| 9 | ORG-04 | Accept Invitation | Invitation | BC-02 |
| 10 | ORG-05 | Remove Team Member | Organization | BC-02 |
| 11 | ORG-06 | Assign Permission Group | Organization | BC-02 |
| 12 | ORG-07 | Reassign Permission Group | Organization | BC-02 |
| 13 | ORG-08 | Update Organization Profile | Organization | BC-02 |
| 14 | ORG-09 | View Organization Dashboard | Organization | BC-02 |
| 15 | EVT-01 | Create Event | Event | BC-03 |
| 16 | EVT-02 | Edit Event (Minor) | Event | BC-03 |
| 17 | EVT-03 | Edit Event (Major) | Event | BC-03 |
| 18 | EVT-04 | Submit Event for Approval | Event | BC-03 |
| 19 | EVT-05 | Approve / Reject Event | Event | BC-03 |
| 20 | EVT-06 | Cancel Event | Event | BC-03 |
| 21 | EVT-07 | Complete Event | Event | BC-03 |
| 22 | EVT-08 | Browse / Search Events | Event | BC-03 |
| 23 | EVT-09 | View Event Details | Event | BC-03 |
| 24 | TKT-01 | Define Ticket Type | TicketType | BC-04 |
| 25 | TKT-02 | Configure Pricing | TicketType | BC-04 |
| 26 | TKT-03 | Reserve Tickets | Reservation | BC-04 |
| 27 | TKT-04 | Purchase Tickets | Order | BC-04 |
| 28 | TKT-05 | View My Tickets | Ticket | BC-04 |
| 29 | TKT-06 | Join Waitlist | Waitlist | BC-04 |
| 30 | TKT-07 | Cancel Ticket | Ticket | BC-04 |
| 31 | TKT-08 | Check In | Ticket | BC-04 |
| 32 | TKT-09 | Request Refund | Ticket | BC-04 |
| 33 | PRM-01 | Create Voucher Code | VoucherCode | BC-05 |
| 34 | PRM-02 | Configure Group Discount | GroupDiscount | BC-05 |
| 35 | PRM-03 | Apply Promotion at Checkout | PricingPipeline (DS) | BC-05 |
| 36 | PRM-04 | View Promotion Performance | VoucherCode | BC-05 |
| 37 | PAY-01 | Process Payment | Payment | BC-06 |
| 38 | PAY-02 | Handle Payment Status Update | Payment | BC-06 |
| 39 | PAY-03 | Calculate Commission | Payment | BC-06 |
| 40 | PAY-09 | View Transaction History | Payment | BC-06 |
| 41 | PAY-07 | Process Refund | RefundRequest | BC-07 |
| 42 | PAY-04 | Generate Settlement | Settlement | BC-08 |
| 43 | PAY-05 | Review Settlement | Settlement | BC-08 |
| 44 | PAY-06 | Process Payout | Payout | BC-08 |
| 45 | PAY-08 | View Revenue Report | Settlement | BC-08 |
| 46 | REV-01 | Submit Review | Review | BC-09 |
| 47 | REV-02 | View Reviews | Review | BC-09 |
| 48 | REV-03 | Moderate Reviews | Review | BC-09 |
| 49 | ENG-01 | Record Attendance | EngagementProfile | BC-10 |
| 50 | ENG-02 | Record Spending | EngagementProfile | BC-10 |
| 51 | ENG-03 | View Engagement Data | EngagementProfile | BC-10 |
| 52 | OPS-01 | Manage Notification Templates | Notification | BC-11 |
| 53 | OPS-02 | Send Notifications | Notification | BC-11 |
| 54 | OPS-03 | Maintain Audit Log | AuditLogEntry | BC-11 |
| 55 | OPS-04 | Moderate Content | GovernanceAction | BC-11 |
| 56 | OPS-05 | Suspend Organization | GovernanceAction | BC-11 |
| 57 | OPS-06 | Lift Suspension | GovernanceAction | BC-11 |
| 58 | OPS-07 | Ban Organization | GovernanceAction | BC-11 |

**Coverage: 58 / 58 ✅ — No orphans, no duplicates.**

---

## 3. Business Rule → Aggregate Mapping (57 / 57)

| # | Rule ID | Title | Enforcing Aggregate | Context |
|---|---|---|---|---|
| 1 | BR-ORG-01 | Default Attendee Role | User | BC-01 |
| 2 | BR-ORG-02 | Organization Approval Gate | Organization | BC-02 |
| 3 | BR-ORG-03 | Owner Self-Removal Prevention | Organization | BC-02 |
| 4 | BR-ORG-04 | Permission Group Assignment | Organization | BC-02 |
| 5 | BR-ORG-05 | Single Organization per Event | Organization | BC-02 |
| 6 | BR-ORG-06 | Event Ownership Continuity | Organization | BC-02 |
| 7 | BR-ORG-07 | Suspension Effects | Organization | BC-02 |
| 8 | BR-ORG-08 | Ban Effects | Organization | BC-02 |
| 9 | BR-EVT-01 | Event Approval Gate | Event | BC-03 |
| 10 | BR-EVT-02 | Post-Sale Edit Lock | Event | BC-03 |
| 11 | BR-EVT-03 | Minor Edit Pass-Through | Event | BC-03 |
| 12 | BR-EVT-04 | Major Edit Re-Approval | Event | BC-03 |
| 13 | BR-EVT-05 | Cancellation Auto-Refund | Event | BC-03 |
| 14 | BR-EVT-06 | Event Authorization | Event | BC-03 |
| 15 | BR-EVT-07 | Single Organization Ownership | Event | BC-03 |
| 16 | BR-EVT-08 | Minimum Ticket Type Requirement | Event | BC-03 |
| 17 | BR-TKT-01 | Published Event Gate | TicketType | BC-04 |
| 18 | BR-TKT-02 | Capacity Enforcement | TicketType | BC-04 |
| 19 | BR-TKT-03 | Configurable Sales Window | TicketType | BC-04 |
| 20 | BR-TKT-04 | Unique QR / Single Scan | Ticket | BC-04 |
| 21 | BR-TKT-05 | Reservation Expiration Period | Reservation | BC-04 |
| 22 | BR-TKT-06 | Non-Transferable Tickets | Ticket | BC-04 |
| 23 | BR-TKT-07 | Multi-Ticket Orders | Order | BC-04 |
| 24 | BR-TKT-08 | Price Lock at Purchase | Order | BC-04 |
| 25 | BR-TKT-09 | Purchase Limit | Order | BC-04 |
| 26 | BR-PRC-01 | Early Bird Definition | PricingStrategy | BC-05 |
| 27 | BR-PRC-02 | Auto-Revert to Base Price | PricingStrategy | BC-05 |
| 28 | BR-PRC-03 | Single Active Strategy | PricingStrategy | BC-05 |
| 29 | BR-PRC-04 | Price Transparency | PricingPipeline (DS) | BC-05 |
| 30 | BR-PRC-05 | Pricing Pipeline | PricingPipeline (DS) | BC-05 |
| 31 | BR-PRM-01 | Voucher Scope | VoucherCode | BC-05 |
| 32 | BR-PRM-02 | Group Discount Threshold | GroupDiscount | BC-05 |
| 33 | BR-PRM-03 | No Discount Stacking | PricingPipeline (DS) | BC-05 |
| 34 | BR-PRM-04 | Best Benefit Selection | PricingPipeline (DS) | BC-05 |
| 35 | BR-PAY-01 | Commission Model | Payment | BC-06 |
| 36 | BR-PAY-03 | Original Payment Method Refund | Payment | BC-06 |
| 37 | BR-PAY-04 | Immutable Financial Ledger | Payment | BC-06 |
| 38 | BR-PAY-05 | Payment Idempotency | Payment | BC-06 |
| 39 | BR-PAY-08 | Commission on Discounted Price | Payment | BC-06 |
| 40 | BR-REF-01 | Manual Refund Approval | RefundRequest | BC-07 |
| 41 | BR-REF-02 | Auto-Refund on Event Cancellation | RefundRequest | BC-07 |
| 42 | BR-REF-03 | Platform-Fault Cost Allocation | RefundRequest | BC-07 |
| 43 | BR-REF-04 | Organizer-Fault Cost Allocation | RefundRequest | BC-07 |
| 44 | BR-REF-05 | Force Majeure Cost Allocation | RefundRequest | BC-07 |
| 45 | BR-REF-06 | Inventory Restoration on Refund | RefundRequest | BC-07 |
| 46 | BR-REF-07 | Refund Cutoff Time | RefundRequest | BC-07 |
| 47 | BR-PAY-02 | Post-Event Payout Gate | Settlement | BC-08 |
| 48 | BR-PAY-06 | Settlement Cooling Period | Settlement | BC-08 |
| 49 | BR-PAY-07 | Manual Payout | Payout | BC-08 |
| 50 | BR-REV-01 | Review Eligibility | Review | BC-09 |
| 51 | BR-REV-02 | Cancelled Event Not Reviewable | Review | BC-09 |
| 52 | BR-REV-03 | One Review per Attendee per Event | Review | BC-09 |
| 53 | BR-REV-04 | No Edit, Delete Only | Review | BC-09 |
| 54 | BR-REV-05 | Content Moderation | Review | BC-09 |
| 55 | BR-AUD-01 | Mandatory State Change Logging | AuditLogEntry | BC-11 |
| 56 | BR-AUD-02 | Audit Immutability | AuditLogEntry | BC-11 |
| 57 | BR-AUD-03 | Audit Entry Requirements | AuditLogEntry | BC-11 |

**Coverage: 57 / 57 ✅ — No orphans, no duplicates.**

> [!IMPORTANT]
> **BR-REV-04 Conflict.** BR-REV-04 states "No Edit, Delete Only" but PO decisions 13–17 explicitly allow review editing within a 30-day window. The Review aggregate (AGG-17) is designed per PO decisions. BR-REV-04 requires a Phase 1 document amendment. See OBS-01.

---

## 4. State Machine → Aggregate Mapping (10 / 10)

| SM | Entity | Owning Aggregate | Context | States | Transitions |
|---|---|---|---|---|---|
| SM-01 | Event | Event | BC-03 | 9 | 14 |
| SM-02 | Order | Order | BC-04 | 4 | 4 |
| SM-03 | Ticket | Ticket | BC-04 | 4 | 5 |
| SM-04 | Reservation | Reservation | BC-04 | 3 | 3 |
| SM-05 | Organization | Organization | BC-02 | 4 | 7 |
| SM-06 | Settlement | Settlement | BC-08 | 5 | 6 |
| SM-07 | Refund Request | RefundRequest | BC-07 | 3 | 3 |
| SM-08 | Invitation | Invitation | BC-02 | 4 | 4 |
| SM-09 | Waitlist Entry | Waitlist | BC-04 | 4 | 5 |
| SM-10 | Payout | Payout | BC-08 | 2 | 2 |

**Coverage: 10 / 10 ✅ — Every state machine mapped to exactly one aggregate.**

---

## 5. Business Process → Primary Aggregate Mapping (10 / 10)

| BP | Process | Primary Aggregate | Participating Aggregates | Contexts Crossed |
|---|---|---|---|---|
| BP-01 | Organization Onboarding | Organization | User, Organization | BC-01, BC-02 |
| BP-02 | Team Management | Organization | Organization, Invitation | BC-02 |
| BP-03 | Event Creation & Approval | Event | Event, Organization (auth check) | BC-02, BC-03 |
| BP-04 | Ticket Purchase | Order | TicketType, Reservation, Order, Ticket, Payment | BC-03, BC-04, BC-05, BC-06 |
| BP-05 | Group Purchase | Order | TicketType, Reservation, Order, Ticket, GroupDiscount, Payment | BC-04, BC-05, BC-06 |
| BP-06 | Waitlist | Waitlist | Waitlist, TicketType | BC-04 |
| BP-07 | Check-in | Ticket | Ticket, EngagementProfile | BC-04, BC-10 |
| BP-08 | Refund | RefundRequest | RefundRequest, Ticket, TicketType, Payment | BC-04, BC-06, BC-07 |
| BP-09 | Settlement & Payout | Settlement | Settlement, Payout, Payment | BC-06, BC-07, BC-08 |
| BP-10 | Organization Suspension | GovernanceAction | GovernanceAction, Organization, Event | BC-02, BC-03, BC-11 |

**Coverage: 10 / 10 ✅ — Every process mapped with primary and participating aggregates.**

---

## 6. Bounded Context → Aggregate Mapping (11 / 11)

| Context | Aggregates | Count |
|---|---|---|
| BC-01: Identity & Access | User | 1 |
| BC-02: Organization | Organization, Invitation | 2 |
| BC-03: Event Management | Event | 1 |
| BC-04: Ticketing | TicketType, Order, Ticket, Reservation, Waitlist | 5 |
| BC-05: Pricing & Promotion | PricingStrategy, VoucherCode, GroupDiscount + PricingPipeline (DS) | 3+DS |
| BC-06: Payment | Payment | 1 |
| BC-07: Refund | RefundRequest | 1 |
| BC-08: Settlement | Settlement, Payout | 2 |
| BC-09: Reviews & Ratings | Review | 1 |
| BC-10: Engagement | EngagementProfile | 1 |
| BC-11: Platform Operations | AuditLogEntry, Notification, GovernanceAction | 3 |

**Coverage: 11 / 11 ✅ — Every context has at least one aggregate. No context is empty.**

---

# PART III — AGGREGATE QUALITY ASSESSMENT

---

## 1. Aggregate Size Assessment

| Category | Aggregates | Count | Concern |
|---|---|---|---|
| **Small** | User, Invitation, Reservation, PricingStrategy, VoucherCode, GroupDiscount, Payout, Review, EngagementProfile, AuditLogEntry, Notification, GovernanceAction | 12 | None — well-scoped |
| **Medium** | Organization, TicketType, Order, Ticket, Waitlist, Payment, RefundRequest, Settlement | 8 | Acceptable — monitor for growth |
| **Large** | Event | 1 | 9-state SM, 8 rules, 14 transitions. Monitor complexity. |

> [!NOTE]
> **Event (AGG-04)** is the only Large aggregate. Its complexity is inherent — Event has the most complex lifecycle in the system. However, it has no child entities (Venue and Category are VOs). The large surface is in state transitions, not in aggregate width. This is acceptable.

---

## 2. Transactional Hotspots

| Hotspot | Aggregates | Risk | Severity |
|---|---|---|---|
| **Capacity Counter** | TicketType | Multiple concurrent reservation attempts for the same TicketType will compete for the capacity counter. High write contention during popular event sales. | 🔴 **High** |
| **Voucher Usage Counter** | VoucherCode | Concurrent voucher code applications could create contention on usage count. | 🟡 Medium |
| **Waitlist Progression** | Waitlist | When inventory becomes available, waitlist progression must atomically select the next FIFO entry. Moderate contention if many entries expire simultaneously. | 🟡 Medium |
| **Order Confirmation** | Order | Payment callbacks arriving simultaneously for different orders are independent (different aggregate instances). Low contention. | 🟢 Low |

---

## 3. High Write Contention Areas

| Area | Aggregate | Pattern | Mitigation Consideration |
|---|---|---|---|
| Popular event ticket sales | TicketType.CapacityCounter | Many Attendees reserving simultaneously | Optimistic concurrency or reservation queue. Deferred to implementation design. |
| Flash sale voucher redemption | VoucherCode.UsageCount | Many Attendees applying same code | Atomic increment with limit check. Deferred to implementation design. |

---

## 4. Future Split Candidates

| Aggregate | Current Size | Split Trigger | Potential Split |
|---|---|---|---|
| **Ticketing Context (BC-04)** | 5 aggregates | V2 Seat Selection (seat maps, seat holds, adjacency) | Split BC-04 into: Inventory Management (TicketType, Capacity, Seats) + Purchase Flow (Order, Ticket, Reservation) + Venue Operations (SeatMap, Section) |
| **Event (AGG-04)** | 1 large aggregate | If approval workflow becomes more complex (multi-stage approval, category-specific rules) | Split into: EventContent + EventApproval |
| **Waitlist (AGG-09)** | Medium | If waitlists grow very large (10k+ entries per TicketType) | Consider WaitlistEntry as independent aggregate with Waitlist as ordering index |

---

## 5. Aggregate Coupling Assessment

| Coupling | From → To | Type | Risk |
|---|---|---|---|
| TicketType ↔ Reservation | Within BC-04 | **Strong** — capacity counter shared | 🔴 Critical design challenge. See OBS-04. |
| Order → Ticket | Within BC-04 | **Medium** — Order confirmation creates Tickets | Manageable via within-context domain process. |
| Reservation → Order | Within BC-04 | **Medium** — Reservation consumed on Order confirmation | Manageable via within-context domain process. |
| RefundRequest → Ticket | BC-07 → BC-04 | **Weak** — cross-context reference only | Clean. Uses frozen relationship R-07. |
| Settlement → Payment | BC-08 → BC-06 | **Weak** — reads financial data | Clean. Uses frozen relationship R-11. |
| GovernanceAction → Organization | BC-11 → BC-02 | **Weak** — command dispatch | Clean. Uses frozen relationship R-15. |

---

## 6. Eventual Consistency Candidates

| Interaction | From → To | Strong or Eventual? | Rationale |
|---|---|---|---|
| Order confirmation → Ticket issuance | Order → Ticket | **Strong** (within BC-04) | Tickets must be issued atomically with Order confirmation. Same context. |
| Reservation creation → Capacity decrement | Reservation → TicketType | **Strong** (within BC-04) | Capacity must reflect reservation immediately to prevent overselling. See OBS-04. |
| Payment callback → Order status | Payment → Order | **Eventual** (BC-06 → BC-04) | Cross-context. Payment notifies Ticketing asynchronously. |
| Event cancellation → Auto-refund | Event → RefundRequest | **Eventual** (BC-03 → BC-07) | Cross-context cascade. Event transitions first, refunds follow. |
| Event completion → Settlement creation | Event → Settlement | **Eventual** (BC-03 → BC-08) | Cross-context trigger. Settlement created asynchronously. |
| Refund approval → Inventory restoration | RefundRequest → TicketType | **Eventual** (BC-07 → BC-04) | Cross-context command. Partnership pattern (R-07/R-08). |
| Refund approval → Payment reversal | RefundRequest → Payment | **Eventual** (BC-07 → BC-06) | Cross-context command. |
| Governance action → Org suspension | GovernanceAction → Organization | **Eventual** (BC-11 → BC-02) | Cross-context command. |
| Invitation acceptance → Team membership | Invitation → Organization | **Eventual** (within BC-02) | Intra-context but cross-aggregate. Acceptable. |
| Check-in → Engagement recording | Ticket → EngagementProfile | **Eventual** (BC-04 → BC-10) | Fire-and-forget fact recording. |

---

# PART IV — CONSISTENCY AUDIT

---

## Audit Execution Summary

| Check | Expected | Actual | Status |
|---|---|---|---|
| Glossary terms mapped | 48 | 48 | ✅ |
| Capabilities mapped | 58 | 58 | ✅ |
| Business rules mapped | 57 | 57 | ✅ |
| Business processes mapped | 10 | 10 | ✅ |
| State machines mapped | 10 | 10 | ✅ |
| Bounded contexts covered | 11 | 11 | ✅ |
| Orphan capabilities | 0 | 0 | ✅ |
| Orphan rules | 0 | 0 | ✅ |
| Orphan glossary terms | 0 | 0 | ✅ |
| Duplicate ownership (terms) | 0 | 0 | ✅ |
| Duplicate ownership (capabilities) | 0 | 0 | ✅ |
| Duplicate ownership (rules) | 0 | 0 | ✅ |
| Aggregate boundary conflicts | 0 | 0 | ✅ |
| Ownership ambiguity | 0 | 0 | ✅ |

### Cross-Verification Details

**Glossary duplicates check:** Each of 48 terms appears in exactly one row of the Glossary → Aggregate mapping table. Verified no term appears in multiple aggregates.

**Capability duplicates check:** Each of 58 capabilities appears in exactly one row of the Capability → Aggregate mapping table. Verified no capability is assigned to multiple aggregates.

**Rule duplicates check:** Each of 57 rules appears in exactly one row of the Rule → Aggregate mapping table. Verified no rule is enforced by multiple aggregates.

**Context coverage check:** All 11 bounded contexts have at least one aggregate. No empty context.

**State machine alignment check:** All 10 state machines map 1:1 to an aggregate root. No state machine is shared across aggregates.

**Process coverage check:** All 10 processes have a primary aggregate and list all participating aggregates. No process is unaccounted for.

### Domain Service Rule Ownership Note

4 business rules (BR-PRC-04, BR-PRC-05, BR-PRM-03, BR-PRM-04) are mapped to the PricingPipeline **Domain Service** rather than an aggregate. This is architecturally correct — these rules govern cross-aggregate coordination within BC-05. However, strictly speaking, a Domain Service is not an aggregate and cannot "own" a rule in the DDD purist sense. See OBS-03.

---

## Audit Verdict: ✅ PASS

All 183 business artifacts (48 terms + 58 capabilities + 57 rules + 10 processes + 10 state machines) are mapped to exactly one aggregate with no orphans, no duplicates, and no ownership conflicts.

---

# PART V — OPEN OBSERVATIONS

These observations require PO decisions or Phase 1 document amendments. They are **not** design decisions — they are gaps or conflicts discovered during aggregate analysis.

---

### OBS-01: BR-REV-04 Contradicts PO Decisions on Review Editing

**Severity:** 🔴 High — Phase 1 document inconsistency

**Finding:** BR-REV-04 in [02-business-rules-specification.md](file:///D:/01_university/year3/semester-5/mobile/final/agent-workflow/knowledge/project/02-business-rules-specification.md) states: *"Reviews cannot be edited after posting; can only be deleted by the author or Platform Operations."*

PO decisions 13–17 explicitly state:
- Reviews may be edited (PO-13)
- Within a configurable edit window (PO-16, default 30 days, PO-17)
- Only after Event COMPLETED (PO-14)
- Not if Org SUSPENDED or Event deleted (PO-15)

**Impact:** The Review aggregate (AGG-17) is designed per PO decisions (editable within window). BR-REV-04 in the Phase 1 document needs amendment to reflect the updated policy.

**Required Action:** Amend BR-REV-04 text in 02-business-rules-specification.md or create a superseding rule. Update 03-business-rule-traceability-matrix.md accordingly.

---

### OBS-02: New Business Rules Required for Review Editing

**Severity:** 🟡 Medium — Phase 1 document gap

**Finding:** PO decisions 14–17 introduce 4 new business constraints that do not exist in Phase 1 documents:
1. Reviews editable only after Event COMPLETED (PO-14)
2. Reviews not editable if Organization SUSPENDED (PO-15)
3. Reviews not editable if Event deleted/unavailable (PO-15)
4. Review edit window configurable, default 30 days (PO-16/17)

**Impact:** These should become formal business rules (e.g., BR-REV-06, BR-REV-07, BR-REV-08, BR-REV-09) to maintain Phase 1 document authority.

**Required Action:** Create new BR-REV rules in 02-business-rules-specification.md. Update traceability matrix. Update glossary if "Review Edit Window" should be a defined term.

---

### OBS-03: Domain Service Rules Lack Aggregate Ownership

**Severity:** 🟢 Low — Architectural observation

**Finding:** 4 business rules (BR-PRC-04, BR-PRC-05, BR-PRM-03, BR-PRM-04) are enforced by the PricingPipeline Domain Service, which is stateless and has no aggregate identity. In strict DDD, rules are owned by aggregates.

**Impact:** These rules are correctly enforced within BC-05. The Domain Service pattern is architecturally valid. This is not a defect — it is an observation for audit transparency.

**Recommendation:** Accept as-is. Document that PricingPipeline DS enforces cross-aggregate rules within BC-05. No PO action needed.

---

### OBS-04: TicketType–Reservation Capacity Coordination (Critical Design Challenge)

**Severity:** 🔴 High — Transactional hotspot

**Finding:** Reservation creation (AGG-08) must atomically decrement TicketType (AGG-05) capacity counter. Reservation expiration must atomically restore capacity. These are two separate aggregates that share a critical consistency requirement.

**Design Options (for later tactical phases):**
1. **Saga/Process Manager:** Coordinate capacity decrement + reservation creation via a domain process within BC-04
2. **Domain Service with transaction scope:** A within-context Domain Service that loads both aggregates in a single unit of work
3. **Capacity as separate aggregate:** Extract CapacityCounter as its own aggregate to reduce contention surface

**Impact:** This is the **primary architectural risk** in the system. Incorrect handling will cause overselling or inventory leaks.

**Required Action:** PO awareness. Detailed design in subsequent tactical phases (command/event design).

---

### OBS-05: Event Cancellation Cascade Scope

**Severity:** 🟡 Medium — Multi-aggregate, multi-context cascade

**Finding:** When Event transitions to CANCELLED (SM-01 T10/T11):
1. All ISSUED tickets → CANCELLED (SM-03 T4) — Ticket aggregate, bulk operation
2. All CHECKED_IN tickets → CANCELLED (SM-03 T5) — Ticket aggregate, bulk operation
3. Auto-refund for all sold tickets (BR-EVT-05) — RefundRequest aggregate, BC-07
4. Inventory restoration (BR-REF-06) — TicketType aggregate
5. Settlement impact — Settlement aggregate, BC-08
6. Waitlist entries → EXPIRED (SM-09 T5) — Waitlist aggregate

This cascade touches **6 aggregates across 4 bounded contexts**. It requires careful orchestration in later tactical phases.

**Required Action:** Design a cancellation orchestration process in the command/event design phase. The cascade must be eventually consistent across context boundaries.

---

### OBS-06: Purchase Limit Cross-Aggregate Enforcement

**Severity:** 🟢 Low — Query concern

**Finding:** BR-TKT-09 (Purchase Limit) is per-account-per-Event. Enforcing this at Order creation requires querying ALL existing Orders for the same User + Event combination. This crosses Order aggregate boundaries (you need to check OTHER Order instances).

**Impact:** Enforcement may require a read model or aggregate-level query service. This is a common DDD pattern (using a Domain Service with a read model for enforcement).

**Required Action:** Design the enforcement mechanism in the command design phase. No PO action needed.

---

### OBS-07: Waitlist Growth Concern

**Severity:** 🟢 Low — Future scaling

**Finding:** Waitlist aggregate (AGG-09) contains all WaitlistEntry child entities for a single TicketType. For extremely popular events, this aggregate could grow large (thousands of entries).

**Impact:** V1 is unlikely to hit this limit (section-based seating with reasonable capacities). If V2 supports larger events, WaitlistEntry may need to become an independent aggregate with a separate ordering index.

**Required Action:** Monitor in V1. Reassess in V2 planning.

---

### OBS-08: Invitation–Organization Eventual Consistency Within BC-02

**Severity:** 🟢 Low — Intra-context coordination

**Finding:** When an Invitation transitions to ACCEPTED (SM-08 T2), a TeamMember must be added to the Organization aggregate. These are separate aggregates within the same bounded context (BC-02). This requires either:
- A within-context domain process to coordinate the two aggregates
- Direct cross-aggregate call within the same transaction scope

**Impact:** Low risk — both aggregates are in the same context. Standard intra-context coordination.

**Required Action:** Design the coordination mechanism in the command design phase. No PO action needed.

---

## Observation Summary

| ID | Severity | Category | PO Action Required? |
|---|---|---|---|
| OBS-01 | 🔴 High | Phase 1 document inconsistency | **Yes** — Amend BR-REV-04 |
| OBS-02 | 🟡 Medium | Phase 1 document gap | **Yes** — Create new BR-REV rules |
| OBS-03 | 🟢 Low | Architectural observation | No |
| OBS-04 | 🔴 High | Transactional hotspot | Awareness only — design later |
| OBS-05 | 🟡 Medium | Multi-context cascade | Awareness only — design later |
| OBS-06 | 🟢 Low | Query concern | No |
| OBS-07 | 🟢 Low | Future scaling | No |
| OBS-08 | 🟢 Low | Intra-context coordination | No |

---

## Summary Statistics

| Metric | Value |
|---|---|
| **Total Aggregates** | 21 |
| **Domain Services** | 1 (PricingPipeline) |
| **Business Invariants Identified** | 87 (INV-01 through INV-87) |
| **Glossary Terms Mapped** | 48 / 48 |
| **Capabilities Mapped** | 58 / 58 |
| **Business Rules Mapped** | 57 / 57 |
| **Processes Mapped** | 10 / 10 |
| **State Machines Mapped** | 10 / 10 |
| **Bounded Contexts Covered** | 11 / 11 |
| **Transactional Hotspots** | 2 (TicketType capacity, VoucherCode usage) |
| **Future Split Candidates** | 3 (Ticketing context, Event aggregate, Waitlist aggregate) |
| **Open Observations** | 8 (2 High, 2 Medium, 4 Low) |
| **PO Actions Required** | 2 (OBS-01 amend BR-REV-04, OBS-02 create new rules) |
| **Consistency Audit** | ✅ PASS |

---

> **End of Aggregate Catalog V1.0**
