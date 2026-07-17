# BUSINESS CAPABILITIES — Eventing Platform V1

> **Document ID:** EV-BC-001
> **Version:** 1.1 (Baselined)
> **Status:** ✅ APPROVED — Baselined
> **Last Updated:** 2026-07-06
> **Dependency:** Project Charter V2.3 (EV-PC-001), Business Rules Specification V1.1 (EV-BR-001), Business Glossary V1.1 (EV-GL-001)
> **Deliverable #:** Phase 1, Item 5

---

## Purpose

This document expands every capability from the Project Charter into a formal business capability definition. Each capability describes its business objective, actors, triggers, preconditions, outcomes, and relationships to other capabilities and business rules.

This document is **implementation-independent**. It describes only business responsibilities — not how those responsibilities are technically implemented.

---

## Capability Group 1: Event Management

### EVT-01 — Create Event

- **Purpose:** Allow an Organization to create a new Event on the platform.
- **Business Objective:** Enable organizations to set up events for public discovery and ticket sales.
- **Actors:** Event Manager
- **Trigger:** Event Manager initiates event creation within their Organization.
- **Preconditions:** Organization is ACTIVE. Actor has Manager or Owner permission.
- **Outcome:** Event created in DRAFT status with basic details (name, description, venue, schedule, category).
- **Rules:** BR-EVT-07 (single org ownership)
- **Process:** 8.3 Event Creation & Approval
- **Dependencies:** ORG-02 (Organization must be approved and active)

---

### EVT-02 — Edit Event (Minor)

- **Purpose:** Allow an Event Manager to make minor adjustments to a published Event without requiring re-approval.
- **Business Objective:** Minimize operational friction for non-impactful changes.
- **Actors:** Event Manager
- **Trigger:** Event Manager modifies a minor attribute (description, banner, FAQ, contact info).
- **Preconditions:** Event is APPROVED or PUBLISHED.
- **Outcome:** Change applied immediately. Event status unchanged.
- **Rules:** BR-EVT-03 (minor edit pass-through)
- **Process:** 8.3 Event Creation & Approval
- **Dependencies:** EVT-01 (event must exist)

---

### EVT-03 — Edit Event (Major)

- **Purpose:** Allow an Event Manager to modify significant Event attributes, subject to approval controls.
- **Business Objective:** Protect Attendees from disruptive changes while allowing Organizers to correct errors.
- **Actors:** Event Manager
- **Trigger:** Event Manager modifies a major attribute (date, venue, capacity, pricing).
- **Preconditions:** Event is APPROVED or PUBLISHED. No tickets sold for this Event.
- **Outcome:** Event status reverts to PENDING_REVIEW. Event becomes invisible until re-approved.
- **Restriction:** If tickets have been sold, major edits are blocked entirely (BR-EVT-02).
- **Rules:** BR-EVT-02 (post-sale edit lock), BR-EVT-04 (major edit re-approval)
- **Process:** 8.3 Event Creation & Approval
- **Dependencies:** EVT-01 (event must exist)

---

### EVT-04 — Submit Event for Approval

- **Purpose:** Allow an Event Manager to submit a completed Event for Platform review.
- **Business Objective:** Ensure event quality and platform content standards before public visibility.
- **Actors:** Event Manager
- **Trigger:** Event Manager submits a DRAFT or REJECTED Event.
- **Preconditions:** All required fields populated. At least one Ticket Type defined (BR-EVT-08).
- **Outcome:** Event status transitions to PENDING_REVIEW. Enters Platform Operations review queue.
- **Rules:** BR-EVT-01 (approval gate), BR-EVT-08 (min ticket type)
- **Process:** 8.3 Event Creation & Approval
- **Dependencies:** EVT-01 (event must exist), TKT-01 (at least one ticket type)

---

### EVT-05 — Approve / Reject Event

- **Purpose:** Allow Platform Operations to review and decide on submitted Events.
- **Business Objective:** Maintain platform quality and prevent fraudulent or inappropriate events.
- **Actors:** Platform Operations
- **Trigger:** Event enters PENDING_REVIEW status.
- **Preconditions:** Event is in PENDING_REVIEW status.
- **Outcome (approve):** Event status transitions to APPROVED → may be PUBLISHED.
- **Outcome (reject):** Event status transitions to REJECTED with a reason. Event Manager may revise and re-submit.
- **Rules:** BR-EVT-01 (approval gate)
- **Process:** 8.3 Event Creation & Approval
- **Dependencies:** EVT-04 (event must be submitted)

---

### EVT-06 — Cancel Event

- **Purpose:** Allow authorized users to cancel a published or ongoing Event.
- **Business Objective:** Provide a mechanism to withdraw an Event when continuation is no longer viable, with full consumer protection.
- **Actors:** Event Manager, Platform Admin
- **Trigger:** Authorized actor initiates event cancellation.
- **Preconditions:** Event is PUBLISHED or ONGOING. Actor has authorization (BR-EVT-06).
- **Outcome:** Event status transitions to CANCELLED. All sold tickets are automatically refunded (BR-EVT-05). Waitlist cleared. Attendees notified. Cost allocation follows fault type (BR-REF-03/04/05).
- **Rules:** BR-EVT-05 (cancellation auto-refund), BR-EVT-06 (event authorization), BR-REF-02, BR-REF-03, BR-REF-04, BR-REF-05
- **Process:** 8.3 Event Creation & Approval, 8.8 Refund
- **Dependencies:** None (operates on existing event)

