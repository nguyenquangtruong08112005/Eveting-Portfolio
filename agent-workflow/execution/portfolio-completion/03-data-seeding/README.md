# Phase 03: Deterministic Realistic Data Seeding

## Status: COMPLETED (Deployed to Staging EC2)

## Overview
Phase 03 delivers a deterministic, portfolio-ready seeding pipeline for Vietnam event management scenarios. It populates realistic venues (Hanoi, HCMC, Da Nang), categories, events, performances, ticket types, seats, promotions, user profiles, reviews, and media items. (Note: Order and ticket seeding was not implemented in Phase 03).

Crucially, this phase establishes the policy that lookup, configuration, and audit tables must not be artificially padded merely to reach arbitrary row targets (e.g. 10 or 20 rows).

## Deliverables
- Seeding script (`server/scripts/seed/seed.platform.postgres.js` / `server/scripts/seed/seed-vietnam-portfolio.js`) providing deterministic, idempotent database seeding.
- Realistic Vietnam event ecosystem data (Hanoi Opera House, HCMC Youth Cultural House, Imperial City Da Nang, Saigon Exhibition Center).
- Media licensing and attribution policy document (`MEDIA_AND_DEMO_POLICY.md`).
- Automated re-indexing of seeded events into Elasticsearch (`server/scripts/maintenance/reindex.elasticsearch.js`).

## Tasks
1. [`01-deterministic-vietnam-seed.md`](01-deterministic-vietnam-seed.md) — Deterministic Vietnam Data Seeding & Relational Scaling (`COMPLETED`)
2. [`02-media-demo-policy.md`](02-media-demo-policy.md) — Media Asset Licensing, Demo Policy & Elasticsearch Indexing (`COMPLETED`)

## Verification & Deployment Evidence
- **Status:** Tasks `03-T1` and `03-T2` are COMPLETED and deployed to staging EC2.
- **Database Seed Verification:** Local and remote seed verification passed with:
  - 22 demo venues
  - 50 future public events
  - 10 each in Music, Theater, Workshop, Sports, and Exhibition categories
  - 1 120-seat map
  - 5 promotions
  - 10 reviews
  - 15 media items
- **Idempotency Verification:** The full deployed seed was run twice and the second run verified unchanged exact demo counts and reindexed 50 events.
- **Elasticsearch Search Indexing:** Remote Elasticsearch successfully reindexed 50 events.
- **Public API Verification:** Public HTTPS health (`/health`), public events (`/events?page=1&limit=5`), and search (`/events/search?q=demo&page=1&limit=5`) endpoints returned HTTP 200. (The `/api/v1` variants return HTTP 404 and are not documented as verified).
- **Scope Note:** Order and ticket seeding was not implemented in Phase 03.
