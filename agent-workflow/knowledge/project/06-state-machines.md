# STATE MACHINES — Eventing Platform V1

> **Document ID:** EV-SM-001
> **Version:** 1.1 (Baselined)
> **Status:** ✅ APPROVED — Baselined
> **Last Updated:** 2026-07-06
> **Dependency:** Project Charter V2.3 (EV-PC-001), Business Rules Specification V1.1 (EV-BR-001), Business Capabilities V1.1 (EV-BC-001), Business Processes V1.1 (EV-BP-001), Business Glossary V1.1 (EV-GL-001)
> **Deliverable #:** Phase 1, Item 7

---

## Purpose

This document defines the business state machines for every stateful entity in the Eventing Platform. Each state machine specifies:

- All valid states an entity can exist in.
- All valid transitions between states.
- The business trigger that causes each transition.
- The guard conditions (business rules) that must be satisfied.
- The business actions that occur during each transition.

State names in this document are **authoritative** and must match exactly the states referenced in the Business Processes document (05-business-processes.md) and the Business Glossary (01-business-glossary.md).

This document is **implementation-independent**. It describes business states and transitions — not database columns, status enums, or technical state patterns.

---

## SM-01: Event Lifecycle

### States

| State | Description |
|---|---|
| **DRAFT** | Event created but not yet submitted for approval. Editable by Event Manager. |
| **PENDING_REVIEW** | Event submitted for Platform Operations review. |
| **APPROVED** | Event approved by Platform Operations. Ready for publication. |
| **REJECTED** | Event rejected by Platform Operations. May be revised and re-submitted. |
| **PUBLISHED** | Event visible to Attendees. Ticket sales active (within Sales Windows). |
| **ONGOING** | Event has started (current time ≥ Event start time). |
| **COMPLETED** | Event has ended (current time > Event end time). |
| **CANCELLED** | Event cancelled by Event Manager, Platform Admin, or as a result of Organization ban. |
| **SUSPENDED** | Event temporarily hidden due to Organization suspension. |

### Transitions

| # | From | To | Trigger | Guard | Business Rules | Actions | Process |
|---|---|---|---|---|---|---|---|
| T1 | *(new)* | DRAFT | Event Manager creates Event | Org is ACTIVE. Actor has Manager/Owner permission. | BR-EVT-07 | Event created with details. | BP-03 |
| T2 | DRAFT | PENDING_REVIEW | Event Manager submits for approval | At least one Ticket Type defined. | BR-EVT-01, BR-EVT-08 | Enters Platform Ops review queue. Notification sent. | BP-03 |
| T3 | PENDING_REVIEW | APPROVED | Platform Ops approves | — | BR-EVT-01 | Notification to Event Manager. | BP-03 |
| T4 | PENDING_REVIEW | REJECTED | Platform Ops rejects | Reason provided. | BR-EVT-01 | Rejection reason recorded. Notification sent. | BP-03 |
| T5 | REJECTED | PENDING_REVIEW | Event Manager re-submits | Corrections made. At least one Ticket Type. | BR-EVT-01, BR-EVT-08 | Re-enters review queue. | BP-03 |
| T6 | APPROVED | PUBLISHED | Event made visible | — | — | Event discoverable by Attendees. | BP-03 |
| T7 | PUBLISHED | PENDING_REVIEW | Event Manager makes major edit (no tickets sold) | No tickets sold. | BR-EVT-04 | Event hidden. Re-enters review. | BP-03 |
| T8 | PUBLISHED | ONGOING | Event start time reached | Current time ≥ Event start time. | — | Check-in becomes available. | BP-07 |
| T9 | ONGOING | COMPLETED | Event end time reached | Current time > Event end time. | BR-PAY-06 | Cooling Period begins. Reviews eligible. | BP-09 |
| T10 | PUBLISHED | CANCELLED | Authorized actor cancels Event | Actor is Event Manager or Platform Admin. | BR-EVT-05, BR-EVT-06 | Mass auto-refund. Waitlist cleared. Attendees notified. | BP-10 |
| T11 | ONGOING | CANCELLED | Authorized actor cancels Event | Actor is Event Manager or Platform Admin. | BR-EVT-05, BR-EVT-06 | Mass auto-refund. Waitlist cleared. Attendees notified. | BP-10 |
| T12 | PUBLISHED | SUSPENDED | Organization suspended | Organization transitions to SUSPENDED. | BR-ORG-07 | Event hidden. Sales stopped. | BP-10 |
| T13 | SUSPENDED | PUBLISHED | Organization suspension lifted | Organization transitions to ACTIVE. May require re-approval. | — | Event re-visible. Sales resume. | BP-10 |
| T14 | SUSPENDED | CANCELLED | Organization banned | Organization transitions to BANNED. | BR-ORG-08, BR-EVT-05 | All tickets auto-refunded. | BP-10 |

