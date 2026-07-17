# BUSINESS GLOSSARY — Eventing Platform V1

> **Document ID:** EV-GL-001
> **Version:** 1.1 (Baselined)
> **Status:** ✅ APPROVED — Baselined
> **Last Updated:** 2026-07-06
> **Dependency:** Project Charter V2.3 (EV-PC-001)
> **Deliverable #:** Phase 1, Item 2

---

## Purpose

This glossary defines the **Ubiquitous Language** of the Eventing Platform. Every term listed here has a single, authoritative meaning across all project artifacts — business analysis, domain modeling, database design, API contracts, and implementation.

**Usage rules:**
- All project documents MUST use these exact terms (not synonyms or abbreviations).
- If a concept is not in this glossary, it either doesn't exist in the domain or must be added here first.
- Anti-definitions (⛔) clarify what a term does NOT mean, to prevent domain confusion.

---

## Domain 3: Event Management

### Event

| | |
|---|---|
| **Definition** | A scheduled occasion organized by an Organization, published on the platform for Attendees to discover and attend. An Event has a title, description, venue, date/time, category, and one or more Ticket Types. |
| **Related Terms** | Venue, Event Category, Ticket Type, Organization |
| **Lifecycle States** | DRAFT → PENDING_REVIEW → APPROVED / REJECTED → PUBLISHED → ONGOING → COMPLETED → CANCELLED. Also: SUSPENDED (during Organization suspension). |
| **Business Rules** | BR-EVT-01 through BR-EVT-08 |
| ⛔ Anti-definition | An Event is NOT a Ticket. An Event is NOT a recurring series (V1: each occurrence is a separate Event). |

### Venue

| | |
|---|---|
| **Definition** | The physical location where an Event takes place. Defined as part of Event details (name, address). |
| **Related Terms** | Event |
| ⛔ Anti-definition | Not a standalone managed entity in V1. Venue is an attribute of Event, not a separate domain object. |

### Event Category

| | |
|---|---|
| **Definition** | A classification label for an Event (e.g., Music, Conference, Workshop, Sports). Used for discovery, filtering, and reporting. |
| **Related Terms** | Event |
| ⛔ Anti-definition | Not a taxonomy or hierarchy. V1: flat list of categories. |

---

## Domain 4: Ticketing

### Ticket Type

| | |
|---|---|
| **Definition** | A class of admission defined within an Event, specifying a section/tier (e.g., VIP, Standard, Standing, Economy), a base price, capacity (maximum number of tickets), and a sales window. Each Ticket Type represents a distinct offering within an Event. |
| **Synonyms** | Section (used interchangeably per ADR-001) |
| **Related Terms** | Event, Ticket, Base Price, Sales Window, Capacity, Pricing Strategy |
| **Business Rules** | BR-TKT-01 through BR-TKT-08 |
| ⛔ Anti-definition | A Ticket Type is NOT a Ticket. It is a template/definition. A Ticket is an issued instance of a Ticket Type. |

### Ticket

| | |
|---|---|
| **Definition** | A purchased unit of admission, issued to an Attendee upon successful payment. Each Ticket belongs to exactly one Ticket Type and one Order. Each Ticket has a unique QR Code for check-in verification. |
| **Lifecycle States** | ISSUED → CHECKED_IN / CANCELLED / REFUNDED |
| **Related Terms** | Ticket Type, Order, QR Code, Check-in |
| **Business Rules** | BR-TKT-04, BR-TKT-06 |
| ⛔ Anti-definition | A Ticket is NOT a reservation. A Ticket exists only after successful payment. |

### Capacity

| | |
|---|---|
| **Definition** | The maximum number of Tickets available for sale within a Ticket Type. When all capacity is consumed, the Ticket Type is SOLD OUT. |
| **Related Terms** | Ticket Type, Reservation, Waitlist |
| ⛔ Anti-definition | Capacity is per Ticket Type, not per Event (unless the Event has only one Ticket Type). |

### Sales Window

| | |
|---|---|
| **Definition** | A configurable time range (Sales Start Time and Sales End Time) during which a Ticket Type is available for purchase. Configured per Ticket Type, not per Event. |
| **Related Terms** | Ticket Type |
| **Business Rules** | BR-TKT-03 |
| **ADR** | ADR-017 |
| ⛔ Anti-definition | The Sales Window is NOT tied to Event start/end times. It is independently configurable to support pre-sales, multi-day events, and door sales. |

### Reservation

