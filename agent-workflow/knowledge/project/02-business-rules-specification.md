# BUSINESS RULES SPECIFICATION — Eventing Platform V1

> **Document ID:** EV-BR-001
> **Version:** 1.1 (Baselined)
> **Status:** ✅ APPROVED — Baselined
> **Last Updated:** 2026-07-06
> **Dependency:** Project Charter V2.3 (EV-PC-001), Business Glossary V1.1 (EV-GL-001)
> **Deliverable #:** Phase 1, Item 3

---

## Purpose

This specification expands every business rule from the Project Charter into a formal, implementable definition. Each rule includes its type, trigger conditions, business outcomes, exceptions, and cross-references.

This document is **implementation-independent**. It describes only business intent, conditions, triggers, exceptions, and outcomes. Technical enforcement (database constraints, API validation, infrastructure) belongs to later design phases.

---

## Rule Type Classification

| Type | Symbol | Description |
|---|---|---|
| **Constraint** | 🔒 | An invariant that must always hold true. Violations must be prevented. |
| **Computation** | 🔢 | A formula or algorithm that produces a derived value. |
| **Action-Enabling** | ✅ | A precondition that must be satisfied before an action can proceed. |
| **Process** | ⚙️ | A rule that defines sequencing, workflow, or state transitions. |

---

## Domain 1: Event Management

### BR-EVT-01 — Event Approval Gate  ·  ⚙️ Process

An Event must be approved by Platform Operations before it becomes visible to Attendees.

- **Condition:** Event has been submitted with all required fields populated.
- **Trigger:** Event Manager submits Event for review.
- **Outcome (approved):** Event becomes APPROVED → PUBLISHED (visible to Attendees).
- **Outcome (rejected):** Event becomes REJECTED with a reason. Event Manager may edit and re-submit.
- **Related:** BR-EVT-08

---

### BR-EVT-02 — Post-Sale Edit Lock  ·  🔒 Constraint

Cannot modify major Event attributes after tickets have been sold.

- **Major attributes:** Date, venue, capacity, ticket pricing, ticket inventory.
- **Condition:** Event has one or more confirmed Orders (tickets sold).
- **Trigger:** Any attempt to modify a major attribute.
- **Outcome:** Modification is rejected. Event cancellation is the only recourse.
- **Exception:** None. This is an absolute constraint.
- **Related:** BR-EVT-04, BR-EVT-05 · ADR-016

---

### BR-EVT-03 — Minor Edit Pass-Through  ·  ✅ Action-Enabling

Minor edits to an approved Event do not require re-approval.

- **Minor attributes:** Description, banner image, FAQ, contact info.
- **Condition:** Event is in APPROVED or PUBLISHED status.
- **Trigger:** Event Manager edits a minor attribute.
- **Outcome:** Change is applied immediately. Event status is unchanged.
- **Related:** BR-EVT-02, BR-EVT-04 · ADR-016

---

### BR-EVT-04 — Major Edit Re-Approval  ·  ⚙️ Process

Major edits to an approved Event with no tickets sold revert the Event to PENDING_REVIEW.

- **Condition:** Event is APPROVED or PUBLISHED with zero confirmed Orders.
- **Trigger:** Event Manager edits a major attribute.
- **Outcome:** Event status reverts to PENDING_REVIEW. Event becomes invisible until re-approved.
- **Guard:** If tickets ARE sold → BR-EVT-02 blocks the edit entirely.
- **Related:** BR-EVT-02, BR-EVT-03 · ADR-016

---

### BR-EVT-05 — Cancellation Auto-Refund  ·  ⚙️ Process

Event cancellation triggers automatic 100% refund for all sold tickets without manual approval.

- **Condition:** Event is PUBLISHED or ONGOING with sold tickets.
- **Trigger:** Authorized user cancels the Event.
- **Outcome:** All associated Tickets are cancelled and auto-refunded. Order payment status remains CONFIRMED (tickets inside it transition to CANCELLED per SM-03). Waitlist cleared. Notifications sent. Cost allocation follows BR-REF-03/04/05 depending on fault type.
- **Related:** BR-REF-02 through BR-REF-05 · ADR-015

---

### BR-EVT-06 — Event Authorization  ·  🔒 Constraint

Only the owning Organization's authorized roles or Platform Admin can modify or cancel an Event.

- **Authorized roles:** Owner, Manager (of the owning Organization), Platform Admin.
- **Trigger:** Any modify/cancel request on an Event.
- **Outcome:** Unauthorized requests are rejected.
- **Related:** BR-ORG-04

