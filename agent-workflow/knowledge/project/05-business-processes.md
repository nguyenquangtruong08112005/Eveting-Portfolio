# BUSINESS PROCESSES — Eventing Platform V1

> **Document ID:** EV-BP-001
> **Version:** 1.1 (Baselined)
> **Status:** ✅ APPROVED — Baselined
> **Last Updated:** 2026-07-06
> **Dependency:** Project Charter V2.3 (EV-PC-001), Business Rules Specification V1.1 (EV-BR-001), Business Capabilities V1.1 (EV-BC-001), Business Glossary V1.1 (EV-GL-001)
> **Deliverable #:** Phase 1, Item 6

---

## Purpose

This document defines the core Business Processes of the Eventing Platform. Each process describes a complete business workflow from trigger to outcome, identifying actors, rules, capabilities, decision points, and business states.

All processes are **implementation-independent**. They describe **what** the business does — not how the software implements it.

---

## State Reference

Entity states referenced in this document are authoritative and must match the State Machines document (06-state-machines.md).

| Entity | States |
|---|---|
| Event | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, ONGOING, COMPLETED, CANCELLED, SUSPENDED, REJECTED |
| Order | PENDING_PAYMENT, CONFIRMED, EXPIRED, CANCELLED |
| Ticket | ISSUED, CHECKED_IN, CANCELLED, REFUNDED |
| Reservation | ACTIVE, CONSUMED, EXPIRED |
| Organization | PENDING_REVIEW, ACTIVE, SUSPENDED, BANNED |
| Settlement | PENDING_CALCULATION, PENDING_REVIEW, APPROVED, PAID, UNDER_REVIEW |
| Refund Request | PENDING_REVIEW, APPROVED, REJECTED |
| Invitation | PENDING, ACCEPTED, EXPIRED, REVOKED |
| Waitlist Entry | QUEUED, NOTIFIED, PURCHASED, EXPIRED |
| Payout | PENDING, COMPLETED |

---

## BP-01: Organization Onboarding

**Charter Reference:** Section 8.1

### Purpose

Enable a user to register an Organization on the platform and obtain authorization to create Events.

### Trigger

An Attendee applies to create an Organization.

### Preconditions

- Applicant has a registered Attendee account.

### Primary Actor

Attendee (applicant)

### Supporting Actors

Platform Operations (reviewer)

### Inputs

- Organization name, description, contact information, supporting documents.

### Outputs

- Organization record with status (ACTIVE or rejected with reason).
- Applicant role upgraded to Owner (if approved).

### Business Rules Referenced

| Rule | Description |
|---|---|
| BR-ORG-01 | Default Attendee role on registration |
| BR-ORG-02 | Organization approval gate |

### Business Capabilities Referenced

| Capability | Description |
|---|---|
| ORG-01 | Register Organization |
| ORG-02 | Approve Organization |
| USR-01 | Register (prerequisite) |

### Start State

Organization: *(does not exist)*

### Main Success Flow

1. Attendee submits Organization application with required details.
2. Organization created in **PENDING_REVIEW** status.
3. Platform Operations receives notification of new application.
4. Platform Operations reviews the application.
5. Platform Operations **approves** the application.
6. Organization status transitions to **ACTIVE**.
7. Applicant's role upgraded to **Owner**.
8. Owner notified of approval.

### Alternative Flows

**AF-01: Application Rejected**

- At step 5: Platform Operations rejects the application with a reason.
- Organization status remains **PENDING_REVIEW** (or is marked as rejected).
- Applicant notified of rejection with reason.
- Applicant may correct issues and re-apply (returns to step 1).

### Exception Flows

None.

### Business Outcomes

- **Success:** Organization is ACTIVE. Owner can invite team members and create Events.
- **Rejection:** Applicant informed. May re-apply.

### End State

- Organization: **ACTIVE** (success) or application rejected (no state change).

### Postconditions

- Owner can perform all Organization Management capabilities (ORG-03 through ORG-09).
- Owner can create Events (EVT-01).

---

## BP-02: Team Management

**Charter Reference:** Section 8.2

### Purpose

Enable an Organization Owner to build and manage their team by inviting members, assigning roles, and maintaining team composition.

### Trigger

Owner initiates a team management action (invite, role change, remove, or transfer).

### Preconditions

- Organization is ACTIVE.
- Actor is Owner of the Organization.

### Primary Actor

Owner

### Supporting Actors

Invited User (for invitation acceptance)

### Inputs

- **Invite:** Target user, assigned Permission Group (Owner/Manager/Staff).
- **Role Change:** Target member, new Permission Group.
- **Remove:** Target member.
- **Transfer:** Target member (new Owner).

### Outputs

- Updated team roster with role assignments.
- Notifications to affected team members.

### Business Rules Referenced

| Rule | Description |
|---|---|
| BR-ORG-03 | Owner cannot remove self |
| BR-ORG-04 | Permission Group assignment |
| BR-ORG-06 | Event ownership continuity on member removal |

### Business Capabilities Referenced

| Capability | Description |
|---|---|
| ORG-03 | Invite Team Member |
| ORG-04 | Accept Invitation |
| ORG-05 | Remove Team Member |
| ORG-06 | Change Member Role |
| ORG-07 | Transfer Ownership |