| | |
|---|---|
| **Definition** | A temporary hold on ticket inventory (capacity) created when an Attendee initiates a purchase. Prevents overselling during the payment window. Reservations have a configurable expiration period and expire automatically if payment is not completed. |
| **Related Terms** | Order, Reservation Expiration Period, Capacity |
| ⛔ Anti-definition | A Reservation is NOT a Ticket. It is a transient state that exists only between checkout initiation and payment completion/expiry. |

### Reservation Expiration Period

| | |
|---|---|
| **Definition** | The configurable maximum duration a Reservation remains valid before automatic expiry. |
| **Related Terms** | Reservation |
| **Default Platform Policy** | 15 minutes |
| **Business Rules** | BR-TKT-05 |

### Purchase Limit

| | |
|---|---|
| **Definition** | A configurable maximum number of tickets that a single Attendee account can purchase for a given Event. Prevents inventory hoarding and ensures fair access. |
| **Related Terms** | Ticket, Order, Anti-Hoarding |
| **Default Platform Policy** | 10 tickets per account per Event |
| **Business Rules** | BR-TKT-09 |
| ⛔ Anti-definition | Purchase Limit is NOT a per-Ticket-Type limit. It is per-Event across all Ticket Types combined. |

### Check-in

| | |
|---|---|
| **Definition** | The process of validating an Attendee's Ticket at the venue by scanning its QR Code. Transitions the Ticket from ISSUED to CHECKED_IN. Each QR Code can only be scanned once. |
| **Related Terms** | Ticket, QR Code |
| **Business Rules** | BR-TKT-04 |

### QR Code

| | |
|---|---|
| **Definition** | A unique, machine-readable code generated for each Ticket upon issuance. Used for Check-in validation. One QR Code per Ticket; single-scan only. |
| **Related Terms** | Ticket, Check-in |

### Waitlist

| | |
|---|---|
| **Definition** | A FIFO queue for a SOLD OUT Ticket Type. Attendees can join the waitlist and will be notified in order when inventory becomes available (due to refund, cancellation, or capacity increase). Notified Attendees have a configurable time window to complete purchase. |
| **Related Terms** | Ticket Type, Capacity |
| **Business Rules** | ADR-006 |
| **ADR** | ADR-006 |

---

## Domain 5: Pricing & Promotion

### Base Price

| | |
|---|---|
| **Definition** | The original, full price of a Ticket Type before any Pricing Strategy or Promotion adjustments are applied. Set by the Event Manager during Event creation. |
| **Related Terms** | Ticket Type, Pricing Pipeline, Final Selling Price |
| ⛔ Anti-definition | Base Price is NOT the price the Attendee pays. It is the starting point of the Pricing Pipeline. |

### Pricing Strategy

| | |
|---|---|
| **Definition** | A time-based pricing adjustment intrinsic to a Ticket Type. Applied automatically based on the current date/time. V1 supports one strategy: Early Bird. |
| **Related Terms** | Early Bird, Ticket Type, Pricing Pipeline |
| **Business Rules** | BR-PRC-01 through BR-PRC-05 |
| **ADR** | ADR-013 |
| ⛔ Anti-definition | A Pricing Strategy is NOT a Promotion. It is part of the Ticket Type's intrinsic pricing schedule, not an external checkout-time discount. |

### Early Bird

| | |
|---|---|
| **Definition** | A Pricing Strategy that offers a lower price for a Ticket Type during a defined time window (start date, end date). When the Early Bird period ends, the price automatically reverts to the Base Price. |
| **Related Terms** | Pricing Strategy, Base Price |
| **Business Rules** | BR-PRC-01, BR-PRC-02 |
| ⛔ Anti-definition | Early Bird is NOT a Promotion (see ADR-013). It does not use a code, does not depend on quantity, and is not applied at checkout — it changes the displayed price directly. |

### Pricing Pipeline

| | |
|---|---|
| **Definition** | The sequential process by which the Final Selling Price is determined: **Base Ticket Price → Pricing Strategy adjustment → Promotion adjustment → Final Selling Price**. Each stage is independent and applied in order. |
| **Related Terms** | Base Price, Pricing Strategy, Promotion, Final Selling Price |
| **Business Rules** | BR-PRC-05 |
| **ADR** | ADR-021 |

### Final Selling Price

| | |
|---|---|
| **Definition** | The actual price paid by the Attendee for a Ticket, after all applicable Pricing Strategy and Promotion adjustments have been applied through the Pricing Pipeline. This is the price used for commission calculation and financial records. |
| **Related Terms** | Pricing Pipeline, Commission |
| **Business Rules** | BR-PAY-08 |
| ⛔ Anti-definition | The Final Selling Price is NOT the Base Price unless no adjustments apply. |

---



### Voucher Code

