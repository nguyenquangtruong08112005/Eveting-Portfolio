# DOMAIN DISCOVERY — Eventing Platform V1

> **Document ID:** EV-DD-001
> **Version:** 1.1 (Baselined)
> **Status:** ✅ APPROVED — Baselined
> **Last Updated:** 2026-07-06
> **Dependency:** Project Charter V2.3, Business Glossary V1.1, Business Rules Specification V1.1, Business Capabilities V1.1, Business Processes V1.1, State Machines V1.1
> **Deliverable #:** Phase 1, Item 8

---

## Purpose

This document identifies the logical business domains of the Eventing Platform following DDD strategic design principles. Domains are discovered from business capabilities, processes, rules, and ubiquitous language — not from technical modules, folder structures, or data schemas.

Each domain represents a coherent area of business responsibility with clear ownership boundaries.

This document is **implementation-independent**. It describes business domains, their responsibilities, and their relationships. Tactical DDD decisions (repositories, factories, persistence models, event buses, messaging infrastructure) belong to Phase 2.

> [!IMPORTANT]
> **Domain Numbering Cross-Reference.** Earlier Phase 1 documents use different domain groupings for different purposes:
> - **Business Glossary** (01): 10 content domains — organizes terms by subject area.
> - **Business Rules Specification** (02): 9 rule categories — groups rules by governance area.
> - **This document** (07): 11 strategic domains (DOM-01 to DOM-11) — identifies bounded contexts for DDD.
>
> These serve different purposes and are **not** required to be 1:1. This document (Domain Discovery) is the **authoritative domain structure** for Phase 2 onward. Earlier groupings remain valid for their respective purposes (term lookup, rule navigation).

---

## Domain Classification Key

| Classification | Description | Investment Strategy |
|---|---|---|
| **Core** | Creates competitive advantage. Unique to this platform. | Maximum investment. Best talent. Custom-built. |
| **Supporting** | Necessary to operate but not differentiating. | Moderate investment. Standard patterns acceptable. |
| **Generic** | Commodity capability. Standard across all platforms. | Minimal custom investment. Buy or reuse. |

---

## Discovered Domains

### DOM-01: Identity & Access

#### Classification: Generic

**Why Generic:** User registration, authentication, and profile management are commodity capabilities present in every platform. No competitive advantage comes from how users log in. Can be delegated to standard identity solutions.

#### Domain Purpose

Manage user identity, authentication, and authorization across the platform.

#### Responsibilities

- User registration and account management.
- Authentication (login/logout).
- Profile management.
- Platform-level user administration.
- Role assignment at platform level (Attendee role on registration).

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Guest | Guest |
| Attendee | Attendee |
| User Profile | (implicit, USR-03) |

#### Business Rules Owned

| Rule | Description |
|---|---|
| BR-ORG-01 | Default Attendee role on registration |

**Rule Count:** 1

#### Processes Involved

| Process | Role |
|---|---|
| BP-01 | Prerequisite — Attendee must have an account before applying for Organization |
| BP-04 | Prerequisite — Guest must register before purchasing |

#### Capabilities Owned

| Capability | Description |
|---|---|
| USR-01 | Register |
| USR-02 | Login / Logout |
| USR-03 | Manage Profile |
| USR-04 | Manage Users |
| USR-05 | Manage Platform Team |

**Capability Count:** 5

#### Primary Actors

- Guest, Attendee, Platform Admin

#### Upstream Dependencies

None (foundational domain).

#### Downstream Dependencies

- **Organization** — Organization Onboarding requires an authenticated Attendee.
- **Ticketing** — Ticket purchase requires an authenticated Attendee.
- **All domains** — Every actor interaction requires an authenticated identity.

#### Data Ownership

- User accounts, authentication credentials, user profiles.

#### Candidate Aggregate Roots

- **User** — Central identity entity governing registration, authentication, and profile.

#### Candidate Entities

- User Account, User Profile

#### Candidate Value Objects

- Email Address, Password (hashed), Display Name

#### Domain Events (Business)

- User Registered
- User Logged In
- Profile Updated

#### External Policies

None specific.

#### Notes

- V1: Platform Admin and Platform Support roles are pre-seeded, not self-registered.
- This domain does NOT manage Organization-level roles (that belongs to Organization domain).

---

### DOM-02: Organization

#### Classification: Supporting

**Why Supporting:** Organization management is necessary for multi-organizer operations but does not differentiate this platform. Standard RBAC and team management patterns apply.

#### Domain Purpose

Manage the lifecycle of Organizations on the platform — from application through approval, team management, and governance actions (suspension/ban).

#### Responsibilities

- Organization registration and approval.
- Team composition (invite, accept, remove, role change, ownership transfer).
- Permission Group assignment and enforcement.
- Organization profile management.
- Organization suspension and ban enforcement.

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Organization | Organization |
| Permission Group | Permission Group |
| Team Member | Team Member |
| Invitation | (referenced in BP-02) |
| Organization Suspension | Organization Suspension |
| Ban | Ban |

#### Business Rules Owned

| Rule | Description |
|---|---|
| BR-ORG-02 | Organization approval gate |
| BR-ORG-03 | Owner cannot remove self |
| BR-ORG-04 | Permission Group assignment |
| BR-ORG-05 | Organization profile defaults |
| BR-ORG-06 | Event ownership continuity on member removal |
| BR-ORG-07 | Suspension effects |
| BR-ORG-08 | Ban effects |

**Rule Count:** 7

#### Processes Involved

| Process | Role |
|---|---|
| BP-01 | Primary — Organization Onboarding |
| BP-02 | Primary — Team Management |
| BP-10 | Primary — Organization Suspension/Ban |
| BP-03 | Gate — Organization must be ACTIVE for event creation |

#### Capabilities Owned