### State Diagram

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │                                                              │
  *(new)* ──T1──► DRAFT ──T2──► PENDING_REVIEW ──T3──► APPROVED ──T6──► PUBLISHED │
                                  ▲        │                              │  │  │  │
                                  │        T4                            T7  T8 T10 T12
                                  │        ▼                             │   │  │  │
                                  T5── REJECTED                         │   │  │  ▼
                                  │                                     │   │  │ SUSPENDED
                                  └─────────────────────────────────────┘   │  │  │  │
                                                                            │  │  │  T13→PUBLISHED
                                                                            ▼  │  │  T14↓
                                                                       ONGOING │  ▼
                                                                         │  │  CANCELLED
                                                                         T9 T11  ▲
                                                                         ▼   └───┘
                                                                      COMPLETED
```

### Terminal States

- **COMPLETED** — Event lifecycle ended normally.
- **CANCELLED** — Event lifecycle ended by cancellation.

### Constraints

- Major edits (T7) are **blocked** if any tickets have been sold (BR-EVT-02). This is not a state transition — it is a guard that prevents T7.
- Minor edits do not trigger a state transition (BR-EVT-03).
- An Event can only be cancelled from PUBLISHED, ONGOING, or SUSPENDED states.

---

## SM-02: Order Lifecycle

### States

| State | Description |
|---|---|
| **PENDING_PAYMENT** | Order created. Awaiting payment from Attendee. |
| **CONFIRMED** | Payment successful. Tickets issued. |
| **EXPIRED** | Payment not completed within Reservation TTL, or payment failed. |
| **CANCELLED** | Order cancelled (e.g., due to Organization suspension). |

### Transitions

| # | From | To | Trigger | Guard | Business Rules | Actions | Process |
|---|---|---|---|---|---|---|---|
| T1 | *(new)* | PENDING_PAYMENT | Attendee confirms checkout | Capacity available. Sales Window open. Purchase limit not exceeded. | BR-TKT-01, BR-TKT-02, BR-TKT-03, BR-TKT-09 | Reservation created (ACTIVE). Redirect to Payment. | BP-04 |
| T2 | PENDING_PAYMENT | CONFIRMED | Payment successful | Payment Gateway confirms. | BR-PAY-05 | Tickets issued. Inventory decremented. Commission recorded. Engagement captured. Notification sent. | BP-04 |
| T3 | PENDING_PAYMENT | EXPIRED | Payment failed or Reservation TTL expired | — | BR-TKT-05 | Reservation released. Inventory restored. | BP-04 |
| T4 | PENDING_PAYMENT | CANCELLED | Organization suspended | Organization transitions to SUSPENDED. Order is still pending. | BR-ORG-07 | Reservation released. Inventory restored. | BP-10 |

### State Diagram

```
  *(new)* ──T1──► PENDING_PAYMENT ──T2──► CONFIRMED
                       │    │
                       T3   T4
                       ▼    ▼
                    EXPIRED  CANCELLED
