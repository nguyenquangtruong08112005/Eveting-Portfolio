# Phase 09 Task 03: Commerce, Profile, and Media UX

## Status

`PLANNED - follows Phase 08 governance`

## Approved product decisions

- Voucher picker shows only public, active vouchers that are eligible for the current event/order. Private organizer-only promotions are never shown. Selecting a voucher fills the checkout code field.
- The membership card is hidden only from the web profile. Its source and future mobile/member work remain intact.
- Profile interests use a comma/Enter tag input with removable tags.
- Featured Profiles are public identities distinct from organizers. The profile page shows followed Featured Profiles, and each featured profile has a public page.
- Event and Featured Profile media use R2-backed upload controls with validation, preview, progress/error state, and a controlled URL fallback for compatible legacy data.
- Vietnam administrative data uses `zuydd/vn-geo` only after a license, maintenance, bundle-size, and offline-fallback audit.

## Deliverables

1. Eligible public voucher picker modal with selection state and server-side revalidation at quote/checkout.
2. Public Featured Profile route and followed-profile section; no organizer ownership language.
3. Interest tag input with stable normalized values and accessible keyboard behavior.
4. Membership-card concealment behind a web-only feature boundary.
5. Shared R2 media upload component for event cover, banner, artist avatar, and artist banner, including file type/size validation and preview.
6. Vietnam province/district/ward data adapter with documented license and fallback behavior.

## Constraints

- UI eligibility hints are not an authorization boundary. Server promotion validation remains authoritative.
- R2 credentials remain server-side; browser uploads use an approved upload route or short-lived signed upload mechanism.
- Existing URL media remains renderable during migration.
- Featured Profile contracts must remain mobile-compatible until Phase 10 completes the Android alignment audit.

## Verification

- Voucher shown in modal but made ineligible before checkout is rejected safely by the server.
- Private promo never appears in the public picker.
- Uploaded assets render from R2 and legacy URLs still render.
- Public profile and followed-profile list have loading, empty, and error states.
- Responsive browser checks plus affected web build/lint.