### Start State

Invitation: *(does not exist)*

### Main Success Flow — Invite Member

1. Owner creates an invitation with target user and Permission Group.
2. Invitation created in **PENDING** status.
3. Invitation sent to target user (email / in-app notification).
4. Target user accepts the invitation.
5. Invitation status transitions to **ACCEPTED**.
6. User added to Organization with assigned Permission Group.
7. Team roster updated. Both parties notified.

### Alternative Flows

**AF-01: Target User Not Registered**

- At step 4: Target user must register first (USR-01), then accept the invitation.
- Flow continues from step 5.

**AF-02: Invitation Expires**

- Invitation reaches expiry time without acceptance.
- Invitation status transitions to **EXPIRED**.
- Owner notified. May re-invite.

**AF-03: Owner Revokes Invitation**

- Owner cancels a pending invitation before acceptance.
- Invitation status transitions to **REVOKED**.

**AF-04: Role Change**

1. Owner selects an existing team member.
2. Owner assigns a new Permission Group.
3. Permission Group updated immediately.
4. Member notified of role change.

**AF-05: Remove Member**

1. Owner selects a team member to remove.
2. System validates: target is NOT the Owner (BR-ORG-03).
3. Member removed from Organization.
4. Member's access revoked.
5. Events created by the member remain owned by the Organization (BR-ORG-06).
6. Removed member notified.

**AF-06: Transfer Ownership**

1. Owner selects an existing team member.
2. Owner confirms ownership transfer.
3. Target member becomes Owner.
4. Original Owner becomes Manager.
5. Both parties notified.

### Exception Flows

**EX-01: Remove Self (Owner)**

- At AF-05 step 2: Validation fails. Owner cannot remove self (BR-ORG-03).
- Action blocked with explanation: "Transfer ownership before removing yourself."

### Business Outcomes

- **Invite Success:** Team grows. New member has role-based access.
- **Role Change:** Responsibilities adjusted.
- **Remove:** Access revoked. Organizational data preserved.
- **Transfer:** Governance succession completed.

### End State

- Invitation: **ACCEPTED** (success), **EXPIRED**, or **REVOKED**.

### Postconditions

- Team roster reflects current composition.
- All role changes are effective immediately.
- Audit trail records team management actions (BR-AUD-01).

---

## BP-03: Event Creation & Approval

**Charter Reference:** Section 8.3

### Purpose

Enable an Organization to create, configure, and publish Events on the platform through a quality-controlled approval process.

### Trigger

Event Manager initiates event creation within their Organization.

### Preconditions

- Organization is ACTIVE.
- Actor has Manager or Owner permission.

### Primary Actor

Event Manager

### Supporting Actors

Platform Operations (reviewer)

### Inputs

- Event details: title, description, venue, schedule, category.
- Ticket Types: name, base price, capacity, sales window.
- Optional: Early Bird pricing strategy, voucher codes, group discount configuration.

### Outputs

- Published Event visible to Attendees.
- Configured Ticket Types with pricing and availability.

### Business Rules Referenced

| Rule | Description |
|---|---|
| BR-EVT-01 | Approval gate — must be approved before visible |
| BR-EVT-02 | Post-sale edit lock — major edits blocked after tickets sold |
| BR-EVT-03 | Minor edit pass-through — no re-approval needed |
| BR-EVT-04 | Major edit re-approval — reverts to PENDING_REVIEW |
| BR-EVT-07 | Single Organization ownership |
| BR-EVT-08 | Minimum one Ticket Type required for submission |

### Business Capabilities Referenced

| Capability | Description |
|---|---|
| EVT-01 | Create Event |
| EVT-02 | Edit Event (Minor) |
| EVT-03 | Edit Event (Major) |
| EVT-04 | Submit Event for Approval |
| EVT-05 | Approve / Reject Event |
| TKT-01 | Define Ticket Types |
| TKT-02 | Configure Pricing Strategy |
| PRM-01 | Create Voucher Code |
| PRM-02 | Configure Group Discount |

### Start State

Event: *(does not exist)*

### Main Success Flow

1. Event Manager creates a new Event with required details.
2. Event created in **DRAFT** status.
3. Event Manager defines at least one Ticket Type with base price, capacity, and sales window (BR-EVT-08).
4. Event Manager optionally configures Early Bird pricing strategy for ticket type(s).
5. Event Manager optionally creates voucher codes and/or configures group discount.
6. Event Manager submits the Event for approval (EVT-04).
7. Event status transitions to **PENDING_REVIEW**.
8. Platform Operations receives notification of pending review.
9. Platform Operations reviews the Event.
10. Platform Operations **approves** the Event.
11. Event status transitions to **APPROVED** → **PUBLISHED**.
12. Event becomes visible to Attendees for browsing and purchase.
13. Event Manager and Organization Owner notified of approval.

### Alternative Flows

**AF-01: Event Rejected**

- At step 10: Platform Operations rejects the Event with a reason.
- Event status transitions to **REJECTED**.
- Event Manager notified with rejection reason.
- Event Manager edits the Event and re-submits (returns to step 6).

**AF-02: Minor Edit After Approval**

- Event is APPROVED or PUBLISHED.
- Event Manager modifies minor attributes (description, banner, FAQ, contact info).
- Changes applied immediately. No re-approval required (BR-EVT-03).
- Event status unchanged.

