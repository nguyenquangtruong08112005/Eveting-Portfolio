# ENTERPRISE DOCUMENTATION AUDIT — Eventing Platform V1

> **Document ID:** EV-AUD-DOC-001  
> **Audit Date:** 2026-07-11  
> **Scope:** `agent-workflow/knowledge/project/` (00–11)  
> **Auditor Stance:** Senior BA / Solution Architect / Domain Expert / Software Architect — adversarial review for multi-million user scale  
> **Verdict:** **NO-GO for production readiness**

---

## 1. Executive Summary

The documentation set is **methodologically ambitious** and, for a student/portfolio redesign, unusually thorough: 57 formal rules, 58 capabilities, 10 processes, 10 state machines, 11 bounded contexts, 21 aggregates. Process discipline (glossary → rules → capabilities → processes → states → domains → BC map → aggregates) is real.

**That does not make it production-ready.**

At enterprise / multi-million-user scale, this corpus fails on several axes that would kill a real marketplace:

1. **Financial model is incomplete and partially self-contradictory.** Cooling Period vs post-event refund eligibility is defined three mutually incompatible ways. Platform-fault cancellation creates unbounded double exposure. Attendee-initiated refund economics are undefined. Ban cost language contradicts organizer-fault rules.

2. **Market/compliance reality is deferred as if optional.** Tax, invoicing, KYC/AML for payouts, chargebacks, bank account verification, consumer law, and PCI-adjacent concerns are out of scope while the product is defined as a **money-moving marketplace**. You cannot run V1 as a real business without these.

3. **Operational model does not scale.** Manual settlement, manual payout, manual refund approval, unlimited waitlists, and Platform Finance as a human bottleneck collapse under volume. There are **no NFRs** (latency, throughput, availability, RPO/RTO).

4. **Consistency is worse than the documents claim.** Phase 1 claims “baselined.” Phase 2 drafts silently rename capabilities, rename waitlist states, introduce PO decisions that overturn baselined rules, and mis-label rules in domain discovery. The “all OQs resolved” claim is false — OBS-02 through OBS-05 and ASM-01–06 remain open, and PO-13 explicitly breaks BR-REV-04.

5. **DDD strategic design is competent; tactical design has known critical holes.** TicketType ↔ Reservation capacity is a acknowledged critical hotspot without a chosen consistency pattern. Ticketing is a hub/god context. AuditLogEntry/EngagementProfile as “aggregates” are anemic. Cross-context cancellation cascade touches 6 aggregates / 4 contexts with no orchestration design.

6. **Security model is marketplace-naive.** QR sharing for group purchases is institutionalized ticket transfer. Purchase limits are account-scoped with no multi-account controls. Separation of duties is collapsed into 3 permission groups. No fraud, rate-limit, or payment-abuse model.

**Bottom line:** Treat this as a **strong BA portfolio foundation with serious redesign debt**, not as a production design package. Do not implement payment settlement or go live on these specs without a financial redesign pass.

---

## 2. Scores

| Score | Value | Rationale (brutal) |
|---|---|---|
| **Overall** | **48 / 100** | Solid BA craftsmanship offset by financial contradictions, missing enterprise controls, and production-blocking gaps |
| **Business Maturity** | **52 / 100** | Core marketplace loop is sketched; revenue/refund/settlement economics incomplete; compliance deferred |
| **Architecture Maturity** | **55 / 100** | Context map is thoughtful; no NFRs, no saga/orchestration design, no data/API design yet |
| **DDD Maturity** | **62 / 100** | Best part of the corpus; still hub-context risk, aggregate consistency holes, anemic aggregates |
| **Enterprise Readiness** | **28 / 100** | Explicit single-region, single-gateway, manual finance, no multi-tenant/i18n/compliance/DR |

**Score interpretation:** Below 60 overall = not ready for implementation freeze. Below 40 enterprise = not ready for any real money.

---

## 3. Audit Issues

---

### Issue ID
AUD-001

### Severity
Critical

### Category
Business

### Description
**Post-event refund vs Cooling Period is defined in three incompatible ways.**

Evidence:
- **Charter 8.9 / BP-09:** During Cooling Period, “refund requests can still come in.”
- **BR-REF-07 / Glossary Refund Cutoff:** Normal refunds are **not accepted after the event has started**. Only cancellation refunds apply post-event.
- **Cooling Period glossary:** “does not imply or allow automatic post-event refunds.”
- **ADR-014:** Cooling exists so post-event refunds (e.g. quality complaints) can still be accommodated.
- **ADR-022:** “Post-event refunds during cooling period are still possible but require higher scrutiny.”

