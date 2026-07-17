# BUSINESS RULE TRACEABILITY MATRIX — Eventing Platform V1

> **Document ID:** EV-TM-001
> **Version:** 1.2 (Baselined)
> **Status:** ✅ APPROVED — Baselined
> **Last Updated:** 2026-07-06
> **Dependency:** Business Rules Specification V1.1 (EV-BR-001), Project Charter V2.3 (EV-PC-001), Business Glossary V1.1 (EV-GL-001)
> **Deliverable #:** Phase 1, Item 4

---

## Purpose

This matrix traces every business rule to its related capabilities, business processes, actors, and ADRs. It serves three purposes:

1. **Completeness check** — Are all capabilities covered by at least one rule?
2. **Impact analysis** — If a rule changes, which capabilities and processes are affected?
3. **Scope validation** — Are any rules orphaned (not tied to a capability or process)?

---

## Traceability Matrix

### Domain 1: Event Management

| Rule ID | Rule Name | Type | Capability | Process | Primary Actors | ADR |
|---|---|---|---|---|---|---|
| BR-EVT-01 | Event Approval Gate | ⚙️ | EVT-04, EVT-05 | 8.3 Event Creation & Approval | Event Manager, Platform Ops | — |
| BR-EVT-02 | Post-Sale Edit Lock | 🔒 | EVT-03 | 8.3 Event Creation & Approval | Event Manager | ADR-016 |
| BR-EVT-03 | Minor Edit Pass-Through | ✅ | EVT-02 | 8.3 Event Creation & Approval | Event Manager | ADR-016 |
| BR-EVT-04 | Major Edit Re-Approval | ⚙️ | EVT-03, EVT-05 | 8.3 Event Creation & Approval | Event Manager, Platform Ops | ADR-016 |
| BR-EVT-05 | Cancellation Auto-Refund | ⚙️ | EVT-06 | 8.8 Refund, 8.10 Org Suspension | Event Manager, Platform Admin | ADR-015 |
| BR-EVT-06 | Event Authorization | 🔒 | EVT-02, EVT-03, EVT-06 | 8.3 Event Creation & Approval | Owner, Manager, Platform Admin | — |
| BR-EVT-07 | Single Org Ownership | 🔒 | EVT-01 | 8.3 Event Creation & Approval | Event Manager | — |
| BR-EVT-08 | Min Ticket Type Req. | ✅ | EVT-04 | 8.3 Event Creation & Approval | Event Manager | — |

### Domain 2: Ticketing

| Rule ID | Rule Name | Type | Capability | Process | Primary Actors | ADR |
|---|---|---|---|---|---|---|
| BR-TKT-01 | Published Event Gate | ✅ | TKT-03, TKT-04 | 8.4 Ticket Purchase | Attendee | — |
| BR-TKT-02 | Capacity Enforcement | 🔒 | TKT-03, TKT-04 | 8.4 Ticket Purchase | Attendee, System | — |
| BR-TKT-03 | Configurable Sales Window | ✅ | TKT-01, TKT-03, TKT-04 | 8.4 Ticket Purchase | Event Manager, Attendee | ADR-017 |
| BR-TKT-04 | Unique QR / Single Scan | 🔒 | TKT-08 | 8.7 Check-in | Check-in Staff, System | — |
| BR-TKT-05 | Reservation Expiration Period | ⚙️ | TKT-03, TKT-04 | 8.4 Ticket Purchase | System | — |
| BR-TKT-06 | Non-Transferable Tickets | 🔒 | — | — | — | ADR-007 |
| BR-TKT-07 | Multi-Ticket Orders | ✅ | TKT-03, TKT-04 | 8.4 Ticket Purchase, 8.5 Group Purchase | Attendee | — |
| BR-TKT-08 | Price Lock at Purchase | 🔒 | TKT-03, TKT-04 | 8.4 Ticket Purchase | System | — |
| BR-TKT-09 | Purchase Limit | 🔒 | TKT-03, TKT-04 | 8.4 Ticket Purchase | Attendee, Platform Admin | — |

### Domain 3: Pricing & Promotion

| Rule ID | Rule Name | Type | Capability | Process | Primary Actors | ADR |
|---|---|---|---|---|---|---|
| BR-PRC-01 | Early Bird Definition | 🔒 | TKT-02 | 8.3 Event Creation & Approval | Event Manager | ADR-013 |
| BR-PRC-02 | Auto-Revert to Base | ⚙️ | TKT-03, TKT-04 | 8.4 Ticket Purchase | System | — |
| BR-PRC-03 | Single Active Strategy | 🔒 | TKT-02 | 8.3 Event Creation & Approval | Event Manager | — |
| BR-PRC-04 | Price Transparency | 🔒 | EVT-09, TKT-03, TKT-04 | 8.4 Ticket Purchase | System | — |
| BR-PRC-05 | Pricing Pipeline | 🔢 | TKT-03, TKT-04, PRM-03 | 8.4 Ticket Purchase | System | ADR-021 |
| BR-PRM-01 | Voucher Scope | 🔒 | PRM-01 | 8.4 Ticket Purchase | Marketing Manager | — |
| BR-PRM-02 | Group Discount Threshold | ✅ | PRM-02, TKT-04 | 8.5 Group Purchase | Attendee, System | — |
| BR-PRM-03 | No Discount Stacking | 🔒 | PRM-03 | 8.4 Ticket Purchase | System | ADR-019 |
| BR-PRM-04 | Best Benefit Selection | 🔢 | PRM-03 | 8.4 Ticket Purchase | System | ADR-019 |