```

### Terminal States

- **CONFIRMED** — Successful purchase.
- **EXPIRED** — Failed or timed-out purchase.
- **CANCELLED** — Externally cancelled (suspension).

### Constraints

- A CONFIRMED Order cannot transition to EXPIRED or CANCELLED. Confirmed Orders are only affected through the Refund process (which changes Ticket states, not Order state).
- Each Order covers a single Event only (BR-TKT-08).

---

## SM-03: Ticket Lifecycle

### States

| State | Description |
|---|---|
| **ISSUED** | Ticket issued after successful payment. Active and valid for check-in. |
| **CHECKED_IN** | Ticket scanned and validated at the venue. Attendee admitted. |
| **REFUNDED** | Ticket refunded. No longer valid. |
| **CANCELLED** | Ticket cancelled (e.g., due to Event cancellation or Organization ban). |

### Transitions

| # | From | To | Trigger | Guard | Business Rules | Actions | Process |
|---|---|---|---|---|---|---|---|
| T1 | *(new)* | ISSUED | Order confirmed (payment successful) | Order transitions to CONFIRMED. | — | QR code generated. Ticket assigned to Attendee. | BP-04 |
| T2 | ISSUED | CHECKED_IN | QR code scanned at venue | Ticket belongs to correct Event. Event is ONGOING. Not already checked in. | BR-TKT-04 | Attendance recorded. | BP-07 |
| T3 | ISSUED | REFUNDED | Refund approved | Refund Request approved (manual or auto). | BR-REF-01, BR-REF-02, BR-REF-06 | Inventory restored. Payment returned via original method. Waitlist may be notified. | BP-08 |
| T4 | ISSUED | CANCELLED | Event cancelled | Event transitions to CANCELLED. | BR-EVT-05 | Auto-refund processed. Inventory not relevant (Event ended). | BP-10 |
| T5 | CHECKED_IN | CANCELLED | Event cancelled | Event transitions to CANCELLED. | BR-EVT-05 | Auto-refund processed. | BP-10 |

### State Diagram

```
  *(new)* ──T1──► ISSUED ──T2──► CHECKED_IN
                   │  │               │
                   │  │               T5
                   │  │               │
                   ▼  ▼               ▼
               REFUNDED  CANCELLED ◄──┘
```

### Terminal States

- **CHECKED_IN** — Attendee attended. Exceptionally CANCELLED if event is cancelled.
- **REFUNDED** — Ticket refunded.
- **CANCELLED** — Ticket cancelled due to Event cancellation or Organization ban.

### Constraints

- A CHECKED_IN Ticket cannot be refunded or cancelled under normal circumstances (Attendee-initiated). *Exception:* If the Event is cancelled (BP-10), CHECKED_IN tickets transition to CANCELLED and are fully refunded.
- Each QR code is scanned at most once (BR-TKT-04).
- Tickets are non-transferable (BR-TKT-06) — ownership does not change.
- The transition from ISSUED to CANCELLED (T4) also involves automatic refund processing, so the Attendee receives their money back. The state is CANCELLED (not REFUNDED) because the cancellation is Event-driven, not Attendee-initiated.

> [!NOTE]
> **Design Observation:** CANCELLED and REFUNDED are semantically different. REFUNDED = Attendee-initiated return. CANCELLED = System/Event-driven invalidation (which also includes a refund). Both result in the Attendee receiving money back, but the business cause is different.

---

## SM-04: Reservation Lifecycle

### States

| State | Description |
|---|---|
| **ACTIVE** | Inventory temporarily held for the Attendee during checkout. |
| **CONSUMED** | Payment completed successfully. Reservation converted to permanent inventory hold. |
| **EXPIRED** | Reservation TTL elapsed or payment failed. Inventory released. |

### Transitions

| # | From | To | Trigger | Guard | Business Rules | Actions | Process |
|---|---|---|---|---|---|---|---|
| T1 | *(new)* | ACTIVE | Attendee confirms checkout | Capacity available. | BR-TKT-02, BR-TKT-05 | Inventory temporarily decremented. TTL timer starts. | BP-04 |
| T2 | ACTIVE | CONSUMED | Payment successful | Payment Gateway confirms. | — | Inventory hold becomes permanent. | BP-04 |
| T3 | ACTIVE | EXPIRED | TTL expires or payment fails | — | BR-TKT-05 | Inventory restored to available. | BP-04 |

### State Diagram

```
  *(new)* ──T1──► ACTIVE ──T2──► CONSUMED
                    │
                    T3
                    ▼
                  EXPIRED