| | |
|---|---|
| **Definition** | A code-based discount created by the Marketing Manager, scoped to one or more Events within an Organization. Applied by the Attendee at checkout. Provides a percentage or fixed-amount discount. |
| **Related Terms** | Promotion, Group Discount, Best Benefit Selection |
| **Business Rules** | BR-PRM-01, BR-PRM-03, BR-PRM-04 |
| ⛔ Anti-definition | Not a Pricing Strategy. Voucher Codes are external, one-time-use (or limited-use) discounts, not intrinsic pricing schedules. |

### Group Discount

| | |
|---|---|
| **Definition** | A quantity-based discount applied automatically when a single Order meets or exceeds a minimum ticket quantity threshold for a given Event. |
| **Related Terms** | Promotion, Voucher Code, Best Benefit Selection |
| **Business Rules** | BR-PRM-02, BR-PRM-03 |
| **ADR** | ADR-011 |
| ⛔ Anti-definition | Group Discount is not a code. It is automatically triggered by quantity, not manually entered. |

### Best Benefit Selection

| | |
|---|---|
| **Definition** | The system behavior when both a Voucher Code and a Group Discount are applicable to the same Order. The system calculates both discount amounts and automatically applies the one that provides the greatest financial benefit to the Attendee. Only one pricing adjustment is applied (no stacking). |
| **Related Terms** | Voucher Code, Group Discount, Pricing Pipeline |
| **Business Rules** | BR-PRM-03, BR-PRM-04 |
| **ADR** | ADR-019 |

### Promotion

| | |
|---|---|
| **Definition** | An umbrella term for external checkout-time discounts: Voucher Code and Group Discount. Promotions are applied as the last stage of the Pricing Pipeline, after Pricing Strategy. |
| **Related Terms** | Voucher Code, Group Discount, Pricing Strategy |
| ⛔ Anti-definition | Promotion does NOT include Early Bird. Early Bird is a Pricing Strategy (ADR-013). |

---

## Domain 6: Payment

### Order

| | |
|---|---|
| **Definition** | A commercial transaction representing an Attendee's purchase of one or more Tickets for a single Event. An Order records the Tickets purchased, total amount, applied discount (if any), and payment status. |
| **Lifecycle States** | PENDING_PAYMENT → CONFIRMED / EXPIRED / CANCELLED |
| **Related Terms** | Ticket, Payment, Reservation |
| **Business Rules** | BR-TKT-07 |
| ⛔ Anti-definition | An Order covers a single Event only. Multiple events require multiple Orders. |

### Payment

| | |
|---|---|
| **Definition** | The financial transaction processing an Order's total amount through an external Payment Gateway. Business logic is gateway-agnostic (ADR-010). V1 implementation: ZaloPay. |
| **Related Terms** | Order, Payment Gateway, Commission |
| **Business Rules** | BR-PAY-03, BR-PAY-04, BR-PAY-05 |
| ⛔ Anti-definition | Payment is a business domain concept. "ZaloPay" is an infrastructure implementation detail. |

### Payment Gateway

| | |
|---|---|
| **Definition** | The external service that processes financial transactions (payments, refunds). The platform integrates with a Payment Gateway through an abstraction layer. V1: ZaloPay. |
| **Related Terms** | Payment |
| **ADR** | ADR-010 |
| ⛔ Anti-definition | The Payment Gateway is not part of the platform's domain model. It is an external infrastructure dependency. |

### Commission

| | |
|---|---|
| **Definition** | The platform's fee charged on each successful ticket sale, calculated as a percentage of the Final Selling Price. V1: percentage-based only, with a platform-wide default rate and per-Organization override capability. |
| **Related Terms** | Final Selling Price, Settlement |
| **Business Rules** | BR-PAY-01, BR-PAY-08 |
| **ADR** | ADR-020 |
| ⛔ Anti-definition | Commission is NOT charged on the Base Price. It is calculated on the Final Selling Price (after all discounts). |

---

## Domain 8: Settlement & Payout

### Settlement

| | |
|---|---|
| **Definition** | The process of calculating the net amount owed to an Organization after an Event completes and the Cooling Period expires. Settlement = Gross Revenue − Commission − Refunds Processed. |
| **Lifecycle States** | PENDING_CALCULATION → PENDING_REVIEW → APPROVED → PAID / UNDER_REVIEW |
| **Related Terms** | Cooling Period, Payout, Commission |
| **Business Rules** | BR-PAY-02, BR-PAY-06 |
| **ADR** | ADR-008 |

### Cooling Period

