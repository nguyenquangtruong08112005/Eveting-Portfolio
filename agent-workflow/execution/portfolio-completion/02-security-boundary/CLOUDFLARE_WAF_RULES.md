# Cloudflare WAF, Bot Fight & Edge Rate Limiting Rules Specification

## 1. Overview
This document specifies the exact Cloudflare edge security rules for the production domains:
- **Web Domain:** `https://eventing.moteo.fun`
- **API Domain:** `https://eventing-api.moteo.fun`

> [!NOTE]
> These edge security policies are designed for manual execution via the **Cloudflare Dashboard** (or Cloudflare API / Terraform `cloudflare_ruleset` resources where applicable).

---

## 2. Recommended Cloudflare Edge Configuration

### A. SSL/TLS Settings
- **Encryption Mode:** **Full (strict)**
  - Ensures encrypted traffic between Cloudflare edge and origin Caddy reverse proxy.
  - Prevents redirect loop vulnerabilities caused by Flexible mode.
- **Minimum TLS Version:** `TLS 1.2`
- **Always Use HTTPS:** `Enabled`
- **HTTP Strict Transport Security (HSTS):** `Enabled` (`max-age=31536000; includeSubDomains; preload`)

---

### B. Cloudflare WAF Security Rules (Custom Firewall Rules)

#### Rule 1: Block High Threat Score Requests
- **Rule Name:** `Block High Threat Score / Malicious IPs`
- **Expression:** `(cf.threat_score gt 30)`
- **Action:** `Block` (or `Managed Challenge`)

#### Rule 2: Protect Authentication & Administrative Endpoints
- **Rule Name:** `Challenge Auth & Admin Abuse`
- **Expression:** `(http.request.uri.path contains "/auth/" or http.request.uri.path contains "/admin/") and cf.threat_score gt 10`
- **Action:** `Managed Challenge`

#### Rule 3: Restrict CORS & Block Direct Proxy Spoofing
- **Rule Name:** `Filter Unauthorized Cross-Origin Preflights`
- **Expression:** `http.request.method eq "OPTIONS" and not (http.request.headers["origin"][0] in {"https://eventing.moteo.fun" "https://eventing-api.moteo.fun"})`
- **Action:** `Block`

---

### C. Edge Rate Limiting Rules (Cloudflare Dashboard Rate Limiting)

| Rule Name | Endpoint Match | Threshold | Period | Action | Mitigation Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Global API Rate Limit** | `http.host eq "eventing-api.moteo.fun" and http.request.uri.path starts_with "/"` | 100 requests | 1 minute | Block / 429 | Custom JSON: `{"error":"RATE_LIMIT_EXCEEDED"}` |
| **Auth Abuse Rate Limit** | `http.request.uri.path in {"/auth/login" "/auth/register" "/api/auth/login" "/api/auth/register"}` | 10 requests | 1 minute | Block / 429 | Custom JSON: `{"error":"AUTH_RATE_LIMIT_EXCEEDED"}` |
| **Seat Hold / Booking Rate Limit** | `http.request.uri.path in {"/tickets/book" "/tickets/hold-seat" "/tickets/book-held-seats"}` | 20 requests | 1 minute | Challenge / Block | Custom JSON: `{"error":"BOOKING_RATE_LIMIT_EXCEEDED"}` |

---

### D. Bot Management & Browser Integrity
- **Bot Fight Mode:** `Enabled`
- **Browser Integrity Check:** `Enabled`
- **JavaScript Challenge for Suspicious Scraping:** Enabled on `/events/search` and public scraping targets if threat score > 15.

---

## 3. Manual Setup Runbook for Operators

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Select Zone: `moteo.fun`.
3. **SSL/TLS Setup:** Navigate to **SSL/TLS** $\rightarrow$ **Overview** $\rightarrow$ Select **Full (strict)**.
4. **WAF Custom Rules:** Navigate to **Security** $\rightarrow$ **WAF** $\rightarrow$ **Custom Rules** $\rightarrow$ Click **Create Rule**.
   - Enter Rule Name and Expression as detailed in Section 2B above.
5. **Rate Limiting Rules:** Navigate to **Security** $\rightarrow$ **WAF** $\rightarrow$ **Rate limiting rules** $\rightarrow$ Click **Create Rule**.
   - Configure thresholds and 1-minute window per Section 2C.
6. **Bot Fight Mode:** Navigate to **Security** $\rightarrow$ **Bots** $\rightarrow$ Toggle **Bot Fight Mode** to `On`.

---

## 4. Verification
Run edge rate limit verification:
```bash
node server/scripts/smoke/smoke.rate-limit-cors.js
```