---

### BR-EVT-07 — Single Organization Ownership  ·  🔒 Constraint

An Event belongs to exactly one Organization. No co-hosting in V1.

- **Related:** BR-ORG-05

---

### BR-EVT-08 — Minimum Ticket Type Requirement  ·  ✅ Action-Enabling

An Event must have at least one Ticket Type before submission for approval.

- **Condition:** Event Manager attempts to submit Event for review.
- **Guard:** Count of associated Ticket Types ≥ 1.
- **Outcome (fail):** Submission rejected: "Event must have at least one Ticket Type."

---

## Domain 2: Ticketing

### BR-TKT-01 — Published Event Gate  ·  ✅ Action-Enabling

Tickets can only be sold for PUBLISHED events.

- **Condition:** Event status must be PUBLISHED.
- **Trigger:** Attendee attempts to purchase.
- **Outcome (fail):** "This event is not currently available for ticket purchase."
- **Related:** BR-EVT-01

---

### BR-TKT-02 — Capacity Enforcement  ·  🔒 Constraint

Cannot sell tickets exceeding Ticket Type capacity.

- **Definition:** Available = Capacity − (Issued Tickets + Checked-in Tickets + Active Reservations).
- **Trigger:** Attendee selects quantity for a Ticket Type.
- **Guard:** Requested quantity ≤ Available.
- **Outcome (fail):** "Only [N] tickets remaining" or "SOLD OUT."
- **Related:** BR-TKT-05, BR-REF-06

---

### BR-TKT-03 — Configurable Sales Window  ·  ✅ Action-Enabling

Ticket sales are controlled by configurable Sales Start Time and Sales End Time per Ticket Type.

- **Condition:** Current time must be within [Sales Start, Sales End] for the target Ticket Type.
- **Trigger:** Attendee attempts to purchase.
- **Outcome (too early):** "Tickets go on sale on [date]."
- **Outcome (too late):** "Ticket sales have ended for this Ticket Type."
- **ADR:** ADR-017

---

### BR-TKT-04 — Unique QR / Single Scan  ·  🔒 Constraint

Each Ticket has a unique QR code. Each QR can only be checked in once.

- **Trigger:** Check-in Staff scans a Ticket QR code.
- **Outcome (first scan):** Ticket transitions to CHECKED_IN.
- **Outcome (duplicate scan):** Rejected: "Already checked in at [timestamp]."

---

### BR-TKT-05 — Reservation Expiration Period  ·  ⚙️ Process

Unpaid Reservations expire after a configurable expiration period.

- **Trigger:** Reservation created at checkout initiation.
- **Outcome (payment succeeds):** Reservation consumed. Tickets issued.
- **Outcome (expiration period expires):** Reservation released. Inventory restored. Order expires.
- **Default Platform Policy:** 15 minutes.
- **Related:** BR-TKT-02

---

### BR-TKT-06 — Non-Transferable Tickets  ·  🔒 Constraint

Tickets are non-transferable in V1. Ticket ownership cannot be changed after issuance.

- **ADR:** ADR-007

---

### BR-TKT-07 — Multi-Ticket Orders  ·  ✅ Action-Enabling

An Attendee can purchase multiple tickets in a single Order for the same Event.

- **Constraint:** All tickets in one Order must be for the same Event.
- **Related:** BR-PRM-02 (Group Discount triggered by quantity)

---

### BR-TKT-08 — Price Lock at Purchase  ·  🔒 Constraint

The ticket price at the time of purchase is the effective price. Price changes after purchase do not affect existing tickets.

- **Trigger:** Order is confirmed (payment successful).
- **Outcome:** The price paid is permanently recorded and never recalculated.
- **Related:** BR-PRC-05

---

### BR-TKT-09 — Purchase Limit  ·  🔒 Constraint

Each Event may define a configurable maximum number of tickets purchasable per account. Platform Admin may override this limit for specific Events when appropriate.

- **Trigger:** Attendee attempts to purchase tickets.
- **Guard:** (Existing purchased quantity + requested quantity) ≤ Event's purchase limit.
- **Outcome (fail):** "You can purchase a maximum of [N] tickets for this event."
- **Rationale:** Prevent inventory hoarding and ensure fair access for all Attendees.
- **Default Platform Policy:** 10 tickets per account per Event.

---

## Domain 4: Payment