These cannot all be true.

### Impact
Settlement math is undefined. Platform Finance cannot know which refunds to accept. Engineering will implement one interpretation; finance/legal will assume another. Disputes, incorrect payouts, and consumer-protection violations are guaranteed.

### Recommendation
Pick **one** policy and rewrite all five artifacts:
1. Pre-event normal refunds (manual).
2. Post-cutoff exceptional refunds (Support).
3. Post-start / cooling-period: either **closed** except cancellation/chargeback, or **open** via exceptional path only with explicit SLAs.
4. Align ADR-014, ADR-022, BR-REF-07, Cooling Period glossary, BP-09.

### Example Solution
```
Policy V1.1 (recommended for risk control):
- After Event.Start: attendee-initiated refunds CLOSED.
- Cooling Period is for platform investigation, chargebacks, and cancellation-related adjustments only.
- Settlement Net = Gross − Commission − (Refunds + Chargebacks + Adjustments) finalized at CoolingEnd.
Remove “quality refunds during cooling” from ADR-014 or reclassify them as Support exceptions with explicit cost allocation.
```

---

### Issue ID
AUD-002

### Severity
Critical

### Category
Business

### Description
**Platform-fault cancellation (BR-REF-03 / ADR-015) creates unbounded double financial exposure** with no definition of “platform fault,” no cap, no insurance model, and no approval authority.

Attendee gets 100% refund **and** Organizer receives 100% of revenue while Platform waives commission. Platform pays ~200% of ticket revenue.

### Impact
A single large festival cancellation attributed to “platform fault” can bankrupt the company. No criteria = every organizer will claim platform fault. Manual Platform Finance becomes a legal fight, not an ops process.

### Recommendation
Redefine platform-fault as a rare, enumerated set of system failures (duplicate charge, inventory corruption, prolonged payment outage after money taken) with:
- Cap (e.g. max organizer compensation = net of commission already earned, or fixed SLA credits).
- Dual approval (Platform Admin + Finance).
- Never “100% of revenue + 100% refund” without hard caps and reserves.

### Example Solution
```
Platform-fault outcomes:
- Attendee: 100% refund (mandatory)
- Organizer: service credit or % of net (not gross), OR make-good for documented prep costs up to Cap C
- Platform: waives commission on cancelled tickets only
Require PlatformAdmin + PlatformFinance co-approval for any PLATFORM_FAULT classification.
```

---

### Issue ID
AUD-003

### Severity
Critical

### Category
Business

### Description
**Attendee-initiated refund cost allocation is undefined.** BP-08 step 8 mentions “Attendee-initiated (no fault) → Standard refund processing” without specifying:
- Does commission reverse?
- Does organizer net decrease by full refund amount?
- Is there a restocking / platform fee?
- Does inventory restore always (scalping dump)?

### Impact
Every individual refund is a financial guess. Settlement formula `Gross − Commission − Refunds` is ambiguous if commission on refunded tickets is not reversed consistently. Easy path for inventory manipulation near cutoff.

### Recommendation
Add explicit rules BR-REF-08/09 for attendee-initiated refunds:
- Full refund of Final Selling Price via original method.
- Commission fully reversed (ledger compensating entry).
- Organizer receives no revenue for refunded tickets.
- Inventory restore subject to anti-abuse (optional cooldown / no restore after cutoff).

### Example Solution
```
Ledger (refund approved, attendee-initiated):
1. Debit: Refund Payable (attendee)
2. Credit: Organizer Payable reduction (full ticket net)
3. Reversal: Commission ledger entry (platform)
4. Ticket → REFUNDED; optional inventory +1 if before cutoff
```

---

### Issue ID
AUD-004

### Severity
Critical

### Category
Business / Consistency

### Description
**Ban cost language contradicts itself.**  
Glossary **Ban**: “all tickets auto-refunded (**platform bears cost**).”  
BR-ORG-08 / BR-REF-04 / Charter 8.10: ban treated as **organizer-fault** — organizer no settlement, platform **waives commission**.

“Platform bears cost” ≠ organizer-fault model. In organizer-fault, platform loses commission but does not pay organizer compensation; platform still funds attendee refunds from held funds (float risk).

### Impact
Finance and legal cannot interpret ban liability. Implementers will hardcode wrong party.

