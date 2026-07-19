# Portfolio V1 Scope — Eventing

> **Document ID:** EV-PORT-001  
> **Version:** 1.0  
> **Status:** Active — shipping target  
> **Last Updated:** 2026-07-17  
> **Relationship:** Subset of enterprise design in `00`–`11`. Those docs are **frozen for future**; this file governs what we implement **now**.

---

## 1. Goal

Ship a **demoable, deployable** event ticketing product for internship / portfolio:

- Clear architecture (modular monolith + FKs)
- Real non-CRUD flows (lifecycle, hold→pay→ticket, check-in)
- Flavor features (reviews, loyalty, categories, profile, guest name)
- **Not** a full marketplace finance engine

---

## 2. Actors (V1)

| Actor | Capabilities |
|---|---|
| Guest | Browse events |
| Attendee | Register, buy, tickets/QR, profile, review, loyalty view |
| Organizer (Owner) | Org, events draft/submit, ticket types, dashboard |
| Check-in Staff | Scan QR (organizer staff or same as organizer for demo) |
| Platform Admin | Approve/reject events, basic moderation |

**Out:** Finance Manager, Marketing Manager, multi-group RBAC expansion.

---

## 3. In scope

| Area | Include |
|---|---|
| Auth | Register, login JWT, profile |
| Organization | Create org, simple team (owner), optional invite later |
| Events | CRUD draft, submit, admin approve, publish, categories |
| Tickets | Ticket types, capacity, sales window (basic) |
| Order | Reserve hold, order, payment sandbox / ZaloPay if stable |
| Tickets issued | QR (JWT token), my tickets |
| Check-in | Single scan, wrong-event rejection |
| Reviews | After completed event + eligible purchase/check-in |
| Loyalty | Points on check-in (or attendance count) — display only |
| Guest | Guest name on ticket slot (simple; not full transfer marketplace) |
| Web | Attendee + organizer + admin approve surfaces |
| Mobile | Contract-compatible critical paths (polish secondary) |

---

## 4. Out of scope (Portfolio V1)

- Settlement, cooling period, manual/auto payout engine  
- Multi-fault refund cost allocation (platform/organizer/FM)  
- Commission ledger productization  
- Voucher stacking / best-benefit engine (optional single promo later)  
- Waitlist product  
- Dynamic pricing / Early Bird full pipeline  
- Seat map as **required** demo path (optional if already stable)  
- Multi-agent orchestration  
- Full 11 bounded-context microservices  
- White-label, multi-currency, tax/invoicing  

Enterprise design for the above remains in `knowledge/project/00`–`11` for **future**.

---

## 5. Complex flows (must work E2E)

1. **Event lifecycle:** DRAFT → PENDING_REVIEW → APPROVED/PUBLISHED → ONGOING → COMPLETED  
2. **Purchase:** select ticket type → hold → pay → tickets + QR  
3. **Check-in:** scan/validate QR → CHECKED_IN once  
4. **Review:** eligible attendee submits rating after COMPLETED  

---

## 6. Target data (core tables)

```text
auth_users, user_profiles
organizations, organization_memberships
events, ticket_types (or ticket types in relational form)
orders, order_items, payment_attempts
tickets
reviews
loyalty_points_ledger (or user_profiles.points)
```

Deferred for product path: full seat_maps productization, organizer_balances settlement, dual voucher systems.

---

## 7. Definition of Done

- [ ] Single doc tree (`agent-workflow` only)  
- [ ] Transactional migrations + critical FKs  
- [ ] E2E demo: register → publish event → buy → QR → check-in → review  
- [ ] Web primary flows follow DESIGN.md  
- [ ] Docker or deployed demo + DEMO.md  
- [ ] Root README suitable for CV  

---

## 8. Priority rule

If enterprise design conflicts with this file for **implementation**, **Portfolio V1 wins** until V1 is shipped.
