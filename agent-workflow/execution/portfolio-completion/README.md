# Eventing Monorepo — Portfolio Completion Program

> **Program Status:** `PLANNED`  
> **Target Branch:** `staging` $\rightarrow$ `main`  
> **Scope:** Monorepo Staging-Grade Hardening, Feature Completion, Security, Concurrency, and Portfolio Readiness.

---

## Navigation & Index

This directory contains the complete implementation program to prepare the Eventing Monorepo as a staging-grade engineering portfolio showcase.

### Core Documentation
- **Confirmed User Decisions:** [`DECISIONS.md`](DECISIONS.md)
- **Shared Conventions & Standards:** [`CONVENTIONS.md`](CONVENTIONS.md)
- **Open Questions & Provider Blockers:** [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md)
- **Phase Dependency Graph:** [`DEPENDENCY_GRAPH.md`](DEPENDENCY_GRAPH.md)
- **Task Status Matrix:** [`TASK_MATRIX.md`](TASK_MATRIX.md)

---

## Phase Index

| Phase | Directory | Focus & Primary Deliverable |
| :--- | :--- | :--- |
| **00** | [`00-baseline/`](00-baseline/) | Codegraph audit, current-state freeze, API contract inventory |
| **01** | [`01-auth/`](01-auth/) | OAuth (`auth_identities`), Email activation, HttpOnly cookies, Mobile bearer, CSRF defense |
| **02** | [`02-security-boundary/`](02-security-boundary/) | API boundary, RBAC/ownership, CORS, rate limits, Cloudflare WAF, Mobile attestation |
| **03** | [`03-data-seeding/`](03-data-seeding/) | Deterministic Vietnam dataset, media policy, Elasticsearch indexing, table scaling rationale |
| **04** | [`04-infra-cache-search/`](04-infra-cache-search/) | Outbox worker verification, Redis cache strategies, rate limiter & idempotency storage |
| **05** | [`05-payments-idempotency/`](05-payments-idempotency/) | Durable Idempotency Engine (`idempotency_keys`), ZaloPay sandbox, refund/payout safeguards |
| **06** | [`06-seatmap-concurrency/`](06-seatmap-concurrency/) | Visual seat map editor, DB-level locking, Redis hold TTL, race-condition testing, auto-release |
| **07** | [`07-organizer-business/`](07-organizer-business/) | Event builder (VN dict), ticket rules, attendee Qs, bank/tax info, reports/analytics, Team RBAC |
| **08** | [`08-admin-governance/`](08-admin-governance/) | Organizer KYC, event moderation, user control, financial oversight, audit logs, feature flags |
| **09** | [`09-web-ux-hardening/`](09-web-ux-hardening/) | Web UI/UX polish, Bo Cong Thuong removal, portfolio demo disclosures, responsive flow |
| **10** | [`10-mobile-apps/`](10-mobile-apps/) | Android Attendee & Organizer audit, auth migration, mobile attestation, UI consistency |
| **11** | [`11-documentation-showcase/`](11-documentation-showcase/) | README portfolio showcase, architecture (C4, ERD, Use Case, Sequence, State, Activity) |
| **12** | [`12-git-release-model/`](12-git-release-model/) | Git flow (`main`/`staging`), PR CI/CD, ECR image tagging, Terraform plan review gates |
| **13** | [`13-verification-gate/`](13-verification-gate/) | E2E verification, OWASP Top 10, Trivy/dependency scans, backup/restore, public smoke |