### Recommendation
Rewrite Ban glossary to match BR-REF-04. Explicitly state float risk: platform refunds attendees from held ticket proceeds; organizer receives nothing for cancelled events.

---

### Issue ID
AUD-005

### Severity
Critical

### Category
Architecture / Operations

### Description
**No Non-Functional Requirements.** No throughput, p99 latency, availability SLO, concurrency targets for flash sales, RPO/RTO, retention, or manual-ops capacity model. Project claims enterprise practices while remaining silent on load.

### Impact
You cannot design capacity management, payment timeouts, check-in at gates, or mass refund without NFRs. “Millions of users” is cosplay without numbers.

### Recommendation
Add EV-NFR-001 with at least:
- Peak tickets/sec per Event and platform-wide
- Reservation create p99
- Check-in scan p99 offline/online
- Mass cancel/refund SLA (e.g. 100k tickets in X hours)
- Availability 99.9% for purchase path
- RPO ≤ 1 min for financial ledger; RTO ≤ 1 hour

---

### Issue ID
AUD-006

### Severity
High

### Category
Business / Consistency

### Description
**Baselined BR-REV-04 (“No Edit, Delete Only”) is overturned by Aggregate Catalog PO-13–17 without a formal rule amendment.** Aggregate Catalog OBS-01 admits this. Traceability matrix still lists BR-REV-04 as authoritative.

### Impact
Implementers have two truths. Review feature will thrash. Baselining process is discredited.

### Recommendation
Either amend BR-REV-04 + matrix + glossary, or reject PO-13–17. No silent PO overrides of baselined rules.

---

### Issue ID
AUD-007

### Severity
High

### Category
Business

### Description
**Force Majeure and Organizer-fault are financially identical** (BR-REF-04 = BR-REF-05). Organizer who loses venue to government order gets same zero as organizer who cancels for convenience.

### Impact
Unrealistic for serious organizers; will drive high-value inventory off-platform. Force majeure without partial protection is not enterprise marketplace practice (insurance, credit, reschedule options).

### Recommendation
Differentiate:
- Organizer voluntary cancel → organizer-fault (current).
- Force majeure → 100% attendee refund; organizer may keep non-refundable prep allowance or event credit; platform fee waived or reduced.
- Or support Reschedule as first-class alternative to Cancel.

---

### Issue ID
AUD-008

### Severity
High

### Category
Security / Business

### Description
**Group Purchase “Leader Pays All” institutionalizes ticket transfer via external QR sharing** while BR-TKT-06 claims non-transferable tickets. Charter admits sharing is outside the platform.

### Impact
Primary anti-scalping and fraud control is decorative. Screenshot QR = secondary market. Check-in staff cannot verify identity. Chargebacks increase when “leader” disputes after distributing codes.

### Recommendation
V1 minimum: bind tickets to named guests at purchase OR generate one-time short-lived check-in tokens OR require ID match for VIP. If true non-transferability is impossible, stop claiming it; document “bearer tickets under purchaser account” honestly.

---

### Issue ID
AUD-009

### Severity
High

### Category
Security

### Description
**Purchase limit (BR-TKT-09) is per account only.** No multi-account, device, payment-instrument, or identity controls. Unlimited waitlist (ASM-05). Reservation holds inventory 15 minutes (abuse window).

### Impact
Bots create N accounts × 10 tickets. Waitlist spam. Inventory starvation for real buyers. Classic flash-sale failure mode.

### Recommendation
Add business anti-abuse rules: payment instrument velocity, phone/email verification before purchase, waitlist cap, progressive delays, IP/device risk scoring (architecture phase). Make purchase limit optionally per payment method.

---

### Issue ID
AUD-010

### Severity
High

### Category
Scalability / DDD

### Description
**TicketType capacity ↔ Reservation cross-aggregate atomicity is the primary hotspot (Aggregate Catalog OBS-04)** and has no selected consistency design (saga, single UoW, capacity aggregate). Formula in BR-TKT-02:

`Available = Capacity − (Issued + Checked-in + Active Reservations)`

**Checked-in tickets are a subset of issued tickets** in the lifecycle (ISSUED → CHECKED_IN). Counting both **double-decrements** capacity permanently once check-in starts.

### Impact
Wrong formula → capacity leaks or artificial sellouts mid-event. Missing saga → oversell under concurrency.