---

### EVT-07 — Complete Event

- **Purpose:** Automatically mark an Event as completed after its scheduled end time.
- **Business Objective:** Transition the Event lifecycle to post-event processing (settlement, reviews).
- **Actors:** System
- **Trigger:** Current time passes the Event's scheduled end time.
- **Preconditions:** Event is in ONGOING status.
- **Outcome:** Event status transitions to COMPLETED. Settlement Cooling Period begins (BR-PAY-06). Review submissions become eligible (BR-REV-01).
- **Rules:** BR-PAY-06 (cooling period begins)
- **Process:** 8.9 Settlement & Payout
- **Dependencies:** None (time-based system trigger)

---

### EVT-08 — Browse / Search Events

- **Purpose:** Allow users to discover Events available on the platform.
- **Business Objective:** Drive Attendee engagement and ticket sales through discoverability.
- **Actors:** Guest, Attendee
- **Trigger:** User accesses the event listing or search interface.
- **Preconditions:** None.
- **Outcome:** User sees a filterable list of PUBLISHED events with key details (name, date, venue, category, price range, availability).
- **Rules:** None (discovery feature, no specific business constraints)
- **Process:** None (standalone capability)
- **Dependencies:** None

---

### EVT-09 — View Event Details

- **Purpose:** Allow users to see complete information about a specific Event.
- **Business Objective:** Inform purchase decisions and provide all relevant event information.
- **Actors:** Guest, Attendee
- **Trigger:** User selects a specific Event.
- **Preconditions:** Event is PUBLISHED, ONGOING, or COMPLETED (visible states).
- **Outcome:** User sees full event details: description, venue, schedule, ticket types, pricing (current effective price per BR-PRC-04), availability, reviews.
- **Rules:** BR-PRC-04 (price transparency)
- **Process:** None (standalone capability)
- **Dependencies:** EVT-08 (usually accessed via search/browse)

---

## Capability Group 2: Ticketing

### TKT-01 — Define Ticket Types

- **Purpose:** Allow an Event Manager to create distinct ticket categories for an Event.
- **Business Objective:** Enable differentiated pricing and access levels (e.g., VIP, General, Student).
- **Actors:** Event Manager
- **Trigger:** Event Manager creates a Ticket Type within a DRAFT Event.
- **Preconditions:** Event exists in DRAFT status. Organization is ACTIVE.
- **Outcome:** Ticket Type created with name, description, base price, capacity, and sales window.
- **Rules:** BR-EVT-08 (event needs ≥1 ticket type for submission)
- **Process:** 8.3 Event Creation & Approval
- **Dependencies:** EVT-01 (event must exist)

---

### TKT-02 — Configure Pricing Strategy

- **Purpose:** Allow an Event Manager to define time-based pricing adjustments for a Ticket Type.
- **Business Objective:** Incentivize early purchases and optimize revenue through dynamic pricing periods.
- **Actors:** Event Manager
- **Trigger:** Event Manager configures an Early Bird pricing period for a Ticket Type.
- **Preconditions:** Ticket Type exists. No other active Pricing Strategy on the same Ticket Type (BR-PRC-03).
- **Outcome:** Pricing Strategy configured with start date, end date, and Early Bird price. Price automatically reverts to base when the period ends (BR-PRC-02).
- **Rules:** BR-PRC-01 (Early Bird definition), BR-PRC-02 (auto-revert), BR-PRC-03 (single active strategy)
- **Process:** 8.3 Event Creation & Approval
- **Dependencies:** TKT-01 (ticket type must exist)

---

### TKT-03 — Purchase Tickets

- **Purpose:** Allow an Attendee to select, pay for, and receive tickets for a published Event.
- **Business Objective:** Core commercial transaction — convert interest into ticket sales.
- **Actors:** Attendee
- **Trigger:** Attendee initiates checkout for selected tickets.
- **Preconditions:** Event is PUBLISHED (BR-TKT-01). Within sales window (BR-TKT-03). Sufficient inventory (BR-TKT-02). Within purchase limit (BR-TKT-09).
- **Outcome:** Order confirmed. Payment processed. Tickets issued with unique QR codes. Inventory decremented. Commission recorded.
- **Rules:** BR-TKT-01, BR-TKT-02, BR-TKT-03, BR-TKT-07, BR-TKT-08, BR-TKT-09, BR-PAY-01, BR-PAY-05, BR-PRC-05
- **Process:** 8.4 Ticket Purchase
- **Dependencies:** EVT-05 (event must be approved/published), TKT-01 (ticket types defined), PAY-01 (payment processing)

---

### TKT-04 — Group Purchase (Leader Pays All)