**AF-03: Major Edit After Approval (No Tickets Sold)**

- Event is APPROVED or PUBLISHED. No tickets have been sold.
- Event Manager modifies major attributes (date, venue, capacity, pricing).
- Event status reverts to **PENDING_REVIEW** (BR-EVT-04).
- Event becomes invisible until re-approved (returns to step 8).

**AF-04: Major Edit Blocked (Tickets Sold)**

- Event is PUBLISHED. Tickets have been sold.
- Event Manager attempts to modify major attributes.
- Action **blocked** (BR-EVT-02).
- Event Manager informed: "Major edits are not permitted after tickets have been sold."

### Exception Flows

**EX-01: Submission Without Ticket Type**

- At step 6: Event has no Ticket Types defined.
- Submission blocked (BR-EVT-08).
- Event Manager informed: "At least one Ticket Type is required."

### Business Outcomes

- **Success:** Event is PUBLISHED and discoverable by Attendees.
- **Rejected:** Event Manager informed and may revise.
- **Major Edit Post-Sale:** Blocked to protect Attendee interests.

### End State

- Event: **PUBLISHED** (success), **REJECTED** (may re-submit), or **DRAFT** (still editing).

### Postconditions

- Published Event is available for browsing (EVT-08, EVT-09) and ticket purchase (TKT-03).
- Ticket sales begin when Sales Window opens (BR-TKT-03).
- Audit trail records creation, submission, and approval decisions (BR-AUD-01).

---

## BP-04: Ticket Purchase

**Charter Reference:** Section 8.4

### Purpose

Enable an Attendee to purchase tickets for a published Event through a secure, inventory-protected checkout flow.

### Trigger

Attendee initiates checkout for selected tickets.

### Preconditions

- Event is PUBLISHED (BR-TKT-01).
- Sales Window is open for the selected Ticket Type (BR-TKT-03).
- Sufficient inventory available (BR-TKT-02).
- Attendee has not exceeded the purchase limit for this Event (BR-TKT-09).
- Attendee has a registered account (USR-01).

### Primary Actor

Attendee

### Supporting Actors

System (pricing, reservation, inventory), Payment Gateway (payment processing)

### Inputs

- Selected Ticket Type and quantity.
- Optional: Voucher Code.

### Outputs

- Confirmed Order with issued Tickets (each with unique QR code).
- Payment receipt.
- Commission recorded.
- Engagement data captured.

### Business Rules Referenced

| Rule | Description |
|---|---|
| BR-TKT-01 | Published Event gate |
| BR-TKT-02 | Capacity enforcement |
| BR-TKT-03 | Configurable Sales Window |
| BR-TKT-05 | Reservation TTL |
| BR-TKT-07 | Multi-ticket orders allowed |
| BR-TKT-08 | Single-event Order |
| BR-TKT-09 | Purchase limit |
| BR-PAY-01 | Commission model |
| BR-PAY-05 | Payment idempotency |
| BR-PRC-02 | Early Bird auto-revert |
| BR-PRC-04 | Price transparency |
| BR-PRC-05 | Pricing Pipeline |
| BR-PRM-03 | No discount stacking |
| BR-PRM-04 | Best benefit selection |

### Business Capabilities Referenced

| Capability | Description |
|---|---|
| EVT-08 | Browse / Search Events |
| EVT-09 | View Event Details |
| TKT-03 | Purchase Tickets |
| PRM-03 | Apply Promotion at Checkout |
| PAY-01 | Process Payment |
| PAY-02 | Handle Payment Callback |
| PAY-03 | Calculate Commission |
| ENG-02 | Track Spending |

### Start State

Order: *(does not exist)*, Reservation: *(does not exist)*

### Main Success Flow

1. Attendee browses and selects an Event (EVT-08, EVT-09).
2. Attendee selects a Ticket Type and quantity.
3. System determines the current effective price per Pricing Pipeline (BR-PRC-05):
   - Base Price → Pricing Strategy (Early Bird if active) → Promotion (if applicable) → Final Selling Price.
4. Attendee optionally enters a Voucher Code.
5. System validates:
   - Capacity available for requested quantity (BR-TKT-02).
   - Sales Window open (BR-TKT-03).
   - Purchase limit not exceeded (BR-TKT-09).
   - Voucher Code valid (if entered): within dates, usage not exhausted, correct Event scope.
6. If both Voucher Code and Group Discount are applicable, system selects the one providing greatest benefit to Attendee (BR-PRM-04). Only one discount applied (BR-PRM-03).
7. System displays Final Selling Price with breakdown (BR-PRC-04).
8. Attendee confirms checkout.
9. Reservation created in **ACTIVE** status — inventory temporarily held.
10. Order created in **PENDING_PAYMENT** status.
11. Attendee redirected to Payment Gateway.
12. Attendee completes payment.
13. Payment Gateway confirms success.
14. Reservation status transitions to **CONSUMED**.
15. Order status transitions to **CONFIRMED**.
16. Tickets issued in **ISSUED** status — each with a unique QR code.
17. Inventory permanently decremented.
18. Commission calculated and recorded (BR-PAY-01, PAY-03).
19. Engagement data captured — spending amount recorded (ENG-02).
20. Order confirmation notification sent to Attendee (OPS-02).

