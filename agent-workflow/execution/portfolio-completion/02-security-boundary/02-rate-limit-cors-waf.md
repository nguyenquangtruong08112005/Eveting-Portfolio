# Task 02-T2: Rate Limiting, CORS & Cloudflare WAF Hardening

## 1. Goal
Implement distributed rate limiting via Redis, configure strict CORS origins, ensure private Docker container networking, and document Cloudflare WAF protection rules.

## 2. Why
Defends against Denial of Service (DoS), brute force credential attacks, unauthorized cross-origin requests, and automated scraping.

## 3. Dependencies
- Task `02-T1` (Public API Security Boundary & RBAC).

## 4. Preconditions
- Redis instance running and accessible via `REDIS_URL`.
- Public domain routes defined (`https://eventing.moteo.fun` and `https://eventing-api.moteo.fun`).

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Redis sliding-window rate limiter middleware with distinct limits:
    - Global API: 100 req/min per IP.
    - Auth routes (`/auth/login`, `/auth/register`): 10 req/min per IP.
    - High-value routes (`/checkout/process`, `/events/:id/seats/hold`): 20 req/min per User ID / IP.
  - Express CORS middleware restricted strictly to `process.env.ALLOWED_ORIGINS` (`https://eventing.moteo.fun`).
  - Container security: ensure `postgres`, `redis`, `elasticsearch` bind to internal Docker bridge network (`127.0.0.1` / private overlay), only exposing ports 80/443 on host.
  - Cloudflare WAF rule specifications (Browser Integrity Check, Rate Limiting, Bot Fight Mode).
- **Out-of-Scope:**
  - Applying paid Cloudflare Enterprise features.

## 6. Likely Source Modules / Files
- `server/src/middleware/rateLimiter.js` — [Discovery Target: Rate limiting middleware]
- `server/src/app.js` — [Discovery Target: CORS configuration]
- `docker-compose.app.yml` — [Discovery Target: Docker networking rules]

## 7. Contracts / Behavior to Preserve
- Returning HTTP 429 Too Many Requests with `Retry-After` header when rate limit exceeded.

## 8. Ordered Implementation Steps
1. Implement `createRateLimiter(windowMs, maxRequests, keyPrefix)` using Redis atomic scripts.
2. Apply strict rate limits to auth, checkout, and search routes in Express app.
3. Configure `cors({ origin: [process.env.CORS_ALLOWED_ORIGINS], credentials: true })`.
4. Audit `docker-compose.app.yml` to remove external port mappings for `db`, `redis`, and `elasticsearch`.
5. Create `CLOUDFLARE_WAF_RULES.md` documenting edge security policies.

## 9. Database / Migration Needs
- Redis keyspace prefix design: `ratelimit:<prefix>:<ip_or_user>`.

## 10. Security Requirements
- IP detection behind reverse proxy (use `req.ip` with `app.set('trust proxy', 1)`).
- Zero database or search container ports exposed to public internet interface (`0.0.0.0`).

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `node server/scripts/smoke/smoke.rate-limiter.js`

## 12. Acceptance Criteria
- [ ] Exceeding 10 requests/min on `/auth/login` returns HTTP 429.
- [ ] Cross-origin request from unauthorized origin rejected by CORS.
- [ ] Internal containers (`db`, `redis`) inaccessible from host external IP.

## 13. Rollback / Feature-Flag Strategy
- Rate limiting fallback to in-memory store if Redis drops connection.

## 14. Required Artifacts / Handoff Report
- Rate limiter smoke test output and Cloudflare WAF configuration doc.

## 15. Blocker Questions
- Should staging environment use lower rate limits to facilitate automated E2E testing?
