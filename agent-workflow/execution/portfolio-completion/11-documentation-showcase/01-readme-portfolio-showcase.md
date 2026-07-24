# Task 11-T1: Portfolio README Showcase & Developer Setup Manual

## 1. Goal
Write the primary monorepo `README.md` showcasing system capabilities, feature matrix, technical architecture highlights, demo account credentials, and step-by-step developer setup commands.

## 2. Why
Serves as the primary landing presentation for technical recruiters, engineering leaders, and project reviewers evaluating the portfolio repository.

## 3. Dependencies
- Phase 10 (Android Mobile Applications Audit & Alignment).

## 4. Preconditions
- Monorepo features, APIs, and seeding scripts fully functional.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Executive summary and live production demo links (`https://eventing.moteo.fun`).
  - Core Feature Showcase matrix (Web Next.js 16 App Router, Node.js Express Backend, Jetpack Compose Android Apps, PostgreSQL 16, Redis 7, Elasticsearch 8, ZaloPay Payment Engine, Seat Map Visual Editor, Transactional Outbox Worker, Idempotency Engine).
  - Quick Demo Credentials section (Admin, Organizer, Attendee).
  - Local Quick-Start Guide (`docker compose up -d`, `npm run db:migrate`, `node server/scripts/seed/seed-vietnam-portfolio.js`).
  - Provider Boundaries & External Services table (ZaloPay, Resend, Cloudflare, AWS EC2, Google Play Integrity).
- **Out-of-Scope:**
  - Adding promotional marketing fluff unrelated to technical implementation.

## 6. Likely Source Modules / Files
- `README.md` — [Discovery Target: Monorepo root README file]
- `docs/` — [Discovery Target: System documentation directory]

## 7. Contracts / Behavior to Preserve
- Clean GitHub Flavored Markdown formatting with badge shields and table rendering.

## 8. Ordered Implementation Steps
1. Draft Executive Summary and Feature Highlight matrix in `README.md`.
2. Document environment variable requirements and local Docker setup instructions.
3. Add step-by-step instructions for running test suites and seed scripts.
4. Document provider boundaries and third-party service integration points.
5. Review rendering on GitHub / Markdown previewer.

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- Ensure no real credentials, private SSH keys, or production secrets are disclosed in `README.md`.

## 11. Test / Build / Smoke Commands
- `npx markdownlint-cli README.md`

## 12. Acceptance Criteria
- [ ] Root `README.md` provides clear visual overview of monorepo architecture and features.
- [ ] Local setup steps tested and verified from fresh clone.
- [ ] Live demo URLs and sandboxed test credentials clearly presented.

## 13. Rollback / Feature-Flag Strategy
- N/A (Documentation task).

## 14. Required Artifacts / Handoff Report
- Monorepo `README.md` file.

## 15. Blocker Questions
- Should video walkthrough GIFs be embedded directly in the root README?
