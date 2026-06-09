# Security Verification Gate

Use this after every implementation slice before accepting worker output, especially before commits that touch backend routes, auth, persistence, file upload, payments, notifications, infrastructure, or mobile-facing contracts.

This gate does not replace functional tests. It is an additional manager/verifier checklist.

## 1. Functional Check

- Confirm the changed flow still works at the route/use-case level.
- Confirm existing mobile-facing response shapes are unchanged unless explicitly approved.
- Run the narrowest relevant smoke/build/test commands.
- Confirm no unrelated repo/file changes were introduced.

## 2. OWASP Top 10 Scan

Review the diff and touched runtime paths for:

- Authentication bypass.
- Broken access control.
- Injection:
  - SQL injection.
  - NoSQL injection.
  - Command injection.
- XSS.
- CSRF.
- SSRF.
- Security misconfiguration.
- Sensitive data exposure.
- Dependency vulnerabilities.

Minimum expectations:

- Auth-required routes still require auth.
- Role-required routes still enforce role checks.
- User-owned resources still verify ownership.
- SQL queries use parameterized inputs.
- No user input reaches shell commands.
- URL fetches, redirects, uploads, and webhooks are constrained.
- Error responses do not expose secrets, stack traces, tokens, provider keys, or database URLs.
- New dependencies are justified and checked before commit.

## 3. Hardening Review

Review:

- Input validation:
  - request body, query, params, file uploads, webhook payloads.
- Output encoding:
  - do not render untrusted HTML unless sanitized.
  - API strings should not become unsafe web HTML later.
- Rate limiting:
  - auth, search, public APIs, upload, payment, webhook, and admin endpoints.
- Secret management:
  - no secrets in source, APK, logs, screenshots, committed docs, or generated artifacts.
- Encryption:
  - password hashing, refresh-token hashing, TLS assumptions, secure provider credentials.
- Logging and audit trail:
  - enough audit logs for auth/admin/payment/security-sensitive actions.
  - no sensitive values in logs.
- Least privilege:
  - route roles, database/provider credentials, storage bucket permissions.
- Network segmentation:
  - local/dev Docker ports, public ngrok exposure, provider webhook endpoints, admin/metrics exposure.

## 4. Attacker Mindset

Ask:

- What can an unauthenticated attacker do?
- What can a normal attendee do to another attendee, organizer, admin, event, ticket, or payment?
- What can an organizer do to another organizer's event, attendee list, promotion, media, or analytics?
- Can stale tokens, replayed QR codes, replayed webhooks, duplicate requests, or repeated uploads cause damage?
- Can malformed payloads crash handlers or bypass validation?
- Can a public URL or uploaded file expose private data?
- Can logs reveal tokens, payment identifiers, secrets, or personal data?

## 5. Defense Design

For any risk found, record one of:

- Fixed in the slice.
- Accepted temporarily with reason.
- Deferred as a named follow-up task.
- Blocker: do not commit/merge until resolved.

Preferred defenses:

- Centralized auth/role/ownership middleware.
- Request validators close to route boundaries.
- Repository parameterization for database access.
- Idempotency keys or transaction guards for payment/ticket/event write paths.
- Upload MIME/size/key validation plus storage provider boundary.
- Webhook signature verification.
- Structured error handling without sensitive details.
- Contract smokes for mobile-facing payloads.
- Audit logs for admin, auth, payment, check-in, and destructive actions.

## Required Report Format

Every manager verification note after implementation must include:

```text
Security Verification Gate:
- Functional check: pass | fail | not run + reason
- OWASP Top 10 scan: pass | findings
- Hardening review: pass | findings
- Attacker mindset: pass | findings
- Defense design: fixed | accepted | deferred | blocker
```