| Capability | Description |
|---|---|
| ORG-01 | Register Organization |
| ORG-02 | Approve Organization |
| ORG-03 | Invite Team Member |
| ORG-04 | Accept Invitation |
| ORG-05 | Remove Team Member |
| ORG-06 | Change Member Role |
| ORG-07 | Transfer Ownership |
| ORG-08 | Update Organization Profile |
| ORG-09 | View Organization Dashboard |

**Capability Count:** 9

#### Primary Actors

- Attendee (applicant), Owner, Platform Operations, Platform Admin

#### State Machines Owned

| State Machine | Entity | States |
|---|---|---|
| SM-05 | Organization | PENDING_REVIEW, ACTIVE, SUSPENDED, BANNED |
| SM-08 | Invitation | PENDING, ACCEPTED, EXPIRED, REVOKED |

#### Upstream Dependencies

- **Identity & Access** — Applicant must have a registered account.

#### Downstream Dependencies

- **Event Management** — Organization must be ACTIVE for Events to be created.
- **Settlement & Payout** — Payouts are made to Organizations.
- **All org-scoped domains** — Organization status affects Event, Ticketing, Settlement operations.

#### Data Ownership

- Organization profile, team membership, permission assignments, invitation records.

#### Candidate Aggregate Roots

- **Organization** — Governs team composition, status, and permissions.

#### Candidate Entities

- Organization, Team Member, Invitation

#### Candidate Value Objects

- Organization Name, Organization Description, Contact Info, Permission Group

#### Domain Events (Business)

- Organization Application Submitted
- Organization Approved
- Organization Rejected
- Team Member Invited
- Invitation Accepted
- Team Member Removed
- Role Changed
- Ownership Transferred
- Organization Suspended
- Organization Suspension Lifted
- Organization Banned

#### External Policies

- Platform Operations review policy for organization approval.

#### Notes

- 7 business roles mapped to 3 V1 permission groups (ADR-009).
- Suspension and ban are platform governance actions, not self-service.

---

### DOM-03: Event Management

#### Classification: Core

**Why Core:** Event creation, approval, discovery, and lifecycle management form the primary value proposition of the platform. The quality control approval workflow, the publishing flow, and the event discovery experience are what differentiate this platform from a simple listing site.

#### Domain Purpose

Manage the full lifecycle of Events — from creation through approval, publication, execution, and completion.

#### Responsibilities

- Event creation and configuration.
- Approval workflow (submission → review → approve/reject).
- Publication and discovery (browse, search, view details).
- Event lifecycle transitions (ONGOING, COMPLETED, CANCELLED).
- Post-approval edit control (minor vs. major edit classification).
- Event cancellation and its downstream effects.

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Event | Event |
| Venue | Venue |
| Event Category | Event Category |
| Event Cancellation | Event Cancellation |

#### Business Rules Owned

| Rule | Description |
|---|---|
| BR-EVT-01 | Event approval gate |
| BR-EVT-02 | Post-sale edit lock |
| BR-EVT-03 | Minor edit pass-through |
| BR-EVT-04 | Major edit re-approval |
| BR-EVT-05 | Cancellation auto-refund trigger |
| BR-EVT-06 | Authorization for modify/cancel |
| BR-EVT-07 | Single Organization ownership |
| BR-EVT-08 | Minimum one Ticket Type for submission |

**Rule Count:** 8

#### Processes Involved

| Process | Role |
|---|---|
| BP-03 | Primary — Event Creation & Approval |
| BP-04 | Gate — Event must be PUBLISHED for ticket purchase |
| BP-07 | Gate — Event must be ONGOING for check-in |
| BP-09 | Trigger — Event COMPLETED initiates settlement |
| BP-10 | Affected — Events suspended/cancelled on Organization suspension/ban |

#### Capabilities Owned

| Capability | Description |
|---|---|
| EVT-01 | Create Event |
| EVT-02 | Edit Event (Minor) |
| EVT-03 | Edit Event (Major) |
| EVT-04 | Submit Event for Approval |
| EVT-05 | Approve / Reject Event |
| EVT-06 | Cancel Event |
| EVT-07 | Complete Event |
| EVT-08 | Browse / Search Events |
| EVT-09 | View Event Details |

**Capability Count:** 9

#### Primary Actors

- Event Manager, Platform Operations

#### State Machines Owned

| State Machine | Entity | States |
|---|---|---|
| SM-01 | Event | DRAFT, PENDING_REVIEW, APPROVED, REJECTED, PUBLISHED, ONGOING, COMPLETED, CANCELLED, SUSPENDED |

#### Upstream Dependencies

- **Organization** — Events belong to an ACTIVE Organization.
- **Identity & Access** — Actors must be authenticated.

#### Downstream Dependencies

- **Ticketing** — Ticket Types are defined as part of Event configuration.
- **Pricing & Promotion** — Pricing strategies and promotions are configured per Event/Ticket Type.
- **Refund & Cancellation** — Event cancellation triggers mass refund.
- **Settlement & Payout** — Event completion triggers settlement calculation.
- **Reviews** — Event must be COMPLETED for reviews.

#### Data Ownership

- Event details, venue, schedule, category, approval history, cancellation records.

#### Candidate Aggregate Roots

- **Event** — Central entity governing lifecycle, approval, and configuration.

#### Candidate Entities

- Event

#### Candidate Value Objects

- Event Title, Event Description, Venue, Schedule (start/end time), Event Category, Banner Image

#### Domain Events (Business)

- Event Created
- Event Submitted for Approval
- Event Approved
- Event Rejected
- Event Published
- Event Started (ONGOING)
- Event Completed
- Event Cancelled
- Event Suspended
- Event Suspension Lifted

#### External Policies

- Platform Operations content review policy.
- Minor vs. major edit classification policy.

#### Notes

- BR-EVT-05 (cancellation auto-refund) is owned by this domain but executed by the Refund domain. This is a cross-domain interaction.
- Event does NOT own Ticket Types. Ticket Types are owned by the Ticketing domain but are associated with an Event.

---

### DOM-04: Ticketing

#### Classification: Core