### Recommendation
```
Available = Capacity − Sold − ActiveReservations
Sold = count(Ticket where status IN (ISSUED, CHECKED_IN, CANCELLED_IF_NOT_RESTORED?))
-- typically Sold stays until REFUNDED restores
```
Design reservation as: single transactional boundary that updates capacity projection + reservation row, or CapacityCounter aggregate with optimistic versioning.

---

### Issue ID
AUD-011

### Severity
High

### Category
Operations / Business

### Description
**Manual settlement + manual payout + manual refund approval** (ADR-008, BR-PAY-07, BR-REF-01) with **no org event limits** (ASM-04) and **no finance SLA**.

### Impact
Platform Finance does not scale past dozens of events/week. Payout delays destroy organizer trust. Refund queues become public relations crises.

### Recommendation
Define ops capacity model. Auto-approve settlement if variance < ε and no open disputes. Queue SLAs (refund review 24–48h). Cap concurrent active events per org until automation exists.

---

### Issue ID
AUD-012

### Severity
High

### Category
Business / Compliance

### Description
**Tax, invoicing, KYC/AML, bank account ownership verification, and chargebacks are out of scope** while product is a commission marketplace using real payment gateways (ZaloPay).

### Impact
Illegal or non-compliant to operate as real business in VN/most jurisdictions. Chargebacks will hit settlement after payout with no clawback design (ban already says no clawback on completed payouts).

### Recommendation
Minimum V1 production gate:
- Organizer KYC + verified bank account before first payout
- Chargeback = financial adjustment type in ledger + settlement reopen rules
- Tax treatment documented even if automated e-invoice is V2
- Hold % of settlement as reserve for chargebacks during cooling

---

### Issue ID
AUD-013

### Severity
High

### Category
Consistency

### Description
**Capability and state vocabulary drift across baselined vs draft docs.**

| Artifact | Says | Conflicts with |
|---|---|---|
| BC Map TKT-03/04/07 | Reserve / Purchase / Cancel Ticket | Capabilities: TKT-03 Purchase, TKT-04 Group Purchase, no Cancel Ticket capability |
| BC Map USR-04/05 | Reset Password / Deactivate | Capabilities: Manage Users / Manage Platform Team |
| BC Map Waitlist | WAITING | SM-09: QUEUED |
| BC Map Refund SM | PENDING | SM-07: PENDING_REVIEW |
| Domain Discovery BR-TKT-08 | “Single-event Order” | Spec: Price Lock at Purchase |
| Domain Discovery BR-ORG-05 | “Org profile defaults” | Spec: Single Org per Event |
| SM-02 constraint | cites BR-TKT-08 for single-event | BR-TKT-08 is price lock; single-event is BR-TKT-07 constraint text |

### Impact
Traceability is fiction. Agents/devs wire wrong endpoints. Baselining means nothing if draft docs rewrite IDs.

### Recommendation
Freeze capability IDs as in EV-BC-001. BC map and aggregate catalog must not rename. Add automated glossary/ID lint. Fix mislabeled rules in 07 and 06.

---

### Issue ID
AUD-014

### Severity
High

### Category
DDD / Architecture

### Description
**Event cancellation cascade (OBS-05) spans 6 aggregates / 4 contexts with no orchestration, idempotency, or partial-failure model.** Mass auto-refund (BR-REF-02) at festival scale is a distributed systems problem, not a state transition row.

### Impact
Partial refunds, double refunds, inventory thrash, settlement wrong if cascade fails mid-way. No compensating transaction design.

### Recommendation
Define `EventCancellationProcess` (process manager):
1. Event → CANCELLED (source of truth)
2. Emit EventCancelled
3. Batch create refund jobs (idempotent by ticketId)
4. Payment reverse with gateway idempotency keys
5. Ticket → CANCELLED/REFUNDED
6. Waitlist expire
7. Settlement mark ineligible / zero net  
Document failure queues and replay.

---

### Issue ID
AUD-015

### Severity
High

### Category
Security / Architecture

### Description
**QR code security is unspecified.** No signing, rotation, encryption, or anti-replay beyond “single scan.” Screenshots work forever until first scan. Staff role can check in with no two-person rule.

### Impact
QR forgery if predictable IDs. Gate fraud. Compromised staff device mass-check-in.

### Recommendation
Signed QR payloads (ticketId + exp + HMAC/JWT), short-lived refresh tokens in app for active tickets, offline allowlist with signed batches, staff device attestation, audit every scan attempt (success and fail).

---

