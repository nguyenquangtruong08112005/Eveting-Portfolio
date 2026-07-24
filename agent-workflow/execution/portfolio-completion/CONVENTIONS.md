# Portfolio Completion Program — Shared Conventions & Standards

---

## 1. Quality Baseline & Terminology

- **Scope & System Status:** The application is a **portfolio-ready, staging-grade** monorepo showcase. Documentation and task specs avoid overclaims such as "enterprise-grade", "battle-tested", or "zero-downtime single-instance deployment".
- **Discovery Target Labeling:** Any source file, controller, function, or script whose exact signature or existence has not been directly verified during Phase 00 discovery MUST be explicitly labeled as a **[Discovery Target]**. Agents executing tasks must inspect authoritative source files before making code edits.
- **Proposed Commands & Scripts:** Any script name, command, or file path proposed for future creation MUST be explicitly labeled as **[Proposed]** (e.g. `[Proposed Command: npm run test:unit]`). Phase 00 inventories existing package scripts before any task executes commands.

---

## 2. Validation Framework Standards

- **Server Backend (`server/`):** Preserve existing `express-validator` and shared validation middleware in `server/` unless Phase 00 code audit explicitly approves a migration.
- **Web Application (`web/`):** Use Zod and React Hook Form only where dependencies and patterns already exist or are explicitly added by task specifications.

---

## 3. Idempotency Architecture Specification

### Scope & Rule
Idempotency is enforced **ONLY** for state-modifying, high-risk operations where duplicate execution causes financial, inventory, or state corruption.
- **Required Endpoints:**
  - Order creation (`POST /api/web/orders` / `/api/mobile/orders`)
  - Payment initiation & callback handling (`POST /checkout/process`, `POST /payments/zalopay/callback`)
  - Seat confirmation & ticket purchase (`POST /events/:id/seats/confirm`)
  - Refund issuance & Payout approvals (`POST /admin/finance/refunds`, `POST /organizer/payouts`)
  - Explicitly selected unsafe retries of failed state transitions.
- **Not Required:** `GET`, `HEAD`, `OPTIONS` requests, or simple idempotent updates (e.g. `PUT /profile`).

### Authority & Storage Strategy
1. **Durable Authority:** The PostgreSQL `idempotency_keys` table is the **sole source of truth**.
2. **Accelerator Cache:** Redis acts purely as an optional fast accelerator for lock acquisition and response caching.
3. **Header:** `Idempotency-Key: <UUIDv4>` (Web client generates a fresh UUID per user intent and reuses it ONLY on retry).
4. **Key Scoping:** Key is scoped by `user_id` + `endpoint_operation`, request payload hash (`sha256(req.body)`), execution status (`IN_PROGRESS`, `COMPLETED`), cached response status code, cached response body, and expiration TTL (24 hours).
5. **Conflict & Mismatch Handling:**
   - **Identical Retry:** If `Idempotency-Key` exists AND payload hash matches: return cached response (HTTP 200/201) without re-executing business logic.
   - **Payload Mismatch:** If `Idempotency-Key` exists AND payload hash **differs**: reject request immediately with **HTTP 422 Unprocessable Entity**, error payload `{ error: "IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH" }`.
   - **Concurrent Lock:** If request is currently `IN_PROGRESS` by another process: return **HTTP 409 Conflict**, error payload `{ error: "CONCURRENT_REQUEST_IN_PROGRESS" }`.

---

## 4. Web & Mobile Security Architecture

### Web Client Session Transport
- **Dual Cookie Strategy:** BOTH Access Token and Rotating Refresh Token are stored in host-only, HttpOnly, Secure, SameSite=Lax/Strict cookies.
- **Token Isolation:** NO authentication tokens are stored in `localStorage`, `sessionStorage`, or returned in web JSON response bodies.
- **Preserved Secret Names:** `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.
- **CSRF Defense:** HttpOnly cookies mitigate JavaScript XSS token theft but **do NOT prevent CSRF**. All cookie-authenticated state-modifying requests (`POST`, `PUT`, `PATCH`, `DELETE`) require a signed double-submit or synchronizer CSRF token header (`X-CSRF-Token`), `Origin` / `Fetch-Metadata` header validation, `credentials: 'include'` on client requests, and exact credentialed CORS origin (`https://eventing.moteo.fun`).

