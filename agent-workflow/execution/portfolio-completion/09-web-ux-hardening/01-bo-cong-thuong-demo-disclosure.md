# Task 09-T1: Bo Cong Thuong Removal & Portfolio Demo Disclosures

## 1. Goal
Remove unverified "Đã Đăng Ký Bộ Công Thương" badges from the web footer and implement a clear, non-intrusive portfolio demo disclosure banner.

## 2. Why
Ensures legal compliance regarding Vietnamese web registration seals while clearly setting expectations for reviewers and visitors that the app is an engineering portfolio project.

## 3. Dependencies
- Phase 08 (Admin Capabilities & Platform Governance).

## 4. Preconditions
- `web/src/components/layout/Footer.tsx` readable.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Removing fake/unverified Bộ Công Thương image badges from `Footer.tsx`.
  - Adding a subtle, elegant top notification bar or footer disclosure tag: `"Dự án Portfolio Demo — Hệ thống đặt vé sự kiện thử nghiệm (Eventing Portfolio Project)"`.
  - Adding a quick "Demo Accounts & Info" modal trigger in the header/footer displaying instant login credentials for testing (`admin@eventing.moteo.fun`, `organizer@eventing.moteo.fun`, `attendee@eventing.moteo.fun`).
- **Out-of-Scope:**
  - Altering core layout structure or branding identity.

## 6. Likely Source Modules / Files
- `web/src/components/layout/Footer.tsx` — [Discovery Target: Footer component]
- `web/src/components/layout/Navbar.tsx` — [Discovery Target: Navigation header]
- `web/src/components/shared/DemoDisclosureModal.tsx` — [Discovery Target: Portfolio demo disclosure modal]

## 7. Contracts / Behavior to Preserve
- Clean visual aesthetic without looking like a broken or incomplete site.

## 8. Ordered Implementation Steps
1. Inspect `web/src/components/layout/Footer.tsx` and delete Bo Cong Thuong image elements.
2. Build `DemoDisclosureBanner` component displaying polite portfolio project notice.
3. Build `DemoAccountsModal` providing 1-click credential auto-fill for testing.
4. Integrate disclosure components into main root layout (`web/src/app/layout.tsx`).
5. Verify visual rendering across desktop and mobile screens.

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- Ensure demo account credentials displayed in modal correspond ONLY to sandboxed seed test accounts.

## 11. Test / Build / Smoke Commands
- `npm run build` (in `web/`)

## 12. Acceptance Criteria
- [ ] Bo Cong Thuong badge completely removed from footer.
- [ ] Portfolio demo disclosure clearly visible without obstructing user interaction.
- [ ] 1-click demo account auto-fill modal operates cleanly on login page.

## 13. Rollback / Feature-Flag Strategy
- Disclosure banner toggleable via `NEXT_PUBLIC_SHOW_DEMO_DISCLOSURE=true` environment flag.

## 14. Required Artifacts / Handoff Report
- UI screenshot of cleaned footer and demo disclosure modal.

## 15. Blocker Questions
- Should the demo disclosure banner be dismissible by the visitor during their session?