- **Purpose:** Allow a single Attendee (leader) to purchase multiple tickets in one transaction, potentially qualifying for Group Discount.
- **Business Objective:** Facilitate group attendance and incentivize bulk purchases.
- **Actors:** Attendee (as group leader)
- **Trigger:** Attendee selects quantity ≥ group discount threshold for an Event.
- **Preconditions:** Same as TKT-03 purchase preconditions. Quantity meets group discount minimum (BR-PRM-02).
- **Outcome:** All tickets issued to the leader's account. Group Discount applied if eligible (subject to Best Benefit Selection per BR-PRM-04). Leader receives all QR codes.
- **Rules:** BR-TKT-07 (multi-ticket orders), BR-PRM-02 (group threshold), BR-PRM-03 (no stacking), BR-PRM-04 (best benefit)
- **Process:** 8.5 Group Purchase (Leader Pays All)
- **Dependencies:** TKT-03 (standard purchase flow)

---

### TKT-05 — View My Tickets

- **Purpose:** Allow an Attendee to view their purchased tickets and associated QR codes.
- **Business Objective:** Provide convenient access to ticket information for event entry.
- **Actors:** Attendee
- **Trigger:** Attendee accesses their ticket portfolio.
- **Preconditions:** Attendee has at least one confirmed Order.
- **Outcome:** Attendee sees list of purchased tickets with QR codes, event details, and ticket status (ACTIVE, CHECKED_IN, REFUNDED, CANCELLED).
- **Rules:** None (view-only capability)
- **Process:** None (standalone capability)
- **Dependencies:** TKT-03 (must have purchased tickets)

---

### TKT-06 — Join Waitlist

- **Purpose:** Allow an Attendee to queue for a sold-out Ticket Type.
- **Business Objective:** Capture demand beyond current inventory and convert when inventory becomes available.
- **Actors:** Attendee
- **Trigger:** Attendee requests to join the Waitlist for a sold-out Ticket Type.
- **Preconditions:** Ticket Type is sold out. Event is still PUBLISHED.
- **Outcome:** Attendee added to the FIFO Waitlist. Receives confirmation of waitlist position.
- **Rules:** None (waitlist is a standard queue)
- **Process:** 8.6 Waitlist
- **Dependencies:** TKT-01 (ticket type must exist and be sold out)

---

### TKT-07 — Notify Waitlist

- **Purpose:** Notify next-in-line Waitlist members when inventory becomes available.
- **Business Objective:** Maximize ticket utilization by re-offering returned inventory.
- **Actors:** System
- **Trigger:** Ticket Type inventory becomes available (e.g., due to refund per BR-REF-06, reservation expiry per BR-TKT-05).
- **Preconditions:** Waitlist is non-empty for the affected Ticket Type.
- **Outcome:** Next person(s) in the Waitlist notified. They receive a time-limited opportunity to purchase.
- **Rules:** BR-REF-06 (inventory restoration triggers waitlist)
- **Process:** 8.6 Waitlist
- **Dependencies:** TKT-06 (waitlist must exist), OPS-02 (notification delivery)

---

### TKT-08 — Check-in (QR Scan)

- **Purpose:** Verify an Attendee's ticket at the event venue via QR code scan.
- **Business Objective:** Validate entry rights and prevent ticket fraud.
- **Actors:** Check-in Staff
- **Trigger:** Check-in Staff scans an Attendee's QR code.
- **Preconditions:** Event is ONGOING. Ticket is ACTIVE (not already checked in, not refunded).
- **Outcome (valid):** Ticket transitions to CHECKED_IN. Attendance recorded (ENG-01).
- **Outcome (invalid):** Rejection with reason (already checked in, invalid QR, wrong event).
- **Rules:** BR-TKT-04 (unique QR / single scan)
- **Process:** 8.7 Check-in
- **Dependencies:** TKT-03 (tickets must have been purchased)

---

### TKT-09 — Request Refund

- **Purpose:** Allow an Attendee to submit a refund request for a purchased ticket.
- **Business Objective:** Provide consumer protection while managing inventory and financial risk.
- **Actors:** Attendee
- **Trigger:** Attendee initiates a refund request for a confirmed Order.
- **Preconditions:** Order is CONFIRMED. Refund cutoff has not passed (BR-REF-07) — or request qualifies as exceptional.
- **Outcome:** Refund request created in PENDING_REVIEW status. Enters approval queue (BR-REF-01). Attendee notified of submission.
- **Rules:** BR-REF-01 (manual approval), BR-REF-07 (refund cutoff)
- **Process:** 8.8 Refund
- **Dependencies:** TKT-03 (must have purchased tickets)

---

## Capability Group 3: Payment, Settlement & Payout

### PAY-01 — Process Payment

- **Purpose:** Charge an Attendee for their ticket purchase through a payment gateway.
- **Business Objective:** Collect revenue for ticket sales.
- **Actors:** System, Payment Gateway
- **Trigger:** Attendee confirms checkout and submits payment.
- **Preconditions:** Valid Reservation exists (BR-TKT-05). Amount matches Pricing Pipeline output (BR-PRC-05).
- **Outcome:** Payment processed. Transaction recorded. Order confirmed.
- **Rules:** BR-PAY-05 (idempotency)
- **Process:** 8.4 Ticket Purchase
- **Dependencies:** TKT-03 (purchase flow)

---

### PAY-02 — Handle Payment Status Update