### Domain 4: Payment

| Rule ID | Rule Name | Type | Capability | Process | Primary Actors | ADR |
|---|---|---|---|---|---|---|
| BR-PAY-01 | Commission Model | 🔢 | PAY-03 | 8.9 Settlement & Payout | System, Platform Finance | ADR-020 |
| BR-PAY-03 | Original Payment Refund | 🔒 | PAY-07 | 8.8 Refund | Platform Finance, System | — |
| BR-PAY-04 | Immutable Financial Ledger | 🔒 | PAY-09 | All financial processes | System | — |
| BR-PAY-05 | Payment Idempotency | 🔒 | PAY-01, PAY-02 | 8.4 Ticket Purchase | System | — |
| BR-PAY-08 | Commission on Discounted Price | 🔢 | PAY-03 | 8.9 Settlement & Payout | System | — |

### Domain 5: Refund & Cancellation

| Rule ID | Rule Name | Type | Capability | Process | Primary Actors | ADR |
|---|---|---|---|---|---|---|
| BR-REF-01 | Manual Refund Approval | ⚙️ | TKT-09, PAY-07 | 8.8 Refund | Attendee, Platform Finance, Platform Support | — |
| BR-REF-02 | Auto-Refund on Cancellation | ⚙️ | PAY-07 | 8.8 Refund | System | — |
| BR-REF-03 | Platform-Fault Cost | 🔢 | PAY-07 | 8.8 Refund | Platform Finance | ADR-015 |
| BR-REF-04 | Organizer-Fault Cost | 🔢 | PAY-07 | 8.8 Refund | Platform Finance | ADR-015 |
| BR-REF-05 | Force Majeure Cost | 🔢 | PAY-07 | 8.8 Refund | Platform Finance | ADR-015 |
| BR-REF-06 | Inventory Restoration | ⚙️ | PAY-07, TKT-07 | 8.8 Refund, 8.6 Waitlist | System | — |
| BR-REF-07 | Refund Cutoff Time | ⚙️ | TKT-09, PAY-07 | 8.8 Refund | Attendee, Platform Support | ADR-022 |

### Domain 6: Settlement & Payout

| Rule ID | Rule Name | Type | Capability | Process | Primary Actors | ADR |
|---|---|---|---|---|---|---|
| BR-PAY-02 | Post-Event Payout Gate | ✅ | PAY-04, PAY-06 | 8.9 Settlement & Payout | Platform Finance | — |
| BR-PAY-06 | Settlement Cooling Period | ✅ | PAY-04, PAY-05 | 8.9 Settlement & Payout | System, Platform Finance | ADR-014 |
| BR-PAY-07 | Manual Payout | ⚙️ | PAY-06 | 8.9 Settlement & Payout | Platform Finance | ADR-008 |

### Domain 7: Organization

| Rule ID | Rule Name | Type | Capability | Process | Primary Actors | ADR |
|---|---|---|---|---|---|---|
| BR-ORG-01 | Default Attendee Role | ⚙️ | USR-01 | 8.1 Org Onboarding | Guest → Attendee | — |
| BR-ORG-02 | Org Approval Gate | ⚙️ | ORG-01, ORG-02 | 8.1 Org Onboarding | Attendee, Platform Ops | — |
| BR-ORG-03 | Owner Self-Removal Prevention | 🔒 | ORG-05 | 8.2 Team Management | Owner | — |
| BR-ORG-04 | Permission Group Assignment | ✅ | ORG-03, ORG-04, ORG-06, ORG-07 | 8.2 Team Management | Owner | ADR-009 |
| BR-ORG-05 | Single Org per Event | 🔒 | EVT-01 | 8.3 Event Creation & Approval | Event Manager | — |
| BR-ORG-06 | Event Ownership Continuity | 🔒 | ORG-05 | 8.2 Team Management | Owner | — |
| BR-ORG-07 | Suspension Effects | 🔒 | OPS-05 | 8.10 Org Suspension | Platform Admin | — |
| BR-ORG-08 | Ban Effects | ⚙️ | OPS-07 | 8.10 Org Suspension | Platform Admin | — |

### Domain 8: Reviews & Ratings

| Rule ID | Rule Name | Type | Capability | Process | Primary Actors | ADR |
|---|---|---|---|---|---|---|
| BR-REV-01 | Review Eligibility | ✅ | REV-01 | — | Attendee | ADR-018 |
| BR-REV-02 | Cancelled Event Not Reviewable | 🔒 | REV-01 | — | System | — |
| BR-REV-03 | One Review per Event | 🔒 | REV-01 | — | Attendee | — |
| BR-REV-04 | No Edit, Delete Only | 🔒 | REV-01 | — | Attendee | — |
| BR-REV-05 | Content Moderation | ✅ | REV-03 | — | Platform Ops | — |

