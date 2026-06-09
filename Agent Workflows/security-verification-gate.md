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

## 2.1 CI/CD Security Tooling

If CI/CD is available, add automated scanners where practical. Automated scans do not replace manual review, but they should catch common dependency, container, filesystem, secret, and IaC issues.

Recommended baseline:

- Trivy:
  - filesystem scan for source/config/IaC:
    - `trivy fs --scanners vuln,secret,misconfig .`
  - dependency vulnerability scan from lockfiles.
  - container image scan when Docker images are built:
    - `trivy image <image-name>`
- `npm audit` or equivalent Node dependency audit:
  - useful for `Server-2025-Eventing`.
  - treat high/critical runtime dependency findings as blockers unless accepted with reason.
- GitHub CodeQL, if GitHub Actions is used:
  - JavaScript/Node analysis for backend.
  - Kotlin/Java analysis for Android if configured.
- Semgrep:
  - useful for custom rules around auth bypass, SSRF, command injection, unsafe redirects, and insecure crypto.
- Gitleaks or Trivy secret scanner:
  - scan for committed secrets, tokens, private keys, provider credentials, `.env` leaks.
- IaC scanners:
  - Trivy misconfig for Terraform, Docker Compose, Kubernetes, and YAML.
  - Checkov can be added later for deeper Terraform/Kubernetes coverage.
- Android-specific checks:
  - Gradle dependency audit where practical.
  - verify release builds do not embed server-side secrets.
  - verify `google-services.json`, OneSignal app id, and Mapbox public token handling match the accepted risk model.

Suggested CI stages:

```text
1. lint / syntax / compile
2. unit or smoke tests
3. dependency audit
4. Trivy filesystem scan
5. Trivy image scan, if an image is built
6. secret scan
7. IaC misconfiguration scan
8. artifact upload only if all blocking checks pass
```

Blocking policy:

- Block on critical/high vulnerabilities in runtime dependencies unless explicitly accepted.
- Block on detected secrets in tracked source.
- Block on auth/access-control regressions.
- Block on IaC that exposes databases, metrics, admin routes, or storage buckets publicly without an explicit exception.
- Warn, but do not automatically block, on dev-only sandbox credentials if they are intentionally documented as public and not reused in production.

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
- CI/CD tool scan: pass | findings | not configured + reason
- Hardening review: pass | findings
- Attacker mindset: pass | findings
- Defense design: fixed | accepted | deferred | blocker
```
