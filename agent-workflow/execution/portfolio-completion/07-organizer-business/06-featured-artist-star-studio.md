# Task 07-T6: Featured Artist & Famous Profile Star Studio

## 1. Goal
Implement the Featured Star Artist Studio (`PO-idea.md` #22), allowing famous artists, influencers, and featured performers to showcase public profiles, highlight upcoming events, and display activity schedules.

## 2. Why
Fulfills `PO-idea.md` item #22, providing an exclusive brand management studio for featured celebrities and artists to engage fans and drive ticket sales.

## 3. Dependencies
- Task `07-T5` (Team Management & Granular RBAC Permissions).

## 4. Preconditions
- User entity contains `is_featured_artist` status flag (approved by Admin).

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - **Star Profile Studio (`PO-idea.md` #22):**
    - Artist Banner, Avatar image upload, Biography, Category tag (e.g. Ca sĩ, DJ, Diễn viên).
    - **Highlight Events:** Select and pin featured events.
    - **Schedule of Activities:** Timeline of upcoming & past events across platforms.
    - **External Links:** Official website, Spotify, YouTube, Instagram, Facebook links.
  - Public Star Profile View (`GET /artists/:slug`).
  - Admin Approval / Star Status Grant API (`POST /admin/artists/:id/grant`).
- **Out-of-Scope:**
  - Live fan chat / messaging board.

## 6. Likely Source Modules / Files
- `server/src/modules/artists/` — [Discovery Target: Featured artist profile controllers]
- `web/src/features/artists/` — [Discovery Target: Public Star Profile & Studio UI]

## 7. Contracts / Behavior to Preserve
- `GET /artists/:slug` returns public artist profile, social links, and pinned events.

## 8. Ordered Implementation Steps
1. Create PostgreSQL migration for `artist_profiles` and `artist_activities` tables.
2. Implement `ArtistService` managing profile updates, activity timelines, and event pinning.
3. Build public artist landing page in `web/src/app/artists/[slug]/page.tsx`.
4. Build Artist Studio dashboard in `web/src/features/artists/studio/`.
5. Write unit tests for artist profile management and public page rendering.

## 9. Database / Migration Needs
- PostgreSQL migration `069_create_artist_profiles.sql` with unique index on `slug`.

## 10. Security Requirements
- Only authenticated users with `is_featured_artist = true` (granted by Admin) can access the Star Studio editor.

## 11. Test / Build / Smoke Commands
- `npm run test:unit` (in `server/`)
- `npm run build` (in `web/`)

## 12. Acceptance Criteria
- [ ] Admin grants Star status to user account.
- [ ] Artist accesses Star Studio to upload banner, avatar, social links, and activity timeline.
- [ ] Public users view `/artists/son-tung-mtp` and see pinned events and official links.

## 13. Rollback / Feature-Flag Strategy
- Feature flag `FEATURE_STAR_STUDIO_ENABLED=true` enables artist routes.

## 14. Required Artifacts / Handoff Report
- Star Studio feature test report and UI page screenshot.

## 15. Blocker Questions
- Should organizers be able to tag a Featured Artist in their event creation flow?
