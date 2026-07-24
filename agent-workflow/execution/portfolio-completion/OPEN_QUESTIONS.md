# Portfolio Completion Program — Open Questions & Blockers (`OPEN_QUESTIONS.md`)

This document tracks unresolved external provider credentials and product blockers required for portfolio completion.

---

## 1. Provider Credentials Verification Status

The following external providers are configured or available in environment setup and require runtime verification during Phase 00 / Phase 05:
- **ZaloPay Sandbox:** Available in environment setup; requires runtime verification against ZaloPay Sandbox endpoints.
- **SMTP / Resend Email:** Available in environment setup; requires runtime verification during Phase 01 email verification flows.
- **Cloudflare Zone & API Access:** Available for edge proxying and DNS; requires runtime verification during Phase 02 / Phase 12.

*Note:* Development bypass / mock modes (`AUTH_SOCIAL_DEV_BYPASS`, `AUTH_MOCK_EMAIL`, `PAYMENT_MOCK_ENABLED`) are permitted strictly in **local and test environments**. Staging and production environments MUST execute live verification and integrations.

---

## 2. Active Blocker Questions

| ID | Domain | True Blocker Question | Action Required | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Q01** | **Google OAuth** | What are the exact Google OAuth Client IDs and authorized redirect URIs configured for Web and Android apps? | Supply Client IDs & URIs | Phase 01 Task `01-T1` |
| **Q02** | **Facebook OAuth** | Does the Facebook Developer App still exist, and what are its active App ID, App Secret, and OAuth redirect URIs? | Confirm App Status & Credentials | Phase 01 Task `01-T1` |
| **Q03** | **Play Integrity** | Has Google Play Integrity API enrollment been completed for Android apps, and is a Service Account JSON key available for backend attestation verification? | Supply Service Account JSON Key | Phase 02 Task `02-T3` |