**Why Core:** Ticketing is the primary revenue-generating function. Inventory management, the purchase flow, reservation mechanics, waitlist conversion, and check-in are central to the platform's value. Getting these right determines platform success.

#### Domain Purpose

Manage ticket types, inventory, the purchase lifecycle, reservations, waitlist, and venue check-in.

#### Responsibilities

- Ticket Type definition (name, capacity, sales window).
- Inventory management (available, reserved, sold).
- Reservation lifecycle (temporary hold during checkout).
- Order creation and lifecycle.
- Ticket issuance upon successful payment.
- Waitlist management (FIFO queue, notification, conversion).
- Check-in at venue (QR code validation).
- Purchase limit enforcement.
- Refund request initiation.

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Ticket Type | Ticket Type |
| Ticket | Ticket |
| Capacity | Capacity |
| Sales Window | Sales Window |
| Reservation | Reservation |
| Reservation Expiration Period | Reservation Expiration Period |
| Purchase Limit | Purchase Limit |
| Order | Order |
| Check-in | Check-in |
| QR Code | QR Code |
| Waitlist | Waitlist |

#### Business Rules Owned

| Rule | Description |
|---|---|
| BR-TKT-01 | Published Event gate for purchase |
| BR-TKT-02 | Capacity enforcement |
| BR-TKT-03 | Sales Window enforcement |
| BR-TKT-04 | Unique QR / single scan |
| BR-TKT-05 | Reservation TTL (Default Platform Policy: 15 min) |
| BR-TKT-06 | Non-transferable tickets |
| BR-TKT-07 | Multi-ticket orders allowed |
| BR-TKT-08 | Single-event Order constraint |
| BR-TKT-09 | Purchase limit (Default Platform Policy: 10 tickets) |

**Rule Count:** 9

#### Processes Involved

| Process | Role |
|---|---|
| BP-04 | Primary — Ticket Purchase |
| BP-05 | Primary — Group Purchase (Leader Pays All) |
| BP-06 | Primary — Waitlist |
| BP-07 | Primary — Check-in |
| BP-08 | Trigger — Refund request originates from ticket owner |
| BP-03 | Contributor — Ticket Types defined during Event creation |

#### Capabilities Owned

| Capability | Description |
|---|---|
| TKT-01 | Define Ticket Types |
| TKT-02 | Configure Pricing Strategy |
| TKT-03 | Purchase Tickets |
| TKT-04 | Group Purchase (Leader Pays All) |
| TKT-05 | View My Tickets |
| TKT-06 | Join Waitlist |
| TKT-07 | Notify Waitlist |
| TKT-08 | Check-in (QR Scan) |
| TKT-09 | Request Refund |

**Capability Count:** 9

#### Primary Actors

- Attendee (purchaser), Event Manager (configurer), Check-in Staff (scanner)

#### State Machines Owned

| State Machine | Entity | States |
|---|---|---|
| SM-02 | Order | PENDING_PAYMENT, CONFIRMED, EXPIRED, CANCELLED |
| SM-03 | Ticket | ISSUED, CHECKED_IN, REFUNDED, CANCELLED |
| SM-04 | Reservation | ACTIVE, CONSUMED, EXPIRED |
| SM-09 | Waitlist Entry | QUEUED, NOTIFIED, PURCHASED, EXPIRED |

#### Upstream Dependencies

- **Event Management** — Events must be PUBLISHED for ticket sales.
- **Identity & Access** — Attendees must be authenticated.
- **Pricing & Promotion** — Final price determined by Pricing Pipeline.

#### Downstream Dependencies

- **Payment** — Payment processing for confirmed checkout.
- **Refund & Cancellation** — Ticket refunds change ticket state.
- **Engagement** — Attendance and spending data captured post-purchase/check-in.
- **Settlement & Payout** — Revenue from ticket sales feeds settlement.

#### Data Ownership

- Ticket Type definitions, tickets, orders, reservations, waitlist entries, check-in records.

#### Candidate Aggregate Roots

- **Order** — Governs purchase transaction, reservation, and ticket issuance.
- **Ticket Type** — Governs inventory (capacity, sales window).

#### Candidate Entities

- Order, Ticket, Reservation, Waitlist Entry, Ticket Type

#### Candidate Value Objects

- Ticket Type Name, QR Code Data, Seat Assignment (future), Check-in Timestamp, Reservation Expiry Time

#### Domain Events (Business)

- Ticket Type Created
- Ticket Type Sold Out
- Order Created
- Order Confirmed
- Order Expired
- Ticket Issued
- Ticket Checked In
- Ticket Refunded
- Ticket Cancelled
- Reservation Created
- Reservation Consumed
- Reservation Expired
- Waitlist Joined
- Waitlist Notified
- Waitlist Purchase Completed
- Waitlist Entry Expired

#### External Policies

- Reservation TTL policy (configurable).
- Purchase limit policy (configurable).

#### Notes

- TKT-02 (Configure Pricing Strategy) is owned by Ticketing but delegates pricing calculation to the Pricing & Promotion domain.
- TKT-09 (Request Refund) is owned by Ticketing as the initiation point but the refund processing is owned by Refund & Cancellation.

---

### DOM-05: Pricing & Promotion

#### Classification: Core

**Why Core:** The Pricing Pipeline (Base Price → Strategy → Promotion → Final Selling Price) is a key differentiator. Early Bird strategies, voucher codes, group discounts, and the best-benefit selection algorithm represent unique business logic that creates competitive advantage.

#### Domain Purpose

Determine the final selling price for a ticket through a multi-stage pricing pipeline that applies strategies and promotions.

#### Responsibilities