```

### Terminal States

- **CONSUMED** — Successful conversion to ticket.
- **EXPIRED** — Inventory returned.

### Constraints

- Reservation TTL is configurable (Default Platform Policy: 15 minutes per BR-TKT-05).
- A Reservation exists only between checkout initiation and payment completion/expiry.
- The ACTIVE state is transient — it should never persist beyond the TTL.

---

## SM-05: Organization Lifecycle

### States

| State | Description |
|---|---|
| **PENDING_REVIEW** | Application submitted. Awaiting Platform Operations review. |
| **ACTIVE** | Approved and operational. Can create Events, manage team, receive payouts. |
| **SUSPENDED** | Temporarily disabled due to policy investigation. Limited to read-only. |
| **BANNED** | Permanently deactivated. Cannot operate on the platform. |

### Transitions

| # | From | To | Trigger | Guard | Business Rules | Actions | Process |
|---|---|---|---|---|---|---|---|
| T1 | *(new)* | PENDING_REVIEW | Attendee submits Organization application | Applicant has active account. | BR-ORG-02 | Application enters review queue. | BP-01 |
| T2 | PENDING_REVIEW | ACTIVE | Platform Ops approves | — | BR-ORG-02 | Applicant becomes Owner. Notification sent. | BP-01 |
| T3 | PENDING_REVIEW | *(rejected)* | Platform Ops rejects | Reason provided. | BR-ORG-02 | Applicant notified. May re-apply. | BP-01 |
| T4 | ACTIVE | SUSPENDED | Platform Admin suspends | Reason provided. | BR-ORG-07 | Events hidden. Sales stopped. Payouts frozen. Team read-only. | BP-10 |
| T5 | SUSPENDED | ACTIVE | Platform Admin lifts suspension | Investigation resolved. | — | Operations resume. Events may be re-published. | BP-10 |
| T6 | SUSPENDED | BANNED | Platform Admin permanently bans | Severe violation. | BR-ORG-08 | Events cancelled. Tickets auto-refunded. Identity blocked. | BP-10 |
| T7 | ACTIVE | BANNED | Platform Admin directly bans | Severe violation (no prior suspension needed). | BR-ORG-08 | Same as T6. | BP-10 |

### State Diagram

```
  *(new)* ──T1──► PENDING_REVIEW ──T2──► ACTIVE ──T4──► SUSPENDED
                       │                   │                │  │
                       T3                  T7              T5  T6
                       ▼                   │               │   │
                  *(rejected)*             ▼               │   ▼
                                         BANNED ◄──────────┘ BANNED
```

### Terminal States

- **BANNED** — Permanently deactivated.

> [!NOTE]
> *(rejected)* is not a formal lifecycle state. A rejected application means the Organization record was not approved. The applicant may re-apply, creating a new application (returns to PENDING_REVIEW). This distinction avoids cluttering the lifecycle with a "REJECTED" state for Organizations (unlike Events, where REJECTED is meaningful because the Event persists for revision).

### Constraints

- An Organization can be banned directly from ACTIVE (T7) without requiring prior suspension.
- A BANNED Organization cannot be reinstated.
- Already-processed Payouts are not clawed back on ban (business decision from Charter 8.10).

---

## SM-06: Settlement Lifecycle

### States

| State | Description |
|---|---|
| **PENDING_CALCULATION** | Event completed. Cooling Period not yet expired. Settlement awaiting calculation. |
| **PENDING_REVIEW** | Settlement calculated. Awaiting Platform Finance review. |
| **APPROVED** | Settlement verified. Ready for Payout. |
| **UNDER_REVIEW** | Settlement disputed. Under investigation. |
| **PAID** | Payout completed. Funds transferred to Organization. |

### Transitions

| # | From | To | Trigger | Guard | Business Rules | Actions | Process |
|---|---|---|---|---|---|---|---|
| T1 | *(new)* | PENDING_CALCULATION | Event transitions to COMPLETED | — | BR-PAY-06 | Cooling Period begins. | BP-09 |
| T2 | PENDING_CALCULATION | PENDING_REVIEW | Cooling Period expires | Current time > Event end + Cooling Period. | BR-PAY-06 | Settlement calculated: Gross − Commission − Refunds = Net. | BP-09 |
| T3 | PENDING_REVIEW | APPROVED | Platform Finance approves | No discrepancies found. | — | Ready for Payout. | BP-09 |
| T4 | PENDING_REVIEW | UNDER_REVIEW | Platform Finance disputes | Discrepancy identified. | — | Investigation initiated. | BP-09 |
| T5 | UNDER_REVIEW | PENDING_REVIEW | Investigation resolved | Recalculation complete if needed. | — | Settlement returns to review. | BP-09 |
| T6 | APPROVED | PAID | Payout completed | Funds transferred. | BR-PAY-07 | Payout recorded. Organization notified. | BP-09 |

### State Diagram

```
  *(new)* ──T1──► PENDING_CALCULATION ──T2──► PENDING_REVIEW ──T3──► APPROVED ──T6──► PAID
                                                    │   ▲
                                                    T4  T5
                                                    ▼   │
                                                UNDER_REVIEW