### Alternative Flows

**AF-01: Payment Failure**

- At step 13: Payment Gateway reports failure or timeout.
- Reservation status transitions to **EXPIRED**.
- Order status transitions to **EXPIRED**.
- Inventory released (returned to available).
- Attendee notified of payment failure.
- Attendee may re-attempt purchase (returns to step 1).

**AF-02: Reservation Expires (TTL)**

- Between steps 9 and 12: Attendee does not complete payment within Reservation TTL (BR-TKT-05).
- Reservation status transitions to **EXPIRED**.
- Order status transitions to **EXPIRED**.
- Inventory released.
- Attendee notified.

**AF-03: Guest User**

- At step 1: User is a Guest (not authenticated).
- Guest must register (USR-01) or log in (USR-02) before proceeding to step 2.
- Flow continues from step 2.

**AF-04: No Voucher Code Entered**

- At step 4: Attendee does not enter a Voucher Code.
- Pricing Pipeline applies Base Price → Pricing Strategy only.
- Group Discount evaluated automatically if quantity meets threshold.
- Flow continues from step 7.

**AF-05: Sold Out**

- At step 5: Requested quantity exceeds available capacity.
- Attendee informed: "Only [N] tickets remaining" or "SOLD OUT."
- Attendee may reduce quantity or join Waitlist (TKT-06).

**AF-06: Purchase Limit Exceeded**

- At step 5: Existing purchased quantity + requested quantity exceeds Event's purchase limit.
- Attendee informed: "You can purchase a maximum of [N] tickets for this event."

### Exception Flows

**EX-01: Duplicate Payment Callback**

- Payment Gateway sends duplicate confirmation for the same Order.
- System recognizes the Order is already CONFIRMED (BR-PAY-05).
- Duplicate ignored. No additional tickets issued.

### Business Outcomes

- **Success:** Attendee receives Tickets. Organization earns revenue. Platform records commission.
- **Payment Failure:** No financial impact. Inventory restored.
- **Sold Out:** Demand captured via Waitlist.

### End State

- Order: **CONFIRMED** (success), **EXPIRED** (failure/timeout).
- Ticket: **ISSUED** (success).
- Reservation: **CONSUMED** (success), **EXPIRED** (failure/timeout).

### Postconditions

- Confirmed tickets are viewable by Attendee (TKT-05).
- Tickets are eligible for check-in (TKT-08).
- Tickets are eligible for refund request (TKT-09) within Refund Cutoff Period (BR-REF-07).
- Waitlist may be triggered if inventory was previously sold out (TKT-07).

---

## BP-05: Group Purchase (Leader Pays All)

**Charter Reference:** Section 8.5

### Purpose

Enable a single Attendee (the leader) to purchase multiple tickets in one transaction, potentially qualifying for a Group Discount.

### Trigger

Attendee selects a ticket quantity that meets or exceeds the Group Discount threshold.

### Preconditions

- All preconditions from BP-04 (Ticket Purchase) apply.
- Group Discount is configured for this Event (PRM-02).
- Requested quantity ≥ Group Discount minimum threshold (BR-PRM-02).

### Primary Actor

Attendee (as group leader)

### Supporting Actors

System (pricing, discount evaluation), Payment Gateway

### Inputs

- Selected Ticket Type and quantity (N tickets).
- Optional: Voucher Code.

### Outputs

- Single confirmed Order for N tickets.
- N Tickets issued, all under the leader's account.
- N unique QR codes for independent check-in.

### Business Rules Referenced

| Rule | Description |
|---|---|
| BR-TKT-07 | Multi-ticket orders |
| BR-PRM-02 | Group Discount threshold |
| BR-PRM-03 | No discount stacking |
| BR-PRM-04 | Best benefit selection |

All BP-04 rules also apply.

### Business Capabilities Referenced

| Capability | Description |
|---|---|
| TKT-04 | Group Purchase (Leader Pays All) |
| PRM-02 | Configure Group Discount |
| PRM-03 | Apply Promotion at Checkout |

### Start State

Order: *(does not exist)*

### Main Success Flow

1. Leader selects Ticket Type and quantity N (where N ≥ Group Discount minimum).
2. System applies Pricing Pipeline (BR-PRC-05).
3. System evaluates applicable discounts:
   - Group Discount (quantity meets threshold).
   - Voucher Code (if entered).
4. If both applicable, system selects the one providing greatest benefit (BR-PRM-04). Only one discount applied (BR-PRM-03).
5. Leader confirms checkout. Follows BP-04 steps 9–20 (payment flow).
6. N Tickets issued, all under the leader's account.
7. Leader receives N unique QR codes.
8. Leader distributes QR codes to group members outside the platform.

### Alternative Flows

All BP-04 alternative flows apply.

**AF-01: Quantity Below Group Threshold**

- Quantity N < Group Discount minimum.
- Group Discount not applied. Standard purchase flow (BP-04) applies.
- Voucher Code may still be applied if entered.

### Exception Flows

None beyond BP-04 exceptions.

### Business Outcomes

- **Success:** Leader holds all tickets. Group members receive QR codes externally.
- **Failure:** Same as BP-04 payment failure outcomes.

### End State