### BR-PAY-01 — Commission Model  ·  🔢 Computation

Platform charges percentage-based commission on each successful ticket sale.

- **Formula:** `commission_amount = final_selling_price × commission_rate`
- **V1 scope:** Percentage-based only. Commission model extensible for future versions.
- **Trigger:** Order confirmed (payment successful).
- **Related:** BR-PAY-08

---

### BR-PAY-03 — Original Payment Method Refund  ·  🔒 Constraint

Refunds are processed via the original payment method used for the Order.

- **Trigger:** Refund approved for any Order.
- **Outcome:** Refund amount returned through the same channel used for payment.

---

### BR-PAY-04 — Immutable Financial Ledger  ·  🔒 Constraint

All financial transactions are immutable ledger entries (append-only). No modifications or deletions of transaction records are permitted.

- **Corrections:** Errors are corrected via compensating entries (reversal), not by modifying the original record.
- **Related:** BR-AUD-01, BR-AUD-02

---

### BR-PAY-05 — Payment Idempotency  ·  🔒 Constraint

Payment processing must be idempotent. Duplicate payment attempts must not result in double-charging.

- **Trigger:** Payment gateway retry, duplicate gateway notification, or user double-click.
- **Outcome:** Only one charge is recorded per Order regardless of retries.

---

### BR-PAY-08 — Commission on Discounted Price  ·  🔢 Computation

Commission is calculated on the Final Selling Price, not the Base Price.

- **Formula:** `commission = final_selling_price × rate` (NOT `base_price × rate`)
- **Rationale:** Platform earns based on actual revenue collected, not theoretical revenue.
- **Related:** BR-PAY-01, BR-PRC-05

---

## Domain 6: Settlement & Payout

### BR-PAY-02 — Post-Event Payout Gate  ·  ✅ Action-Enabling

Organization receives payout only after Event COMPLETED and Cooling Period expired.

- **Condition:** Event has completed AND cooling period has elapsed.
- **Trigger:** Cooling period expires → Settlement becomes calculable.
- **Related:** BR-PAY-06, BR-PAY-07

---

### BR-PAY-06 — Settlement Cooling Period  ·  ✅ Action-Enabling

Settlement cannot be finalized until a configurable Cooling Period after Event completion.

- **Condition:** Event has completed.
- **Guard:** Current time > Event end time + Cooling Period.
- **Outcome (before):** "Settlement not yet available. Cooling period ends on [date]."
- **Rationale:** Allow Platform Finance adequate review and processing time.
- **Default Platform Policy:** 7 days after Event completion.
- **ADR:** ADR-014
- **Related:** BR-PAY-02

---

### BR-PAY-07 — Manual Payout  ·  ⚙️ Process

Payout is manually initiated by Platform Finance after Settlement is approved.

- **Trigger:** Settlement status = APPROVED.
- **Outcome:** Platform Finance initiates bank transfer. Marks Payout as COMPLETED upon confirmation.
- **ADR:** ADR-008

---

## Domain 5: Refund & Cancellation

### BR-REF-01 — Manual Refund Approval  ·  ⚙️ Process

Individual refund requests require manual approval by Platform Finance (or Platform Support for exceptional requests).

- **Trigger:** Attendee submits refund request with reason.
- **Outcome:** Refund request created as PENDING_REVIEW. Assigned to review queue.
- **Decision:** Approve → initiate refund. Reject (with reason) → notify Attendee.
- **Exception:** Event cancellation refunds bypass this rule (BR-REF-02).

---

### BR-REF-02 — Auto-Refund on Event Cancellation  ·  ⚙️ Process

Event cancellation triggers automatic 100% refund for all sold tickets. No manual approval required.

- **Trigger:** Event status transitions to CANCELLED.
- **Outcome:** All confirmed Orders are refunded. Refunds processed automatically.
- **Related:** BR-EVT-05

---

### BR-REF-03 — Platform-Fault Cancellation Cost Allocation  ·  🔢 Computation

When cancellation is caused by a platform failure:

- **Attendee:** 100% refund.
- **Organizer:** Receives 100% of revenue (compensated for preparation costs).
- **Platform:** Waives commission and bears full financial loss (refund + organizer compensation).
- **ADR:** ADR-015

> [!CAUTION]
> Platform-fault = double financial exposure. Mitigated by rarity of genuine platform faults.

---

### BR-REF-04 — Organizer-Fault Cancellation Cost Allocation  ·  🔢 Computation