- **Purpose:** Process asynchronous payment results from the payment gateway.
- **Business Objective:** Reliably confirm or fail Orders based on actual payment outcome.
- **Actors:** System
- **Trigger:** Payment gateway sends status update or notification with payment result.
- **Preconditions:** A pending payment attempt exists for the referenced Order.
- **Outcome (success):** Order confirmed. Tickets issued. Reservation consumed.
- **Outcome (failure):** Order marked as PAYMENT_FAILED. Reservation released. Inventory restored.
- **Rules:** BR-PAY-05 (idempotency — handle duplicate status updates)
- **Process:** 8.4 Ticket Purchase
- **Dependencies:** PAY-01 (payment must have been initiated)

---

### PAY-03 — Calculate Commission

- **Purpose:** Compute the platform's commission for a completed ticket sale.
- **Business Objective:** Generate platform revenue from each successful transaction.
- **Actors:** System
- **Trigger:** Order confirmed (payment successful).
- **Preconditions:** Order has at least one confirmed line item with a final selling price.
- **Outcome:** Commission amount calculated based on the final selling price (not base price, per BR-PAY-08). Commission recorded against the Order.
- **Rules:** BR-PAY-01 (commission model), BR-PAY-08 (commission on discounted price)
- **Process:** 8.9 Settlement & Payout
- **Dependencies:** PAY-01 (payment must be confirmed)

---

### PAY-04 — Generate Settlement

- **Purpose:** Calculate the net amount owed to an Organization after Event completion.
- **Business Objective:** Prepare accurate financial reconciliation for Organizer payout.
- **Actors:** Platform Finance
- **Trigger:** Cooling Period expires for a completed Event (BR-PAY-06).
- **Preconditions:** Event is COMPLETED. Cooling Period has elapsed.
- **Outcome:** Settlement generated with: gross revenue, total commission, total refunds, net settlement amount.
- **Formula:** Net = Gross Revenue − Commission − Refunds
- **Rules:** BR-PAY-06 (cooling period gate)
- **Process:** 8.9 Settlement & Payout
- **Dependencies:** EVT-07 (event must be completed), PAY-03 (commission calculated)

---

### PAY-05 — Review Settlement

- **Purpose:** Allow Platform Finance to verify settlement calculations before payout.
- **Business Objective:** Ensure financial accuracy and prevent errors in Organizer payments.
- **Actors:** Platform Finance
- **Trigger:** Settlement generated for a completed Event.
- **Preconditions:** Settlement exists in PENDING_REVIEW status.
- **Outcome (approve):** Settlement status transitions to APPROVED. Ready for payout.
- **Outcome (dispute):** Settlement flagged for investigation. Payout deferred.
- **Rules:** BR-PAY-06 (cooling period must have passed)
- **Process:** 8.9 Settlement & Payout
- **Dependencies:** PAY-04 (settlement must be generated)

---

### PAY-06 — Process Payout

- **Purpose:** Transfer the approved settlement amount to the Organization.
- **Business Objective:** Complete the financial cycle by paying the Organizer.
- **Actors:** Platform Finance
- **Trigger:** Platform Finance initiates manual payout for an approved Settlement.
- **Preconditions:** Settlement is APPROVED (BR-PAY-07).
- **Outcome:** Funds transferred to Organization's registered bank account. Payout recorded as COMPLETED.
- **Rules:** BR-PAY-07 (manual payout)
- **Process:** 8.9 Settlement & Payout
- **Dependencies:** PAY-05 (settlement must be approved)

---

### PAY-07 — Process Refund

- **Purpose:** Approve and execute a refund to an Attendee.
- **Business Objective:** Return funds to Attendees when conditions warrant, through the original payment channel.
- **Actors:** Platform Finance, Platform Support
- **Trigger:** Refund request received (manual) or Event cancelled (automatic).
- **Preconditions:** For manual: refund request in PENDING_REVIEW. For auto: Event transitioning to CANCELLED.
- **Outcome:** Refund processed via original payment method (BR-PAY-03). Tickets marked as REFUNDED. Inventory restored (BR-REF-06).
- **Rules:** BR-REF-01 (manual approval), BR-REF-02 (auto on cancellation), BR-PAY-03 (original method), BR-REF-06 (inventory restoration)
- **Process:** 8.8 Refund
- **Dependencies:** TKT-09 (refund request) or EVT-06 (event cancellation)

---

### PAY-08 — View Revenue Report

- **Purpose:** Provide financial reporting on revenue, commissions, and payouts.
- **Business Objective:** Enable financial oversight for both Organizers and Platform Finance.
- **Actors:** Finance Manager, Platform Finance
- **Trigger:** Actor accesses financial reporting interface.
- **Preconditions:** Actor has appropriate role and organizational access.
- **Outcome:** Reports displayed: revenue by event, by period, by organization. Commission totals. Payout status.
- **Rules:** None (reporting capability — no specific constraints)
- **Process:** None (standalone capability)
- **Dependencies:** PAY-03 (commission data), PAY-04 (settlement data)

---

### PAY-09 — View Transaction History

