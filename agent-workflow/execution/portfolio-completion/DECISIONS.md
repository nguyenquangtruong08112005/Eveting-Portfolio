# Portfolio Completion Program — Confirmed Decisions Log (`DECISIONS.md`)

This log records confirmed architectural, security, and infrastructure decisions governing the Portfolio Completion Program.

---

## 1. Quality Baseline & Terminology

- **Scope & Positioning:** The application is a **portfolio-ready, staging-grade** monorepo showcase. Overclaims such as "enterprise-grade", "battle-tested", or "zero-downtime single-instance deployment" are strictly avoided.

---

## 2. Authentication & Identity Architecture

- **Social Auth Route Discovery & Compatibility Aliases:**
  - Route paths such as `/api/web/auth/google` or `/api/mobile/auth/google` are **[Proposed / Discovery Targets]**. Current codebase routes (e.g. `/google-login`, `/facebook-login`, `/auth/google`) will be inventoried during Phase 00.
  - Phase 00 freezes canonical route definitions, and later implementation tasks preserve backward-compatible route aliases.
- **Normalized Social Identity Table:** Social login identities (Google, Facebook) are modeled in a dedicated `auth_identities` table (`id`, `user_id`, `provider`, `provider_subject`, `provider_email`, `created_at`) rather than adding provider-specific columns (`google_id`, `facebook_id`) to the `users` table.
- **Account Linking & Takeover Prevention:**
  - If a social provider presents an email matching an existing verified user account AND `email_verified: true` from the provider, link `auth_identity` to the existing `user_id`.
  - Unverified social emails attempting to attach to existing accounts are rejected without verification.
- **Email Verification & Session Policy:**
  - Registration creates a `pending` / `unverified` user account.
  - **No authenticated web session or JWT cookie is issued prior to email verification.**
  - Verification tokens are single-use, crypto-random strings stored ONLY as SHA-256 hashes (`sha256(token)`) in the database with a 24-hour expiration TTL.
  - Verification links redirect through `APP_PUBLIC_WEB_URL` to `/verify-email`, displaying confirmation and prompting user redirect to `/login`.
  - Development bypass / mock email mode (`AUTH_MOCK_EMAIL=true`) is permitted **strictly in local/test environments**; raw verification tokens are **never** printed in staging or production environment logs.
- **Web Token Security (Dual Cookie Strategy):**
  - **Both Access Token and Refresh Token are stored in host-only, HttpOnly, Secure, SameSite=Lax/Strict cookies for Web.**
  - No authentication tokens are stored in `localStorage`, `sessionStorage`, or returned in web JSON response bodies.
  - Preserved secret names: `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.
- **CSRF Defense (Web Cookie Transport):**
  - HttpOnly cookies mitigate JavaScript XSS token theft but **do not prevent CSRF attacks**.
  - All cookie-authenticated state-modifying requests (`POST`, `PUT`, `PATCH`, `DELETE`) require a signed double-submit or synchronizer CSRF token header (`X-CSRF-Token`), `Origin` / `Fetch-Metadata` header verification, `credentials: 'include'` on client requests, and exact credentialed CORS origin (`https://eventing.moteo.fun`).
- **Mobile Token Transport:**
  - Mobile applications (Android Attendee & Organizer) transport tokens via `Authorization: Bearer <token>` headers stored securely in Android `EncryptedSharedPreferences` / KeyStore.
  - Transport mode selection relies on explicit web vs mobile route paths (`/api/web/auth/*` vs `/api/mobile/auth/*`) or content negotiation established in Phase 00, **not** on an untrusted client header.

---

## 3. Financial & Data Integrity Architecture

- **Durable Idempotency Authority:**
  - The PostgreSQL `idempotency_keys` table is the **sole durable source of truth** for idempotency status and response payload caching.
  - Redis acts purely as an optional fast accelerator cache for active lock keys.
  - Keys are scoped by `user_id` + `endpoint_operation`, request payload hash (`sha256(body)`), execution status (`IN_PROGRESS`, `COMPLETED`), cached response code, cached response body, and 24-hour TTL.
  - Idempotency is required **only** for state-modifying, high-risk operations: Order Creation, Payment Initiation/Callback, Seat Confirmation/Purchase, Refund, Payout, and explicitly selected unsafe retries.
  - Reusing an `Idempotency-Key` with a different request payload returns **HTTP 422 Unprocessable Entity**.
- **Data Seeding & Password Convention:**
  - Seed scripts MUST preserve existing demo account conventions and the default test password `123456`, hashed **only through the existing `backendAuthProvider`**, whose exact internal hashing algorithm is discovered and preserved in Phase 00. (Specific hashing libraries like `bcrypt` or helper class names are not mandated).
  - Seed scenarios use fictional brands/people with explicit asset licensing and attribution.
  - Lookup, configuration, audit, ledger, and empty-state tables are **explicitly exempt** from arbitrary row padding.
  - Targeted cleanup scripts `[Proposed: node scripts/seed/clean-demo.js]` operate on a deterministic demo namespace without running destructive commands like `db:reset`.

---

## 4. Concurrency & Seat-Map Authority

- **Database Seat Locking Invariants:**
  - PostgreSQL database transactions, row-level locks, atomic conditional updates, and database unique constraints remain the **sole ground truth** for seat availability and ticket issuance.
  - Specific ORM method names (e.g. `knex.transaction`), migration file numbers, or assumed column names are NOT mandated prior to Phase 00 schema discovery.
  - Phase 00 discovers existing seat and performance tables, allowing later tasks to implement transaction locks, row locks, or atomic updates matching current table structures.
  - **Core Invariant:** Active holds (`HELD` with unexpired TTL) plus confirmed purchases (`SOLD`) for any seat MUST NEVER exceed 1.
  - Redis acts purely as an advisory accelerator for UI seat visualizers, never as a sole lock.

---

## 5. Infrastructure & Deployment Topology

- **AWS Architecture:** AWS ECR container registry with immutable SHA image tags, AWS EC2 target host running Docker Compose managed via AWS SSM (SSH keys are NOT used).
- **Edge Security:** Cloudflare edge proxy & WAF.
- **Infrastructure as Code:** Terraform with Cloudflare R2 / S3 remote backend state.
- **Terraform Plan Review Gate:** **No `terraform apply` is permitted without first generating and reviewing a plan file (`terraform plan -out=tfplan`).**
- **Rollback Procedure:** Revert target EC2 container deployment to prior immutable ECR image SHA tag via Ansible playbook executed over AWS SSM.
- **Single EC2 Topology:** Container deployment performs container replacement via Docker Compose on target EC2 instance, undergoing a brief, expected service restart window.
