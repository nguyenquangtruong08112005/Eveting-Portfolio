# Task 02-T3: Mobile Attestation & App Integrity Design

## 1. Goal
Design and document the Google Play Integrity API verification architecture for the Android Attendee and Organizer mobile applications.

## 2. Why
Ensures backend API requests originate from legitimate, un-tampered Android app binaries installed via official distribution channels, preventing API abuse by unauthorized automated scripts or modified APKs.

## 3. Dependencies
- Task `02-T2` (Rate Limiting, CORS & WAF).

## 4. Preconditions
- Mobile architecture specs established in `mobile-attendee/` and `mobile-organizer/`.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Architecture blueprint for Google Play Integrity token generation on Android client.
  - Server-side verification handler design (`POST /auth/mobile/attest`) using Google API client libraries.
  - Nonce generation strategy to prevent token replay attacks.
  - Graceful degradation policy for development/testing builds vs production builds.
- **Out-of-Scope:**
  - Purchasing Google Play Console developer account or embedding live Play Integrity secrets during initial portfolio baseline.

## 6. Likely Source Modules / Files
- `server/src/providers/mobile/` — [Discovery Target: Mobile attestation verification service]
- `mobile-attendee/app/src/main/` — [Discovery Target: Android Play Integrity client manager]
- `mobile-organizer/app/src/main/` — [Discovery Target: Android Play Integrity client manager]

## 7. Contracts / Behavior to Preserve
- `X-App-Integrity-Token` request header contract.

## 8. Ordered Implementation Steps
1. Document Play Integrity token flow sequence (Client $\rightarrow$ Server Nonce $\rightarrow$ Client Play Integrity API $\rightarrow$ Server Verification).
2. Design `MobileAttestationProvider` in `server/src/providers/mobile/playIntegrity.js`.
3. Specify Android client implementation using `com.google.android.play:integrity` library.
4. Define verification response caching in Redis (nonces expire in 5 minutes).
5. Document mock verification mode for emulator / local development builds (`MOBILE_ATTESTATION_MOCK=true`).

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- Cryptographic verification of Play Integrity token signatures.
- Rejection of payloads failing `appLicensingVerdict` or `deviceRecognitionVerdict` in production enforcement mode.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)

## 12. Acceptance Criteria
- [ ] Comprehensive Play Integrity Architecture Specification document completed.
- [ ] Server verification handler interface designed with mock dev bypass support.

## 13. Rollback / Feature-Flag Strategy
- Feature flag `MOBILE_ATTESTATION_ENFORCE=false` allows disabling hard enforcement during initial beta or staging testing.

## 14. Required Artifacts / Handoff Report
- `MOBILE_ATTESTATION_DESIGN.md` specification file.

## 15. Blocker Questions
- Will iOS app support (App Attest / DeviceCheck) be required in a future phase?