| | |
|---|---|
| **Definition** | A configurable business period after Event completion during which the platform holds funds to resolve disputes, process exceptional manual reviews, and finalize settlement calculations. It does not imply or allow automatic post-event refunds for attendees. |
| **Related Terms** | Settlement, Payout |
| **Default Platform Policy** | 7 days after Event completion |
| **Business Rules** | BR-PAY-06 |
| **ADR** | ADR-014 |

### Payout

| | |
|---|---|
| **Definition** | The actual transfer of the settled net amount from the platform to the Organization's bank account. V1: manual process initiated by Platform Finance. |
| **Related Terms** | Settlement |
| **Business Rules** | BR-PAY-07 |
| **ADR** | ADR-008 |
| ⛔ Anti-definition | Payout is NOT Settlement. Settlement is the calculation; Payout is the transfer. |

---

## Domain 7: Refund & Cancellation

### Refund

| | |
|---|---|
| **Definition** | The return of the purchase amount to an Attendee, processed via the original payment method. Individual refunds require manual approval. Event cancellation triggers automatic 100% refund. |
| **Related Terms** | Order, Ticket, Refund Cutoff Period |
| **Business Rules** | BR-REF-01 through BR-REF-07 |

### Refund Cutoff Period

| | |
|---|---|
| **Definition** | A configurable time boundary before Event Start Time that determines the refund approval path. Refund requests submitted before the cutoff follow normal manual approval. Requests submitted after the cutoff but before event start require exceptional manual approval by Platform Support (medical emergency, duplicate payment, platform error). Normal refund requests are not accepted after the event has started. Event cancellation refunds bypass this cutoff entirely. |
| **Related Terms** | Refund, Event Cancellation |
| **Default Platform Policy** | 48 hours before Event Start Time |
| **Business Rules** | BR-REF-07 |
| **ADR** | ADR-022 |
| ⛔ Anti-definition | Refund Cutoff Period is NOT the Cooling Period. Cooling Period is a post-event settlement window. Refund Cutoff Period is a pre-event refund acceptance boundary. |

### Event Cancellation

| | |
|---|---|
| **Definition** | The termination of a PUBLISHED or ONGOING Event, triggering automatic 100% refund of all sold Tickets without manual approval. Cost allocation depends on fault type (Platform, Organizer, or Force Majeure). |
| **Related Terms** | Refund, Force Majeure |
| **Business Rules** | BR-REF-02 through BR-REF-05, BR-EVT-05 |
| **ADR** | ADR-015 |

### Force Majeure

| | |
|---|---|
| **Definition** | An unforeseeable, uncontrollable external event (natural disaster, government order, pandemic) that makes an Event impossible to hold. Under Force Majeure: Attendee receives 100% refund, Organizer receives no settlement, Platform waives commission. |
| **Related Terms** | Event Cancellation, Refund |
| **Business Rules** | BR-REF-05 |

---

## Domain 2: Organization

### Organization

| | |
|---|---|
| **Definition** | A registered entity that creates and manages Events on the platform. An Organization has a profile (name, description, logo, contact), a team of members with assigned permission groups, and must be approved by Platform Operations before creating Events. |
| **Lifecycle States** | PENDING_REVIEW → ACTIVE → SUSPENDED → BANNED |
| **Related Terms** | Organization Owner, Permission Group, Team Member |
| **Business Rules** | BR-ORG-01 through BR-ORG-08 |
| **ADR** | ADR-009 |
| ⛔ Anti-definition | An Organization is NOT a single person. It is a team entity with role-based access control. |

### Permission Group

| | |
|---|---|
| **Definition** | A V1 implementation grouping that maps business roles to system permissions. V1 groups: **Owner** (full control), **Manager** (event + finance management), **Staff** (operational tasks like check-in). |
| **Related Terms** | Organization, Team Member |
| **Business Rules** | BR-ORG-04 |
| **ADR** | ADR-009 |
| ⛔ Anti-definition | Permission Groups are NOT the same as business roles. The 7 business roles (Owner, Admin, Event Manager, Finance Manager, Marketing Manager, Support Agent, Check-in Staff) are mapped to 3 V1 permission groups. |

### Team Member

| | |
|---|---|
| **Definition** | A registered user who has been invited to and accepted membership in an Organization. Each Team Member is assigned exactly one Permission Group within that Organization. |
| **Related Terms** | Organization, Permission Group |

### Organization Suspension

| | |
|---|---|
| **Definition** | A temporary enforcement action by Platform Admin that disables an Organization's operational capabilities: no new events, no ticket sales, frozen payouts, read-only team access. Existing valid Tickets remain honored. |
| **Related Terms** | Organization, Ban |
| **Business Rules** | BR-ORG-07 |