- Pricing Strategy management (Early Bird definition, date-based auto-revert).
- Voucher Code creation and validation.
- Group Discount configuration and threshold evaluation.
- Pricing Pipeline execution (Base → Strategy → Promotion → Final).
- Discount stacking prevention (single discount rule).
- Best benefit selection when multiple promotions are applicable.
- Price transparency (show breakdown to Attendee).
- Promotion performance tracking.

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Base Price | Base Price |
| Pricing Strategy | Pricing Strategy |
| Early Bird | Early Bird |
| Pricing Pipeline | Pricing Pipeline |
| Final Selling Price | Final Selling Price |
| Voucher Code | Voucher Code |
| Group Discount | Group Discount |
| Best Benefit Selection | Best Benefit Selection |
| Promotion | Promotion |

#### Business Rules Owned

| Rule | Description |
|---|---|
| BR-PRC-01 | Early Bird definition per Ticket Type |
| BR-PRC-02 | Auto-revert to base price after Early Bird window |
| BR-PRC-03 | Single active Pricing Strategy per Ticket Type |
| BR-PRC-04 | Price transparency (breakdown visible) |
| BR-PRC-05 | Pricing Pipeline sequence |
| BR-PRM-01 | Voucher scope (Event-specific or platform-wide) |
| BR-PRM-02 | Group Discount threshold |
| BR-PRM-03 | No discount stacking |
| BR-PRM-04 | Best benefit selection |

**Rule Count:** 9

#### Processes Involved

| Process | Role |
|---|---|
| BP-04 | Contributor — Price calculation during checkout (steps 3–7) |
| BP-05 | Contributor — Group Discount evaluation during group purchase |
| BP-03 | Contributor — Pricing Strategy configured during Event creation |

#### Capabilities Owned

| Capability | Description |
|---|---|
| PRM-01 | Create Voucher Code |
| PRM-02 | Configure Group Discount |
| PRM-03 | Apply Promotion at Checkout |
| PRM-04 | View Promotion Performance |

**Capability Count:** 4

> Note: TKT-02 (Configure Pricing Strategy) is listed under Ticketing capabilities but involves Pricing & Promotion domain logic. This is a shared boundary — Ticketing owns the configuration UI, Pricing & Promotion owns the calculation engine.

#### Primary Actors

- Event Manager (configuration), Marketing Manager (vouchers), System (auto-calculation)

#### State Machines Owned

None — Pricing and Promotion entities are stateless (applied at calculation time, not lifecycle-managed).

#### Upstream Dependencies

- **Ticketing** — Base Price is defined per Ticket Type.
- **Event Management** — Pricing strategies and promotions are scoped to Events.

#### Downstream Dependencies

- **Ticketing** — Final Selling Price determines Order total.
- **Payment** — Payment amount based on final calculated price.
- **Settlement & Payout** — Commission calculated on discounted price (BR-PAY-08).

#### Data Ownership

- Pricing Strategy definitions, Voucher Code records, Group Discount configurations, promotion usage history.

#### Candidate Aggregate Roots

- **Voucher Code** — Governs usage tracking, validity, and scope.

#### Candidate Entities

- Pricing Strategy (Early Bird), Voucher Code, Group Discount

#### Candidate Value Objects

- Base Price, Final Selling Price, Discount Amount, Discount Percentage, Early Bird Window (start/end dates), Voucher Validity Period, Group Threshold

#### Domain Events (Business)

- Early Bird Activated
- Early Bird Expired (reverted to base price)
- Voucher Code Created
- Voucher Code Applied
- Voucher Code Exhausted
- Group Discount Applied

#### External Policies

None specific.

#### Notes

- V1 supports only one Pricing Strategy: Early Bird. The domain should be designed to accommodate additional strategies in future versions.
- OBS-01 (Voucher discount type) and OBS-02 (Group discount tiers) from the Business Rules Specification are still open observations awaiting PO resolution.

---

### DOM-06: Payment

#### Classification: Generic

**Why Generic:** Payment processing is a commodity function delegated to external gateways. Business logic is explicitly gateway-agnostic (ADR-010). The platform's competitive advantage does not come from how payments are processed.

#### Domain Purpose

Process financial transactions through external Payment Gateways in a gateway-agnostic manner.

#### Responsibilities

- Payment initiation (redirect to gateway).
- Payment callback handling (success/failure/timeout).
- Payment idempotency (reject duplicate callbacks).
- Commission calculation.
- Payment method recording (for refund routing).

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Payment | Payment |
| Payment Gateway | Payment Gateway |
| Commission | Commission |

#### Business Rules Owned

| Rule | Description |
|---|---|
| BR-PAY-01 | Commission model (percentage-based) |
| BR-PAY-03 | Refund via original payment method |
| BR-PAY-04 | Transaction immutability |
| BR-PAY-05 | Payment idempotency |

**Rule Count:** 4

#### Processes Involved

| Process | Role |
|---|---|
| BP-04 | Contributor — Payment processing (steps 11–13) |
| BP-05 | Contributor — Payment for group purchase |
| BP-08 | Contributor — Refund payment return |

#### Capabilities Owned

| Capability | Description |
|---|---|
| PAY-01 | Process Payment |
| PAY-02 | Handle Payment Status Update |
| PAY-03 | Calculate Commission |

**Capability Count:** 3

#### Primary Actors

- System (payment initiation/callback), Attendee (payer)

#### State Machines Owned

None — Payment does not have its own lifecycle. Payment status is reflected in Order state transitions.

#### Upstream Dependencies

- **Ticketing** — Order triggers payment initiation.
- **Pricing & Promotion** — Final Selling Price determines payment amount.

#### Downstream Dependencies

- **Ticketing** — Payment success/failure determines Order state transition.
- **Refund & Cancellation** — Original payment method needed for refund routing.
- **Settlement & Payout** — Commission feeds into settlement calculation.

#### Data Ownership

- Payment transaction records, commission records, gateway references.

#### Candidate Aggregate Roots

- **Payment** — Governs transaction record and gateway interaction.

#### Candidate Entities

- Payment Transaction

#### Candidate Value Objects

- Payment Amount, Commission Amount, Commission Rate, Gateway Reference, Payment Method

#### Domain Events (Business)

- Payment Initiated
- Payment Succeeded
- Payment Failed
- Commission Recorded