When cancellation is caused by the Organizer:

- **Attendee:** 100% refund.
- **Organizer:** Receives no settlement.
- **Platform:** Waives commission.
- **ADR:** ADR-015

---

### BR-REF-05 — Force Majeure Cancellation Cost Allocation  ·  🔢 Computation

When cancellation is caused by uncontrollable external circumstances:

- **Attendee:** 100% refund.
- **Organizer:** Receives no settlement.
- **Platform:** Waives commission.
- **Rationale:** No party profits from uncontrollable circumstances.
- **ADR:** ADR-015

---

### BR-REF-06 — Inventory Restoration on Refund  ·  ⚙️ Process

Refunded tickets return to the Ticket Type's available inventory and may trigger Waitlist notification.

- **Trigger:** Ticket status transitions to REFUNDED.
- **Outcome:** Available capacity incremented. If Waitlist exists and is non-empty → notify next person(s) in queue.
- **Related:** BR-TKT-02

---

### BR-REF-07 — Refund Cutoff Time  ·  ⚙️ Process

Each Event has a configurable refund cutoff period before Event Start Time. Refund requests submitted after the cutoff enter an exceptional approval path.

- **Normal window:** Refund requests submitted before the cutoff follow the standard manual approval workflow (BR-REF-01).
- **Exceptional window:** Requests submitted after the cutoff but before event start require exceptional manual approval by Platform Support. Eligible exceptional cases include:
  - Medical emergency
  - Duplicate payment
  - Platform error
  - Other cases approved at Platform Support's discretion
- **Post-event:** Normal refund requests are NOT accepted after the event has started. Only event cancellation refunds (BR-REF-02) apply.
- **Event cancellation:** Automatic refunds always bypass this cutoff entirely.
- **Default Platform Policy:** 48 hours before Event Start Time.

---

## Domain 3: Pricing & Promotion

### BR-PRM-01 — Voucher Scope  ·  🔒 Constraint

Voucher codes are per-event, created by the Marketing Manager of the owning Organization.

- **Constraint:** A voucher is scoped to a specific Event. It cannot be used for other Events.
- **Authorization:** Only the Marketing Manager role (mapped to Manager permission group) of the owning Organization can create vouchers.

---

### BR-PRM-02 — Group Discount Threshold  ·  ✅ Action-Enabling

Group Discount requires a minimum ticket quantity per Order.

- **Condition:** Order quantity ≥ configured minimum threshold for the Event.
- **Trigger:** Order quantity meets or exceeds threshold during checkout.
- **Outcome:** Group Discount becomes applicable (subject to Best Benefit Selection per BR-PRM-04).
- **Related:** BR-PRM-03, BR-PRM-04

---

### BR-PRM-03 — No Discount Stacking  ·  🔒 Constraint

Only one pricing adjustment (Voucher Code OR Group Discount) may be applied per Order. No stacking.

- **Trigger:** Checkout calculation when both Voucher and Group Discount are potentially applicable.
- **Outcome:** System applies BR-PRM-04 (Best Benefit Selection). Only one adjustment is recorded.
- **ADR:** ADR-019
- **Related:** BR-PRM-04, BR-PRC-05

---

### BR-PRM-04 — Best Benefit Selection  ·  🔢 Computation

When multiple pricing adjustments are applicable, the system automatically applies the one providing greatest financial benefit to the Attendee.

- **Condition:** Both Voucher Code and Group Discount are applicable for the current Order.
- **Algorithm:**
  1. Calculate the discount amount from the Voucher Code.
  2. Calculate the discount amount from the Group Discount.
  3. Apply whichever yields the greater discount for the Attendee.
- **Edge case:** If only one discount is applicable, apply that one directly.
- **ADR:** ADR-019
- **Related:** BR-PRM-03, BR-PRC-05, BR-PAY-08

---

### BR-PRC-01 — Early Bird Definition  ·  🔒 Constraint

Early Bird pricing is defined per Ticket Type with a start date and end date.

- **Constraint:** Early Bird start must be before end, and Early Bird price must be lower than Base Price.
- **Related:** BR-PRC-02, BR-PRC-03

---

### BR-PRC-02 — Auto-Revert to Base Price  ·  ⚙️ Process

When the Early Bird period ends, the price automatically reverts to the regular Base Price.

- **Trigger:** Current date/time passes the Early Bird end date for a Ticket Type.
- **Outcome:** Displayed price returns to Base Price. No manual intervention needed.
- **Related:** BR-PRC-01, BR-PRC-04

