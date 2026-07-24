# Task 01-T2: Email Verification, Activation & Redirect Flow

## 1. Goal
Implement signed token email verification links, backend activation handler (`/api/web/auth/verify-email`), transactional email sending, and web client redirect UX through `APP_PUBLIC_WEB_URL`.

## 2. Why
Ensures user email authenticity before enabling high-risk operations while protecting verification tokens against disclosure and unauthorized account usage.

## 3. Dependencies
- Task `01-T1` (Google & Facebook OAuth Integration).

## 4. Preconditions
- Email provider configured in environment variables (`SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`, `APP_PUBLIC_WEB_URL`).

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Registration creates a `pending` / `unverified` user account.
  - **No authenticated session or JWT cookie is issued prior to email verification.**
  - Single-use random verification tokens stored ONLY as SHA-256 hashes (`sha256(token)`) in database with 24h TTL.
  - Resending verification email endpoint (`POST /api/web/auth/resend-verification`).
  - Account activation route (`GET /api/web/auth/verify-email?token=...`).
  - Redirecting through `APP_PUBLIC_WEB_URL` to `/verify-email` then `/login`.
  - Policy enforcement: Unverified accounts are blocked from high-risk actions (ticket purchases, event publishing, payment payouts).
  - Secret safety: `AUTH_MOCK_EMAIL=true` exposes raw token ONLY in local/test console logs; raw verification tokens are **never** printed in staging or production logs.
- **Out-of-Scope:**
  - SMS/OTP verification.

## 6. Likely Source Modules / Files
- `server/src/providers/email/` — [Discovery Target: Email sending service]
- `server/src/modules/auth/` — [Discovery Target: Email verification controllers]
- `web/src/app/verify-email/page.tsx` — [Discovery Target: Web email activation page]

## 7. Contracts / Behavior to Preserve
- Preserving `email_verified` boolean attribute in User DTO.

## 8. Ordered Implementation Steps
1. Create `email_verifications` table storing `token_hash`, `user_id`, and `expires_at`.
2. Implement crypto-random token generation in `AuthService.createVerificationToken()`, saving `sha256(token)` to database.
3. Configure email client to dispatch HTML email containing activation link (`${APP_PUBLIC_WEB_URL}/verify-email?token=${rawToken}`).
4. Implement `GET /api/web/auth/verify-email` endpoint validating token hash, marking `email_verified = true`, and redirecting to `${APP_PUBLIC_WEB_URL}/verify-email?status=success`.
5. Add unit and integration tests for resend and activation flows.

## 9. Database / Migration Needs
- PostgreSQL migration creating `email_verifications` table and index on `token_hash`.

## 10. Security Requirements
- Store hashed tokens (`sha256(token)`), never plain tokens.
- Never log raw tokens in staging/production environment logs.
- Rate-limit resend verification email endpoint to max 3 requests per 15 minutes per IP.

## 11. Test / Build / Smoke Commands
- Test commands will be selected from `server/package.json` inventoried in Phase 00.

## 12. Acceptance Criteria
- [ ] Registration creates unverified account with zero authenticated session issued.
- [ ] Verification link successfully activates account and redirects through `APP_PUBLIC_WEB_URL`.
- [ ] Hashed token validation prevents token replay attacks.
- [ ] Raw tokens absent from staging/production logs.

## 13. Rollback / Feature-Flag Strategy
- Enable `AUTH_MOCK_EMAIL=true` for local development testing.

## 14. Required Artifacts / Handoff Report
- Verification flow test report and email activation log.

## 15. Blocker Questions
- Should unverified users be allowed to browse events and select seats prior to checkout?
