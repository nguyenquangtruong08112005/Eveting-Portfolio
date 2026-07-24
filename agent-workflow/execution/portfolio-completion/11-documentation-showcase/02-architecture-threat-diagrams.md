# Task 11-T2: Architecture Diagrams (C4, Threat Model, ERD, Sequence)

## 1. Goal
Create comprehensive, interactive Mermaid diagram specifications documenting the complete system architecture, threat model, ERD, and core execution flows under `docs/architecture/`.

## 2. Why
Provides deep architectural transparency, demonstrating mastery of software design, security threat modeling, database modeling, and distributed system interaction patterns.

## 3. Dependencies
- Task `11-T1` (Portfolio README Showcase & Developer Setup Manual).

## 4. Preconditions
- All database schemas, API modules, and infrastructure roles finalized.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **C4 Architecture Model:** System Context, Container (Web, Express, Postgres, Redis, ES, Mobile), Component diagrams.
  - **Threat Model Diagram & STRIDE Analysis:** Trust boundaries, attacker vectors, mitigations (WAF, Rate Limiter, Idempotency Engine, Play Integrity).
  - **Entity Relationship Diagram (ERD):** Full database schema diagram with table attributes, primary/foreign keys, and cardinalities.
  - **Use Case Diagrams:** Attendee, Organizer, and Admin use case models.
  - **Sequence Diagrams:** ZaloPay Payment & Webhook flow, Seat Hold Transaction flow, OAuth Login flow, Outbox Search Indexing flow.
  - **State Machine Diagrams:** Order status transitions, Seat availability states, Event moderation lifecycle.
  - **Activity Diagrams:** Multi-step Event Creation workflow, Checkout & Seat Reservation workflow.
- **Out-of-Scope:**
  - Exporting static binary image formats (Mermaid text code rendered dynamically in Markdown).

## 6. Likely Source Modules / Files
- `docs/architecture/C4_MODEL.md` — [Discovery Target: C4 diagrams]
- `docs/architecture/THREAT_MODEL.md` — [Discovery Target: STRIDE threat model]
- `docs/architecture/ERD_SCHEMA.md` — [Discovery Target: Database ERD]
- `docs/architecture/UML_DIAGRAMS.md` — [Discovery Target: Use Case, Sequence, State, Activity diagrams]

## 7. Contracts / Behavior to Preserve
- Standard Mermaid syntax rendering cleanly in GitHub / VS Code markdown viewers.

## 8. Ordered Implementation Steps
1. Create `docs/architecture/` directory.
2. Build `C4_MODEL.md` with System Context, Container, and Component diagrams.
3. Build `THREAT_MODEL.md` using STRIDE framework (Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege).
4. Build `ERD_SCHEMA.md` displaying full 25+ table relational structure.
5. Build `UML_DIAGRAMS.md` containing Use Case, Sequence, State, and Activity flows.
6. Verify all Mermaid code blocks render cleanly without syntax errors.

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- Ensure Threat Model explicitly references implemented defenses (CSRF, Rate Limiting, Idempotency, Parameterized Queries, RBAC).

## 11. Test / Build / Smoke Commands
- `npx mermaid-cli` (or Markdown preview syntax validation)

## 12. Acceptance Criteria
- [ ] C4, Threat Model, ERD, Use Case, Sequence, State, and Activity diagrams completed in Mermaid markdown format.
- [ ] 100% of diagrams render with zero syntax errors.
- [ ] Database ERD reflects exact PostgreSQL migration schemas.

## 13. Rollback / Feature-Flag Strategy
- N/A (Documentation task).

## 14. Required Artifacts / Handoff Report
- Architecture documentation files under `docs/architecture/`.

## 15. Blocker Questions
- Should sequence diagrams include step-by-step millisecond latency breakdown estimations?