### Issue ID
AUD-016

### Severity
High

### Category
Business

### Description
**Missing financial concepts for production marketplace:** Payment Attempt (vs Order), Chargeback, Adjustment, Ledger Account, Platform Float, Organizer Bank Account, Fee Invoice, Partial Refund (OBS-04 open), Free/Zero-price tickets, Multi-ticket-type cart edge cases, Late payment success after reservation expiry race.

### Impact
Payment edge cases will be invented in code. Race: pay succeeds after TTL → double sell or money without ticket.

### Recommendation
Add PaymentAttempt entity/SM. Define late-success policy: if reservation expired, auto-refund payment OR re-reserve if capacity allows. Add Chargeback + Adjustment. Decide free tickets (commission 0, still inventory).

---

### Issue ID
AUD-017

### Severity
Medium

### Category
Consistency / DDD

### Description
**Base Price ownership is split.** Ticketing sets Base Price on TicketType; Pricing owns Base Price as calculation input; Aggregate map puts Base Price under PricingStrategy (input). Shared concept without single write owner.

### Impact
Two sources of truth for price. Early Bird validation (must be < base) needs base from another context.

### Recommendation
Write-owner: TicketType.BasePrice (Ticketing). Pricing reads base via query. Remove Base Price from Pricing aggregate ownership claims.

---

### Issue ID
AUD-018

### Severity
Medium

### Category
DDD

### Description
**Anemic / infrastructure aggregates:** EngagementProfile (0 invariants), AuditLogEntry (append-only infra), Notification (ops plumbing), GovernanceAction (command log). Calling these aggregates dilutes DDD meaning.

### Impact
False sense of domain richness. Implementation will over-engineer CRUD as aggregates.

### Recommendation
Treat Audit/Notification as infrastructure or application services. Engagement as projection/read model. GovernanceAction as process entry record, not rich aggregate—unless it gains real workflow states.

---

### Issue ID
AUD-019

### Severity
Medium

### Category
Security

### Description
**RBAC collapse:** 7 business roles → 3 groups. Manager combines event, finance, marketing, refund initiation. No separation of duties (create voucher + view finance + initiate refunds). Platform Admin is superuser with suspend/ban and no dual control.

### Impact
Insider fraud: create event, sell, self-refund path via collusion; change payout details if ever added without dual control.

### Recommendation
Even in V1, split Finance Manager permissions from Marketing. Dual approval for ban and for bank account changes. Immutable audit of permission changes.

---

### Issue ID
AUD-020

### Severity
Medium

### Category
Business / Completeness

### Description
**Open observations treated as non-blocking while they block correct implementation:** OBS-02 group discount tiers, OBS-03 waitlist window default, OBS-04 partial refunds, OBS-05 waitlist visibility, unresolved ASM-01–06, OBS-16 only partially reconciled with BP-10 language about hiding ONGOING events.

### Impact
Implementers invent defaults. Product behavior diverges from “baselined” docs.

### Recommendation
Close or formally defer each OBS with owner and default. Charter claim “all OQs resolved” is false—replace with honest open register.

---

### Issue ID
AUD-021

### Severity
Medium

### Category
Scalability

### Description
**Waitlist as single aggregate containing all entries (OBS-07)** + unlimited size (ASM-05). FIFO notify-N-on-release without batching design.

### Impact
Hot aggregate, lock contention, memory blowups on popular TicketTypes.

### Recommendation
WaitlistEntry as independent records + queue position index. Cap queue length. Notify window default 30–60 minutes for tickets, not 24h (24h locks demand).

---

### Issue ID
AUD-022

### Severity
Medium

### Category
Architecture

### Description
**Payment has no formal state machine** while Aggregate Catalog invents INITIATED/SUCCEEDED/FAILED/REFUND_* statuses. Order absorbs payment outcomes. Late/duplicate/partial gateway states not modeled (authorized vs captured).

### Impact
ZaloPay (and any gateway) async realities will force ad-hoc states in code, breaking “gateway-agnostic” claim.

### Recommendation
Add SM-11 PaymentAttempt: CREATED → REDIRECTED → SUCCEEDED | FAILED | EXPIRED | REFUNDED with idempotency key. Keep gateway ACL mapping explicit.

---

### Issue ID
AUD-023

### Severity
Medium

### Category
Business

### Description
**Settlement formula incomplete for platform-fault and partial scenarios.** `Net = Gross − Commission − Refunds` fails when organizer must be paid 100% on platform-fault (BR-REF-03) while attendees are also refunded—needs separate **Organizer Compensation** line and platform loss ledger.