- **Purpose:** Provide a complete financial ledger of all transactions.
- **Business Objective:** Support financial auditing and reconciliation.
- **Actors:** Finance Manager, Platform Finance
- **Trigger:** Actor accesses the transaction history interface.
- **Preconditions:** Actor has appropriate role.
- **Outcome:** Immutable transaction log displayed with full details (BR-PAY-04).
- **Rules:** BR-PAY-04 (immutable ledger)
- **Process:** None (standalone capability)
- **Dependencies:** PAY-01 (payments), PAY-07 (refunds)

---

## Capability Group 4: Pricing & Promotion

### PRM-01 — Create Voucher Code

- **Purpose:** Allow a Marketing Manager to create discount codes for a specific Event.
- **Business Objective:** Drive ticket sales through promotional incentives.
- **Actors:** Marketing Manager
- **Trigger:** Marketing Manager creates a new Voucher Code within an Event.
- **Preconditions:** Event exists. Actor has Manager permission within the owning Organization (BR-PRM-01).
- **Outcome:** Voucher Code created with: code string, discount value, usage limits, validity period, scoped to the specific Event.
- **Rules:** BR-PRM-01 (voucher scope)
- **Process:** 8.4 Ticket Purchase (applied at checkout)
- **Dependencies:** EVT-01 (event must exist)

---

### PRM-02 — Configure Group Discount

- **Purpose:** Allow an Event Manager to define quantity-based discounts for an Event.
- **Business Objective:** Incentivize bulk purchases and group attendance.
- **Actors:** Event Manager
- **Trigger:** Event Manager configures Group Discount for an Event.
- **Preconditions:** Event exists in DRAFT or APPROVED status.
- **Outcome:** Group Discount configured with: minimum ticket quantity threshold and discount value.
- **Rules:** BR-PRM-02 (threshold)
- **Process:** 8.5 Group Purchase
- **Dependencies:** EVT-01 (event must exist)

---

### PRM-03 — Apply Promotion at Checkout

- **Purpose:** Validate and apply eligible discounts to an Order during checkout.
- **Business Objective:** Ensure accurate discount application following business rules.
- **Actors:** Attendee (enters voucher code), System (evaluates eligibility)
- **Trigger:** Checkout calculation when Voucher Code entered or Group Discount threshold met.
- **Preconditions:** At least one promotion is applicable. Promotion is valid (within dates, usage not exhausted).
- **Outcome:** Best eligible discount applied to the Order (BR-PRM-04). Only one discount per Order (BR-PRM-03). Final Selling Price calculated per Pricing Pipeline (BR-PRC-05).
- **Rules:** BR-PRM-03 (no stacking), BR-PRM-04 (best benefit), BR-PRC-05 (pricing pipeline)
- **Process:** 8.4 Ticket Purchase
- **Dependencies:** PRM-01 or PRM-02 (at least one promotion configured), TKT-03 (purchase flow)

---

### PRM-04 — View Promotion Performance

- **Purpose:** Allow Marketing Managers to track the effectiveness of their promotions.
- **Business Objective:** Enable data-driven promotional decisions.
- **Actors:** Marketing Manager
- **Trigger:** Actor accesses promotion analytics.
- **Preconditions:** Actor has Manager permission within the owning Organization.
- **Outcome:** Reports on: voucher redemption count, revenue attributed to promotions, group discount utilization.
- **Rules:** None (reporting capability)
- **Process:** None (standalone capability)
- **Dependencies:** PRM-01 (vouchers created), PRM-02 (group discounts configured)

---

## Capability Group 5: Engagement Tracking

### ENG-01 — Track Attendance

- **Purpose:** Record check-in events per Attendee for future analytics.
- **Business Objective:** Build an Attendee engagement profile over time.
- **Actors:** System
- **Trigger:** Attendee is successfully checked in (TKT-08).
- **Preconditions:** Check-in validated.
- **Outcome:** Attendance record stored against the Attendee's profile.
- **Rules:** None (data capture only — ADR-012)
- **Process:** 8.7 Check-in
- **Dependencies:** TKT-08 (check-in must occur)

> [!NOTE]
> V1 captures data only. No rank calculation, display, or Attendee-facing benefits.

---

### ENG-02 — Track Spending

- **Purpose:** Record purchase amounts per Attendee for future analytics.
- **Business Objective:** Understand Attendee value and spending patterns over time.
- **Actors:** System
- **Trigger:** Order confirmed (payment successful).
- **Preconditions:** Order exists in CONFIRMED status.
- **Outcome:** Spending amount recorded against the Attendee's profile.
- **Rules:** None (data capture only — ADR-012)
- **Process:** 8.4 Ticket Purchase
- **Dependencies:** PAY-01 (payment confirmed)

---

### ENG-03 — Query Engagement Data

- **Purpose:** Allow Platform Admin to view aggregate engagement metrics.
- **Business Objective:** Support future business decisions regarding loyalty programs and engagement incentives.
- **Actors:** Platform Admin
- **Trigger:** Platform Admin accesses engagement analytics.
- **Preconditions:** Actor has Platform Admin role.
- **Outcome:** Aggregate engagement data displayed: top attendees, attendance frequency, spending distribution.
- **Rules:** None (reporting capability)
- **Process:** None (standalone capability)
- **Dependencies:** ENG-01 (attendance data), ENG-02 (spending data)

---

## Capability Group 6: Organization

### ORG-01 — Register Organization

