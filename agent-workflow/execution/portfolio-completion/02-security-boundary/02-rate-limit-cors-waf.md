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
- `node server/scripts/smoke/smoke.rate-limit-cors.js` (Verified locally: tests 1-4 for Compose topology audit, CORS preflight/rejection, and HTTP 429 Retry-After)

## 12. Acceptance Criteria
> [!NOTE]
> Server rate limiting, CORS whitelist, and private container topology are 100% locally verified. Cloudflare edge WAF rules (documented in `CLOUDFLARE_WAF_RULES.md`) remain a manual Cloudflare dashboard configuration requiring active zone DNS proxying.
- [x] Exceeding request rate limit on auth endpoints returns HTTP 429 and `Retry-After` header (Verified in `smoke.rate-limit-cors.js` Test 4).
- [x] Cross-origin request from unauthorized origin rejected by CORS (403 preflight, origin not reflected) (Verified in `smoke.rate-limit-cors.js` Test 3).
- [x] Internal containers (`postgres`, `redis`, `elasticsearch`) have zero host port exposure in production compose template (Verified in `smoke.rate-limit-cors.js` Test 1).

## 14. Required Artifacts / Handoff Report
- Rate limiter & CORS smoke test output: `node server/scripts/smoke/smoke.rate-limit-cors.js` (Verified 100% pass).
- Cloudflare WAF configuration doc: `CLOUDFLARE_WAF_RULES.md`.

## 15. Execution Evidence
- Implemented `RedisFallbackStore` in `server/src/shared/middleware/rateLimit.middleware.js` using `cache-provider.js` Redis client with automatic controlled in-memory fallback when Redis is offline.
- Configured exact CORS allowlist in `server/src/app.js` with credentials support, `X-CSRF-Token` and `X-App-Integrity-Token` allowed headers, explicit local dev origins in non-production, and strict rejection for unauthorized origins.
- Audited `server/infra/ansible/roles/app/templates/docker-compose.app.yml.j2` ensuring zero host port exposure for database/cache/search services.

## 16. Blocker Questions
- Should staging environment use lower rate limits to facilitate automated E2E testing?
  - *Resolved:* `AUTH_RATE_LIMIT_MAX` environment variable allows configurable thresholds per environment.