- Order: **CONFIRMED**.
- Ticket (×N): **ISSUED**.

### Postconditions

- All N tickets are viewable by the leader (TKT-05).
- Each QR code is independently scannable at check-in (TKT-08).
- Tickets remain non-transferable — owned by the leader (BR-TKT-06).

> [!NOTE]
> In V1, "sharing QR codes" is outside the platform (e.g., screenshot, messaging app). Individual-pay collaborative purchase sessions are deferred to V2 (ADR-003).

---

## BP-06: Waitlist

**Charter Reference:** Section 8.6

### Purpose

Capture demand for sold-out Ticket Types and convert when inventory becomes available.

### Trigger

- **Join:** Attendee requests to join the Waitlist for a sold-out Ticket Type.
- **Notify:** Inventory becomes available (due to refund, cancellation, or capacity increase).

### Preconditions

- **Join:** Ticket Type is SOLD OUT. Event is PUBLISHED.
- **Notify:** Waitlist has at least one entry for the affected Ticket Type.

### Primary Actor

Attendee (joining), System (notification)

### Supporting Actors

None

### Inputs

- **Join:** Attendee identity, target Ticket Type.
- **Notify:** Available inventory count.

### Outputs

- **Join:** Confirmation of waitlist position.
- **Notify:** Notification to next person(s) in queue.

### Business Rules Referenced

| Rule | Description |
|---|---|
| BR-REF-06 | Inventory restoration triggers waitlist |

### Business Capabilities Referenced

| Capability | Description |
|---|---|
| TKT-06 | Join Waitlist |
| TKT-07 | Notify Waitlist |
| OPS-02 | Send Notification |

### Start State

Waitlist Entry: *(does not exist)*

### Main Success Flow — Join Waitlist

1. Attendee browses Event and selects a Ticket Type.
2. Ticket Type is SOLD OUT.
3. Attendee requests to join the Waitlist.
4. Waitlist Entry created in **QUEUED** status.
5. Attendee receives confirmation of waitlist position.

### Main Success Flow — Waitlist Notification & Purchase

6. Inventory becomes available for the Ticket Type (e.g., refund processed per BR-REF-06).
7. System identifies next person(s) in the FIFO queue.
8. Waitlist Entry status transitions to **NOTIFIED**.
9. Notified Attendee receives notification with time-limited purchase opportunity.
10. Attendee completes purchase within the time window (follows BP-04 purchase flow).
11. Waitlist Entry status transitions to **PURCHASED**.

### Alternative Flows

**AF-01: Notified Attendee Does Not Purchase (Window Expires)**

- At step 10: Attendee does not complete purchase within the time window.
- Waitlist Entry status transitions to **EXPIRED**.
- Next person in queue notified (returns to step 7).

**AF-02: Event Cancelled While on Waitlist**

- Event transitions to CANCELLED (BP-10 Event Cancellation).
- All Waitlist Entries cleared.
- Waitlisted Attendees notified of cancellation.

### Exception Flows

None.

### Business Outcomes

- **Join Success:** Demand captured. Attendee has a position in the queue.
- **Purchase Success:** Previously unmet demand converted to a sale.
- **Window Expired:** Next waitlisted Attendee gets the opportunity.

### End State

- Waitlist Entry: **PURCHASED** (success), **EXPIRED** (window elapsed), or cleared (event cancelled).

### Postconditions

- Purchased tickets follow standard ticket lifecycle (ISSUED → CHECKED_IN).
- Waitlist queue updated.

---

## BP-07: Check-in

**Charter Reference:** Section 8.7

### Purpose

Verify an Attendee's ticket at the event venue to validate entry rights and record attendance.

### Trigger

Check-in Staff scans an Attendee's QR code at the venue.

### Preconditions

- Event is ONGOING.
- Attendee has a Ticket in ISSUED status.

### Primary Actor

Check-in Staff

### Supporting Actors

Attendee (presents QR code), System (validation)

### Inputs

- Scanned QR code data.

### Outputs

- Validation result (accepted or rejected with reason).
- Attendance record (if accepted).

### Business Rules Referenced

| Rule | Description |
|---|---|
| BR-TKT-04 | Unique QR / single scan |

### Business Capabilities Referenced

| Capability | Description |
|---|---|
| TKT-08 | Check-in (QR Scan) |
| ENG-01 | Track Attendance |

### Start State

Ticket: **ISSUED**

### Main Success Flow

1. Attendee arrives at venue and presents QR code (app or screenshot).
2. Check-in Staff scans QR code.
3. System validates:
   - QR code corresponds to a valid Ticket.
   - Ticket belongs to this Event.
   - Ticket status is **ISSUED** (not checked-in, cancelled, or refunded).
4. All validations pass.
5. Ticket status transitions to **CHECKED_IN**.
6. Attendance recorded — engagement data captured (ENG-01).
7. Check-in Staff sees confirmation: "Check-in successful."

### Alternative Flows

**AF-01: Already Checked In**

- At step 3: Ticket status is CHECKED_IN.
- Scan rejected: "Already checked in at [timestamp]."
- Ticket status unchanged.

**AF-02: Wrong Event**

- At step 3: Ticket belongs to a different Event.
- Scan rejected: "This ticket is for a different event."

**AF-03: Invalid Ticket Status**