#### External Policies

- Payment Gateway terms of service (ZaloPay in V1, gateway-agnostic by design).

#### Notes

- ADR-010: Business logic is gateway-agnostic. "ZaloPay" is infrastructure, not domain.
- V1: Commission is percentage-based only (no fixed-fee or hybrid models).

---

### DOM-07: Refund & Cancellation

#### Classification: Supporting

**Why Supporting:** Refund processing is necessary for consumer protection and trust but follows industry-standard patterns. The approval workflow and fault-based cost allocation add business complexity but don't create competitive differentiation.

#### Domain Purpose

Manage refund requests, approvals, and the financial/inventory consequences of refunds and event cancellations.

#### Responsibilities

- Refund request submission and routing.
- Refund eligibility determination (Refund Cutoff Period).
- Manual approval workflow (Platform Finance or Platform Support).
- Automatic refund on Event cancellation.
- Fault-based cost allocation (platform fault, organizer fault, force majeure).
- Inventory restoration on refund.
- Coordination with Waitlist on inventory restoration.

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Refund | Refund |
| Refund Cutoff Period | Refund Cutoff Period |
| Force Majeure | Force Majeure |

#### Business Rules Owned

| Rule | Description |
|---|---|
| BR-REF-01 | Manual approval required for individual refunds |
| BR-REF-02 | Automatic 100% refund on event cancellation |
| BR-REF-03 | Platform-fault cost allocation |
| BR-REF-04 | Organizer-fault cost allocation |
| BR-REF-05 | Force Majeure cost allocation |
| BR-REF-06 | Inventory restoration on refund |
| BR-REF-07 | Refund Cutoff Period (Default Platform Policy: 48 hours) |

**Rule Count:** 7

#### Processes Involved

| Process | Role |
|---|---|
| BP-08 | Primary — Refund processing |
| BP-10 | Triggered by — Organization ban triggers mass auto-refund |
| BP-06 | Triggers — Inventory restoration notifies waitlist |
| BP-09 | Affects — Refund amounts subtracted from settlement |

#### Capabilities Owned

| Capability | Description |
|---|---|
| PAY-07 | Process Refund |

> Note: TKT-09 (Request Refund) is the initiation point in the Ticketing domain. PAY-07 (Process Refund) is the execution capability owned by this domain.

**Capability Count:** 1

#### Primary Actors

- Attendee (requester), Platform Finance (normal approval), Platform Support (exceptional approval)

#### State Machines Owned

| State Machine | Entity | States |
|---|---|---|
| SM-07 | Refund Request | PENDING_REVIEW, APPROVED, REJECTED |

#### Upstream Dependencies

- **Ticketing** — Refund requests originate from ticket owners.
- **Event Management** — Event cancellation triggers mass refund.
- **Payment** — Original payment method needed for refund routing.

#### Downstream Dependencies

- **Ticketing** — Ticket state transitions to REFUNDED. Inventory restored.
- **Ticketing** — Inventory restoration triggers Waitlist notification.
- **Settlement & Payout** — Refund amounts subtracted from settlement.

#### Data Ownership

- Refund request records, approval/rejection history, fault classification, cost allocation records.

#### Candidate Aggregate Roots

- **Refund Request** — Governs the approval lifecycle and cost allocation.

#### Candidate Entities

- Refund Request

#### Candidate Value Objects

- Refund Amount, Refund Reason, Fault Type (Platform/Organizer/Force Majeure), Refund Cutoff Timestamp

#### Domain Events (Business)

- Refund Requested
- Refund Approved
- Refund Rejected
- Mass Refund Initiated (Event Cancellation)
- Inventory Restored

#### External Policies

- Consumer protection regulations (refund rights).
- Platform refund policy (Refund Cutoff Period).

#### Notes

- The refund domain has a "bi-directional" relationship with Ticketing: it receives refund requests from Ticketing (TKT-09) and sends ticket state changes back (REFUNDED).
- Automatic refunds on Event cancellation bypass the Refund Request lifecycle (no PENDING_REVIEW — directly processed).
- OBS-04 (partial refund support) from Business Processes remains unresolved.

---

### DOM-08: Settlement & Payout

#### Classification: Supporting

**Why Supporting:** Settlement is critical for financial operations but follows a standard financial reconciliation pattern. The calculation formula and cooling period are business-specific, but the overall pattern is not unique.

#### Domain Purpose

Calculate the net amount owed to Organizations after Event completion and manage the payout process.

#### Responsibilities

- Cooling Period management (delay between Event completion and settlement).
- Settlement calculation (Gross − Commission − Refunds = Net).
- Settlement review and approval workflow.
- Payout initiation and completion tracking.
- Revenue reporting.
- Financial dispute resolution.

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Settlement | Settlement |
| Cooling Period | Cooling Period |
| Payout | Payout |

#### Business Rules Owned

| Rule | Description |
|---|---|
| BR-PAY-02 | Settlement formula |
| BR-PAY-06 | Settlement Cooling Period (Default Platform Policy: 7 days) |
| BR-PAY-07 | Manual payout |
| BR-PAY-08 | Commission on discounted price |

**Rule Count:** 4

#### Processes Involved

| Process | Role |
|---|---|
| BP-09 | Primary — Settlement & Payout |
| BP-10 | Affected — Payouts frozen on Organization suspension |

#### Capabilities Owned

| Capability | Description |
|---|---|
| PAY-04 | Generate Settlement |
| PAY-05 | Review Settlement |
| PAY-06 | Process Payout |
| PAY-08 | View Revenue Report |
| PAY-09 | View Transaction History |

**Capability Count:** 5

#### Primary Actors

- Platform Finance (reviewer/approver), Finance Manager (reports)

#### State Machines Owned

| State Machine | Entity | States |
|---|---|---|
| SM-06 | Settlement | PENDING_CALCULATION, PENDING_REVIEW, APPROVED, UNDER_REVIEW, PAID |
| SM-10 | Payout | PENDING, COMPLETED |