- **Purpose:** Allow a user to apply to become an Event Organizer by creating an Organization.
- **Business Objective:** Grow the platform's supply side by onboarding Organizers.
- **Actors:** Attendee (applicant) → becomes Owner upon approval
- **Trigger:** Attendee submits an Organization application.
- **Preconditions:** User has an active Attendee account.
- **Outcome:** Organization created in PENDING_REVIEW status. Application enters Platform Operations review queue.
- **Rules:** BR-ORG-02 (approval gate)
- **Process:** 8.1 Organization Onboarding
- **Dependencies:** USR-01 (user must be registered)

---

### ORG-02 — Approve Organization

- **Purpose:** Allow Platform Operations to review and decide on Organization applications.
- **Business Objective:** Maintain platform quality by vetting Organizers.
- **Actors:** Platform Operations
- **Trigger:** Organization application enters PENDING_REVIEW.
- **Preconditions:** Application is in PENDING_REVIEW status.
- **Outcome (approve):** Organization becomes ACTIVE. Applicant's role upgraded to Owner.
- **Outcome (reject):** Application rejected with reason. Applicant may re-apply.
- **Rules:** BR-ORG-02 (approval gate)
- **Process:** 8.1 Organization Onboarding
- **Dependencies:** ORG-01 (application must be submitted)

---

### ORG-03 — Invite Team Member

- **Purpose:** Allow an Organization Owner to invite new members to the team.
- **Business Objective:** Enable team collaboration for event management.
- **Actors:** Owner
- **Trigger:** Owner sends an invitation with an assigned permission group.
- **Preconditions:** Organization is ACTIVE. Actor is Owner.
- **Outcome:** Invitation sent to the target user. Pending until accepted.
- **Rules:** BR-ORG-04 (permission group assignment)
- **Process:** 8.2 Team Management
- **Dependencies:** ORG-02 (organization must be approved)

---

### ORG-04 — Accept Invitation

- **Purpose:** Allow an invited user to join an Organization.
- **Business Objective:** Complete the team member onboarding process.
- **Actors:** Invited User
- **Trigger:** User accepts a pending invitation.
- **Preconditions:** Valid invitation exists. User has an active account.
- **Outcome:** User added to the Organization with the assigned permission group.
- **Rules:** BR-ORG-04 (permission group assignment)
- **Process:** 8.2 Team Management
- **Dependencies:** ORG-03 (invitation must be sent)

---

### ORG-05 — Remove Team Member

- **Purpose:** Allow an Organization Owner to remove a team member.
- **Business Objective:** Manage team composition and revoke access when necessary.
- **Actors:** Owner
- **Trigger:** Owner removes a team member.
- **Preconditions:** Target is a member of the Organization. Target is not the Owner (BR-ORG-03).
- **Outcome:** Member's access revoked. Events created by the member remain owned by the Organization (BR-ORG-06).
- **Rules:** BR-ORG-03 (owner self-removal prevention), BR-ORG-06 (event ownership continuity)
- **Process:** 8.2 Team Management
- **Dependencies:** ORG-04 (member must have joined)

---

### ORG-06 — Change Member Role

- **Purpose:** Allow an Organization Owner to reassign a team member's permission group.
- **Business Objective:** Adjust responsibilities as team needs evolve.
- **Actors:** Owner
- **Trigger:** Owner changes a member's permission group.
- **Preconditions:** Target is a member of the Organization. Organization must retain at least one Owner.
- **Outcome:** Member's permission group updated. Access rights change accordingly.
- **Rules:** BR-ORG-04 (permission group assignment)
- **Process:** 8.2 Team Management
- **Dependencies:** ORG-04 (member must have joined)

---

### ORG-07 — Transfer Ownership

- **Purpose:** Allow an Organization Owner to transfer the Owner role to another team member.
- **Business Objective:** Support organizational succession and governance changes.
- **Actors:** Owner
- **Trigger:** Owner initiates ownership transfer to another member.
- **Preconditions:** Target is an existing member of the Organization.
- **Outcome:** Target becomes Owner. Original Owner's role changes (to Manager or as configured). Organization always has exactly one Owner.
- **Rules:** BR-ORG-03 (cannot remove self — transfer first), BR-ORG-04 (role assignment)
- **Process:** 8.2 Team Management
- **Dependencies:** ORG-04 (target must be a team member)

---

### ORG-08 — Update Organization Profile

- **Purpose:** Allow the Organization Owner to edit organizational details.
- **Business Objective:** Keep organization information current and accurate.
- **Actors:** Owner
- **Trigger:** Owner edits organization details (name, description, logo, contact).
- **Preconditions:** Organization is ACTIVE. Actor is Owner.
- **Outcome:** Organization profile updated.
- **Rules:** None (standard CRUD)
- **Process:** None (standalone capability)
- **Dependencies:** ORG-02 (organization must be approved)

---

### ORG-09 — View Organization Dashboard

- **Purpose:** Provide an overview of the Organization's operational status.
- **Business Objective:** Enable strategic decision-making through visibility into events, revenue, and team activity.
- **Actors:** Owner, Manager
- **Trigger:** Actor accesses the Organization dashboard.
- **Preconditions:** Actor has Owner or Manager permission.
- **Outcome:** Dashboard shows: active events, team members, revenue summary, pending settlements, recent activity.
- **Rules:** None (reporting capability)
- **Process:** None (standalone capability)
- **Dependencies:** EVT-01 (events), PAY-08 (revenue data)

