# Task 03-T2: Media Asset Licensing, Demo Policy & Elasticsearch Indexing

## 1. Goal
Establish media asset licensing and attribution rules, define demo account policies, and trigger automated sync of seeded portfolio data into Elasticsearch search indices.

## 2. Why
Ensures intellectual property compliance for image/video assets used in portfolio demos, and guarantees immediate searchability of newly seeded events.

## 3. Dependencies
- Task `03-T1` (Deterministic Vietnam Data Seeding).

## 4. Preconditions
- Elasticsearch cluster accessible or dev mock enabled (`ELASTICSEARCH_NODE`).

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Creating `MEDIA_AND_DEMO_POLICY.md` detailing image sourcing guidelines (Unsplash / Pexels royalty-free license with explicit credit metadata).
  - Configuring demo accounts policy (read-only restrictions for generic public demo viewers where appropriate, reset interval guidelines).
  - Bulk indexing script (`node server/scripts/search/reindex-events.js`) triggering Elasticsearch sync for all seeded events.
- **Out-of-Scope:**
  - Self-hosting a CDN video streaming cluster.

## 6. Likely Source Modules / Files
- `server/scripts/search/reindex-events.js` — [Discovery Target: Elasticsearch bulk re-indexer]
- `server/src/providers/search/` — [Discovery Target: Elasticsearch client service]
- `web/public/images/demo/` — [Discovery Target: Public demo static image assets]

## 7. Contracts / Behavior to Preserve
- Elasticsearch document mapping format for `events` index (`event_id`, `title`, `description`, `category_id`, `venue_city`, `start_time`, `price_min`, `status`).

## 8. Ordered Implementation Steps
1. Create `MEDIA_AND_DEMO_POLICY.md` in repository documentation.
2. Select high-resolution royalty-free image URLs for event banners and venue thumbnails, adding license attribution notes to seed files.
3. Update `reindex-events.js` to clear existing index, apply analyzer mappings, and bulk index all `PUBLISHED` events.
4. Execute re-indexing script immediately following `seed-vietnam-portfolio.js`.
5. Verify search query execution against Elasticsearch REST API.

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- Ensure no proprietary or copyrighted images without permission.
- Demo accounts must not permit password changes or administrative escalation by anonymous public users.

## 11. Test / Build / Smoke Commands
- `node server/scripts/search/reindex-events.js`
- `curl http://localhost:9200/events/_search?q=Hanoi`

## 12. Acceptance Criteria
- [ ] `MEDIA_AND_DEMO_POLICY.md` documented and verified.
- [ ] 100% of seeded published events indexed in Elasticsearch.
- [ ] Search query for "Hà Nội" or "Âm nhạc" returns matching seed events in < 50ms.

## 13. Rollback / Feature-Flag Strategy
- Fallback to PostgreSQL `ILIKE` / Full-Text Search if Elasticsearch node is offline (`SEARCH_PROVIDER=postgres`).

## 14. Required Artifacts / Handoff Report
- Elasticsearch cluster mapping dump and seed search verification log.

## 15. Blocker Questions
- Should search results display draft or unmoderated events to logged-in organizers?