Negative net (AF-02) “no payout” but does not define platform recovery of negative balances from future events.

### Impact
Platform-fault settlements cannot be computed with documented formula. Negative org balance unhandled.

### Recommendation
```
Net = GrossRevenue − Commission − Refunds − Adjustments + Compensations
PlatformP&L tracks losses separately.
Org balance can be negative; offset against future settlements (define policy).
```

---

### Issue ID
AUD-024

### Severity
Medium

### Category
Completeness

### Description
**Missing operational / edge processes:** payout bank transfer failure, settlement reopen after PAID, organizer bank change mid-settlement, event end time wrong (early finish / overrun), check-in before ONGOING (doors open), multi-day event mid-state, staff lost connectivity, duplicate org applications, ownership transfer during pending payout, suspended org with ONGOING event settlement rights, guest checkout (none—good), password reset (renamed away in BC map).

### Impact
Support playbooks empty. Production incidents will be handled by engineer heroics.

### Recommendation
Add exception catalog per BP with EX- flows. Add payout FAILED state. Allow early check-in window config.

---

### Issue ID
AUD-025

### Severity
Medium

### Category
Security / Privacy

### Description
**Audit log exists but privacy, retention, PII in notifications, and attendee data export/delete (GDPR/PDPA-style) are absent.** Engagement tracking stores spending/attendance with no retention policy.

### Impact
Regulatory exposure in multi-country future; even VN PDPA-adjacent expectations.

### Recommendation
Data classification, retention (audit 7y financial, engagement 2y), right-to-erasure constraints vs financial immutability, notification PII minimization.

---

### Issue ID
AUD-026

### Severity
Medium

### Category
Future Evolution

### Description
**Claims of future readiness are overstated.** Multi-currency, white-label, loyalty, affiliate, multi-country, dynamic pricing, marketplace multi-party settlement are “no boundary break” aspirational notes without data model hooks (currency on Money shared kernel is VND-assumed; no tenantId; no affiliate code; commission only percentage).

### Impact
False confidence. Schema will need rewrites.

### Recommendation
Add extension points now: Money(currency), TenantId nullable, CommissionRule strategy interface, Party on Settlement lines—even if V1 uses single values.

---

### Issue ID
AUD-027

### Severity
Low

### Category
Consistency

### Description
**Document version metadata rot.** Complexity Matrix Phase 1 summary lists Charter V2.2 and several docs as V1.0 while headers say V2.3 / V1.1 / V1.2. INDEX says Phase 2.1 complete while BC map is still DRAFT awaiting PO.

### Impact
Agents trust wrong status. Audit trail of baselining unreliable.

### Recommendation
Single version registry in INDEX.md; CI check on version strings.

---

### Issue ID
AUD-028

### Severity
Low

### Category
DDD

### Description
**Pricing classified Core** for Early Bird + two promotions is weak competitive differentiation; **Refund classified Supporting** while ranking #2 complexity is admitted but undervalued for investment. **11 BCs / 21 aggregates** for V1 portfolio may induce premature modularization cost.

### Impact
Over-partitioning slows delivery; under-investment in refunds causes post-launch pain (docs already warn).

### Recommendation
Keep modular **logical** boundaries; deploy as modular monolith first. Invest senior design time in Ticketing + Refund + Payment ledger, not Engagement aggregates.

---

### Issue ID
AUD-029

### Severity
Low

### Category
Completeness

### Description
**No User Journeys, Event Storming workshop output, API specs, DB schema, or threat model** in this folder (threat model may exist elsewhere in runs). ADRs live only inside Charter, not as individual records under `decisions/adr/`.

### Impact
Harder onboarding; ADRs not reviewable in isolation; Phase 2 incomplete by own roadmap.

### Recommendation
Extract ADRs to `knowledge/decisions/adr/`. Add journey maps for purchase, refund, cancel, payout. Block coding of finance until ledger ADR exists.

---

### Issue ID
AUD-030

### Severity
High

### Category
Business / Security

### Description
**No payment webhook authentication, amount verification, or order-amount re-validation rules in business layer.** BR-PAY-05 covers idempotency only. No rule: “gateway paid amount must equal Order.PriceLock.”

### Impact
Classic payment fraud: pay 1 unit, confirm order for full amount if integration is naive.