```

### Terminal States

- **PAID** — Financial cycle completed.

### Constraints

- Settlement Cooling Period is configurable (Default Platform Policy: 7 days per BR-PAY-06).
- Payout is manual in V1 (BR-PAY-07).
- Commission calculated on discounted price, not base price (BR-PAY-08).
- Settlement formula: Net = Gross Revenue − Commission − Refunds (BR-PAY-02).

---

## SM-07: Refund Request Lifecycle

### States

| State | Description |
|---|---|
| **PENDING_REVIEW** | Refund request submitted. Awaiting approval. |
| **APPROVED** | Refund approved. Funds being returned. |
| **REJECTED** | Refund request denied. |

### Transitions

| # | From | To | Trigger | Guard | Business Rules | Actions | Process |
|---|---|---|---|---|---|---|---|
| T1 | *(new)* | PENDING_REVIEW | Attendee submits refund request | Order is CONFIRMED. Ticket is ISSUED. | BR-REF-01, BR-REF-07 | Request enters approval queue. Normal or exceptional path determined by Refund Cutoff. | BP-08 |
| T2 | PENDING_REVIEW | APPROVED | Platform Finance/Support approves | Review completed favorably. | BR-REF-01, BR-PAY-03 | Refund processed via original payment method. Ticket → REFUNDED. Inventory restored. Waitlist notified. | BP-08 |
| T3 | PENDING_REVIEW | REJECTED | Platform Finance/Support rejects | Reason provided. | BR-REF-01 | Rejection reason recorded. Attendee notified. Tickets remain ISSUED. | BP-08 |

### State Diagram

```
  *(new)* ──T1──► PENDING_REVIEW ──T2──► APPROVED
                       │
                       T3
                       ▼
                    REJECTED
```

### Terminal States

- **APPROVED** — Refund processed.
- **REJECTED** — Refund denied.

### Constraints

- Requests within the Refund Cutoff Period: normal approval by Platform Finance.
- Requests after the Refund Cutoff Period but before Event start: exceptional approval by Platform Support (medical emergency, duplicate payment, platform error, discretionary).
- Requests after Event start: NOT accepted (BR-REF-07). Exception: Event Cancellation auto-refund does not go through this lifecycle — it directly transitions Tickets to CANCELLED/REFUNDED.
- Automatic refunds on Event Cancellation (BR-REF-02) bypass this lifecycle entirely — they are system-initiated, not Attendee-initiated.

---

## SM-08: Invitation Lifecycle

### States

| State | Description |
|---|---|
| **PENDING** | Invitation sent. Awaiting target user's response. |
| **ACCEPTED** | Target user accepted. Added to Organization team. |
| **EXPIRED** | Invitation reached expiry time without response. |
| **REVOKED** | Owner cancelled the invitation before acceptance. |

### Transitions

| # | From | To | Trigger | Guard | Business Rules | Actions | Process |
|---|---|---|---|---|---|---|---|
| T1 | *(new)* | PENDING | Owner sends invitation | Org is ACTIVE. Target user identified. Permission Group assigned. | BR-ORG-04 | Invitation sent via email/in-app. | BP-02 |
| T2 | PENDING | ACCEPTED | Target user accepts | User has active account. | BR-ORG-04 | User added to Organization with assigned Permission Group. | BP-02 |
| T3 | PENDING | EXPIRED | Invitation reaches expiry time | — | — | Owner notified. May re-invite. | BP-02 |
| T4 | PENDING | REVOKED | Owner cancels invitation | — | — | Invitation invalidated. | BP-02 |

### State Diagram

```
  *(new)* ──T1──► PENDING ──T2──► ACCEPTED
                   │  │
                   T3  T4
                   ▼   ▼
                EXPIRED  REVOKED
