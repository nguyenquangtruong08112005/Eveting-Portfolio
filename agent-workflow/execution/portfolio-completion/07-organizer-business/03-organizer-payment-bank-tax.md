# Task 07-T3: Organizer Payment Profile, Bank Details & Tax Verification

## 1. Goal
Implement the organizer banking, tax verification, and legal business profile management suite (`PO-idea.md` #7).

## 2. Why
Ensures compliance with Vietnamese financial regulations and enables automated payout transfers following event completion.

## 3. Dependencies
- Task `07-T2` (Ticket Rules, Vouchers & Promotion Engine).

## 4. Preconditions
- Organizer user accounts authenticated.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `POST /organizer/payment-profile` — Manages organizer financial parameters:
    - Account Holder Full Name (`full_name`).
    - Bank Account Number (`bank_account_number`).
    - Bank Name (`bank_name`: Vietcombank, Techcombank, BIDV, MBBank, VietinBank, VPBank, etc.).
    - Bank Branch (`bank_branch`).
    - Red Invoice Toggle (`red_invoice_enabled`: boolean).
    - Type of Business (`business_type`: `individual`, `company`, `household`).
    - Registered Business Address (`address`).
    - Tax Identification Number (`tax_number`).
  - `GET /organizer/payment-profile` — Returns masked bank details for security.
- **Out-of-Scope:**
  - Real-time automated bank account verification API via external third-party KYC provider (simulated verification status).

## 6. Likely Source Modules / Files
- `server/src/modules/organizers/` — [Discovery Target: Organizer payment profile service]
- `web/src/features/organizer/profile/` — [Discovery Target: Organizer financial settings UI]

## 7. Contracts / Behavior to Preserve
- Sensitive financial data masking (e.g. Account `XXXXXX1234`) in public API responses.

## 8. Ordered Implementation Steps
1. Create PostgreSQL migration for `organizer_payment_profiles` table.
2. Build `OrganizerProfileService` supporting creation, update, and admin verification status (`PENDING`, `VERIFIED`, `REJECTED`).
3. Implement data encryption for sensitive bank account numbers using AES-256-GCM.
4. Develop Organizer Payment Profile setting UI in `web/src/features/organizer/profile/`.
5. Write unit tests for profile validation and encryption/decryption routines.

## 9. Database / Migration Needs
- PostgreSQL migration `066_create_organizer_payment_profiles.sql` with unique index on `organizer_id`.

## 10. Security Requirements
- Encrypt bank account numbers at rest using `ENCRYPTION_KEY`.
- Only primary organizer account owner can view unmasked bank details or submit changes.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `npm run build` (in `web/`)

## 12. Acceptance Criteria
- [ ] Organizer can save bank account details, business type, and tax ID.
- [ ] Bank account number stored encrypted in database; masked in GET API.
- [ ] Red invoice option correctly recorded for financial reporting.

## 13. Rollback / Feature-Flag Strategy
- Allow manual admin payout processing if online profile submission experiences validation errors.

## 14. Required Artifacts / Handoff Report
- Organizer payment profile unit test report.

## 15. Blocker Questions
- Should red invoice requests from buyers trigger an automated notification to the organizer?