#### Upstream Dependencies

- **Event Management** — Event completion triggers settlement.
- **Ticketing** — Order amounts feed gross revenue.
- **Payment** — Commission amounts feed settlement calculation.
- **Refund & Cancellation** — Refund amounts subtracted from settlement.
- **Organization** — Payout target is the Organization. Payouts frozen/processed on suspension/ban.

#### Downstream Dependencies

None (terminal financial domain).

#### Data Ownership

- Settlement records, payout records, revenue reports, dispute records.

#### Candidate Aggregate Roots

- **Settlement** — Governs financial calculation, review, and approval.

#### Candidate Entities

- Settlement, Payout

#### Candidate Value Objects

- Gross Revenue, Net Settlement Amount, Commission Total, Refund Total, Cooling Period End Date, Bank Account Details

#### Domain Events (Business)

- Settlement Calculation Initiated
- Settlement Ready for Review
- Settlement Approved
- Settlement Disputed
- Payout Initiated
- Payout Completed
- Payout Frozen (Organization suspension)
- Payout Unfrozen (Suspension lifted)

#### External Policies

- Financial reconciliation policies.
- Banking/transfer regulations.

#### Notes

- Payout is manual in V1 (ADR-008).
- Payouts already completed are NOT clawed back on Organization ban (Charter Section 8.10).
- Settlement has the most complex state machine among financial entities (5 states, 6 transitions).

---

### DOM-09: Reviews & Ratings

#### Classification: Supporting

**Why Supporting:** Reviews add value to the platform by building trust and helping Attendees make informed decisions, but they are a standard feature found on every marketplace. No competitive advantage from review mechanics.

#### Domain Purpose

Enable Attendees to share feedback about Events and enable the platform to moderate content.

#### Responsibilities

- Review submission (rating + text).
- Review display.
- Content moderation (policy violation removal).
- Attendance verification (only attended Attendees can review).

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Review | Review |

#### Business Rules Owned

| Rule | Description |
|---|---|
| BR-REV-01 | Review eligibility — checked in OR verified completed purchase (ADR-018) |
| BR-REV-02 | Cancelled events are not reviewable |
| BR-REV-03 | One review per Attendee per Event |
| BR-REV-04 | Reviews cannot be edited after posting (delete only) |
| BR-REV-05 | Platform Operations can remove reviews that violate content policy |

**Rule Count:** 5

#### Processes Involved

No dedicated Business Process in Charter Section 8. Reviews are a capability-level feature (Charter Section 7, REV-01 to REV-03).

#### Capabilities Owned

| Capability | Description |
|---|---|
| REV-01 | Submit Review |
| REV-02 | View Reviews |
| REV-03 | Moderate Reviews |

**Capability Count:** 3

#### Primary Actors

- Attendee (reviewer), Guest (viewer), Platform Operations (moderator)

#### State Machines Owned

None — Reviews are submitted and either visible or removed. No formal lifecycle.

#### Upstream Dependencies

- **Ticketing** — Attendance verification requires Ticket in CHECKED_IN status.
- **Event Management** — Reviews are associated with Events.
- **Identity & Access** — Reviewers must be authenticated.

#### Downstream Dependencies

- **Event Management** — Review scores displayed on Event details.

#### Data Ownership

- Review records, ratings, moderation actions.

#### Candidate Aggregate Roots

- **Review** — Governs the review record and moderation status.

#### Candidate Entities

- Review

#### Candidate Value Objects

- Rating (1–5), Review Text, Moderation Status, Submission Timestamp

#### Domain Events (Business)

- Review Submitted
- Review Moderated (removed)

#### External Policies

- Content moderation policy.

#### Notes

- Reviews do NOT have a dedicated Charter process (Section 8). They are capability-only.
- The "Attendance verification" rule (BR-REV-01) creates a dependency on the Ticketing domain's check-in status.

---

### DOM-10: Engagement Tracking

#### Classification: Supporting

**Why Supporting:** V1 engagement tracking is passive data collection only (attendance + spending). No ranking, gamification, or personalization in V1 (ADR-012). Necessary to support future analytics but not differentiating in current scope.

#### Domain Purpose

Collect and expose engagement data about Attendees (attendance history, spending patterns) for future personalization and analytics.

#### Responsibilities

- Attendance recording (on check-in).
- Spending recording (on order confirmation).
- Engagement data queries.

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Engagement Tracking | Engagement Tracking |

#### Business Rules Owned

None — Engagement tracking is governed by ADR-012 (no explicit business rules). Data collection is a passive consequence of other domain events (check-in, purchase).

**Rule Count:** 0

#### Processes Involved

| Process | Role |
|---|---|
| BP-04 | Data source — Spending recorded on order confirmation |
| BP-07 | Data source — Attendance recorded on check-in |

#### Capabilities Owned

| Capability | Description |
|---|---|
| ENG-01 | Track Attendance |
| ENG-02 | Track Spending |
| ENG-03 | Query Engagement Data |

**Capability Count:** 3

#### Primary Actors

- System (automatic capture), Organization (queries)

#### State Machines Owned

None — Engagement data is append-only. No lifecycle.

#### Upstream Dependencies

- **Ticketing** — Check-in triggers attendance capture. Order confirmation triggers spending capture.

#### Downstream Dependencies

None in V1 (future: personalization, recommendations, loyalty tiers).

#### Data Ownership

- Attendance records, spending records, engagement summaries.

#### Candidate Aggregate Roots

None — Engagement data is an append-only record. No aggregate governance needed.

#### Candidate Entities

- Engagement Record

#### Candidate Value Objects

- Attendance Fact (Event, Attendee, Timestamp), Spending Fact (Event, Attendee, Amount)

#### Domain Events (Business)

- Attendance Recorded
- Spending Recorded

#### External Policies

None specific.

#### Notes

- ADR-012: V1 is passive tracking only. No ranks, gamification, or personalization.
- This domain consumes events from other domains — it does not produce events that other domains depend on.