### Recommendation
BR-PAY-09: Payment success accepted only if amount, currency, and merchant reference match Order; else hold for investigation, do not issue tickets.

---

## 4. Completeness Review (Summary)

| Area | Status | Notes |
|---|---|---|
| Core marketplace happy path | Partial | Purchase → pay → ticket → check-in → settle sketched |
| Actors | Good | Org + platform roles present; end-user fraud actor missing |
| Business rules | Good volume | 57 rules; holes in refund economics, abuse, payment verify |
| Edge cases | Weak | Races, chargebacks, payout fail, free tickets, partial refund |
| Domain events | Listed | Not orchestrated; not ordered; no schema |
| Lifecycle states | Strong | 10 SMs; some naming drift |
| Exception flows | Weak | Many BP EX sections empty |
| Ops processes | Weak | Manual finance without SLAs |
| NFR / security / compliance | Missing | Production blockers |
| DB / API | Missing | By design, but blocks production claim |

**Missing concepts (priority):** PaymentAttempt, Chargeback, Adjustment, BankAccount, TaxLine, PlatformReserve, FraudSignal, IdempotencyRecord, CancellationBatch, OrganizerCompensation.

**Missing actors:** Scalper/Bot, Payment Fraudster, Chargeback Operator, Tax Authority (system), Bank (payout rail).

---

## 5. Consistency Review (Summary)

| Check | Result |
|---|---|
| Terminology | Mostly strong; Ban cost, Cooling vs refund, WAITING/QUEUED fail |
| Rule conflicts | **Critical:** refund/cooling; review edit; BR-TKT-08 misuse |
| Capability IDs | **Broken** in BC map / aggregate catalog renames |
| ADR conflicts | ADR-014 vs BR-REF-07 vs ADR-022 |
| Aggregate boundaries | TicketType–Reservation unresolved |
| Baselining integrity | Compromised by silent PO overrides |

---

## 6. Business Correctness Review (Summary)

| Topic | Assessment |
|---|---|
| Revenue model | Commission-only OK for V1; rate undefined numerically |
| Refund model | **Broken** (allocation + timing conflicts) |
| Settlement | Formula incomplete for platform-fault / chargeback |
| Pricing | Pipeline clean; free tickets / multi-type cart incomplete |
| Promotions | Solid; group tier OBS open |
| Permissions | Over-collapsed for finance safety |
| Org management | Decent; multi-owner invite ambiguity |
| Compliance | Explicitly deferred—unacceptable for real money |
| Unrealistic assumptions | Manual finance at scale; platform-fault 200% payout; “non-transferable” with QR share; unlimited waitlist; no KYC |

---

## 7. DDD Review (Summary)

**Strengths:** Clear context purpose statements; Customer-Supplier mostly sound; Money shared kernel; gateway ACL; Order ownership correctly pulled into Ticketing; Partnership Ticketing↔Refund honest.

**Violations / smells:**
- Cross-aggregate invariant on capacity without design (classic DDD failure mode)
- Hub context Ticketing (god-context risk)
- Anemic aggregates (Engagement, Audit)
- Domain Service “owns” rules (acceptable but under-specified)
- Large Waitlist aggregate
- Event cancellation multi-context without process manager
- Base price dual ownership

---

## 8. Technical Feasibility Review (Summary)

| Risk | Severity |
|---|---|
| Flash-sale capacity contention | Critical |
| Reservation TTL vs late payment | High |
| Mass cancel/refund | High |
| Manual payout ops | High |
| Check-in online-only | Medium |
| Voucher last-use race | Medium |
| No search/index NFRs for discovery | Medium |
| Eventual consistency without inbox/outbox design in these docs | High |

---

## 9. Enterprise Readiness Review

| Dimension | Ready? |
|---|---|
| Multi-tenant / white-label | No |
| Horizontal scale | Not designed |
| i18n / multi-currency | Explicitly no |
| Multi-PSP | Claimed via ACL; unproven |
| Regulatory / tax | No |
| Auditing | Partial (schema only) |
| DR / BCP | No |
| Financial controls | Weak |

---

## 10. Security Review (Summary)

| Threat | Covered? |
|---|---|
| Oversell | Partially (formula wrong) |
| Double charge | Idempotency rule only |
| Pay wrong amount | **No** |
| QR fraud / transfer | **No** (group purchase worsens) |
| Privilege abuse | Weak SoD |
| Scalping bots | Weak |
| Voucher brute force | No |
| Insider payout fraud | Manual, no dual control |
| Data leakage (orders to Staff) | Under-specified |

