# Task 01-T3: Session Management, Rotating Refresh & CSRF Defense

## 1. Goal
Implement dual cookie session management for Web (short-lived access token + rotating refresh token in host-only HttpOnly Secure SameSite cookies), Mobile bearer token storage, secret name preservation (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`), and signed CSRF defense.

## 2. Why
Enforces strict token isolation against XSS token theft while requiring explicit CSRF defenses for cookie-authenticated state mutations.

## 3. Dependencies
- Task `01-T2` (Email Verification, Activation & Redirect Flow).

## 4. Preconditions
- JWT signing secrets configured in `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **Web Client Transport (`/api/web/auth/*`):** BOTH short-lived access token (15m) and rotating refresh token (7d) are delivered in host-only HttpOnly, Secure, SameSite=Lax/Strict cookies.
  - **Token Isolation:** NO authentication tokens stored in `localStorage`, `sessionStorage`, or returned in web JSON response bodies.
  - **Mobile Client Transport (`/api/mobile/auth/*`):** Returns tokens in JSON response body for Android secure storage (`EncryptedSharedPreferences` / KeyStore) and `Authorization: Bearer <token>` transport.
  - Transport boundary selection relies on explicit web vs mobile route paths (`/api/web/auth/*` vs `/api/mobile/auth/*`) or content negotiation established in Phase 00, **not** on untrusted client headers.
  - Preserving secret names: `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.
  - **CSRF Defense:** Explicitly stating that HttpOnly cookies mitigate JS XSS token theft but do NOT prevent CSRF. Requiring signed double-submit or synchronizer CSRF token header (`X-CSRF-Token`), `Origin` / `Fetch-Metadata` header validation, `credentials: 'include'` on client requests, and exact credentialed CORS origin (`https://eventing.moteo.fun`).
- **Out-of-Scope:**
  - Biometric mobile authentication.

## 6. Likely Source Modules / Files
- `server/src/middleware/auth.js` — [Discovery Target: Auth middleware & JWT verification]
- `server/src/middleware/csrf.js` — [Discovery Target: Double submit cookie CSRF middleware]
- `web/src/services/apiClient.ts` — [Discovery Target: Web API client with credentials & CSRF token header]

## 7. Contracts / Behavior to Preserve
- Preserving `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` environment variable names.

## 8. Ordered Implementation Steps
1. Configure cookie options (`HttpOnly; Secure; SameSite=Lax; Path=/`).
2. Implement refresh token family tracking in database `user_sessions` table to detect and block token reuse attempts.
3. Build CSRF middleware validating `X-CSRF-Token` header against `csrfToken` cookie for state-modifying web requests (`POST`, `PUT`, `PATCH`, `DELETE`).
4. Update Web `apiClient.ts` to set `credentials: 'include'` and send `X-CSRF-Token` header.
5. Add unit and integration tests covering refresh rotation, cookie security flags, and CSRF rejection.

## 9. Database / Migration Needs
- PostgreSQL migration creating `user_sessions` table storing hashed refresh tokens, user ID, client IP, user agent, and revocation status.

## 10. Security Requirements
- Both web tokens in HttpOnly, Secure, SameSite cookies.
- Mandatory `X-CSRF-Token` header validation on cookie-authenticated mutations.

## 11. Test / Build / Smoke Commands
- `node server/scripts/smoke/smoke.csrf-session.js` (Verified locally: Steps 1-7 testing cookie flags, zero JSON body tokens, CSRF protection 403, mobile bearer tokens, rotating refresh token, and token reuse detection)

## 12. Acceptance Criteria
- [x] Both access and refresh tokens set as HttpOnly Secure cookies on Web login (Verified in `smoke.csrf-session.js` Step 2).
- [x] Web JSON response body contains zero auth tokens (Verified in `smoke.csrf-session.js` Step 2 & 5).
- [x] Cookie-authenticated `POST` request without valid `X-CSRF-Token` header rejected with HTTP 403 Forbidden (Verified in `smoke.csrf-session.js` Step 3).
- [x] Mobile clients using `/api/mobile/auth/*` receive bearer tokens for Android secure storage (Verified in `smoke.csrf-session.js` Step 4).

## 13. Rollback / Feature-Flag Strategy
- Fallback to non-secure cookies in local HTTP dev environments via `COOKIE_SECURE=false`.

## 14. Required Artifacts / Handoff Report
- Security session test report and CSRF test execution log (`node server/scripts/smoke/smoke.csrf-session.js`).

## 15. Blocker Questions
- Should cross-subdomain cookie sharing (`.moteo.fun`) be enabled for future microservice split?
  - *Resolved:* Current cookie path is `/` with Lax sameSite; cross-subdomain configuration can be toggled via `COOKIE_DOMAIN` env var if required.