---

## Capability Group 7: Identity & Access

### USR-01 — Register

- **Purpose:** Allow a Guest to create an account on the platform.
- **Business Objective:** Grow the platform's user base and enable all authenticated interactions.
- **Actors:** Guest → becomes Attendee
- **Trigger:** Guest submits registration details.
- **Preconditions:** None.
- **Outcome:** Account created with default Attendee role (BR-ORG-01). User can browse, purchase, and join waitlists.
- **Rules:** BR-ORG-01 (default attendee role)
- **Process:** 8.1 Organization Onboarding (role context)
- **Dependencies:** None (entry point)

---

### USR-02 — Login / Logout

- **Purpose:** Allow authenticated users to start and end sessions.
- **Business Objective:** Secure access control for all platform operations.
- **Actors:** All authenticated roles
- **Trigger:** User submits credentials (login) or ends session (logout).
- **Preconditions:** Account exists (for login). Active session exists (for logout).
- **Outcome:** Session started or ended.
- **Rules:** None (standard authentication)
- **Process:** None (standalone capability)
- **Dependencies:** USR-01 (user must be registered)

---

### USR-03 — Manage Profile

- **Purpose:** Allow an Attendee to update their personal information.
- **Business Objective:** Keep user data accurate for communication and ticketing.
- **Actors:** Attendee
- **Trigger:** User accesses profile settings.
- **Preconditions:** User is authenticated.
- **Outcome:** Profile updated with new information.
- **Rules:** None (standard CRUD)
- **Process:** None (standalone capability)
- **Dependencies:** USR-01 (user must be registered)

---

### USR-04 — Manage Users

- **Purpose:** Allow Platform Admin to view, suspend, and reactivate user accounts.
- **Business Objective:** Platform governance and abuse prevention at the individual user level.
- **Actors:** Platform Admin
- **Trigger:** Platform Admin accesses user management interface.
- **Preconditions:** Actor has Platform Admin role.
- **Outcome:** User status changed (suspended/reactivated) or user details viewed.
- **Rules:** None (platform administration)
- **Process:** None (standalone capability)
- **Dependencies:** USR-01 (users must exist)

---

### USR-05 — Manage Platform Team

- **Purpose:** Allow Platform Admin to assign internal platform roles (Operations, Finance).
- **Business Objective:** Distribute platform administrative responsibilities.
- **Actors:** Platform Admin
- **Trigger:** Platform Admin assigns or changes a platform team member's role.
- **Preconditions:** Actor is Platform Admin. Target user has an active account.
- **Outcome:** User assigned to Platform Operations, Platform Finance, or Platform Support role.
- **Rules:** None (platform administration)
- **Process:** None (standalone capability)
- **Dependencies:** USR-01 (users must exist)

---

## Capability Group 8: Platform Operations

### OPS-01 — Manage Notification Templates

- **Purpose:** Allow Platform Admin to create and maintain notification templates.
- **Business Objective:** Centralize communication content for consistency and reusability.
- **Actors:** Platform Admin
- **Trigger:** Platform Admin creates or edits a notification template.
- **Preconditions:** Actor has Platform Admin role.
- **Outcome:** Notification template created or updated. Available for system-triggered notifications.
- **Rules:** None (platform administration)
- **Process:** None (standalone capability)
- **Dependencies:** None

---

### OPS-02 — Send Notification

- **Purpose:** Deliver notifications to users based on business events.
- **Business Objective:** Keep users informed of relevant status changes and actions required.
- **Actors:** System
- **Trigger:** A business event that warrants notification (e.g., order confirmation, refund processed, event cancelled, waitlist availability).
- **Preconditions:** Notification template exists for the event type. Target user has valid contact information.
- **Outcome:** Notification delivered via configured channels (push notification, email).
- **Rules:** None (infrastructure capability)
- **Process:** All processes that generate user-facing events
- **Dependencies:** OPS-01 (templates must exist)

---

### OPS-03 — View Audit Log

- **Purpose:** Allow Platform Admin to browse the immutable history of significant system actions.
- **Business Objective:** Provide accountability, compliance evidence, and incident investigation capability.
- **Actors:** Platform Admin
- **Trigger:** Platform Admin accesses audit log interface.
- **Preconditions:** Actor has Platform Admin role.
- **Outcome:** Filterable, searchable view of all audit entries (BR-AUD-03 schema).
- **Rules:** BR-AUD-01 (mandatory logging), BR-AUD-02 (immutability), BR-AUD-03 (entry requirements)
- **Process:** All state transitions on critical entities
- **Dependencies:** None (continuously populated by the system)

---

### OPS-04 — Moderate Content

- **Purpose:** Allow Platform Operations to remove inappropriate reviews or content.
- **Business Objective:** Maintain platform content quality and community standards.
- **Actors:** Platform Operations
- **Trigger:** Content flagged by users or identified during routine moderation.
- **Preconditions:** Content exists and has been identified for review.
- **Outcome:** Content removed or retained based on platform content policy.
- **Rules:** BR-REV-05 (content moderation)
- **Process:** None (standalone capability)
- **Dependencies:** None

