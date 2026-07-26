# Mobile Attestation & App Integrity Architecture Specification

Refer to the authoritative specification document:
[03-mobile-attestation-design.md](file:///D:/01_university/year3/semester-5/mobile/final/agent-workflow/execution/portfolio-completion/02-security-boundary/03-mobile-attestation-design.md)

## Summary of Mobile Attestation Interface & Behavior

### 1. Nonce Endpoint
- **GET `/auth/mobile/nonce`** (and `/api/mobile/auth/nonce`)
- Generates 32-byte hex nonce with 5-minute (300s) TTL in Redis/Cache. Single-use.

### 2. Attestation Endpoint
- **POST `/auth/mobile/attest`** (and `/api/mobile/auth/attest`)
- Consumes nonce atomically.
- Evaluates token in mock mode (`MOBILE_ATTESTATION_MOCK=true`) or production mode (`MOBILE_ATTESTATION_ENFORCE=true`).

### 3. Verification Provider
- Implemented in `server/src/providers/mobile/playIntegrity.provider.js`.