### Domain 9: Platform Operations

| Rule ID | Rule Name | Type | Capability | Process | Primary Actors | ADR |
|---|---|---|---|---|---|---|
| BR-AUD-01 | Mandatory Logging | 🔒 | OPS-03 | All state transitions | System | — |
| BR-AUD-02 | Audit Immutability | 🔒 | OPS-03 | All state transitions | System | — |
| BR-AUD-03 | Audit Entry Requirements | 🔒 | OPS-03 | All state transitions | System | — |

---

## Coverage Analysis

### Capabilities Without Explicit Rules

The following capabilities from the charter do not have dedicated business rules. This is expected — not every capability requires a constraint or computation rule.

| Capability | Description | Assessment |
|---|---|---|
| EVT-07 | Complete Event | System lifecycle transition (time-triggered) |
| EVT-08 | Browse / Search Events | Discovery feature — no constraint needed |
| EVT-09 | View Event Details | Discovery feature — no constraint needed |
| TKT-05 | View My Tickets | Standard view capability |
| TKT-06 | Join Waitlist | Standard queue capability |
| PAY-08 | View Revenue Report | Reporting feature — no constraint needed |
| PRM-04 | View Promotion Performance | Reporting feature — no constraint needed |
| ENG-01/02/03 | Engagement Tracking | Data capture only (ADR-012) — no rule needed |
| ORG-08 | Update Org Profile | Standard profile update |
| ORG-09 | View Org Dashboard | Reporting dashboard |
| USR-02/03/04/05 | User Management ops | Standard CRUD and authentication |
| OPS-01/02 | Notification Management | Infrastructure and notification delivery |
| OPS-04 | Moderate Content | General content moderation (reviews handled by REV-03) |
| OPS-06 | Lift Suspension | Standard platform administration |
| REV-02 | View Reviews | Standard view capability |

### Orphaned Rules Check

All 57 rules trace to at least one capability or process. **No orphaned rules detected.**

### Process Coverage Check

| Process | Rules That Apply | Count |
|---|---|---|
| 8.1 Organization Onboarding | BR-ORG-01, BR-ORG-02 | 2 |
| 8.2 Team Management | BR-ORG-03, BR-ORG-04, BR-ORG-06 | 3 |
| 8.3 Event Creation & Approval | BR-EVT-01 to 08, BR-PRC-01, BR-PRC-03, BR-ORG-05 | 11 |
| 8.4 Ticket Purchase | BR-TKT-01 to 03, 05, 07 to 09, BR-PRC-02, 04, 05, BR-PRM-01, BR-PRM-03, BR-PRM-04, BR-PAY-05 | 15 |
| 8.5 Group Purchase | BR-TKT-07, BR-PRM-02 | 2 |
| 8.6 Waitlist | BR-REF-06 | 1 |
| 8.7 Check-in | BR-TKT-04 | 1 |
| 8.8 Refund | BR-REF-01 to 07, BR-EVT-05, BR-PAY-03 | 10 |
| 8.9 Settlement & Payout | BR-PAY-01, 02, 06, 07, 08 | 5 |
| 8.10 Organization Suspension | BR-ORG-07, BR-ORG-08, BR-EVT-05 | 3 |

> [!NOTE]
> **Process 8.4 (Ticket Purchase)** has the highest rule density (15 rules). This is expected — it is the platform's core commercial transaction and touches pricing, promotions, capacity, payment, and reservations.

---

## ADR Coverage Summary

| ADR | Decision | Rules Traced |
|---|---|---|
| ADR-007 | Non-transferable Tickets | BR-TKT-06 |
| ADR-008 | Manual Settlement & Payout | BR-PAY-07 |
| ADR-009 | Organization-Based Actor Model | BR-ORG-04 |
| ADR-013 | Early Bird as Pricing Strategy | BR-PRC-01 |
| ADR-014 | Settlement Cooling Period | BR-PAY-06 |
| ADR-015 | Simplified Cancellation Policy | BR-REF-03, BR-REF-04, BR-REF-05, BR-EVT-05 |
| ADR-016 | Event Editing Policy | BR-EVT-02, BR-EVT-03, BR-EVT-04 |
| ADR-017 | Configurable Sales Window | BR-TKT-03 |
| ADR-018 | Expanded Review Eligibility | BR-REV-01 |
| ADR-019 | No Discount Stacking | BR-PRM-03, BR-PRM-04 |
| ADR-020 | Percentage-Based Commission | BR-PAY-01 |
| ADR-021 | Pricing Pipeline | BR-PRC-05 |
| ADR-022 | Refund Time Boundaries | BR-REF-07 |

**ADRs without traced rules:** ADR-001 (Section-based seating — design decision, not a rule), ADR-006 (Waitlist — covered by process), ADR-010 (Gateway-agnostic — architecture principle), ADR-011 (Leader pays — process decision), ADR-012 (Engagement tracking — data capture).

---

> **End of Business Rule Traceability Matrix V1.2**
