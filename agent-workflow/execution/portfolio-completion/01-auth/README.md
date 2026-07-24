# Phase 01: Authentication & Identity

## Overview
Phase 01 implements staging-grade authentication covering Google & Facebook OAuth for Web + Mobile, email verification with redirect activation, dual-token session management (short-lived access token + rotating refresh token), Web HttpOnly cookies, Mobile bearer storage, and CSRF protection.

## Deliverables
- Google & Facebook OAuth authentication handlers for Web and Mobile (`auth_identities`).
- Email verification link generation, activation endpoint, and frontend redirect.
- Refresh token rotation & session revocation mechanism.
- Web HttpOnly Secure SameSite cookie strategy + Double Submit Cookie CSRF defense.
- Mobile secure bearer storage integration (KeyStore / EncryptedSharedPreferences).

## Tasks
1. [`01-oauth-google-facebook.md`](01-oauth-google-facebook.md) — Google & Facebook OAuth Integration (`auth_identities`)
2. [`02-email-verification-flow.md`](02-email-verification-flow.md) — Email Verification, Activation & Redirect Flow
3. [`03-session-refresh-csrf.md`](03-session-refresh-csrf.md) — Session Management, Rotating Refresh & CSRF Defense
