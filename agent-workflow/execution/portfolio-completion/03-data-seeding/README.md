# Phase 03: Deterministic Realistic Data Seeding

## Overview
Phase 03 delivers a deterministic, portfolio-ready seeding pipeline for Vietnam event management scenarios. It populates realistic venues (Hanoi, HCMC, Da Nang), categories, events, performances, ticket types, seats, orders, tickets, promotions, user profiles, and reviews. 

Crucially, this phase establishes the policy that lookup, configuration, and audit tables must not be artificially padded merely to reach arbitrary row targets (e.g. 10 or 20 rows).

## Deliverables
- Seeding script `server/scripts/seed/seed-vietnam-portfolio.js` [Proposed / Discovery Target] providing deterministic, idempotent database seeding.
- Realistic Vietnam event ecosystem data (Hanoi Opera House, HCMC Youth Cultural House, Imperial City Da Nang, Saigon Exhibition Center).
- Media licensing and attribution policy document (`MEDIA_AND_DEMO_POLICY.md` [Proposed Artifact]).
- Automated re-indexing of seeded events into Elasticsearch.

## Tasks
1. [`01-deterministic-vietnam-seed.md`](01-deterministic-vietnam-seed.md) — Deterministic Vietnam Data Seeding & Relational Scaling
2. [`02-media-demo-policy.md`](02-media-demo-policy.md) — Media Asset Licensing, Demo Policy & Elasticsearch Indexing