---

### DOM-11: Platform Operations

#### Classification: Generic

**Why Generic:** Notifications, audit logging, and content moderation are standard operational capabilities found on every platform. No competitive advantage from how notifications are sent or audit logs are stored.

#### Domain Purpose

Provide cross-cutting operational capabilities: notifications, audit logging, and content moderation.

#### Responsibilities

- Notification template management and delivery.
- Audit log recording and querying.
- Content moderation (non-review content).
- Organization governance execution (suspension/ban operational effects).

#### Business Concepts

| Concept | Glossary Term |
|---|---|
| Platform Admin | Platform Admin |
| Platform Operations | Platform Operations |
| Platform Finance | Platform Finance |
| Audit Log | Audit Log |
| Notification | Notification |

#### Business Rules Owned

| Rule | Description |
|---|---|
| BR-AUD-01 | Audit log mandatory for state changes |
| BR-AUD-02 | Audit log immutability |
| BR-AUD-03 | Audit entry schema |

**Rule Count:** 3

#### Processes Involved

| Process | Role |
|---|---|
| All processes | Cross-cutting — Audit logging and notifications throughout |
| BP-10 | Operational execution — Suspension/ban enforcement |

#### Capabilities Owned

| Capability | Description |
|---|---|
| OPS-01 | Manage Notification Templates |
| OPS-02 | Send Notification |
| OPS-03 | View Audit Log |
| OPS-04 | Moderate Content |
| OPS-05 | Suspend Organization |
| OPS-06 | Lift Suspension |
| OPS-07 | Ban Organization |

**Capability Count:** 7

> Note: OPS-05, OPS-06, OPS-07 (Suspend/Lift/Ban) are operational execution capabilities. The business rules governing suspension and ban (BR-ORG-07, BR-ORG-08) are owned by the Organization domain. Platform Operations executes the operational effects.

#### Primary Actors

- Platform Admin, Platform Operations, Platform Finance, Platform Support

#### State Machines Owned

None — Notifications and audit logs do not have lifecycles. Suspension/ban state is owned by the Organization domain.

#### Upstream Dependencies

- **All domains** — Every domain produces events that require notifications and audit entries.

#### Downstream Dependencies

None (terminal operational domain).

#### Data Ownership

- Notification records, notification templates, audit log entries.

#### Candidate Aggregate Roots

None — Operations data is append-only (audit logs, notifications).

#### Candidate Entities

- Notification Template, Audit Log Entry, Notification Record

#### Candidate Value Objects

- Notification Channel (email, in-app), Audit Entry (actor, action, timestamp, before/after), Template Content

#### Domain Events (Business)

- Notification Sent
- Audit Entry Created
- Content Moderated

#### External Policies

- Content moderation policy.
- Data retention policy (audit log retention).

#### Notes

- OPS-05/06/07 create a shared boundary with the Organization domain. The Organization domain owns the business rules; Platform Operations owns the operational execution.
- Audit logging is a cross-cutting concern that applies to all domains but is centrally managed here.

---

## Domain Classification Summary

| Domain | ID | Classification | Rule Count | Capability Count | State Machines |
|---|---|---|---|---|---|
| Identity & Access | DOM-01 | Generic | 1 | 5 | 0 |
| Organization | DOM-02 | Supporting | 7 | 9 | 2 (Organization, Invitation) |
| Event Management | DOM-03 | Core | 8 | 9 | 1 (Event) |
| Ticketing | DOM-04 | Core | 9 | 9 | 4 (Order, Ticket, Reservation, Waitlist Entry) |
| Pricing & Promotion | DOM-05 | Core | 9 | 4 | 0 |
| Payment | DOM-06 | Generic | 4 | 3 | 0 |
| Refund & Cancellation | DOM-07 | Supporting | 7 | 1 | 1 (Refund Request) |
| Settlement & Payout | DOM-08 | Supporting | 4 | 5 | 2 (Settlement, Payout) |
| Reviews & Ratings | DOM-09 | Supporting | 5 | 3 | 0 |
| Engagement Tracking | DOM-10 | Supporting | 0 | 3 | 0 |
| Platform Operations | DOM-11 | Generic | 3 | 7 | 0 |
| **TOTAL** | | **3 Core / 5 Supporting / 3 Generic** | **57** | **58** | **10** |

---

## Domain Boundaries & Interactions

### Context Boundaries

Each domain represents a candidate Bounded Context. Within each context, the Ubiquitous Language has precise, unambiguous meaning.

| Domain | Boundary Definition |
|---|---|
| Identity & Access | Owns the concept of "who you are." Does NOT know about Organizations, Events, or Tickets. |
| Organization | Owns "team structure and governance." Knows about permission groups but NOT about specific Event details. |
| Event Management | Owns "what happens and when." Knows about Event lifecycle but NOT about ticket inventory or pricing. |
| Ticketing | Owns "who can attend and how they get in." Knows about tickets, inventory, orders, but NOT about how prices are calculated. |
| Pricing & Promotion | Owns "how much it costs." Knows about pricing rules but NOT about inventory or payment mechanics. |
| Payment | Owns "how money moves." Gateway-agnostic transaction processing. Does NOT know about business policies. |
| Refund & Cancellation | Owns "money back." Knows about refund eligibility and fault allocation but NOT about settlement timing. |
| Settlement & Payout | Owns "organizer gets paid." Knows about financial aggregation but NOT about individual transaction details. |
| Reviews & Ratings | Owns "what attendees think." Knows about review content but NOT about ticket purchase details. |
| Engagement Tracking | Owns "attendee behavior data." Passively consumes events. No active business logic. |
| Platform Operations | Owns "operational tooling." Cross-cutting notifications and audit. Does NOT own business state of other domains. |

### Shared Concepts

Some business concepts appear at the boundaries between domains. Ownership must be explicit to prevent ambiguity:

| Concept | Owner | Consumers | Resolution |
|---|---|---|---|
| User Identity | Identity & Access | All domains | Domains reference User ID. Only Identity owns user profile data. |
| Organization Status | Organization | Event Management, Settlement, Platform Ops | Domains react to Organization status changes. Only Organization domain can change it. |
| Event Status | Event Management | Ticketing, Settlement, Reviews, Refund | Domains react to Event state transitions. Only Event Management can change it. |
| Ticket Status | Ticketing | Refund, Engagement, Check-in | Only Ticketing can transition ticket state. Refund requests status change through Ticketing. |
| Final Selling Price | Pricing & Promotion (calculated) | Ticketing (applied to Order), Payment (charged), Settlement (aggregated) | Pricing calculates. Ticketing records. Payment charges. Settlement aggregates. |
| Commission | Payment (calculated) | Settlement (aggregated) | Payment domain calculates per-order. Settlement domain aggregates per-event. |

### Ownership Boundaries

Every business concept has exactly **one** owning domain:

| Data Category | Owner |
|---|---|
| User accounts, profiles, credentials | Identity & Access |
| Organization profiles, teams, invitations | Organization |
| Event details, schedule, approval history | Event Management |
| Ticket types, tickets, orders, reservations, waitlist, check-in | Ticketing |
| Pricing strategies, voucher codes, group discounts | Pricing & Promotion |
| Payment transactions, commission records | Payment |
| Refund requests, cost allocation | Refund & Cancellation |
| Settlements, payouts, revenue reports | Settlement & Payout |
| Reviews, ratings, moderation records | Reviews & Ratings |
| Attendance records, spending records | Engagement Tracking |
| Audit logs, notification templates/records | Platform Operations |

### Cross-Domain Interactions

| Interaction | From | To | Nature |
|---|---|---|---|
| Organization active → Event creation enabled | Organization | Event Management | Gate (Organization status) |
| Event published → Ticket sales enabled | Event Management | Ticketing | Gate (Event status) |
| Checkout → Price calculation | Ticketing | Pricing & Promotion | Query (calculate final price) |
| Order confirmed → Payment processed | Ticketing | Payment | Command (initiate payment) |
| Payment result → Order state transition | Payment | Ticketing | Callback (success/failure) |
| Ticket refunded → Inventory restored | Refund & Cancellation | Ticketing | Command (restore inventory) |
| Inventory restored → Waitlist notified | Ticketing | Ticketing | Internal (waitlist trigger) |
| Event completed → Settlement initiated | Event Management | Settlement & Payout | Trigger (cooling period starts) |
| Refund processed → Settlement adjusted | Refund & Cancellation | Settlement & Payout | Data feed (refund amounts) |
| Check-in → Attendance recorded | Ticketing | Engagement Tracking | Data feed (attendance fact) |
| Order confirmed → Spending recorded | Ticketing | Engagement Tracking | Data feed (spending fact) |
| Check-in → Review eligibility | Ticketing | Reviews & Ratings | Gate (CHECKED_IN status) |
| Event cancelled → Mass refund | Event Management | Refund & Cancellation | Command (auto-refund all) |
| Org suspended → Events suspended | Organization | Event Management | Command (suspend events) |
| Org banned → Events cancelled → Mass refund | Organization | Event Mgmt → Refund | Chain (ban → cancel → refund) |
| All state changes → Audit logged | All domains | Platform Operations | Cross-cutting (audit) |
| Key transitions → Notifications sent | All domains | Platform Operations | Cross-cutting (notification) |

### Anti-Corruption Considerations (Business Perspective)

| Boundary | Risk | Mitigation |
|---|---|---|
| Payment ↔ Ticketing | Payment Gateway terminology (e.g., "charge", "capture") may leak into Ticketing language. | Ticketing speaks in "Order" and "Payment" terms. Payment domain translates to/from gateway terms. |
| Pricing ↔ Ticketing | Pricing logic leaking into checkout flow makes both domains rigid. | Ticketing asks "what is the final price?" — it does NOT know how it's calculated. |
| Organization ↔ Event Management | Organization governance rules leaking into Event rules. | Event Management reacts to Organization status changes — it does NOT enforce Organization policies. |
| Refund ↔ Ticketing | Refund processing logic leaking into ticket management. | Ticketing initiates refund requests. Refund domain processes them. Ticketing receives the state change result. |
| Settlement ↔ Payment | Settlement calculation leaking financial aggregation into payment processing. | Payment records individual transactions. Settlement aggregates. No reverse dependency. |

---

## Observations

> [!NOTE]
> The following observations were identified during domain discovery. They are NOT new business rules.

| ID | Observation | Domain |
|---|---|---|
| OBS-09 | The Refund & Cancellation domain owns only 1 capability (PAY-07) but 7 business rules, making it rule-dense relative to its capability surface. This suggests the domain's complexity is in decision-making (approval workflow, fault allocation) rather than user-facing features. | DOM-07 |
| OBS-10 | Engagement Tracking (DOM-10) owns 0 business rules and 0 state machines. It is a pure data consumer. Consider whether it warrants a standalone domain or should be a sub-capability of Platform Operations. Decision: keep it separate because it has distinct data ownership and future extensibility (ADR-012 mentions future personalization). | DOM-10 |
| OBS-11 | The Event Cancellation concept is defined in the Glossary under Domain 7 (Refund & Cancellation) but the cancellation trigger is owned by Event Management (BR-EVT-05, EVT-06). The Refund domain handles the financial consequence, not the cancellation decision itself. This is a correct cross-domain interaction, not a misplacement. | DOM-03, DOM-07 |
| OBS-12 | Platform Operations capabilities OPS-05/06/07 (Suspend/Lift/Ban) could be argued to belong to the Organization domain. They are placed in Platform Operations because they represent platform governance actions, not self-service organization management. The Organization domain owns the rules (BR-ORG-07/08); Platform Operations provides the operational mechanism. | DOM-02, DOM-11 |

---

> **End of Domain Discovery V1.1**