---

## 11. Future Evolution Review

| Capability | Support |
|---|---|
| White-label orgs | Not designed |
| Subscription plans | New context OK; commission interaction undefined |
| Dynamic pricing | Pipeline needs strategy plugin; OK in principle |
| Marketplace multi-party | Partial; settlement model single-party |
| Loyalty | Engagement passive only |
| Affiliate | Missing |
| Multi-country | Missing currency, tax, legal entity |

---

## 12. Top 10 Risks

1. **Financial policy contradictions (refund/cooling)** → wrong money movement  
2. **Platform-fault double exposure** → solvency risk  
3. **Undefined attendee-refund ledger** → settlement corruption  
4. **Capacity formula + concurrency** → oversell / sellout bugs  
5. **QR-as-transfer + group purchase** → fraud and chargebacks  
6. **No chargeback/KYC/tax** → cannot legally operate at scale  
7. **Manual finance ops** → operational collapse  
8. **Mass cancellation cascade unscoped** → partial failure chaos  
9. **Capability/ID drift** → wrong system built  
10. **No NFRs** → silent production failure under load  

---

## 13. Top 10 Improvements

1. **Rewrite financial policy pack** (refund timing, cost allocation, settlement formula, chargebacks) as one document; force ADR alignment.  
2. **Add PaymentAttempt SM + amount-match rule BR-PAY-09.**  
3. **Fix capacity formula; design TicketType–Reservation consistency pattern.**  
4. **Extract ADR files; ban silent PO overrides of baselined rules.**  
5. **Restore capability ID freeze; repair BC map renames.**  
6. **Add NFR document and finance ops SLAs.**  
7. **Honest ticket transfer model or real anti-transfer controls.**  
8. **KYC + BankAccount + reserve for chargebacks before first real payout.**  
9. **EventCancellation process manager design.**  
10. **Anti-abuse pack:** waitlist caps, multi-account controls, voucher rate limits.  

---

## 14. Go / No-Go Recommendation

### **NO-GO for production readiness**

| Gate | Result |
|---|---|
| Business rules consistent | **FAIL** |
| Financial model complete | **FAIL** |
| Compliance minimum | **FAIL** |
| Scale/ops model | **FAIL** |
| Security for payments/tickets | **FAIL** |
| DDD strategic clarity | **PASS (with conditions)** |
| Portfolio / academic BA quality | **PASS** |
| Ready for Phase 2.3 DB/API freeze | **NO-GO until AUD-001–004, 006, 010, 013 fixed** |
| Ready to implement purchase path in lab/demo | **CONDITIONAL GO** |
| Ready to move real money | **HARD NO-GO** |

### Conditions for CONDITIONAL implementation (demo/portfolio only)
- Document explicitly: “demo marketplace; not production finance.”  
- Fix capacity formula and pick one refund timing policy.  
- Do not implement platform-fault 200% payout without caps.  
- Keep single currency, single PSP, manual payouts accepted as lab constraints.

### Conditions for future production GO
- Close all Critical and High issues AUD-001–016, 030.  
- NFR + threat model + ledger design approved.  
- Chargeback, KYC, tax position signed off.  
- Load test design for inventory + cancel cascade.  
- Baselined docs re-audited with zero Critical conflicts.

---

## 15. What Is Actually Good (so the critique is not hollow)

1. **Process discipline** — rare and valuable.  
2. **Pricing pipeline separation (ADR-013/021)** — correct domain call.  
3. **Organization-centric RBAC direction** — right enterprise instinct (execution collapsed too far).  
4. **State machines with guards** — implementable backbone.  
5. **Honest hub-context warning (OBS-13)** — self-aware.  
6. **Gateway-agnostic payment stance** — correct.  
7. **Traceability matrix** — good practice even if some rows wrong.  
8. **Aggregate catalog admits BR-REV-04 conflict** — better than hiding it.

**Do not confuse documentation volume with correctness.** This audit found critical financial contradictions in baselined text. Volume without financial truth is dangerous.

---

## 16. Issue Index by Severity

| Severity | IDs |
|---|---|
| Critical | AUD-001, 002, 003, 004, 005 |
| High | AUD-006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 030 |
| Medium | AUD-017–026 |
| Low | AUD-027–029 |

**Total issues filed: 30**

---

> **End of Enterprise Documentation Audit EV-AUD-DOC-001**