### Ban

| | |
|---|---|
| **Definition** | A permanent deactivation of an Organization. All upcoming events are cancelled, all tickets auto-refunded (platform bears cost), pending payouts settled, then Organization marked BANNED. Cannot create new Organization with same identity. |
| **Related Terms** | Organization Suspension |
| **Business Rules** | BR-ORG-08 |

---

## Domain 1: Identity & Access

### Guest

| | |
|---|---|
| **Definition** | An unauthenticated visitor who can browse Events but cannot purchase Tickets or interact with the platform. Must register to become an Attendee. |
| **Related Terms** | Attendee |

### Attendee

| | |
|---|---|
| **Definition** | A registered and authenticated user who can purchase Tickets, submit reviews, request refunds, and join Waitlists. The default role upon registration. |
| **Related Terms** | Guest, Order, Ticket, Engagement Tracking |
| **Business Rules** | BR-ORG-01 |
| ⛔ Anti-definition | An Attendee is NOT an Organization member unless separately invited and accepted into an Organization. The roles are independent. |

---

## Domain 10: Engagement Tracking

### Engagement Tracking

| | |
|---|---|
| **Definition** | The system's background recording of an Attendee's attendance (check-ins) and spending (purchase amounts) across Events. V1: data capture only — no rank calculation, no rank display, no benefits. Designed to support future rank extension. |
| **Related Terms** | Attendee, Check-in |
| **ADR** | ADR-012 |
| ⛔ Anti-definition | Engagement Tracking is NOT a loyalty program or membership tier system in V1. It is raw data collection for future use. |

---

## Domain 9: Reviews & Ratings

### Review

| | |
|---|---|
| **Definition** | An Attendee's rating and textual feedback for an Event they attended. Eligible if Attendee has checked in OR has a verified completed purchase. One review per Attendee per Event. Cannot be edited (only deleted). |
| **Related Terms** | Attendee, Event, Check-in |
| **Business Rules** | BR-REV-01 through BR-REV-05 |
| **ADR** | ADR-018 |

---

## Domain 11: Platform Operations

### Platform Admin

| | |
|---|---|
| **Definition** | The highest-authority role within the platform team. Manages users, organizations, notification templates, audit logs, and has authority to suspend/ban Organizations. |
| **Related Terms** | Platform Operations, Platform Finance |

### Platform Operations

| | |
|---|---|
| **Definition** | Platform team members responsible for reviewing and approving Organization applications and Event submissions, moderating content (reviews), and handling suspensions. |
| **Related Terms** | Platform Admin |

### Platform Finance

| | |
|---|---|
| **Definition** | Platform team members responsible for reviewing Settlements, approving refund requests, processing Payouts, and managing financial reports. |
| **Related Terms** | Settlement, Payout, Refund |

### Platform Support

| | |
|---|---|
| **Definition** | Platform team members responsible for attendee support and reviews exceptional refund requests submitted after the Refund Cutoff Period. |
| **Related Terms** | Refund, Refund Cutoff Period |

### Audit Log

| | |
|---|---|
| **Definition** | An immutable, append-only record of all significant actions performed on the platform. Each entry records: actor, action, timestamp, affected entity, previous state, and new state. |
| **Related Terms** | Platform Admin |
| **Business Rules** | BR-AUD-01 through BR-AUD-03 |

### Notification

| | |
|---|---|
| **Definition** | A system-generated message triggered by specific business events (order confirmation, refund status, waitlist availability, etc.). Delivered via push notification and/or email. Based on configurable templates managed by Platform Admin. |
| **Related Terms** | Platform Admin |

---

## Cross-Reference Summary

| # | Domain | Terms | Key ADRs |
|---|---|---|---|
| 1 | Identity & Access | 2 terms | — |
| 2 | Organization | 5 terms | ADR-009 |
| 3 | Event Management | 3 terms | ADR-001 |
| 4 | Ticketing | 11 terms | ADR-006, ADR-007, ADR-017 |
| 5 | Pricing & Promotion | 9 terms | ADR-013, ADR-019, ADR-021 |
| 6 | Payment | 3 terms | ADR-010, ADR-020 |
| 7 | Refund & Cancellation | 4 terms | ADR-015, ADR-022 |
| 8 | Settlement & Payout | 3 terms | ADR-008, ADR-014 |
| 9 | Reviews & Ratings | 1 term | ADR-018 |
| 10 | Engagement Tracking | 1 term | ADR-012 |
| 11 | Platform Operations | 6 terms | — |
| | **Total** | **48 terms** | **16 referenced ADRs (22 total)** |

---

> **End of Business Glossary V1.1**
