# Security Threat Model: Phase P1.11 - Security, Ticket Safety, and Compliance

This threat model outlines the potential security risks, vulnerabilities, threat actors, attack vectors, and mitigations in the Eventing platform, focusing on Ticket Validation, Payment Verification, and Web Compliance.

---

## 1. Threat Scenarios and Attack Paths

### Threat Scenario A: Ticket Validation (QR Code Check-in Bypass)
* **Description**: Attackers forge, capture, or replay QR codes to check in attendees without paying or to reuse one ticket multiple times.
* **Attack Paths**:
  1. **QR Interception**: An attacker sniffs/screenshots a legitimate user's static ticket QR code and uses it before the user arrives.
  2. **Signature Tampering**: An attacker creates a fake JWT with arbitrary payload `{ ticketId, userId, ... }`, signs it with an arbitrary key, and presents it to the scanner.
  3. **QR Lifetime Reuse**: An attendee checks in, screenshots their QR code, and shares it with friends. The friends attempt check-in at another entrance gate.
* **Defenses & Mitigations**:
  * **JWT Signature Verification**: Enforce strong HMAC-SHA256 verification using a server-side secret (`JWT_TICKET_SECRET`).
  * **Dynamic Refresh (Short TTL)**: The server does not return the static database JWT to client apps on retrieve. Instead, `/tickets/:ticketId` dynamically signs a fresh JWT with a 10-minute expiry (`exp` claim) when requested.
  * **Status & Count Lock**: The backend runs ticket validation inside a database transaction, checking that `status = 'paid'` and `checkInCount < quantity` before incrementing.
  * **Backward Compatibility**: If a legacy QR code has no `exp` claim, allow check-in but log a warning, ensuring old tickets/apps do not break.

### Threat Scenario B: Payment Webhook Callback Integrity
* **Description**: Attackers fake successful payment webhooks to acquire tickets without actually completing ZaloPay payment.
* **Attack Paths**:
  1. **Webhook Forgery**: An attacker sends a POST request directly to `/payments/callback` with `status: success` and a fake transaction ID.
  2. **Replay Attack**: An attacker captures a valid callback payload and sends it multiple times to try to cause double ticket allocation or corrupt the commission ledgers.
* **Defenses & Mitigations**:
  * **HMAC Signature Check**: ZaloPay callbacks include a `mac` signature calculated with a private secret (`key2`). The backend strictly validates this signature: `calculatedMac === mac`.
  * **State Machine Guard**: In `handleZaloPayCallback`, check if the payment attempt is already in a terminal state (`succeeded`, `failed`, `cancelled`) and block transition if so.
  * **Transaction-Level Locking**: Lock the database row for the target payment attempt (`SELECT ... FOR UPDATE`) to prevent concurrent race conditions.

### Threat Scenario C: OWASP compliance (SQLi/XSS/SSRF/CSRF)
* **Description**: Attackers inject SQL syntax, cross-site scripts, or forge server requests to hijack session tokens, access other attendees' data, or manipulate inventories.
* **Attack Paths**:
  1. **SQL Injection**: Injecting SQL into search query params (`/events/search?query=...`) or body inputs to bypass access control.
  2. **Cross-Site Scripting (XSS)**: Injecting malicious scripts in event descriptions, names, or venue addresses which are rendered raw on other users' browsers.
  3. **Server-Side Request Forgery (SSRF)**: Specifying malicious URLs in image uploads or webhook configurations to scan internal network ports.
* **Defenses & Mitigations**:
  * **Strict Parameterization**: Use parameterization (`$1`, `$2`) for all PostgreSQL queries.
  * **Input Validation & Sanitization**: Filter and sanitize inputs at request entry using `express-validator`.
  * **Content Security Policy / Helmet**: Apply modern headers to prevent execution of unauthorized scripts in browsers.
  * **Storage Provider Bounds**: Constrain upload handlers and URLs to only resolved cloud storage domains (e.g. S3).

---

## 2. Rate Limiting Strategy
To protect endpoints from abuse, scraping, and brute forcing, we introduce three distinct rate limiters:

| Limiter | Target Routes | Rate / Limit |
|---|---|---|
| **Auth Limiter** | `/auth/register`, `/auth/login`, password resets, verification requests | Max 10 requests per minute per IP |
| **Booking Limiter** | `/tickets/book`, `/tickets/hold-seat`, `/payments/create-order` | Max 30 requests per minute per IP |
| **Webhook Limiter** | `/payments/callback` | Max 500 requests per minute per IP |

---

## 3. Database Audit Logging
Durable audit logs provide traceability in case of security incidents. The `audit_logs` table logs actor actions, resource types, IDs, metadata (IP address, path, response status), and timestamps.

All high-privilege operations must be logged:
* **Admin**: `event:approve`, `event:reject`
* **Organizer**: `organizer:register`, `ticket:check-in`, `attendees:import`, `attendees:export`, `notification:broadcast`
* **Ticketing**: `ticket:book`, `seat:hold`, `seat:release`, `seat:book-held`
* **Payments**: `payment:create-order`, `payment:callback`, `payment:check-status`
