# PROJECT CHARTER — Eventing Platform V1

> **Document ID:** EV-PC-001
> **Version:** 2.3 (Baselined)
> **Status:** ✅ APPROVED — All Open Questions Resolved
> **Last Updated:** 2026-07-06
> **Supersedes:** Version 2.2
>
> **Governing Document:** Project Directive dated 2026-06-29.
> All decisions traceable to the directive or explicitly approved by the Product Owner.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Design Philosophy](#2-design-philosophy)
3. [Business Model](#3-business-model)
4. [Scope Boundaries](#4-scope-boundaries)
5. [Actor Model](#5-actor-model)
6. [Business Glossary](#6-business-glossary)
7. [Business Capabilities](#7-business-capabilities)
8. [Core Business Processes](#8-core-business-processes)
9. [Business Rules](#9-business-rules)
10. [Architectural Decision Records](#10-architectural-decision-records)
11. [Open Questions](#11-open-questions)
12. [Feature Proposal Template](#12-feature-proposal-template)
13. [Deliverable Roadmap](#13-deliverable-roadmap)

---

## 1. Project Overview

### 1.1. Background

Complete redesign of an existing Event Management & Ticketing Platform. The current system has been audited and contains significant design flaws. This redesign is **not constrained** by the existing implementation.

### 1.2. Project Goal

A professional software engineering portfolio demonstrating:

- Business Analysis & Process Modeling
- Domain-Driven Design
- Database Design
- Backend Architecture
- Enterprise Software Engineering practices

### 1.3. Design Principles

| Principle | Description |
|---|---|
| **Depth over breadth** | Fewer features, designed thoroughly |
| **Business justification required** | Every feature must have a clear business reason |
| **No over-engineering** | No feature "just in case" |
| **Ask, don't assume** | Missing requirements → ask PO, don't infer |
| **Business drives technology** | Database and API serve business, never the reverse |

---

## 2. Design Philosophy

Strict sequence. Never skip a step.

```
Business Understanding
  → Business Capabilities
    → Business Processes
      → Business Rules
        → State Machines
          → Domain Discovery
            → Domain Model
              → Database Design
                → API Design
                  → Implementation
```

> [!CAUTION]
> The database must **never** drive business decisions. If business and code conflict, business wins.

---

## 3. Business Model

### 3.1. Primary Model: Marketplace

Platform acts as intermediary between Organizations (event creators) and Attendees (ticket buyers). Revenue from commission fees on successful ticket sales.

```
Attendee ──[pays]──→ Platform ──[net amount]──→ Organization
                         │
                    Commission Fee
                    (Platform Revenue)
```

### 3.2. Revenue Streams

| Stream | V1 | Future |
|---|---|---|
| Commission fee per ticket sale | ✅ | ✅ |
| Subscription plans | ❌ | Planned |
| Freemium / premium features | ❌ | Planned |
| Featured event placement | ❌ | Potential |

### 3.3. Core Financial Capabilities

Ticket Sales → Payment Processing → Commission Calculation → Settlement (with cooling period) → Manual Payout → Refund (when applicable)

---

## 4. Scope Boundaries

### 4.1. IN SCOPE (V1)

| # | Capability | Business Justification |
|---|---|---|
| 1 | Event Lifecycle Management | Core — Organizations create, manage, publish events |
| 2 | Section-Based Seating (VIP, Standard, etc.) | Core — Ticket sections with capacity and pricing |
| 3 | Ticket Sales with Configurable Sales Window | Core — Primary revenue source |
| 4 | Ticket Pricing Strategies (incl. Early Bird) | Core — Time-based pricing is standard practice |
| 5 | Group Purchase (Leader Pays All) | High — Common real-world scenario |
| 6 | Waitlist | High — Captures demand when sold out |
| 7 | Payment Processing (gateway-agnostic, V1: ZaloPay) | Core — No payment = no marketplace |
| 8 | Promotions (Voucher Code, Group Discount) | High — Standard marketplace capability |
| 9 | Commission & Settlement (with cooling period) | Core — Platform business model |
| 10 | Organizer Payout (Manual) | Core — Organization must receive revenue |
| 11 | Refund Processing (Manual Approval) | Core — Consumer protection |
| 12 | Engagement Tracking (attendance, spending history) | High — Data foundation for future membership ranks |
| 13 | Event Discovery (search, filter, browse) | Core — Attendees must find events |
| 14 | Event Check-in (QR Code) | Core — Attendance verification |
| 15 | Organization Management (multi-role teams) | Core — Enterprise org structure |
| 16 | Event Approval Workflow | Core — Platform quality control |
| 17 | Notification System + Template Management | Core — Transactional communications |
| 18 | Audit Log | Core — Enterprise accountability |
| 19 | Revenue Reporting | Core — Financial visibility |
| 20 | Event Reviews & Ratings | High — Trust-building |

### 4.2. OUT OF SCOPE (V1)

| # | Capability | Reason | Deferred To |
|---|---|---|---|
| 1 | Group Purchase — Individual Pay Sessions | Disproportionate complexity (ADR-011) | V2 |
| 2 | Membership Ranks (Bronze → Diamond) | No tangible benefit in V1 (ADR-012) | V2 |
| 3 | Loyalty Point System | No business justification without ranks | V2+ |
| 4 | Corporate event features | Different business model | V2+ |
| 5 | Subscription/SaaS billing | V1 uses commission only | V2+ |
| 6 | Multi-currency, multi-language | V1 = single region | V2 |
| 7 | Invoicing & tax compliance | Legal complexity | V2+ |
| 8 | Live streaming / virtual events | Different domain | V2+ |
| 9 | In-app chat / messaging | Not core marketplace | V2+ |
| 10 | Advanced BI dashboards | Basic reporting sufficient | V2 |
| 11 | Venue as independent domain | Venue = Event attribute in V1 | V2+ |
| 12 | Ticket transfer | Simplifies lifecycle (ADR-007) | V2 |
| 13 | Custom seat map editor | Section-based only (ADR-001) | V2+ |
| 14 | Dynamic pricing / flash sales | Pricing complexity without value | V2+ |
| 15 | Stackable coupons / Buy X Get Y | Promotion complexity without value | V2+ |
| 16 | Multi-organizer per event | One Org per Event (ADR-009) | V2+ |
| 17 | Offline check-in | Future enhancement | V2 |
| 18 | Automated bank payout | Manual payout in V1 (ADR-008) | V2 |

### 4.3. Target Event Types

| Category | Examples |
|---|---|
| **Music** | Concert, live show, DJ night, music festival |
| **Festival** | Food festival, art festival, cultural festival |
| **Community** | Meetup, networking, hackathon |
| **Education** | Workshop, seminar, conference |
| **Entertainment** | Comedy show, theater, exhibition, party |

> All types share the same flow. No event-type-specific logic in V1.

### 4.4. Target Market

Generic, portfolio-ready. V1 = single region. Extensible for multi-language, multi-currency.

---

## 5. Actor Model

### 5.1. Business Actor Hierarchy

```
Actors
├── End Users
│   ├── Guest                   (unauthenticated)
│   └── Attendee                (authenticated, buys tickets)
│
├── Organization (Organizer Side)
│   ├── Organization Owner      (creates org, ultimate authority)
│   ├── Organization Admin      (manages org settings, team)
│   ├── Event Manager           (creates/manages events)
│   ├── Finance Manager         (financial reports, payout requests)
│   ├── Marketing Manager       (promotions, voucher codes)
│   ├── Support Agent           (attendee support, refund requests)
│   └── Check-in Staff          (QR scanning at venue)
│
├── Platform (Operator Side)
│   ├── Platform Admin          (system administration)
│   ├── Platform Operations     (event approval, day-to-day ops)
│   ├── Platform Finance        (settlement, payout, refund approval)
│   └── Platform Support        (attendee support, exceptional refund review)
│
└── System Actors
    ├── Payment Gateway         (V1: ZaloPay)
    ├── Email Provider          (transactional email)
    └── QR Scanner Device       (check-in hardware)
```

### 5.2. V1 Permission Group Mapping

> [!IMPORTANT]
> **Business roles** represent real-world responsibilities and must be preserved in all business documentation.
> **Permission groups** are a V1 implementation simplification. The system is designed to support full role granularity in V2.

| Business Role | V1 Permission Group | Rationale |
|---|---|---|
| Organization Owner | **Owner** | Full org authority |
| Organization Admin | **Owner** | Small teams: owner handles admin |
| Event Manager | **Manager** | Combined operational role |
| Finance Manager | **Manager** | Combined operational role |
| Marketing Manager | **Manager** | Combined operational role |
| Support Agent | **Staff** | Limited operational role |
| Check-in Staff | **Staff** | Narrowest scope |

**V1 Permission Groups:**

| Group | Permissions |
|---|---|
| **Owner** | All organization capabilities. Team management. Transfer ownership. Cannot be removed (must transfer first). |
| **Manager** | Event CRUD, ticket types, promotions, financial views, submit for approval, initiate refund requests. Cannot manage team. |
| **Staff** | QR check-in, view orders for assigned events. Cannot modify events or financials. |

### 5.3. Actor Descriptions

#### End Users

| Actor | Description | Primary Goal |
|---|---|---|
| **Guest** | Unauthenticated visitor. Browse events only. | Discover events, decide to register |
| **Attendee** | Registered user. Purchases tickets, attends events. | Find events, buy easily, attend smoothly |

#### Platform Roles

| Actor | Description |
|---|---|
| **Platform Admin** | System-level administration. User management, configuration. |
| **Platform Operations** | Event approval/rejection, organization approval, content moderation. |
| **Platform Finance** | Settlement review, payout processing, refund approval. |
| **Platform Support** | Attendee support, reviews exceptional refund requests. |

---

## 6. Business Glossary

> **Ubiquitous Language.** All documentation, code, APIs, and database must use these terms consistently.

| Term | Definition |
|---|---|
| **Event** | A planned gathering created by an Organization and published on the platform. Has a lifecycle (Draft → Published → Completed/Cancelled). |
| **Organization** | A business entity that creates and manages Events. Has team members with assigned roles. Replaces the concept of individual "Organizer." |
| **Venue** | The physical location of an Event. Modeled as Event attributes (name, address, capacity) in V1, not an independent entity. |
| **Ticket Type** | A category of admission (e.g., VIP, Standard). Defines price, capacity, and sales window. Synonymous with "Section" in V1. |
| **Ticket** | A unit of admission issued after successful payment. Bound to an Event and Ticket Type. Non-transferable. Identified by unique QR code. |
| **Order** | A purchase transaction for one or more Tickets to a single Event. |
| **Reservation** | A temporary hold on ticket inventory during checkout. Expires if payment is not completed within the expiration period. |
| **Sales Window** | The configurable time range (Sales Start Time → Sales End Time) during which tickets for an Event can be purchased. |
| **Pricing Strategy** | A time-based pricing model for a Ticket Type. Example: Early Bird pricing during an initial period, then regular pricing. Not a promotion — it is intrinsic to the ticket type. |
| **Early Bird** | A Pricing Strategy where tickets are offered at a reduced price during an early sales period. Transitions to regular price after the Early Bird end date. |
| **Payment** | The act of transferring money from Attendee to Platform. A business concept independent of any gateway. |
| **Transaction** | An immutable record of a financial operation (payment, refund, payout). |
| **Commission** | The fee charged by the Platform on each successful ticket sale (% or fixed amount). |
| **Settlement** | Calculation of net amount owed to an Organization after Event completion and cooling period. Gross revenue − commission − refunds = net amount. |
| **Cooling Period** | A configurable business period (default: 7 days) after Event completion during which the platform holds funds to resolve disputes, process exceptional manual reviews, and finalize settlement calculations. It does not imply or allow automatic post-event refunds for attendees. |
| **Payout** | Transfer of settled funds to the Organization. Manual process in V1. |
| **Refund** | Return of payment to an Attendee. Requires manual approval (except auto-refund on event cancellation). |
| **Waitlist** | A FIFO queue for sold-out Ticket Types. Notifies next-in-line when inventory becomes available. |
| **Check-in** | Verification of an Attendee's Ticket at the venue via QR code. Each ticket checks in once. |
| **Voucher Code** | A promotional discount code applied at checkout. Created by Marketing Manager per-event. One per order. Canonical term — synonymous with "coupon code." |
| **Group Discount** | A checkout-time discount applied when minimum ticket quantity is met in a single order. |
| **Engagement Tracking** | Recording of Attendee behavior (events attended, spending, orders) for future use. V1 tracks data only — no visible ranks or benefits. |
| **Audit Log** | Immutable record of significant system actions. Records: who, what, when, before/after state. |
| **Force Majeure** | Unforeseeable circumstances beyond either party's control (natural disaster, government restriction, pandemic, venue closure). Triggers specific cancellation rules. |
| **Suspension** | Platform action to temporarily disable an Organization's operations pending investigation. |

> [!NOTE]
> Glossary will be refined during Domain Discovery. Terms may be added, split, or merged.

---

## 7. Business Capabilities

### 7.1. Event Management

| ID | Capability | Actors | Description |
|---|---|---|---|
| EVT-01 | Create Event | Event Manager | Create with details, venue, schedule, ticket types, pricing strategies |
| EVT-02 | Edit Event (Minor) | Event Manager | Description, banner, FAQ — no re-approval needed |
| EVT-03 | Edit Event (Major) | Event Manager | Date, venue, capacity, ticket pricing — triggers re-approval |
| EVT-04 | Submit for Approval | Event Manager | Submit to Platform for review |
| EVT-05 | Approve / Reject Event | Platform Operations | Review and decide with reason |
| EVT-06 | Cancel Event | Event Manager, Platform Admin | Cancel event, triggers mass refund |
| EVT-07 | Complete Event | System | Auto-mark as completed after end time |
| EVT-08 | Browse / Search Events | Guest, Attendee | Discover by name, category, location, date |
| EVT-09 | View Event Details | Guest, Attendee | Full info, ticket availability, reviews, pricing |

### 7.2. Ticketing

| ID | Capability | Actors | Description |
|---|---|---|---|
| TKT-01 | Define Ticket Types (Sections) | Event Manager | Create sections with price, capacity, sales window |
| TKT-02 | Configure Pricing Strategy | Event Manager | Set Early Bird period and price for a ticket type |
| TKT-03 | Purchase Tickets | Attendee | Select tickets, apply voucher, checkout, pay |
| TKT-04 | Group Purchase (Leader Pays All) | Attendee | Leader buys N tickets, receives all QR codes |
| TKT-05 | View My Tickets | Attendee | See purchased tickets with QR codes |
| TKT-06 | Join Waitlist | Attendee | Queue for sold-out ticket types |
| TKT-07 | Notify Waitlist | System | Alert next-in-line when inventory available |
| TKT-08 | Check-in (QR Scan) | Check-in Staff | Scan QR to validate and record attendance |
| TKT-09 | Request Refund | Attendee | Submit refund request for purchased ticket |

### 7.3. Payment & Finance

| ID | Capability | Actors | Description |
|---|---|---|---|
| PAY-01 | Process Payment | System, Payment Gateway | Charge Attendee via gateway |
| PAY-02 | Handle Payment Status Update | System | Process async status update from gateway |
| PAY-03 | Calculate Commission | System | Compute platform fee per transaction |
| PAY-04 | Generate Settlement | Platform Finance | Calculate net amount post-event + cooling period |
| PAY-05 | Review Settlement | Platform Finance | Verify calculations |
| PAY-06 | Process Payout | Platform Finance | Manual transfer to Organization |
| PAY-07 | Process Refund | Platform Finance | Approve and execute refund |
| PAY-08 | View Revenue Report | Finance Manager, Platform Finance | Reports by event, period, organization |
| PAY-09 | View Transaction History | Finance Manager, Platform Finance | Full financial ledger |

### 7.4. Promotions

| ID | Capability | Actors | Description |
|---|---|---|---|
| PRM-01 | Create Voucher Code | Marketing Manager | Discount code for specific event(s) |
| PRM-02 | Configure Group Discount | Event Manager | Discount when minimum ticket quantity met |
| PRM-03 | Apply Promotion at Checkout | Attendee, System | Validate and apply discount to order |
| PRM-04 | View Promotion Performance | Marketing Manager | Usage and redemption tracking |

> [!NOTE]
> **Early Bird is NOT a promotion.** It is a Pricing Strategy (TKT-02) — an intrinsic property of a Ticket Type's pricing over time. Promotions are external discounts applied at checkout.

### 7.5. Engagement Tracking

| ID | Capability | Actors | Description |
|---|---|---|---|
| ENG-01 | Track Attendance | System | Record check-in events per Attendee |
| ENG-02 | Track Spending | System | Record purchase amounts per Attendee |
| ENG-03 | Query Engagement Data | Platform Admin | View aggregate engagement metrics |

> V1 captures data only. No rank calculation, no rank display, no benefits.
> Database designed for future rank extension without schema changes.

### 7.6. Organization Management

| ID | Capability | Actors | Description |
|---|---|---|---|
| ORG-01 | Register Organization | User → becomes Org Owner | Apply with org details |
| ORG-02 | Approve Organization | Platform Operations | Review and approve application |
| ORG-03 | Invite Team Member | Owner | Send invitation with assigned role |
| ORG-04 | Accept Invitation | Invited User | Join organization in assigned role |
| ORG-05 | Remove Team Member | Owner | Revoke access (cannot remove self) |
| ORG-06 | Change Member Role | Owner | Reassign permission group |
| ORG-07 | Transfer Ownership | Owner | Transfer Owner role to another member |
| ORG-08 | Update Organization Profile | Owner | Edit name, description, logo, contact |
| ORG-09 | View Organization Dashboard | Owner, Manager | Overview of events, revenue, team |

### 7.7. User Management & Auth

| ID | Capability | Actors | Description |
|---|---|---|---|
| USR-01 | Register | Guest → becomes Attendee | Create account |
| USR-02 | Login / Logout | All authenticated | Session management |
| USR-03 | Manage Profile | Attendee | Update personal info |
| USR-04 | Manage Users | Platform Admin | View, suspend, reactivate |
| USR-05 | Manage Platform Team | Platform Admin | Assign Platform Ops/Finance roles |

### 7.8. Platform Operations

| ID | Capability | Actors | Description |
|---|---|---|---|
| OPS-01 | Manage Notification Templates | Platform Admin | CRUD notification templates |
| OPS-02 | Send Notification | System | Deliver via push/email based on triggers |
| OPS-03 | View Audit Log | Platform Admin | Browse immutable action history |
| OPS-04 | Moderate Content | Platform Operations | Remove inappropriate reviews/content |
| OPS-05 | Suspend Organization | Platform Admin | Temporarily disable org operations |
| OPS-06 | Lift Suspension | Platform Admin | Restore org operations |
| OPS-07 | Ban Organization | Platform Admin | Permanently deactivate org, cancel events |

### 7.9. Event Reviews & Ratings

| ID | Capability | Actors | Description |
|---|---|---|---|
| REV-01 | Submit Review | Attendee | Submit a rating and written review for an event |
| REV-02 | View Reviews | Guest, Attendee | View reviews and ratings for an event |
| REV-03 | Moderate Reviews | Platform Operations | Remove reviews that violate content policies |

---

## 8. Core Business Processes

### 8.1. Organization Onboarding

```
User registers on platform (becomes Attendee)
  → Applies to create Organization (name, description, contact, documents)
  → Application status: PENDING_REVIEW
  → Platform Operations reviews
      ├── Approve → Organization: ACTIVE → Owner can invite team, create events
      └── Reject (with reason) → User may re-apply with corrections
```

### 8.2. Team Management

```
Owner invites team member
  → System sends invitation (email/in-app)
  → Invitation includes: assigned permission group (Owner/Manager/Staff)
  → Invited user accepts
      ├── Already registered → Added to Organization
      └── Not registered → Register first → Then accept
  → Member appears in Organization team with assigned group

Role Change:
  → Owner changes member's permission group → Effective immediately

Remove Member:
  → Owner removes member → Access revoked immediately
  → Events created by that member remain owned by Organization

Transfer Ownership:
  → Owner selects existing member → Confirms transfer
  → New Owner gets Owner permissions → Old Owner becomes Manager
```

### 8.3. Event Creation & Approval

```
Event Manager creates Event (DRAFT)
  → Fill: title, description, venue, schedule, category
  → Define Ticket Types: name, price, capacity, sales window
  → Optionally configure: Early Bird pricing strategy
  → Optionally configure: voucher codes, group discount
  → Submit for Approval → Status: PENDING_REVIEW

Platform Operations reviews
  ├── Approve → Status: APPROVED → PUBLISHED (visible to Attendees)
  └── Reject (with reason) → Status: REJECTED → Event Manager edits → Re-submit

Post-Approval Edits:
  ├── Minor (description, banner, FAQ) → No re-approval
  └── Major (date, venue, capacity, pricing) → Status reverts to PENDING_REVIEW
      → If tickets already sold: Major edit BLOCKED (see BR-EVT-02)
```

### 8.4. Ticket Purchase

```
Guest/Attendee browses → finds Event
  → Guest must register/login to purchase
  → Attendee selects Ticket Type + quantity
  → Current price determined (Early Bird or regular, based on date)
  → Optionally applies Voucher Code
  → System validates: capacity available? voucher valid? sales window open?
  → System creates Reservation (temporary inventory hold, expiration period: configurable)
  → System creates Order (PENDING_PAYMENT)
  → Redirect to Payment Gateway

Payment Gateway processes:
  ├── Success
  │   → Order: CONFIRMED
  │   → Tickets: ISSUED (QR codes generated)
  │   → Reservation released, inventory permanently decremented
  │   → Commission recorded
  │   → Engagement data recorded (spending)
  │   → Order confirmation notification sent
  │
  └── Failure / Timeout
      → Order: EXPIRED
      → Reservation released, inventory returned
      → Attendee notified if applicable
```

### 8.5. Group Purchase (Leader Pays All)

```
Leader (Attendee) selects Ticket Type + quantity (N tickets)
  → Group Discount applied if N ≥ minimum threshold
  → Single Order for all N tickets
  → Leader completes payment for total amount
  → N Tickets issued, all under Leader's account
  → Leader shares individual QR codes with group members
  → Each QR code is independently scannable at check-in
```

> In V1, "sharing QR codes" is outside the platform (e.g., screenshot, messaging app).
> Tickets remain non-transferable — they're all owned by the Leader.

### 8.6. Waitlist

```
Attendee selects Ticket Type → SOLD OUT
  → Option: Join Waitlist
  → Added to FIFO queue for that Ticket Type

Inventory becomes available (refund, cancellation, capacity increase):
  → System notifies next N people in queue
  → Notified Attendee has limited time (configurable) to purchase
      ├── Purchases → Normal ticket flow
      └── Window expires → Next person(s) notified
```

### 8.7. Check-in

```
Attendee at venue → Opens app → Shows QR Code
  → Check-in Staff scans QR
  → System validates:
      ├── Ticket exists? ✓
      ├── Correct Event? ✓
      ├── Status = ISSUED (not checked-in, not cancelled, not refunded)? ✓
      └── All valid → Status: CHECKED_IN
          → Engagement data recorded (attendance)

      Any validation fails → REJECTED with specific reason
```

### 8.8. Refund

```
Attendee submits Refund Request (reason required)
  → System records request: PENDING_REVIEW
  → Platform Finance / Support Agent reviews
      ├── Approve
      │   → Determine fault:
      │       ├── Platform fault → Platform bears cost, commission waived
      │       ├── Organizer fault → Organizer bears cost, commission waived
      │       └── Force Majeure → See event cancellation rules
      │   → Refund via original payment method
      │   → Ticket: REFUNDED → Inventory restored
      │   → Waitlist notified if applicable
      │   → Notification to Attendee + Organization
      │
      └── Reject (with reason) → Notification to Attendee

Event Cancellation (special case):
  → ALL tickets auto-refunded 100% — no manual approval
  → See Section 9.4 for cost allocation
```

### 8.9. Settlement & Payout

```
Event: COMPLETED (after end time)
  → Cooling Period begins (default: 7 days)
  → During cooling period: refund requests can still come in
  
  → Cooling Period expires
  → System calculates settlement:
      Gross Revenue (total ticket sales)
      − Commission (platform fee)
      − Refunds processed
      = Net Amount (owed to Organization)
  
  → Settlement status: PENDING_REVIEW
  → Platform Finance reviews
      ├── Approve → Settlement: APPROVED
      │   → Initiate Manual Payout
      │   → Transfer to Organization bank account
      │   → Payout: COMPLETED
      │   → Notification to Organization (Finance Manager)
      │
      └── Dispute → Settlement: UNDER_REVIEW → Resolve → Recalculate
```

### 8.10. Organization Suspension

```
Platform Admin suspends Organization (reason required)

Immediate effects:
  → Organization status: SUSPENDED
  → All PUBLISHED events → SUSPENDED (hidden from public)
  → Ticket sales for all org events → STOPPED
  → Pending Orders (PENDING_PAYMENT) → CANCELLED, reservations released
  → Already-sold Tickets remain VALID (attendees can attend if event happens)
  → New event creation → BLOCKED
  → Pending Payouts → FROZEN
  → Org team members → read-only access

Suspension lifted:
  → Events may be re-published (may require re-approval per Platform discretion)
  → Payouts unfrozen
  → Normal operations resume

Permanent ban (escalation from suspension):
  → All upcoming events → CANCELLED
  → All tickets → AUTO-REFUNDED (treated as organizer-caused, organizer receives no settlement, platform waives commission per BR-REF-04)
  → Completed-event payouts already processed → not clawed back
  → Pending payouts → settled per normal rules, then org deactivated
  → Organization: BANNED → cannot create new org with same identity
```

---

## 9. Business Rules

### 9.1. Event Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-EVT-01 | Event must be approved by Platform Operations before visible to Attendees | Quality control |
| BR-EVT-02 | Cannot modify major event attributes (date, venue, capacity, ticket pricing) after tickets have been sold | Protect Attendee rights |
| BR-EVT-03 | Minor edits (description, banner, FAQ) do not require re-approval | Reduce friction for non-material changes |
| BR-EVT-04 | Major edits to an approved event (no tickets sold) revert status to PENDING_REVIEW | Ensure re-validation of material changes |
| BR-EVT-05 | Event cancellation triggers automatic 100% refund for all sold tickets | Consumer protection |
| BR-EVT-06 | Only the owning Organization's authorized roles or Platform Admin can modify/cancel | Authorization and data integrity |
| BR-EVT-07 | An Event belongs to exactly one Organization | No multi-organizer (V1 scope) |
| BR-EVT-08 | Event must have at least one Ticket Type before submission for approval | An event without tickets has no marketplace value |

### 9.2. Ticketing Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-TKT-01 | Tickets can only be sold for PUBLISHED events | Ensure event has been approved |
| BR-TKT-02 | Cannot sell tickets exceeding Ticket Type capacity | Prevent overselling |
| BR-TKT-03 | Ticket sales are controlled by configurable Sales Start Time and Sales End Time per Ticket Type | Supports multi-day events, flexible strategies |
| BR-TKT-04 | Each Ticket has a unique QR code; each QR can only be checked in once | Fraud prevention |
| BR-TKT-05 | Unpaid Reservations expire after configurable expiration period (default: 15 min) | Prevent indefinite inventory locking |
| BR-TKT-06 | Tickets are non-transferable | V1 scope limitation |
| BR-TKT-07 | Attendee can purchase multiple tickets in a single Order (same event) | Support group attendance |
| BR-TKT-08 | Ticket price at time of purchase is the effective price (Early Bird or regular) | Price is locked at purchase, unaffected by later price changes |
| BR-TKT-09 | Each Event may define a maximum number of tickets purchasable per account (default: 10) | Prevent inventory hoarding and ensure fair access |

### 9.3. Payment & Finance Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-PAY-01 | Platform charges percentage-based commission on each successful ticket sale | Business model. V1: percentage only. Commission model extensible for future versions. |
| BR-PAY-02 | Organization receives payout only after Event COMPLETED + cooling period expired | Risk mitigation |
| BR-PAY-03 | Refund is processed via original payment method | Financial compliance |
| BR-PAY-04 | All financial transactions are immutable ledger entries (append-only) | Audit trail |
| BR-PAY-05 | Payment processing must be idempotent | Prevent double-charging |
| BR-PAY-06 | Settlement cannot be finalized until cooling period (default: 7 days) after event completion | Allow Platform Finance adequate review and processing time |
| BR-PAY-07 | Payout is manual, initiated by Platform Finance | V1 scope — no automated transfers |
| BR-PAY-08 | Commission is calculated on the final (discounted) price, not the original price | Platform earns based on actual revenue |

### 9.4. Refund & Cancellation Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-REF-01 | Individual refund requests require manual approval by Platform Finance (or Platform Support for exceptional requests) | Prevent abuse |
| BR-REF-02 | Event cancellation → automatic 100% refund, no manual approval | Consumer protection |
| BR-REF-03 | **Platform-caused cancellation**: Attendee 100% refund. Organizer receives 100% of revenue. Platform waives commission and bears full financial loss. | Platform accountability. Note: Platform pays both refund and organizer compensation. |
| BR-REF-04 | **Organizer-caused cancellation**: Attendee 100% refund. Organizer receives no settlement. Platform waives commission. | Organizer accountability |
| BR-REF-05 | **Force Majeure**: Attendee 100% refund. Organizer receives no settlement. Platform waives commission. | Fair risk distribution — no party profits from uncontrollable circumstances |
| BR-REF-06 | Refunded tickets return to inventory and may trigger Waitlist notification | Maximize ticket utilization |
| BR-REF-07 | Refund requests are accepted until a configurable refund cutoff period before Event Start Time (default: 48 hours). Requests after the cutoff require exceptional manual approval by Platform Support (medical emergency, duplicate payment, platform error). Event cancellation refunds bypass this cutoff entirely. | Prevent last-minute inventory disruption while preserving consumer protection for genuine emergencies |

### 9.5. Promotion Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-PRM-01 | Voucher codes are per-event, created by Marketing Manager | Scoped to organization's events |
| BR-PRM-02 | Group Discount requires minimum ticket quantity per Order | Volume incentive |
| BR-PRM-03 | Only one pricing adjustment (Voucher Code OR Group Discount) may be applied per Order — no stacking | Simplifies commission and refund calculation |
| BR-PRM-04 | When multiple adjustments are applicable, system automatically applies the one providing greatest financial benefit to the Attendee | Customer-first approach; eliminates manual discount selection |

### 9.6. Pricing Strategy Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-PRC-01 | Early Bird pricing is defined per Ticket Type with a start date and end date | Time-bound pricing |
| BR-PRC-02 | When Early Bird period ends, price automatically reverts to regular price | No manual intervention needed |
| BR-PRC-03 | A Ticket Type can have at most one active pricing strategy at a time | Simplicity — no overlapping strategies |
| BR-PRC-04 | Price displayed to Attendee is always the current effective price | Transparency |
| BR-PRC-05 | Final Selling Price follows a defined pricing pipeline: **Base Ticket Price → Pricing Strategy adjustment (Early Bird) → Promotion adjustment (best of Voucher/Group Discount) → Final Selling Price**. Each stage is independent and applied sequentially. | Clean separation of pricing concerns; traceable price composition |

### 9.7. Organization Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-ORG-01 | New accounts default to Attendee role | Simple onboarding |
| BR-ORG-02 | Becoming an Organization requires application and Platform Operations approval | Quality control |
| BR-ORG-03 | Organization Owner cannot remove themselves (must transfer ownership first) | Prevent orphaned organizations |
| BR-ORG-04 | Owner can assign team members to V1 permission groups: Owner, Manager, Staff | RBAC |
| BR-ORG-05 | One Organization owns one Event (no co-hosting) | V1 simplification |
| BR-ORG-06 | Events created by a removed team member remain owned by the Organization | Data continuity |
| BR-ORG-07 | Suspended Organization cannot create events, sell tickets, or receive payouts | Enforcement |
| BR-ORG-08 | Permanent ban triggers cancellation of all upcoming events and auto-refund | Clean deactivation |

### 9.8. Review Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-REV-01 | A review can be submitted if the Attendee has **checked in** OR has a **verified completed purchase** | Broadened eligibility — covers check-in system failures |
| BR-REV-02 | Cancelled events are not reviewable | No meaningful experience to review |
| BR-REV-03 | One review per Attendee per Event | Prevent spam |
| BR-REV-04 | Reviews cannot be edited after posting (delete only) | Simplicity, prevent manipulation |
| BR-REV-05 | Platform Operations can remove reviews that violate content policy | Content moderation |

### 9.9. Audit Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-AUD-01 | State changes on critical entities (Event, Order, Ticket, Payment, Payout, Organization) must be logged | Accountability |
| BR-AUD-02 | Audit entries are immutable — no update or delete | Data integrity |
| BR-AUD-03 | Entries record: actor, action, timestamp, entity, previous state, new state | Forensic capability |

---

## 10. Architectural Decision Records

### ADR-001: Section-Based Seating

| | |
|---|---|
| **Decision** | Section-based seating (VIP, Standard, Standing, Economy) |
| **Alternatives** | (A) GA only, (B) Section-based, (C) Full seat map |
| **Rationale** | Covers realistic use cases without seat map editor complexity |
| **Consequences** | Ticket Type ≈ Section. Capacity tracking and validation is performed at the ticket type level. |

### ADR-002: Promotions Scope (Revised by ADR-013)

| | |
|---|---|
| **Decision** | ~~Include Voucher Code, Early Bird, Group Discount.~~ |
| **Status** | **Partially superseded by ADR-013.** Early Bird moved to Pricing Strategy. Promotions = Voucher Code + Group Discount only. |

### ADR-003: Membership — Superseded by ADR-012

| | |
|---|---|
| **Status** | **Superseded.** See ADR-012. |

### ADR-004: Refund — Superseded by ADR-015

| | |
|---|---|
| **Status** | **Superseded.** See ADR-015. |

### ADR-005: Group Purchase — Superseded by ADR-011

| | |
|---|---|
| **Status** | **Superseded.** See ADR-011. |

### ADR-006: Waitlist

| | |
|---|---|
| **Decision** | Support FIFO waitlist for sold-out ticket types |
| **Rationale** | Captures demand, enables recovery from cancellations |
| **Consequences** | Queue management, time-limited purchase window, notification trigger. |

### ADR-007: Ticket Transfer Excluded

| | |
|---|---|
| **Decision** | Non-transferable tickets in V1 |
| **Rationale** | Simplifies lifecycle. Transfer introduces fraud/scalping concerns. |

### ADR-008: Manual Settlement & Payout

| | |
|---|---|
| **Decision** | Manual processes for settlement review and bank payout |
| **Rationale** | Automated transfers require complex financial infra, inappropriate for V1. |

### ADR-009: Organization-Based Actor Model

| | |
|---|---|
| **Decision** | Organizer = Organization with multi-role team (7 business roles, 3 V1 permission groups) |
| **Rationale** | Enterprise RBAC. Business roles preserved; V1 implements simplified permission groups. |
| **Consequences** | Org entity, team management, invitation workflow, role-permission mapping. |

### ADR-010: Payment Gateway Agnostic

| | |
|---|---|
| **Decision** | Business logic is gateway-agnostic. V1: ZaloPay. |
| **Rationale** | Clean architecture. Business concepts (Payment, Refund) separated from technical infrastructure details. |

### ADR-011: Group Purchase — Leader Pays All Only (V1)

| | |
|---|---|
| **Decision** | V1 supports leader-pays-all only. Individual-pay collaborative sessions deferred to V2. |
| **Supersedes** | ADR-005 |
| **Context** | Individual-pay requires real-time session management, partial completion handling, and complex inventory reservation. Disproportionate complexity for V1. |
| **Complexity** | Individual-pay: HIGH (real-time sessions, coordination of active users, partial state). Leader-pays: LOW (standard order with N tickets). |
| **Impacted Domains** | Ticketing, Payment |
| **Rationale** | Leader-pays covers the core group use case. Individual-pay is a V2 enhancement. |

### ADR-012: Engagement Tracking Without Ranks (V1)

| | |
|---|---|
| **Decision** | V1 tracks attendance and spending data. No rank calculation, display, or benefits. |
| **Supersedes** | ADR-003 |
| **Context** | Ranks without tangible benefits are vanity metrics. Violates "every feature needs business justification." |
| **Rationale** | Capture data now (check-ins and orders happen anyway). Introduce Bronze→Diamond when benefits exist. |
| **Database Impact** | Data model is designed to support future rank attributes without structural redesign in V2. |

### ADR-013: Early Bird as Pricing Strategy

| | |
|---|---|
| **Decision** | Early Bird is a Ticket Pricing Strategy, NOT a Promotion. Promotions = Voucher Code + Group Discount. |
| **Modifies** | ADR-002 |
| **Context** | Early Bird is intrinsic to a Ticket Type's pricing over time. Vouchers and group discounts are external checkout-time discounts. Conflating them creates domain model confusion. |
| **Rationale** | Clean domain separation. Pricing Strategy lives in Ticketing domain. Promotions live in Promotion domain. |
| **Impacted Domains** | Ticketing (gains Pricing Strategy), Promotions (loses Early Bird) |

### ADR-014: Settlement Cooling Period

| | |
|---|---|
| **Decision** | Mandatory 7-day cooling period after event completion before settlement finalization. |
| **Context** | Without cooling period, post-event refund requests (e.g., "event quality was poor") cannot be accommodated — money is already settled/paid out. |
| **Rationale** | Standard marketplace practice (comparable to Stripe Connect hold periods). |
| **Business Rules Introduced** | BR-PAY-06, BR-REF-07 |

### ADR-015: Simplified Event Cancellation Policy

| | |
|---|---|
| **Decision** | Platform waives commission in ALL cancellation scenarios. |
| **Supersedes** | ADR-004 |

| Scenario | Attendee | Organizer | Platform |
|---|---|---|---|
| Platform fault | 100% refund | Receives 100% of revenue | Bears full loss (refund + organizer payment) |
| Organizer fault | 100% refund | No settlement | Waives commission |
| Force Majeure | 100% refund | No settlement | Waives commission |

| | |
|---|---|
| **Rationale** | Simpler. Fairer. Eliminates financial disputes about commission retention. For platform-fault: platform is accountable and should compensate the organizer who prepared the event. |
| **Risk** | Platform-fault scenario = double financial exposure (refund + organizer payment). Mitigated by rarity of genuine platform faults. |

### ADR-016: Event Editing Policy

| | |
|---|---|
| **Decision** | Distinguish minor edits (no re-approval) from major edits (triggers re-approval). |
| **Minor** | Description, banner, FAQ |
| **Major** | Date, venue, capacity, ticket pricing, ticket inventory |
| **Additional Rule** | Major edits BLOCKED entirely if tickets have already been sold (BR-EVT-02). |
| **Rationale** | Reduces friction for cosmetic changes. Protects Attendees from material changes post-purchase. |

### ADR-017: Configurable Ticket Sales Window

| | |
|---|---|
| **Decision** | Replace "sales stop at event start" with configurable Sales Start Time and Sales End Time per Ticket Type. |
| **Context** | Previous rule ("no sales after event start") breaks multi-day festivals and flexible door policies. |
| **Rationale** | Configurable window gives Organizers control. Supports: pre-sale periods, multi-day events, door sales. |
| **Business Rules Modified** | BR-TKT-03 (replaced) |

### ADR-018: Expanded Review Eligibility

| | |
|---|---|
| **Decision** | Reviews allowed if Attendee checked in OR has verified completed purchase. Cancelled events not reviewable. |
| **Context** | Previous rule ("only checked-in") blocked legitimate reviews when check-in system failed or Attendee had access issues. |
| **Rationale** | Broader eligibility, still prevents non-purchasers from reviewing. Cancelled events excluded because no experience occurred. |
| **Business Rules Modified** | BR-REV-01 (expanded), BR-REV-02 (new) |

### ADR-019: No Discount Stacking — Best Benefit Selection

| | |
|---|---|
| **Decision** | Only one pricing adjustment per Order (Voucher Code OR Group Discount). System auto-selects the option providing greatest benefit to the Attendee. |
| **Context** | PO decided against discount stacking to simplify commission and refund calculations. |
| **Alternatives** | (A) Allow stacking both, (B) Manual attendee selection, (C) Auto-select best |
| **Rationale** | Option C is the best UX (attendee always gets optimal discount) while maintaining single-discount simplicity for finance. |
| **Consequences** | System must calculate both discounts at checkout and compare. Minor computation overhead but no stacking complexity in settlement/refund. |
| **Business Rules** | BR-PRM-03, BR-PRM-04 |

### ADR-020: Percentage-Based Commission

| | |
|---|---|
| **Decision** | V1 supports percentage-based commission only. Platform-wide default rate with per-Organization override. |
| **Context** | PO decided to keep commission model simple for V1. |
| **Alternatives** | (A) Fixed fee, (B) Percentage, (C) Hybrid, (D) Tiered |
| **Rationale** | Percentage scales naturally with ticket price. Per-Organization override allows negotiation with large organizers without per-event complexity. |
| **Assumption** | Commission scope = Platform-wide default + per-Organization override. Awaiting PO confirmation. |
| **Extensibility** | Pricing structure should accommodate fixed-fee and hybrid models in future versions. |
| **Business Rules** | BR-PAY-01, BR-PAY-08 |

### ADR-021: Pricing Pipeline

| | |
|---|---|
| **Decision** | Price resolution follows a sequential pipeline: Base Price → Pricing Strategy → Promotion → Final Selling Price. |
| **Context** | PO explicitly separated Pricing Strategy (Early Bird) from Promotions (Voucher/Group Discount) as different domain concepts. |
| **Rationale** | Clear separation of concerns. Each pricing stage is independent. Price composition is traceable and auditable. |
| **Consequences** | Pricing Strategy is intrinsic to Ticket Type (time-based). Promotion is external to Ticket Type (checkout-time). They are applied sequentially, not in parallel. |
| **Business Rules** | BR-PRC-05 |

### ADR-022: Refund Time Boundaries

| | |
|---|---|
| **Decision** | Pre-event refunds follow normal manual approval. Post-event-start refunds are exceptional cases requiring escalated Platform Support review. |
| **Context** | Need to define when refund requests are accepted relative to event timing. |
| **Alternatives** | (A) No time limit, (B) Hard cutoff before event, (C) Graduated (normal pre-event, exceptional post-event) |
| **Rationale** | Option C balances consumer rights (post-event complaints are legitimate) with organizer stability (most refunds should happen pre-event). Post-event refunds during cooling period are still possible but require higher scrutiny. |
| **Business Rules** | BR-REF-07 |

---

## 11. Open Questions — Resolution Log

> All Open Questions have been resolved as of 2026-06-29. Decisions recorded as ADRs.

| OQ | Question | Resolution | ADR |
|---|---|---|---|
| OQ-1 | Discount stacking | No stacking. One adjustment per order. System auto-selects best benefit for Attendee. | ADR-019 |
| OQ-2 | Commission structure | Percentage-based only (V1). Platform-wide default with per-Organization override. | ADR-020 |
| OQ-3 | Featured Profiles | **Deferred.** Not addressed in directive. Excluded from V1 per BA recommendation. | — |
| OQ-4 | Org event limits | **Deferred.** Not addressed in directive. No limit in V1. Will revisit if operational issues arise. | — |
| OQ-5 | Refund time boundary | Pre-event: normal approval. Post-event-start: exceptional, escalated review. | ADR-022 |
| OQ-6 | Waitlist details | Accepted as proposed. FIFO, no size limit specified. | ADR-006 |

### Remaining Assumptions (Pending PO Confirmation)

| ID | Assumption | Documented In |
|---|---|---|
| ASM-01 | Commission scope: Platform-wide default with per-Organization override (not per-Event) | ADR-020 |
| ASM-02 | No minimum commission per ticket in V1 | ADR-020 |
| ASM-03 | Featured Profiles excluded from V1; organizer describes performers in event description | OQ-3 |
| ASM-04 | No limit on number of active events per Organization in V1 | OQ-4 |
| ASM-05 | Waitlist is unlimited (no cap per Ticket Type) | OQ-6 |
| ASM-06 | Attendee can join multiple waitlists for different Ticket Types of the same Event | OQ-6 |

---

## 12. Feature Proposal Template

> Every new feature proposal must follow this format before being accepted into scope.

```markdown
### FP-[NNN]: [Feature Name]

**Business Value:** Why does this feature exist? What problem does it solve?

**Complexity Assessment:** LOW / MEDIUM / HIGH
- Describe the implementation complexity and dependencies.

**Impacted Domains:** Which bounded contexts are affected?

**Business Rules Introduced:**
- List new rules this feature requires.

**Database Impact:** New tables? New columns? Schema migration?

**V1 Decision:**
- INCLUDE — [rationale]
- EXCLUDE — [rationale] — Deferred to [version]
```

---

## 13. Deliverable Roadmap

### Phase 1: Business Analysis (Current)

| # | Deliverable | Status | Dependencies |
|---|---|---|---|
| 1 | **Project Charter** | ✅ V2.3 — Baselined | None |
| 2 | **Business Glossary** (standalone) | ✅ V1.1 — Baselined | Charter |
| 3 | **Business Rules Specification** | ✅ V1.1 — Baselined | Glossary |
| 4 | **Business Rule Traceability Matrix** | ✅ V1.2 — Baselined | Rules Spec |
| 5 | **Business Capabilities** (detailed) | ✅ V1.1 — Baselined | Glossary |
| 6 | **Business Processes** (detailed BPMN) | ✅ V1.1 — Baselined | Capabilities |
| 7 | **State Machines** | ✅ V1.1 — Baselined | Processes, Rules |
| 8 | **Domain Discovery** | ✅ V1.1 — Baselined | State Machines |
| 9 | **Domain Complexity Matrix** | ✅ V1.1 — Baselined | Domain Discovery |

### Phase 2: Domain & Technical Design

| # | Deliverable | Dependencies |
|---|---|---|
| 10 | Domain Model (DDD) | All Phase 1 |
| 11 | Database Design | Domain Model |
| 12 | API Design | Domain Model + Database |
| 13 | Architecture Design | All above |

> [!IMPORTANT]
> Phase 2 does NOT begin until all Phase 1 deliverables are reviewed and approved by PO.

---

> **End of Project Charter V2.3**
