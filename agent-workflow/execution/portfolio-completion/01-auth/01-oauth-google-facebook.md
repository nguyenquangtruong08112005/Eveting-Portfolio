# Task 01-T1: Google & Facebook OAuth Integration (`auth_identities`)

## 1. Goal
Implement backend social authentication handlers supporting proposed route aliases (`/api/web/auth/google`, `/api/web/auth/facebook`) and mobile routes using a normalized `auth_identities` table, account-linking rules, and account takeover prevention.

## 2. Why
Provides social login for Vietnamese users on Web and Mobile platforms while maintaining normalized relational identity storage and preventing unauthorized account takeover.

## 3. Dependencies
- Phase 00 (Baseline & Contract Freeze).

## 4. Preconditions
- Provider credentials placeholders configured in environment variables (`GOOGLE_ALLOWED_CLIENT_IDS`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`).
- `AUTH_SOCIAL_DEV_BYPASS=true` support for **local/test offline development only** (never in staging).

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Discovery Target routes: `/api/web/auth/google`, `/api/web/auth/facebook` (web) and `/api/mobile/auth/google`, `/api/mobile/auth/facebook` (mobile) — [Proposed / Discovery Targets]. Current routes (e.g. `/google-login`) inventoried in Phase 00.
  - Verifying Google ID Token via Google API client and Facebook Access Token via Graph API `/debug_token`.
  - Storing social identities in a normalized `auth_identities` table (`id`, `user_id`, `provider`, `provider_subject`, `provider_email`, `created_at`).
  - **Account-linking & Takeover Rules:**
    - If a social provider returns an email matching an existing verified user account AND `email_verified: true` from the provider, link `auth_identity` to existing `user_id`.
    - If an unverified user registers with an email matching an existing social identity, enforce email verification before linking.
    - Reject unverified social emails attempting to attach to existing password accounts without verification.
- **Out-of-Scope:**
  - Native iOS/Android SDK UI implementation (handled in Phase 10).

## 6. Likely Source Modules / Files
- `server/src/providers/auth/` — [Discovery Target: Social OAuth token verification service]
- `server/src/modules/auth/` — [Discovery Target: Auth controllers & route handlers]
- `web/src/features/auth/` — [Discovery Target: Web social login components]

## 7. Contracts / Behavior to Preserve
- Standard User DTO envelope returned by backend.

## 8. Ordered Implementation Steps
1. Create PostgreSQL migration for `auth_identities` table (`id`, `user_id`, `provider`, `provider_subject`, `provider_email`, `created_at`).
2. Build `GoogleOAuthProvider` and `FacebookOAuthProvider` under `server/src/providers/auth/`.
3. Implement `AuthIdentityService.findOrCreateSocialUser()` implementing account-linking and takeover rules.
4. Mount web handlers on proposed routes `/api/web/auth/google` and `/api/web/auth/facebook` while maintaining legacy route aliases.
5. Write unit tests for social authentication handlers, identity linking, and dev bypass logic.

## 9. Database / Migration Needs
- PostgreSQL migration for `auth_identities` table with unique index on `(provider, provider_subject)`.

## 10. Security Requirements
- Cryptographically verify token signatures directly with Google/Facebook API endpoints.
- Reject unverified provider emails attempting to claim existing accounts.
- Dev bypass mode (`AUTH_SOCIAL_DEV_BYPASS=true`) restricted to local/test environments only.

## 11. Test / Build / Smoke Commands
- Syntax and Provider Loader Verification: `npm run db:smoke:lazy-providers` and `node scripts/ci/check-js-syntax.js` (Verified locally).
- Manual Provider Token Exchange: Live Google/Facebook provider exchange requires real provider tokens/credentials (`GOOGLE_ALLOWED_CLIENT_IDS`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`).

## 12. Acceptance Criteria
> [!NOTE]
> Implementation is complete (`server/src/providers/auth/google.auth.provider.js`, `facebook.auth.provider.js`, `server/src/providers/database/postgres.auth.repository.js`, `server/db/migrations/061_create_auth_identities_and_email_verifications.sql`). Live Google/Facebook provider exchange remains a manual runtime validation requiring real external provider tokens and configuration.
- [x] Backend database schema (`auth_identities`), repositories, and OAuth service endpoints implemented.
- [ ] Valid Google ID Token exchanges for authenticated session via `auth_identities` table (Requires manual runtime validation with real Google credentials/tokens).
- [ ] Social email matching existing verified account links identity safely (Requires manual runtime validation with real provider accounts).
- [ ] Invalid/tampered social tokens rejected with HTTP 401 (Requires manual runtime validation with real provider tokens).

## 13. Rollback / Feature-Flag Strategy
- Disable social login routes via `AUTH_SOCIAL_ENABLED=false` feature flag.

## 14. Required Artifacts / Handoff Report
- Verification test logs (`npm run db:smoke:lazy-providers`) and `061_create_auth_identities_and_email_verifications.sql` migration.

## 15. Blocker Questions
- See `OPEN_QUESTIONS.md` Q01 & Q02 regarding Google Client IDs and Facebook App credentials (requires live provider app registration).