---

### OPS-05 — Suspend Organization

- **Purpose:** Allow Platform Admin to temporarily disable an Organization's operations pending investigation.
- **Business Objective:** Protect Attendees and the platform from potentially harmful organizational behavior.
- **Actors:** Platform Admin
- **Trigger:** Platform Admin initiates suspension with a reason.
- **Preconditions:** Organization is ACTIVE. Grounds for suspension identified.
- **Outcome:** Organization status transitions to SUSPENDED. All published events hidden. Ticket sales stopped. New event creation blocked. Payouts frozen. Existing valid tickets remain honored (BR-ORG-07).
- **Rules:** BR-ORG-07 (suspension effects)
- **Process:** 8.10 Organization Suspension
- **Dependencies:** ORG-02 (organization must exist and be active)

---

### OPS-06 — Lift Suspension

- **Purpose:** Allow Platform Admin to restore a suspended Organization's operations.
- **Business Objective:** Resume normal business operations after investigation concludes favorably.
- **Actors:** Platform Admin
- **Trigger:** Platform Admin lifts suspension after investigation.
- **Preconditions:** Organization is SUSPENDED.
- **Outcome:** Organization status transitions to ACTIVE. All operations resume. Events re-published. Ticket sales resume.
- **Rules:** None (reversal of OPS-05)
- **Process:** 8.10 Organization Suspension
- **Dependencies:** OPS-05 (organization must be suspended)

---

### OPS-07 — Ban Organization

- **Purpose:** Permanently deactivate an Organization that has severely violated platform policies.
- **Business Objective:** Remove bad actors from the platform to protect Attendees and platform integrity.
- **Actors:** Platform Admin
- **Trigger:** Platform Admin initiates permanent ban.
- **Preconditions:** Organization exists. Grounds for permanent ban established (typically after repeated violations or severe misconduct).
- **Outcome:** All upcoming events cancelled. All tickets auto-refunded (cost allocated per BR-REF-04 — organizer-fault: organizer receives no settlement, platform waives commission). Pending payouts settled then frozen. Organization status becomes BANNED. Organization cannot create a new account with the same identity (BR-ORG-08).
- **Rules:** BR-ORG-08 (ban effects), BR-REF-04 (organizer-fault cost allocation), BR-EVT-05 (cancellation auto-refund)
- **Process:** 8.10 Organization Suspension
- **Dependencies:** None (can ban from any state)

---

## Capability Group 9: Event Reviews & Ratings

### REV-01 — Submit Review

- **Purpose:** Allow an Attendee to submit a rating and written review for a completed Event.
- **Business Objective:** Build trust on the platform and provide feedback to Organizers.
- **Actors:** Attendee
- **Trigger:** Attendee submits a review for an Event.
- **Preconditions:** Event is COMPLETED. Attendee is eligible per BR-REV-01. One review per attendee (BR-REV-03).
- **Outcome:** Review is recorded and associated with the Event and Attendee.
- **Rules:** BR-REV-01 (review eligibility), BR-REV-02 (cancelled event not reviewable), BR-REV-03 (one review per attendee), BR-REV-04 (no edit)
- **Process:** None (standalone capability)
- **Dependencies:** TKT-08 (check-in) or TKT-03 (purchase)

---

### REV-02 — View Reviews

- **Purpose:** Allow guests and attendees to view ratings and reviews for an Event.
- **Business Objective:** Inform Attendee purchase decisions and build marketplace transparency.
- **Actors:** Guest, Attendee
- **Trigger:** User views the event details page.
- **Preconditions:** Event has reviews.
- **Outcome:** Reviews and aggregate rating displayed on the Event details page.
- **Rules:** None (view-only capability)
- **Process:** None (standalone capability)
- **Dependencies:** EVT-09 (view event details)

---

### REV-03 — Moderate Reviews

- **Purpose:** Allow Platform Operations to remove reviews that violate content policies.
- **Business Objective:** Maintain platform quality and prevent abuse.
- **Actors:** Platform Operations
- **Trigger:** Platform Operations removes a review.
- **Preconditions:** Review exists.
- **Outcome:** Review is removed from public view.
- **Rules:** BR-REV-05 (content moderation)
- **Process:** None (standalone capability)
- **Dependencies:** REV-01 (reviews must exist)

---

## Capability Summary

| Group | Capabilities | Count |
|---|---|---|
| Event Management | EVT-01 to EVT-09 | 9 |
| Ticketing | TKT-01 to TKT-09 | 9 |
| Payment & Finance | PAY-01 to PAY-09 | 9 |
| Promotions | PRM-01 to PRM-04 | 4 |
| Engagement Tracking | ENG-01 to ENG-03 | 3 |
| Organization Management | ORG-01 to ORG-09 | 9 |
| User Management & Auth | USR-01 to USR-05 | 5 |
| Platform Operations | OPS-01 to OPS-07 | 7 |
| Event Reviews & Ratings | REV-01 to REV-03 | 3 |
| **Total** | | **58** |

---

> **End of Business Capabilities V1.1**
