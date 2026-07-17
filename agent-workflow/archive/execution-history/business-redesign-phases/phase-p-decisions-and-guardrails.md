# Phase P Decisions And Implementation Guardrails

Date: 2026-06-12

## User Decisions

These choices supersede the earlier undecided P1.2 decision brief.

1. Execution priority can be decided by Codex manager when the tradeoff is technical and already covered by this plan.
2. Event lifecycle target model: use the richer lifecycle model, not only the legacy status strings.
   - Target states: `draft`, `submitted`, `approved`, `published`, `rejected`, `cancelled`.
   - Implementation must preserve current mobile-facing behavior during migration.
3. Organizer model: organization/team based.
   - One organization can have owner/manager/staff.
   - A user can belong to more than one organization.
4. Web target: build a full Eventing web product, not only admin.
   - Attendee web.
   - Organizer web.
   - Admin web.
5. Ticket/order/payment target:
   - Add a standard order model: `orders`, `order_items`, `payment_attempts`, ticket issuance.
   - Include seat map/seat selection.
6. Seat selection:
   - Implement a basic seat map for one event type.
7. Money flow:
   - Eventually implement full payout/refund flow.
8. Notification redesign:
   - Start with in-process Observer/domain event pattern.
   - Document outbox table and queue options for the later stable phase.
9. Notification channels:
   - Push, email, and Socket.IO in-app realtime are target channels.
10. Search/Elasticsearch:
   - Move from direct service sync to domain event/outbox, then async indexing after lifecycle is stable.
11. Redis/cache/realtime database:
   - Do later, not in the first P implementation slices.
12. Promotion:
   - Defer until ticket/order/payment is stable because promotion depends on order/payment rules.
13. Membership:
   - Defer until promotion/payment is stable.
14. Review/social:
   - Defer until core ticket/payment is stable.
15. AI spam moderation:
   - Defer to web/admin phase.
16. Auth:
   - Continue self-managed JWT/session/refresh/RBAC.
   - Reference Keycloak concepts but do not integrate Keycloak.
17. API architecture:
   - Add a `/web/*` BFF layer later.
   - Also introduce `/api/v1` and standardize DTOs gradually.
18. Worker strategy:
   - Codex is manager/verifier.
   - OpenCode implements backend.
   - AGY is preferred for Android/Kotlin.
   - If OpenCode and AGY are both unavailable, Codex may use Codex sub-agents.
   - Prefer continuing a previous local worker session to avoid repeatedly re-reading the source tree.

## Immediate Phase Order

### P1.1-C - RBAC Guardrail Cleanup

Reason:

- The RBAC commits are functionally correct but introduced some middleware paths that do not fully follow the shared error/logger conventions.

Scope:

- Refactor new RBAC/authz middleware and smoke code to follow existing shared error/logger conventions where safe.
- Preserve all status codes and response bodies already protected by smoke tests.
- Keep admin and organizer route behavior unchanged.

### P1.2 - Event Lifecycle Foundation

Target:

- Introduce a central event lifecycle model with canonical states:
  - `draft`
  - `submitted`
  - `approved`
  - `published`
  - `rejected`
  - `cancelled`

Compatibility requirement:

- Current mobile contract must not break while migrating.
- Existing API behavior using `pending`, `active`, `rejected`, `cancelled` must be bridged until mobile/web contracts are versioned.
- Public lists/search/nearby must continue exposing only currently visible public events.

Suggested first implementation slice:

- Add lifecycle constants/policies/transition helpers.
- Add legacy status mapping.
- Add smoke tests for existing behavior and canonical mapping.
- Replace duplicated string literals in server services with lifecycle constants.
- Do not migrate DB data yet.

### P1.3 - Organization Staff Foundation

Target:

- Organization owner/manager/staff model using the P1.1 RBAC tables.
- Read-only membership endpoints first.
- Write/invite flows later after auth/email policy is stable.

### P1.4 - Order, Payment, Ticket Issuance Foundation

Target:

- `orders`
- `order_items`
- `payment_attempts`
- ticket issuance after payment success
- transaction-safe inventory handling

