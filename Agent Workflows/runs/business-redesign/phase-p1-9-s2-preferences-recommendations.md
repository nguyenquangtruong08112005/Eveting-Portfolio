# Run Log: Phase P1.9-S2 - Preferences & Recommendations Relational Fallback

## 1. Overview
Implemented PostgreSQL relational fallback queries matching user interests against event categories and tags in the event recommendations engine. This serves as a fallback mechanism when Elasticsearch is unconfigured or experiences query failures.

## 2. Implemented Changes

### Database Layer
- Implemented `getRecommendedEventsRelational(interests, excludeEventIds, limit)` inside [postgres.event.repository.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/providers/database/postgres.event.repository.js):
  - Overlap queries categories and tags against user interests using array intersection (`&&`).
  - Correctly excludes events in `excludeEventIds` using `NOT (id = ANY($idx))`.
  - Filters for active, public, and upcoming events.
  - Returns recommended events sorted by `hot_score` descending and `date` ascending.
  - Automatically exported by the proxy.

### Service Layer
- Modified `getRecommendations` inside [service.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/modules/events/application/service.js):
  - Injected mapping utility to structure fallback relational results matching the service contracts.
  - Routed direct fallback to `eventRepository.getRecommendedEventsRelational` when `esClient` is not configured or throws errors.

---

## 3. Verification

### Relational Fallback Smoke Test
Created and executed the comprehensive test script [smoke.recommendations-fallback.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/scripts/smoke.recommendations-fallback.js):
- **Scenario 1**: User with interests gets matching upcoming events (by category or tags matching interests list).
- **Scenario 2**: Excluded events (present in user history array) are successfully excluded from recommendations.
- **Scenario 3**: User with no interests receives general upcoming events.
- **Scenario 4**: Endpoint fallback works seamlessly when the application server runs without Elasticsearch.

#### Test Execution Command:
```cmd
node scripts/smoke.recommendations-fallback.js
```

#### Output:
```text
smoke.recommendations-fallback.js
─────────────────────────────────

  [Setup Test DB Data]

  [Testing Repository Level Relational Query]
  recs1Ids (User 1): [
  'evt_rec_a_1599f5c9-aac2-4360-b47e-ae0063e89e8e',
  'evt_rec_c_cf10c985-0086-4eb7-afdc-c275b71797cb'
]
  ✓ User 1 query returns Event A
  ✓ User 1 query returns Event C
  ✓ User 1 query does NOT return Event B (no interest overlap)
  ✓ User 1 query does NOT return Event D (past event)
  ✓ User 1 query does NOT return Event E (private event)
  ✓ User 1 query does NOT return Event F (pending event)
  recs2Ids (User 2): [ 'evt_rec_a_1599f5c9-aac2-4360-b47e-ae0063e89e8e' ]
  ✓ User 2 query returns Event A
  ✓ User 2 query does NOT return Event C (history excluded)
  recs3Ids (User 3): [
  'evt_rec_a_1599f5c9-aac2-4360-b47e-ae0063e89e8e',
  'evt_rapviet_allstar_2025',
  ...
]
  ✓ User 3 query returns Event A
  ✓ User 3 query returns Event B
  ✓ User 3 query returns Event C
  ✓ User 3 query results sorted by hot score DESC

  [Spawning Application Server (No ES)]
  Server is responsive at: http://localhost:39889

  [Testing HTTP Recommendations Endpoint Fallback]
  ✓ HTTP recommendations call success for User 1
  HTTP User 1 recs: [
  'evt_rec_a_1599f5c9-aac2-4360-b47e-ae0063e89e8e',
  'evt_rec_c_cf10c985-0086-4eb7-afdc-c275b71797cb'
]
  ✓ HTTP User 1 returns Event A
  ✓ HTTP User 1 returns Event C
  ✓ HTTP User 1 does NOT return Event B
  ✓ HTTP recommendations call success for User 2
  HTTP User 2 recs: [ 'evt_rec_a_1599f5c9-aac2-4360-b47e-ae0063e89e8e' ]
  ✓ HTTP User 2 returns Event A
  ✓ HTTP User 2 does NOT return Event C (history excluded)
  ✓ HTTP recommendations call success for User 3
  HTTP User 3 recs: [
  'evt_rec_a_1599f5c9-aac2-4360-b47e-ae0063e89e8e',
  ...
]
  ✓ HTTP User 3 returns Event A
  ✓ HTTP User 3 returns Event B
  ✓ HTTP User 3 returns Event C

  [Tear Down Server & Clean DB]

  Total: 23 passed, 0 failed
```

---

## 4. Verification Controls

### Mobile Contracts Check
```cmd
npm run db:smoke:mobile-contracts
```
**Result**: `17 passed, 0 failed, 0 skipped`. The mobile facing contracts remain unbroken.

---

### CI Checks Suite
```cmd
npm run ci:check
```
**Result**: All tests passed. The check suite is green.