- At step 3: Ticket status is CANCELLED or REFUNDED.
- Scan rejected: "This ticket is no longer valid."

**AF-04: Invalid QR Code**

- At step 3: QR code does not correspond to any Ticket.
- Scan rejected: "Invalid ticket."

### Exception Flows

None.

### Business Outcomes

- **Success:** Attendee enters the venue. Attendance recorded for engagement tracking.
- **Rejection:** Attendee directed to support desk if they believe the rejection is an error.

### End State

- Ticket: **CHECKED_IN** (success) or remains **ISSUED** (rejection).

### Postconditions

- Checked-in Ticket cannot be checked in again (BR-TKT-04).
- Attendance data available for engagement queries (ENG-03).

---

## BP-08: Refund

**Charter Reference:** Section 8.8

### Purpose

Enable Attendees to request refunds and Platform Finance/Support to process them, with different approval paths depending on timing relative to the Refund Cutoff Period.

### Trigger

- **Manual:** Attendee submits a refund request.
- **Automatic:** Event is cancelled (triggers mass refund — see BP-10).

### Preconditions

- **Manual:** Order is CONFIRMED. Ticket(s) are ISSUED (not already refunded or cancelled).
- **Automatic:** Event transitions to CANCELLED.

### Primary Actor

Attendee (requester)

### Supporting Actors

Platform Finance (normal approval), Platform Support (exceptional approval), System (auto-refund on cancellation)

### Inputs

- **Manual:** Order reference, reason for refund.
- **Automatic:** Event cancellation trigger.

### Outputs

- Refund processed or rejected.
- Tickets marked as REFUNDED (if approved).
- Inventory restored.
- Attendee and Organization notified.

### Business Rules Referenced

| Rule | Description |
|---|---|
| BR-REF-01 | Manual approval required for individual refunds |
| BR-REF-02 | Automatic 100% refund on event cancellation |
| BR-REF-03 | Platform-fault cost allocation |
| BR-REF-04 | Organizer-fault cost allocation |
| BR-REF-05 | Force Majeure cost allocation |
| BR-REF-06 | Inventory restoration on refund |
| BR-REF-07 | Refund Cutoff Period |
| BR-PAY-03 | Refund via original payment method |
| BR-PAY-08 | Commission on discounted price |

### Business Capabilities Referenced

| Capability | Description |
|---|---|
| TKT-09 | Request Refund |
| PAY-07 | Process Refund |
| TKT-07 | Notify Waitlist (on inventory restoration) |
| OPS-02 | Send Notification |

### Start State

Refund Request: *(does not exist)*

### Main Success Flow — Normal Refund (Before Cutoff)

1. Attendee submits a refund request with reason.
2. System validates: request is within the Refund Cutoff Period (BR-REF-07).
3. Refund Request created in **PENDING_REVIEW** status.
4. Platform Finance receives notification of pending refund.
5. Platform Finance reviews the request.
6. Platform Finance **approves** the request.
7. Refund Request status transitions to **APPROVED**.
8. Fault type determined (platform fault, organizer fault, or attendee-initiated):
   - Platform fault → Platform bears cost, commission waived (BR-REF-03).
   - Organizer fault → Organizer bears cost, commission waived (BR-REF-04).
   - Attendee-initiated (no fault) → Standard refund processing.
9. Refund processed via original payment method (BR-PAY-03).
10. Ticket(s) status transitions to **REFUNDED**.
11. Inventory restored — available tickets increase (BR-REF-06).
12. If Waitlist exists for this Ticket Type, next person notified (TKT-07).
13. Attendee notified of refund approval and processing.
14. Organization notified of refund.

### Alternative Flows

**AF-01: Refund Rejected**

- At step 6: Platform Finance rejects the request with a reason.
- Refund Request status transitions to **REJECTED**.
- Attendee notified with rejection reason.
- Tickets remain ISSUED.

**AF-02: Exceptional Refund (After Cutoff, Before Event Start)**

- At step 2: Request is submitted after the Refund Cutoff Period but before the Event starts.
- Refund Request created in **PENDING_REVIEW** status, flagged as exceptional.
- Request routed to **Platform Support** (not Platform Finance).
- Platform Support evaluates against exceptional criteria:
  - Medical emergency
  - Duplicate payment
  - Platform error
  - Other cases at Platform Support's discretion
- If approved: continues from step 7.
- If rejected: continues as AF-01.

**AF-03: Post-Event Refund Request**

- At step 2: Event has already started or completed.
- Normal refund request **NOT accepted** (BR-REF-07).
- Attendee informed: "Refund requests are not accepted after the event has started."
- Only Event Cancellation refunds (BR-REF-02) apply post-event.

**AF-04: Automatic Refund on Event Cancellation**

- Event transitions to CANCELLED (see BP-10).
- System automatically creates refund for ALL confirmed Orders — no manual approval (BR-REF-02).
- All Tickets status transitions to **CANCELLED**.
- All inventory restored.
- Cost allocation per fault type (BR-REF-03/04/05).
- All Attendees notified of cancellation and refund.

### Exception Flows

None.

### Business Outcomes

- **Approved:** Attendee receives refund. Inventory potentially recycled via Waitlist.
- **Rejected:** Tickets remain valid. Attendee informed.
- **Auto-Refund:** Full consumer protection on cancellation.

