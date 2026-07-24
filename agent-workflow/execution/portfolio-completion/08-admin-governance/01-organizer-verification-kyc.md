# Task 08-T1: Organizer Verification & KYC Workflow

## 1. Goal
Implement Admin organizer verification review APIs and Web UI (`/admin/organizers/kyc`), allowing platform administrators to audit submitted tax details, business licenses, and bank account information before authorizing organizer event publishing.

## 2. Why
Protects ticket buyers and the platform from fraudulent event organizers and compliance violations.

## 3. Dependencies
- Phase 07 (Organizer Business Suite).

## 4. Preconditions
- Admin role (`role = 'admin'`) authenticated.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - `GET /admin/organizers/kyc` — Lists pending organizer verification submissions.
  - `POST /admin/organizers/:id/verify` — Approve or reject KYC profile with review notes.
  - Automatic email notification to organizer upon approval/rejection.
  - Locking ticket sale payouts until organizer verification status is `VERIFIED`.
- **Out-of-Scope:**
  - Third-party government database automated lookup integrations.

## 6. Likely Source Modules / Files
- `server/src/modules/admin/` — [Discovery Target: Admin KYC verification controllers]
- `web/src/app/admin/users/page.tsx` — [Discovery Target: Admin user/organizer verification UI]

## 7. Contracts / Behavior to Preserve
- Organizer status values: `UNVERIFIED`, `PENDING_REVIEW`, `VERIFIED`, `REJECTED`.

## 8. Ordered Implementation Steps
1. Add `kyc_status` and `kyc_rejection_reason` to `organizer_payment_profiles` / `users` tables.
2. Implement `AdminKycService.reviewOrganizer()` with atomic status transition.
3. Trigger email notification via `EmailProvider` sending review decision to organizer.
4. Develop Admin KYC Review interface in `web/src/app/admin/organizers/page.tsx`.
5. Write unit tests for KYC approval/rejection handling.

## 9. Database / Migration Needs
- PostgreSQL migration `070_add_admin_kyc_fields.sql`.

## 10. Security Requirements
- Endpoint accessible ONLY by users with `role = 'admin'`.
- All review actions recorded in `admin_audit_logs`.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `npm run build` (in `web/`)

## 12. Acceptance Criteria
- [ ] Admin can view submitted bank account, business address, and tax ID details.
- [ ] Approving KYC sets status to `VERIFIED` and unlocks payout eligibility.
- [ ] Rejecting KYC records reason and notifies organizer via email.

## 13. Rollback / Feature-Flag Strategy
- Default `ALLOW_UNVERIFIED_EVENT_CREATION=true` allows organizers to draft events while KYC is pending.

## 14. Required Artifacts / Handoff Report
- Admin KYC workflow test execution log.

## 15. Blocker Questions
- Should organizers be required to re-verify KYC if they update their bank account details?