```

### Terminal States

- **ACCEPTED** — User joined team.
- **EXPIRED** — Invitation lapsed.
- **REVOKED** — Invitation withdrawn.

### Constraints

- Only the Organization Owner can send and revoke invitations.
- A user can accept an invitation only if they have an active platform account.

---

## SM-09: Waitlist Entry Lifecycle

### States

| State | Description |
|---|---|
| **QUEUED** | Attendee is in the FIFO queue, waiting for inventory to become available. |
| **NOTIFIED** | Inventory became available. Attendee has been notified with a time-limited purchase window. |
| **PURCHASED** | Attendee completed the purchase within the notification window. |
| **EXPIRED** | Notification window elapsed without purchase, or Event was cancelled. |

### Transitions

| # | From | To | Trigger | Guard | Business Rules | Actions | Process |
|---|---|---|---|---|---|---|---|
| T1 | *(new)* | QUEUED | Attendee joins Waitlist | Ticket Type is SOLD OUT. Event is PUBLISHED. | — | Attendee added to FIFO queue. Confirmation of position. | BP-06 |
| T2 | QUEUED | NOTIFIED | Inventory becomes available | Attendee is next in FIFO order. | BR-REF-06 | Notification sent with time-limited purchase window. | BP-06 |
| T3 | NOTIFIED | PURCHASED | Attendee completes purchase | Purchase within time window. Standard purchase validations. | — | Standard ticket purchase flow (BP-04). Entry removed from queue. | BP-06 |
| T4 | NOTIFIED | EXPIRED | Time window elapses without purchase | — | — | Next person in queue notified. | BP-06 |
| T5 | QUEUED | EXPIRED | Event cancelled | Event transitions to CANCELLED. | — | All waitlist entries cleared. Attendees notified. | BP-10 |

### State Diagram

```
  *(new)* ──T1──► QUEUED ──T2──► NOTIFIED ──T3──► PURCHASED
                    │                │
                    T5               T4
                    ▼                ▼
                  EXPIRED         EXPIRED
```

### Terminal States

- **PURCHASED** — Converted to ticket sale.
- **EXPIRED** — Opportunity lapsed or Event cancelled.

### Constraints

- Waitlist is FIFO (first-in, first-out).
- Notification time window is configurable (see Observation OBS-03 in Business Processes document).
- When a NOTIFIED entry expires, the system automatically progresses to the next QUEUED entry.

---

## SM-10: Payout Lifecycle

### States

| State | Description |
|---|---|
| **PENDING** | Settlement approved. Payout initiated but not yet completed. |
| **COMPLETED** | Funds successfully transferred to Organization's bank account. |

### Transitions

| # | From | To | Trigger | Guard | Business Rules | Actions | Process |
|---|---|---|---|---|---|---|---|
| T1 | *(new)* | PENDING | Settlement transitions to APPROVED | — | BR-PAY-07 | Payout record created. | BP-09 |
| T2 | PENDING | COMPLETED | Funds transferred | Manual transfer completed by Platform Finance. | BR-PAY-07 | Organization notified. Financial records updated. | BP-09 |

### State Diagram

```
  *(new)* ──T1──► PENDING ──T2──► COMPLETED