### End State

- Refund Request: **APPROVED** or **REJECTED**.
- Ticket: **REFUNDED** (if approved) or remains **ISSUED** (if rejected).

### Postconditions

- Refunded inventory may trigger Waitlist notification (BP-06).
- Settlement calculation will subtract refunded amounts (BP-09).
- Audit trail records refund decision and processing (BR-AUD-01).

---

## BP-09: Settlement & Payout

**Charter Reference:** Section 8.9

### Purpose

Calculate the net amount owed to an Organization after Event completion, review for accuracy, and transfer funds.

### Trigger

Cooling Period expires for a completed Event (BR-PAY-06).

### Preconditions

- Event is COMPLETED (EVT-07).
- Cooling Period has elapsed.

### Primary Actor

Platform Finance

### Supporting Actors

System (calculation), Finance Manager (reporting)

### Inputs

- Gross revenue from all confirmed Orders for the Event.
- Total commission (calculated per BR-PAY-01).
- Total refunds processed during and after the Cooling Period.

### Outputs

- Settlement record with financial breakdown.
- Payout to Organization's registered bank account.
- Financial notifications to Organization.

### Business Rules Referenced

| Rule | Description |
|---|---|
| BR-PAY-01 | Commission model (percentage-based) |
| BR-PAY-02 | Settlement formula |
| BR-PAY-06 | Settlement Cooling Period |
| BR-PAY-07 | Manual payout |
| BR-PAY-08 | Commission on discounted price |

### Business Capabilities Referenced

| Capability | Description |
|---|---|
| EVT-07 | Complete Event |
| PAY-03 | Calculate Commission |
| PAY-04 | Generate Settlement |
| PAY-05 | Review Settlement |
| PAY-06 | Process Payout |
| PAY-08 | View Revenue Report |
| PAY-09 | View Transaction History |

### Start State

Settlement: *(does not exist)*

### Main Success Flow

