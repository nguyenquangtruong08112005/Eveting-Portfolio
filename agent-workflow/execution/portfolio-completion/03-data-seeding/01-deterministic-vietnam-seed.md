# Task 03-T1: Deterministic Vietnam Data Seeding & Relational Scaling

**Status:** COMPLETED (Deployed to Staging EC2)

## 1. Goal
Implement a deterministic, reproducible PostgreSQL data seeder creating realistic Vietnamese event scenarios, preserving existing demo account conventions and test password `123456` hashed only through the existing `backendAuthProvider`.

## 2. Why
Provides immediate, high-fidelity visual and functional content for portfolio demonstrations, UI testing, search verification, and sales analytics.

## 3. Dependencies
- Phase 02 (Public API Security Boundary).

## 4. Preconditions
- PostgreSQL database schemas updated and migrations applied (`npm run db:migrate`).

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **Demo Password & Password Hash Convention:** Preserve existing demo account password convention `123456` hashed through the existing `backendAuthProvider`. The exact internal hashing algorithm used by `backendAuthProvider` is discovered and preserved in Phase 00.
  - **Deterministic Scenario & Count Matrix:**
    - $\ge 10$ events per user-facing category (Music, Theater, Workshops, Sports, Exhibitions).
    - $\ge 20$ venues across multiple Vietnamese provinces/cities (Hanoi Opera House, Hòa Bình Theater HCMC, Mỹ Đình Athletics Palace, Nguyễn Du Gymnasium, Da Nang International Exhibition Center, Imperial City Huế venue, etc.).
    - Consistent relational scenarios across organizers, performances, ticket types, seat maps, promotions, reviews, and media. *(Note: Order and ticket seed was not implemented).*
  - **Explicit Non-Padding Policy:** Lookup, configuration, audit, financial ledger, and empty-state tables are **explicitly exempt** from arbitrary 10/20 padding if fewer rows represent domain reality.
  - **Attribution Policy:** Sourced fictional brands and people with licensed, attributed media assets; zero misleading real organizer affiliation.
  - **Targeted Cleanup:** Cleanup operates strictly on the deterministic demo namespace via a targeted script `node server/scripts/seed/clean-demo.js`.
- **Out-of-Scope:**
  - Using real person names or proprietary brand logos without attribution.
  - Destructive database commands (e.g. running `db:reset` or dropping entire schemas).
  - Order or ticket seeding *(not implemented in Phase 03)*.

## 6. Likely Source Modules / Files
- `server/scripts/seed/` — Database seeders (`seed.platform.postgres.js`, `clean-demo.js`, `verify-seed.js`)
- `server/src/db/` — Seed script modules and database models
- `server/src/providers/auth/` — backendAuthProvider password hashing

## 7. Contracts / Behavior to Preserve
- Idempotency: Running the seed script multiple times produces identical state without key collisions or duplicated unique constraints.
- Test password `123456` hashed through `backendAuthProvider` for demo accounts (`admin@eventing.moteo.fun`, `organizer@eventing.moteo.fun`, `attendee@eventing.moteo.fun`).

## 8. Ordered Implementation Steps
1. Create `server/scripts/seed/seed.platform.postgres.js` (and `seed-vietnam-portfolio.js`) and `server/scripts/seed/clean-demo.js`.
2. Generate deterministic UUIDs using fixed seed keys (`uuidv5`).
3. Seed categories, $\ge 20$ venues across Vietnamese provinces, organizers, and featured star artists.
4. Seed $\ge 10$ events per category with performances, section layouts, seat maps, ticket rules, and custom questions.
5. Seed demo user accounts with password `123456` hashed using `backendAuthProvider`.
6. Seed promotions, reviews, and media items. *(Note: Order and ticket seeding was not implemented).*

## 9. Database / Migration Needs
- Ensures seed script uses `ON CONFLICT DO UPDATE` or targets demo namespace safely.

## 10. Security Requirements
- All demo account passwords hashed strictly using `backendAuthProvider`.
- Fictional data only; no confidential personal information.

## 11. Test / Build / Smoke Commands
- `node server/scripts/seed/clean-demo.js`
- `node server/scripts/seed/seed.platform.postgres.js`
- `node server/scripts/seed/verify-seed.js`

## 12. Acceptance Criteria
- [ ] Database seeds cleanly in < 15 seconds.
- [x] 22 venues and 50 future public events (10 per category: music, theater, workshop, sports, exhibition) seeded across Vietnamese cities.
- [x] Demo account logins succeed using password `123456`.
- [x] Lookup, audit, and ledger tables explicitly exempted from arbitrary row padding.
- [x] Targeted cleanup script (`clean-demo.js`) removes demo data without dropping database.
- *(Note: Order and ticket seed was not implemented).*

## 13. Rollback / Feature-Flag Strategy
- Execute `node server/scripts/seed/clean-demo.js` to purge demo namespace cleanly.

## 14. Required Artifacts / Handoff Report
- Seed execution log with entity summary count (`DEPLOYED_SEED_RUNBOOK.md`).

## 15. Blocker Questions
- Should historical orders include ZaloPay transaction reference IDs for mock verification?

## 16. Verification & Deployment Evidence
- **Status:** Task `03-T1` is COMPLETED and deployed to staging EC2.
- **Database Seed Verification:** Local and remote seed verification passed (`verify-seed.js`) with:
  - 22 demo venues
  - 50 future public events
  - 10 each in Music, Theater, Workshop, Sports, and Exhibition categories
  - 1 120-seat map
  - 5 promotions
  - 10 reviews
  - 15 media items
- **Idempotency Verification:** The full deployed seed was run twice and the second run verified unchanged exact demo counts and reindexed 50 events.
- **Elasticsearch Search Indexing:** Remote Elasticsearch successfully reindexed 50 events.
- **Public API Verification:** Public HTTPS health (`/health`), public events (`/events?page=1&limit=5`), and search (`/events/search?q=demo&page=1&limit=5`) returned HTTP 200. (The `/api/v1` variants return HTTP 404 and are not documented as verified).
- **Scope Restriction:** Order and ticket seeding was not implemented in Phase 03.