### P1.5 - Basic Seat Map

Target:

- One event type with seat map and seat locking.
- Must include concurrency smoke to prevent double booking.

### P1.6 - Notification Observer

Target:

- In-process domain event observer first.
- Push/email/Socket.IO channel abstraction.
- Docs for later outbox/queue design.

### P1.7 - Search Projection Cleanup

Target:

- Move direct Elasticsearch writes out of business services.
- Use domain event/outbox-style projection after lifecycle is stable.

### P1.8 - Web/API Boundary

Target:

- Plan and scaffold `/api/v1`.
- Plan `/web/*` BFF for full Eventing web app.

## Implementation Guardrails

### Shared Error Handling

- New controllers and middleware must use existing shared errors and global error handling when the current route surface allows it.
- Do not introduce new ad-hoc error response patterns unless preserving a legacy response body is required by mobile contract tests.
- If a legacy body must be preserved, add smoke coverage explaining why.

### Shared Logger

- New code must use the shared logger where available.
- Avoid new `console.log` / `console.error` in application code.
- Smoke scripts may use console output.

### DB Query Budget

For every new endpoint or changed hot path, the worker must report expected DB round trips.

Target guidance:

- Public list/search page: keep DB calls minimal and avoid N+1.
- Authenticated profile/current-user: avoid repeated role/profile lookups within the same request.
- Organizer/admin dashboards: aggregate queries are allowed, but must be explicit and indexed.
- If an endpoint needs more than 3 DB round trips, explain why or batch it.

Future enhancement:

- Add optional per-request query counting around the PostgreSQL client for local/dev diagnostics.

### Index Plan

Every migration that adds tables or high-cardinality filters must include index review.

Required for each new table:

- Primary key.
- Foreign-key lookup indexes.
- Status/state filters.
- Owner/user/organization lookup indexes.
- Time/order columns used by list endpoints.

For performance-sensitive queries, add a short `EXPLAIN`/query-plan note in the verification report.

### SQL Safety

Baseline rule:

- Use `pg` parameterized queries with `$1`, `$2`, etc.
- Never interpolate request/body/query values directly into SQL.
- Dynamic column names or sort fields must be selected from a whitelist map.

Current assessment:

- Existing PostgreSQL repositories mostly use parameterized queries.
- Dynamic update builders such as event update use field maps and parameter arrays, which is the right basic pattern.
- This is not a full security proof; each new repository/query must still be reviewed.

Verification requirement:

- Worker reports any dynamic SQL.
- Manager checks for direct interpolation of user-controlled values.
- Security gate remains: OWASP Top 10, hardening review, dependency scan, and attacker mindset.

### Request Contract Guard

After any backend behavior change touching mobile-facing routes, run:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
npm run db:smoke:mobile-contracts
```

### Visualization / Architecture Artifacts

Use these options:

- Code structure:
  - CodeGraph for symbol/file/call dependency lookup.
  - Mermaid diagrams in docs for module and request-flow views.
  - Optional later: generate dependency graphs with Madge or dependency-cruiser if added to tooling.
- Database:
  - DBeaver or pgAdmin for live DB browsing.
  - Mermaid ER diagrams for committed docs.
  - Optional later: SchemaSpy, tbls, or dbdiagram.io DBML export.

The plan should add committed diagrams for:

- Backend module boundaries.
- Event lifecycle transition flow.
- Order/payment/ticket issuance flow.
- Notification observer flow.
- Core PostgreSQL ERD.

## Worker Prompt Requirements

Every worker implementation prompt must include:

- Continue from existing workspace/session if possible.
- Do not reread the whole repo unnecessarily; use CodeGraph first for symbol lookup.
- Do not revert unrelated changes.
- Use shared errors/logger/config helpers.
- Report DB round trips for touched endpoints.
- Report query/index/security implications.
- Run `node --check` on changed JS files.
- Run `git diff --check`.
- Run relevant smoke tests.
- Do not change mobile-facing payloads unless the task explicitly says so.