```

### Terminal States

- **COMPLETED** — Funds transferred.

### Constraints

- Payouts are manual in V1 (BR-PAY-07).
- Payouts are frozen during Organization suspension (BR-ORG-07).
- Already-completed Payouts are not clawed back on Organization ban.

---

## State Cross-Reference Matrix

This matrix verifies that all states referenced in the Business Processes document (05) are defined in this State Machines document (06).

| Entity | States in Glossary | States in Processes (05) | States in This Document (06) | Consistent? |
|---|---|---|---|---|
| Event | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, ONGOING, COMPLETED, CANCELLED | + REJECTED, SUSPENDED | DRAFT, PENDING_REVIEW, APPROVED, REJECTED, PUBLISHED, ONGOING, COMPLETED, CANCELLED, SUSPENDED | ✅ |
| Order | PENDING_PAYMENT, CONFIRMED, EXPIRED, CANCELLED | Same | PENDING_PAYMENT, CONFIRMED, EXPIRED, CANCELLED | ✅ |
| Ticket | ISSUED, CHECKED_IN, CANCELLED, REFUNDED | Same | ISSUED, CHECKED_IN, REFUNDED, CANCELLED | ✅ |
| Reservation | ACTIVE, CONSUMED, EXPIRED | Same | ACTIVE, CONSUMED, EXPIRED | ✅ |
| Organization | PENDING_REVIEW, ACTIVE, SUSPENDED, BANNED | Same | PENDING_REVIEW, ACTIVE, SUSPENDED, BANNED | ✅ |
| Settlement | PENDING_CALCULATION, PENDING_REVIEW, APPROVED, PAID, UNDER_REVIEW | Same | PENDING_CALCULATION, PENDING_REVIEW, APPROVED, UNDER_REVIEW, PAID | ✅ |
| Refund Request | PENDING_REVIEW, APPROVED, REJECTED | Same | PENDING_REVIEW, APPROVED, REJECTED | ✅ |
| Invitation | PENDING, ACCEPTED, EXPIRED, REVOKED | Same | PENDING, ACCEPTED, EXPIRED, REVOKED | ✅ |
| Waitlist Entry | QUEUED, NOTIFIED, PURCHASED, EXPIRED | Same | QUEUED, NOTIFIED, PURCHASED, EXPIRED | ✅ |
| Payout | PENDING, COMPLETED | Same | PENDING, COMPLETED | ✅ |

---

## State Machine Summary

| ID | Entity | States | Transitions | Terminal States |
|---|---|---|---|---|
| SM-01 | Event | 9 | 14 | COMPLETED, CANCELLED |
| SM-02 | Order | 4 | 4 | CONFIRMED, EXPIRED, CANCELLED |
| SM-03 | Ticket | 4 | 5 | CHECKED_IN, REFUNDED, CANCELLED |
| SM-04 | Reservation | 3 | 3 | CONSUMED, EXPIRED |
| SM-05 | Organization | 4 | 7 | BANNED |
| SM-06 | Settlement | 5 | 6 | PAID |
| SM-07 | Refund Request | 3 | 3 | APPROVED, REJECTED |
| SM-08 | Invitation | 4 | 4 | ACCEPTED, EXPIRED, REVOKED |
| SM-09 | Waitlist Entry | 4 | 5 | PURCHASED, EXPIRED |
| SM-10 | Payout | 2 | 2 | COMPLETED |
| **Total** | **10 entities** | **42 states** | **53 transitions** | |

---

## Observations

> [!NOTE]
> The following observations were identified during state machine definition. They are questions or clarifications — NOT new business rules.

| ID | Observation | State Machine |
|---|---|---|
| ~~OBS-06~~ | **RESOLVED.** The Glossary (V1.1) already includes SUSPENDED and REJECTED in the Event lifecycle: "DRAFT → PENDING_REVIEW → APPROVED / REJECTED → PUBLISHED → ONGOING → COMPLETED → CANCELLED. Also: SUSPENDED." No action needed. | SM-01 |
| OBS-07 | Organization rejection is modeled as a non-state (application not approved) rather than a formal REJECTED state. This is a deliberate design choice to keep the Organization lifecycle simple. If the PO prefers explicit rejection tracking, a REJECTED state can be added. | SM-05 |
| OBS-08 | The relationship between Ticket CANCELLED and Ticket REFUNDED involves identical financial outcomes (Attendee gets money back) but different business semantics. CANCELLED = Event-driven. REFUNDED = Attendee-driven. This distinction should be preserved in domain modeling. | SM-03 |
| ~~OBS-16~~ | **RESOLVED (PO Decision: Option A).** ONGOING events continue to completion naturally when an Organization is suspended. Suspension blocks future activity only (no new events, no new ticket sales). Settlement remains allowed. Architecture should preserve the ability to evolve toward full event suspension in future versions. | SM-01, BP-10 |

---

> **End of State Machines V1.1**