1. Event reaches scheduled end time.
2. Event status transitions to **COMPLETED** (EVT-07).
3. Cooling Period begins (BR-PAY-06).
4. During the Cooling Period: refund requests may still be submitted and processed (BP-08).
5. Cooling Period expires.
6. System calculates Settlement:
   - Gross Revenue (total of all confirmed Order amounts)
   - − Commission (platform percentage fee on each Order's final selling price, per BR-PAY-01, BR-PAY-08)
   - − Refunds Processed (total refund amounts)
   - = **Net Settlement Amount** (owed to Organization)
7. Settlement created in **PENDING_REVIEW** status.
8. Platform Finance receives notification.
9. Platform Finance reviews the Settlement (PAY-05).
10. Platform Finance **approves** the Settlement.
11. Settlement status transitions to **APPROVED**.
12. Platform Finance initiates manual Payout (BR-PAY-07, PAY-06).
13. Payout created in **PENDING** status.
14. Funds transferred to Organization's registered bank account.
15. Payout status transitions to **COMPLETED**.
16. Settlement status transitions to **PAID**.
17. Organization (Finance Manager) notified of payout completion.

### Alternative Flows

**AF-01: Settlement Disputed**

- At step 10: Platform Finance identifies a discrepancy.
- Settlement status transitions to **UNDER_REVIEW**.
- Investigation conducted.
- Settlement recalculated if needed.
- Returns to step 9 for re-review.

**AF-02: No Revenue (Free Event or Full Refund)**

- At step 6: Net Settlement Amount = 0 or negative.
- Settlement recorded with zero/negative balance.
- No Payout initiated.
- Organization notified.

### Exception Flows

None.

### Business Outcomes

- **Success:** Organization receives accurate payment. Platform retains commission.
- **Dispute:** Financial accuracy ensured through investigation before payout.

### End State

- Settlement: **PAID** (success) or **UNDER_REVIEW** (dispute).
- Payout: **COMPLETED** (success) or **PENDING** (awaiting transfer).

### Postconditions

- Financial records complete for the Event lifecycle.
- Revenue reports available (PAY-08).
- Transaction history immutable (BR-PAY-04).
- Audit trail records settlement and payout actions (BR-AUD-01).

---

## BP-10: Organization Suspension

**Charter Reference:** Section 8.10

### Purpose

Allow the platform to suspend, lift suspension, or permanently ban an Organization that violates platform policies.

### Trigger

- **Suspend:** Platform Admin identifies policy violation.
- **Lift:** Investigation concludes favorably.
- **Ban:** Severe or repeated violations warrant permanent removal.

### Preconditions

- **Suspend:** Organization is ACTIVE.
- **Lift:** Organization is SUSPENDED.
- **Ban:** Organization exists (typically SUSPENDED, but can escalate from ACTIVE).

### Primary Actor

Platform Admin

### Supporting Actors

System (enforcement of suspension effects)

### Inputs

- **Suspend:** Organization identity, reason for suspension.
- **Lift:** Organization identity, resolution notes.
- **Ban:** Organization identity, reason for ban.

### Outputs

- Updated Organization status with corresponding operational effects.
- Notifications to Organization team and affected Attendees (if applicable).

### Business Rules Referenced

| Rule | Description |
|---|---|
| BR-ORG-07 | Suspension effects |
| BR-ORG-08 | Ban effects |
| BR-EVT-05 | Event cancellation auto-refund (on ban) |
| BR-REF-04 | Organizer-fault cost allocation (ban = organizer-caused) |

### Business Capabilities Referenced

| Capability | Description |
|---|---|
| OPS-05 | Suspend Organization |
| OPS-06 | Lift Suspension |
| OPS-07 | Ban Organization |
| EVT-06 | Cancel Event (triggered by ban) |

### Start State

Organization: **ACTIVE** (for suspension), **SUSPENDED** (for lift/ban)

### Main Success Flow — Suspend Organization

1. Platform Admin identifies a policy violation.
2. Platform Admin initiates suspension with a reason.
3. Organization status transitions to **SUSPENDED**.
4. Immediate effects:
   - All PUBLISHED Events become **SUSPENDED** (hidden from public).
   - Ticket sales for all Organization Events stopped.
   - Pending Orders (PENDING_PAYMENT) cancelled. Reservations released.
   - Already-sold Tickets remain valid (Attendees can attend if Event occurs).
   - New Event creation blocked.
   - Pending Payouts frozen.
   - Team members have read-only access.
5. Organization Owner and team notified of suspension with reason.

### Alternative Flows

**AF-01: Lift Suspension**

1. Platform Admin determines investigation outcome is favorable.
2. Platform Admin lifts the suspension.
3. Organization status transitions to **ACTIVE**.
4. Events may be re-published (may require re-approval per platform discretion).
5. Payouts unfrozen.
6. Normal operations resume.
7. Organization Owner notified.

**AF-02: Permanent Ban (Escalation)**

1. Platform Admin determines the violation warrants permanent removal.
2. Platform Admin initiates a permanent ban.
3. Organization status transitions to **BANNED**.
4. All upcoming Events cancelled — triggers auto-refund (BR-EVT-05):
   - Cost treated as organizer-caused (BR-REF-04) — Organizer receives no settlement for cancelled events.
   - Platform waives commission.
5. All Tickets for upcoming Events automatically refunded to Attendees.
6. Completed-event Payouts already processed are NOT clawed back.
7. Pending Payouts settled per normal rules, then Organization deactivated.
8. Organization cannot create a new Organization with the same identity (BR-ORG-08).
9. All affected Attendees notified of Event cancellations.
10. Organization Owner notified of permanent ban.

### Exception Flows

None.

### Business Outcomes

- **Suspension:** Organization operations paused. Attendees with valid tickets protected.
- **Lift:** Business continuity restored.
- **Ban:** Bad actor permanently removed. Full consumer protection through auto-refunds.

### End State

- Organization: **SUSPENDED** (suspension), **ACTIVE** (lift), or **BANNED** (permanent ban).

### Postconditions

- **Suspension:** Ongoing Events may still occur if they've already started. Attendees are not affected.
- **Lift:** Organization resumes normal operations.
- **Ban:** No further platform activity. Existing financial records preserved. Audit trail records all actions.

---

## Process Summary

| ID | Process | Charter Ref | Primary Actor | Start State | End State |
|---|---|---|---|---|---|
| BP-01 | Organization Onboarding | 8.1 | Attendee → Owner | *(none)* | Org: ACTIVE |
| BP-02 | Team Management | 8.2 | Owner | Inv: *(none)* | Inv: ACCEPTED/EXPIRED/REVOKED |
| BP-03 | Event Creation & Approval | 8.3 | Event Manager | Event: *(none)* | Event: PUBLISHED |
| BP-04 | Ticket Purchase | 8.4 | Attendee | Order: *(none)* | Order: CONFIRMED, Ticket: ISSUED |
| BP-05 | Group Purchase | 8.5 | Attendee (leader) | Order: *(none)* | Order: CONFIRMED, Ticket: ISSUED (×N) |
| BP-06 | Waitlist | 8.6 | Attendee / System | WL: *(none)* | WL: PURCHASED/EXPIRED |
| BP-07 | Check-in | 8.7 | Check-in Staff | Ticket: ISSUED | Ticket: CHECKED_IN |
| BP-08 | Refund | 8.8 | Attendee | Refund: *(none)* | Refund: APPROVED/REJECTED |
| BP-09 | Settlement & Payout | 8.9 | Platform Finance | Settlement: *(none)* | Settlement: PAID |
| BP-10 | Org Suspension | 8.10 | Platform Admin | Org: ACTIVE | Org: SUSPENDED/ACTIVE/BANNED |

---

## Observations

> [!NOTE]
> The following observations were identified during process definition. They are NOT new business rules — they are questions that may require PO clarification.

| ID | Observation | Process |
|---|---|---|
| OBS-03 | Waitlist notification time window is described as "configurable" but no Default Platform Policy value has been established. Recommend defining this as a configurable policy (e.g., default: 24 hours). | BP-06 |
| OBS-04 | The Refund process does not specify whether partial refunds (refund some tickets in an Order while keeping others) are supported in V1. Current rules imply full-order refund only. | BP-08 |
| OBS-05 | When an Event is SUSPENDED (Organization suspension), the process describes Events as "hidden" but does not specify a distinct Event state. This document uses the state SUSPENDED for Events during Organization suspension. | BP-10 |

---

> **End of Business Processes V1.1**