### Mobile Client Session Transport
- Mobile apps (Android Attendee & Organizer) transport tokens via `Authorization: Bearer <token>` headers stored securely in Android `EncryptedSharedPreferences` / KeyStore.
- Transport mode selection relies on explicit web vs mobile route paths (`/api/web/auth/*` vs `/api/mobile/auth/*`) or content negotiation established in Phase 00 discovery, **not** on an untrusted client header.

---

## 5. Data Seeding & Relational Scaling Policy

- **Password Convention:** Seed scripts MUST preserve existing demo account conventions and the default test password `123456`, hashed **only through the existing `backendAuthProvider`**, whose exact internal algorithm is discovered and preserved in Phase 00.
- **Relational Realism over Row Padding:** Lookup, configuration, audit, ledger, and empty-state tables are **explicitly exempt** from arbitrary row padding.
- **Deterministic Scenario Matrix:** Core entities (Events, Venues, Performances, Ticket Types, Orders, Tickets, Promotions, Reviews) MUST contain rich, realistic data representing authentic Vietnamese event scenarios:
  - $\ge 10$ events per user-facing category.
  - $\ge 20$ venues across multiple Vietnamese provinces/cities (Hanoi, Ho Chi Minh City, Da Nang, etc.).
- **Asset Sourcing:** Fictional brands/people with licensed, attributed media; zero misleading real organizer affiliation.
- **Targeted Cleanup:** Rollback and re-seeding operate on a deterministic demo namespace using proposed targeted cleanup scripts `[Proposed: node scripts/seed/clean-demo.js]`.

---

## 6. Infrastructure & Deployment Topology

- **AWS Architecture:** AWS ECR container registry with immutable SHA image tags, AWS EC2 target host running Docker Compose managed via AWS SSM (SSH keys are NOT used).
- **Edge Security:** Cloudflare edge proxy & WAF.
- **Infrastructure as Code:** Terraform with Cloudflare R2 / S3 remote backend state.
- **Terraform Plan Review Gate:** **No `terraform apply` is permitted without first generating and reviewing a plan file (`terraform plan -out=tfplan`).**
- **Rollback Procedure:** Revert target EC2 container deployment to prior immutable ECR image SHA tag via Ansible playbook executed over AWS SSM.

---

## 7. Standard Task Specification Template

Every task specification file under this program MUST adhere to the following 15-section markdown template:

```markdown
# [Task ID]: [Task Name]

## 1. Goal
[Short, single-sentence summary of what this task delivers]

## 2. Why
[Value and engineering rationale]

## 3. Dependencies
[Prerequisite tasks or phases]

## 4. Preconditions
[Environment state, infra, database, or branch prerequisites]

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - [Item 1]
- **Out-of-Scope:**
  - [Item 1]

## 6. Likely Source Modules / Files
- `path/to/module/` — [Discovery Target: Code location description]

## 7. Contracts / Behavior to Preserve
- [API route, schema, mobile contract, or UI state to preserve]

## 8. Ordered Implementation Steps
1. [Step 1]
2. [Step 2]

## 9. Database / Migration Needs
- [Migration SQL, table changes, index additions, or seeds]

## 10. Security Requirements
- [Authz, validation, secret safety, OWASP mitigation]

## 11. Test / Build / Smoke Commands
- `npm run test:...` — [Proposed Command: Subject to Phase 00 script inventory]

## 12. Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## 13. Rollback / Feature-Flag Strategy
- [Feature flag configuration or Git revert path]

## 14. Required Artifacts / Handoff Report
- [Log output, test report, or code diff summary] — [Proposed Artifact]

## 15. Blocker Questions
- [Edge case or decision to resolve during discovery]
```