---

### BR-PRC-03 — Single Active Strategy  ·  🔒 Constraint

A Ticket Type can have at most one active Pricing Strategy at a time.

- **Trigger:** Attempt to define overlapping strategies on the same Ticket Type.
- **Outcome:** Rejected.

---

### BR-PRC-04 — Price Transparency  ·  🔒 Constraint

The price displayed to the Attendee is always the current effective price (after Pricing Strategy, before Promotion).

- **Outcome:** Attendees see what they will pay, not the Base Price when Early Bird is active.
- **Related:** BR-PRC-05

---

### BR-PRC-05 — Pricing Pipeline  ·  🔢 Computation

The Final Selling Price follows a defined sequential pipeline:

```
Stage 1: BASE PRICE
         Set by Event Manager on Ticket Type.
              ↓
Stage 2: PRICING STRATEGY
         If Early Bird is active → apply Early Bird price.
              ↓ Strategy-Adjusted Price
Stage 3: PROMOTION
         Apply best of Voucher / Group Discount (per BR-PRM-04).
              ↓ Final Selling Price
```

- **Invariant:** Each stage is independent. Stage 2 output feeds into Stage 3.
- **Auditability:** Each order records the Base Price, Strategy-Adjusted Price, discount type, discount amount, and Final Selling Price.
- **ADR:** ADR-021
- **Related:** BR-PRC-01 through BR-PRC-04, BR-PRM-03, BR-PRM-04, BR-PAY-08

---

## Domain 7: Organization

### BR-ORG-01 — Default Attendee Role  ·  ⚙️ Process

New accounts default to the Attendee role upon registration.

- **Trigger:** User registers on the platform.
- **Outcome:** Account created as Attendee. No organization association.

---

### BR-ORG-02 — Organization Approval Gate  ·  ⚙️ Process

Becoming an Organization requires application and Platform Operations approval.

- **Trigger:** Attendee submits Organization application with details and documents.
- **Outcome (approved):** Organization becomes ACTIVE. Applicant becomes Owner.
- **Outcome (rejected):** Application rejected with reason. User may re-apply with corrections.

---

### BR-ORG-03 — Owner Self-Removal Prevention  ·  🔒 Constraint

Organization Owner cannot remove themselves from the Organization. Must transfer ownership first.

- **Trigger:** Owner attempts to leave or remove self.
- **Outcome:** Rejected: "Cannot remove yourself as Owner. Transfer ownership first."
- **Related:** BR-ORG-04

---

### BR-ORG-04 — Permission Group Assignment  ·  ✅ Action-Enabling

Owner can assign team members to V1 permission groups: Owner, Manager, Staff.

- **Authorization:** Only Owner can assign or change permission groups.
- **Constraint:** Organization must have at least one Owner at all times.
- **ADR:** ADR-009

---

### BR-ORG-05 — Single Organization per Event  ·  🔒 Constraint

One Organization owns one Event. No co-hosting in V1.

- **Related:** BR-EVT-07

---

### BR-ORG-06 — Event Ownership Continuity  ·  🔒 Constraint

Events created by a removed team member remain owned by the Organization.

- **Trigger:** Team member is removed from Organization.
- **Outcome:** Member's access is revoked. Events remain unchanged (owned by Organization entity, not individual).

---

### BR-ORG-07 — Suspension Effects  ·  🔒 Constraint

A suspended Organization cannot create events, sell tickets, or receive payouts.

- **Effects:** All published events hidden. Ticket sales stopped. New event creation blocked. Payouts frozen. Team members have read-only access. Existing valid tickets remain honored.
- **Related:** Process 8.10 in Project Charter

---

### BR-ORG-08 — Ban Effects  ·  ⚙️ Process

Permanent ban triggers cancellation of all upcoming events and auto-refund.

- **Trigger:** Platform Admin bans Organization.
- **Outcome:** Upcoming events cancelled. All tickets auto-refunded (cost allocated per BR-REF-04 - Organizer-fault). Pending payouts settled then frozen. Organization status becomes BANNED. Cannot create new Organization with same identity.
- **Related:** BR-EVT-05, BR-REF-04

---

## Domain 8: Reviews & Ratings

### BR-REV-01 — Review Eligibility  ·  ✅ Action-Enabling

A review can be submitted if the Attendee has checked in OR has a verified completed purchase for a completed Event.

- **Condition:** Attendee has CHECKED_IN ticket OR has CONFIRMED Order for a COMPLETED Event.
- **Outcome (fail):** "You are not eligible to review this event."
- **ADR:** ADR-018

---

### BR-REV-02 — Cancelled Event Not Reviewable  ·  🔒 Constraint

Cancelled events are not reviewable. No meaningful experience occurred to review.

---

### BR-REV-03 — One Review per Attendee per Event  ·  🔒 Constraint

Each Attendee may submit only one review per Event.

---

### BR-REV-04 — No Edit, Delete Only  ·  🔒 Constraint

Reviews cannot be edited after posting. They can only be deleted by the author or by Platform Operations.

---

### BR-REV-05 — Content Moderation  ·  ✅ Action-Enabling

Platform Operations can remove reviews that violate the platform's content policy.

- **Authorization:** Platform Operations role only.

---

## Domain 9: Platform Operations

### BR-AUD-01 — Mandatory State Change Logging  ·  🔒 Constraint

State changes on critical entities must be logged.

- **Critical entities:** Event, Order, Ticket, Payment, Payout, Organization, Refund, Settlement.
- **Trigger:** Any state transition on a critical entity.
- **Outcome:** Audit log entry created with all required fields (per BR-AUD-03).
- **Related:** BR-AUD-02, BR-AUD-03

---

### BR-AUD-02 — Audit Immutability  ·  🔒 Constraint

Audit entries are immutable — no update or delete operations permitted.

- **Related:** BR-PAY-04

---

### BR-AUD-03 — Audit Entry Requirements  ·  🔒 Constraint

Every audit entry must record:

| Field | Description |
|---|---|
| Actor | Who performed the action (user or system) |
| Action | What was done |
| Timestamp | When it occurred |
| Entity type | Which type of entity was affected |
| Entity ID | Which specific entity was affected |
| Previous state | State before the change |
| New state | State after the change |

---

## Anti-Hoarding Business Principles

The following business decisions collectively mitigate inventory hoarding and abuse without requiring complex anti-bot or fraud detection systems in V1:

| Principle | Mechanism | Rule |
|---|---|---|
| **Prevent unpaid holds** | Reservation Expiration Period automatically releases unpaid inventory. | BR-TKT-05 |
| **Limit accumulation** | Configurable purchase limit caps tickets per account per Event. | BR-TKT-09 |
| **Discourage late dumps** | Configurable refund cutoff prevents last-minute inventory release. | BR-REF-07 |
| **Preserve consumer rights** | Exceptional refunds remain possible through manual Platform Support review. | BR-REF-07 |
| **Protect cancellation rights** | Event cancellation refunds always bypass normal restrictions. | BR-REF-02 |

> [!NOTE]
> Anti-bot technical measures (rate limiting, device fingerprinting, ML detection) are deferred to Architecture and Security phases. They are not business rules.

---

## Rule Summary Matrix

| Domain | Count | 🔒 Constraint | 🔢 Computation | ✅ Action-Enabling | ⚙️ Process |
|---|---|---|---|---|---|
| Event Management | 8 | 3 | 0 | 2 | 3 |
| Ticketing | 9 | 5 | 0 | 3 | 1 |
| Payment & Finance | 8 | 3 | 2 | 2 | 1 |
| Refund & Cancellation | 7 | 0 | 3 | 0 | 4 |
| Promotions | 4 | 2 | 1 | 1 | 0 |
| Pricing Strategy | 5 | 3 | 1 | 0 | 1 |
| Organization | 8 | 5 | 0 | 1 | 2 |
| Reviews | 5 | 3 | 0 | 2 | 0 |
| Audit | 3 | 3 | 0 | 0 | 0 |
| **Total** | **57** | **27** | **7** | **11** | **12** |

---

## Observations for PO Review

### ~~OBS-01~~: **RESOLVED** — Voucher Discount Type Specified

Voucher Codes provide a discount. Per Glossary V1.1, they are defined as supporting both percentage-based and fixed-amount discounts (Option C — configurable per voucher), resolving this observation.

### OBS-02: Group Discount Tier Structure

Group Discount is defined per Event, but the charter does not specify:
- **(A)** Single tier (≥N tickets = X% off)
- **(B)** Multi-tier (≥5 = 5%, ≥10 = 10%, ≥20 = 15%)

**Recommendation:** Option A for V1. Multi-tier adds complexity with diminishing returns.

---

> **End of Business Rules Specification V1.1**
