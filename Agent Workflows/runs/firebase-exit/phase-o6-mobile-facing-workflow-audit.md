# Phase O6 - Mobile-Facing Workflow Audit

Date: 2026-06-09

## Goal

Record what the attendee and organizer mobile apps currently depend on before deeper business-domain redesign.

Scope:

- `Mobile-2025-Eventing`
- `Mobile-2025-Eventing-Organizer`
- `Server-2025-Eventing`

Rules:

- Read-only source audit for mobile/server contracts.
- No backend or mobile implementation changes.
- Worker reports were treated as input, then Codex manager verified critical claims against current source.

## Worker Verification

O5 was verified by an OpenCode worker from the parent workspace.

Result: PASS.

Evidence:

- `codegraph status .` in server repo matched O5 docs: 285 files, 1,269 nodes, 1,512 edges.
- Server working tree was clean on `staging`.
- O5 server commits were present:
  - `a9ace1d`
  - `073a97f`
  - `5cf3f99`
  - `0a0b9a5`
  - `5612b3d`
  - `e3cc9f4`
  - `c80d1fd`
  - `8ef1268`
  - `2ee6a1b`
- `git diff --check` passed.
- `npm run ci:check` passed.
- `npm run db:smoke:structured-errors` passed.

## Attendee Workflows

| Workflow | Mobile anchor | Backend endpoint | Request contract | Response dependency | Side effects | Risk |
|---|---|---|---|---|---|---|
| Register | `EventApiService.register`, `AuthRepositoryImpl.signUp` | `POST /auth/register` | `name`, `email`, `password`, `role` | `AuthResponse.user`, `accessToken`, `refreshToken` | auth user/session/profile | Stable |
| Login | `EventApiService.login`, `AuthRepositoryImpl.signIn` | `POST /auth/login` | `email`, `password` | `AuthResponse` | session create | Stable |
| Social login | `googleLogin`, `facebookLogin` | `POST /auth/google-login`, `POST /auth/facebook-login` | provider token, `role` | `AuthResponse` | social auth user/session/profile | Depends on provider credentials |
| Refresh token | OkHttp interceptor, `TokenStore` | `POST /auth/refresh` | `refreshToken` | new `accessToken`, `refreshToken` | old session revoked, new session created | Stable; reactive refresh only |
| Logout | `AuthRepositoryImpl.signOut` | `POST /auth/logout` | `refreshToken` | ignored body | revoke current session | Low: `logout-all` unused |
| Current user | `getUserProfile`, profile screens | `GET /users/me` | bearer token | `UserDto.userName`, `profilePictureUrl`, `coverPhotoUrl`, `aboutMe`, `interests`, `emailVerified` | read profile | Stable; server maps `name` to `userName` and `bio` to `aboutMe` |
| Update profile | `updateUserProfile` | `PUT /users/me` | `name`, `aboutMe`, `profilePicUrl`, `coverPhotoUrl`, `birthDate`, `address`, `interests`, `fcmToken` | `UserDto` | update profile; optional topic sync | Medium: `address` is sent by mobile but current server update helper does not persist it |
| Event list/search | `getAllEvents`, `searchEvents` | `GET /events`, `GET /events/search` | page/filter/sort query | `{events, pagination}` | read Postgres/Elasticsearch | Stable |
| Nearby events | `findNearbyEvents` | `GET /events/nearby` | `lat`, `lon`, `radius`, `page`, `limit` | `{events, pagination}` mapped to `Event` | read geo events | Low/Medium: server returns `distanceKm`, but mobile maps to generic `EventDto` and discards distance |
| Recommendations | `getRecommendations` | `GET /events/recommendations` | `limit` | bare `List<EventDto>` | read profile interests + Elasticsearch fallback | Stable; worker false positive corrected |
| Event detail/weather | `getEventById`, `getWeather` | `GET /events/:id`, `GET /events/:id/weather` | path id | `EventDetailDto`, `WeatherDto` | read event/weather provider | Stable |
| Featured profile | `getFeaturedProfileById` | `GET /profiles/:id` | profile id | `FeaturedProfileDto` | read featured profile | Stable |
| Follow/unfollow | `followProfile`, `unfollowProfile` | `POST /users/me/follow`, `DELETE /users/me/follow/:profileId` | `profileId` | ignored body | update followed ids/counts; topic sync skipped in OneSignal external-id mode | Stable |
| Tickets list/detail | `getUserTickets`, `getTicketDetails` | `GET /users/me/tickets`, `GET /tickets/:ticketId` | pagination/path id | ticket/event/venue DTOs | read tickets/events/venues | Stable |
| Book ticket | `bookTicket` | `POST /tickets/book` | `eventId`, `ticketType`, `quantity`, `promoCode` | `Ticket` | transaction: create ticket, decrement availability, analytics/promo updates | Stable; high business criticality |
| Create payment order | `createZaloPayOrder` | `POST /payments/create-order` | `ticketId` | `zpToken`, `appTransId`, `returnCode`, `returnMessage` | ZaloPay call, ticket payment fields update | Stable; provider/env sensitive |
| Reviews | `getEventReviews`, `postEventReview` | `GET/POST /events/:eventId/reviews` | rating/comment for POST | review list wrapper or ignored POST body | read/create review, ticket eligibility check | Stable |
| Event media | `getEventMedia`, `postEventMedia`, `uploadEventMediaMultipart` | `GET/POST /events/:eventId/media` | JSON `mediaItems` or multipart `file` | media wrapper or ignored body | storage upload for multipart; media row create | Stable; server supports both JSON and multipart |
| Storage upload | `uploadImage` | `POST /storage/upload` | multipart `file`, optional `purpose` | `key`, `url`, `contentType`, `originalName`, `size` | upload to active storage provider | Stable; provider/env sensitive |
| Notifications | `getNotifications`, `markNotificationAsRead` | `GET /notifications`, `POST /notifications/:id/read` | notification id | notification DTO list | read/update notifications | Stable |
| Promotions | `checkPromotion`, `getPublicPromotions` | `POST /promotions/apply`, `GET /promotions` | code/event/quantity | promotion validation/list DTOs | promotion read/validation | Stable |

## Organizer Workflows

| Workflow | Mobile anchor | Backend endpoint | Request contract | Response dependency | Side effects | Risk |
|---|---|---|---|---|---|---|
| Register/login/social/refresh/logout | `AuthApiService`, `AuthRepositoryImpl` | `/auth/*` | same auth contracts with organizer role | backend tokens and user roles | auth/session/profile | Stable |
| Organizer registration | `registerOrganizer` | `POST /organizer/register` | `companyName`, `description`, `taxCode`, `website` | ignored body | organizer role/info update | Stable |
| Organizer profile | `getOrganizerProfile`, `updateOrganizerProfile` | `GET/PUT /organizer/me` | profile fields | `OrganizerProfileResponse` | read/update organizer info | Stable |
| Dashboard stats | `getStatsOverview` | `GET /organizer/me/stats` | none | revenue/tickets/events/upcoming | aggregate events/analytics | Stable |
| Event stats | `getEventStats` | `GET /organizer/events/:eventId/stats` | event id | analytics DTO | read analytics after ownership check | Stable |
| My events | `getMyEvents` | `GET /organizer/me/events` | `page`, `limit`, optional `status` | `{data: [MyEventDto]}` | read organizer events | Stable; worker false positive corrected |
| Create event | `createEvent` | `POST /events` | event create DTO including tickets, venue/profile refs | body ignored by mobile | create pending/private event, venue handling, notifications | Stable; high contract sensitivity |
| Update event | `updateEvent` | `PUT /events/:eventId` | full/partial event DTO | body ignored by mobile | ownership check, event update, ES sync/notifications | Stable; high contract sensitivity |
| Cancel event | no mobile UI found | `DELETE /events/:eventId` | event id | event body | cancel event, ES delete, attendee notifications | Gap: server capability unused by organizer app |
| Promotions CRUD | `getOrganizerPromotions`, `create/update/deletePromotion` | `/promotions/organizer*` | promotion DTOs | `PromotionDto` or ignored body | CRUD promotions | Stable |
| QR check-in | `checkInByQr` | `POST /organizer/check-in-qr` | `qrToken` | legacy `{valid, error/message, ticketInfo}` | ticket status/check-in analytics | Stable; legacy error payload must be preserved |
| Attendees list | `getEventAttendees` | `GET /organizer/events/:eventId/attendees` | event id | `{attendees}` | read tickets/users | Stable |
| Import attendees | `importAttendees` | `POST /organizer/events/:eventId/attendees/import` | multipart file | mobile expects `Unit`; server returns counts/errors | ticket booking/payment confirmation per row | Medium: mobile discards import success/failure details |
| Export attendees | `exportAttendees` | `GET /organizer/events/:eventId/attendees/export` | event id | binary xlsx | read attendees and stream file | Stable |
| Broadcast notification | `broadcastNotification` | `POST /organizer/events/:eventId/broadcast` | `title`, `message` | mobile expects `Unit`; server returns `{success,sentTo}` | create notifications, send push | Low: mobile discards `sentTo` |
| Storage upload | `uploadImage` | `POST /storage/upload` | multipart `file`, optional `purpose` | upload metadata | storage provider upload | Stable |
| Admin pending/approve/reject | admin screens in organizer app | `/admin/events/pending`, `/admin/events/:id/approve`, `/admin/events/:id/reject` | page/limit, reason for reject | pending event DTOs or ignored body | status change, ES index/delete, notifications | Stable; admin role required |

## Confirmed Gaps

1. Attendee `PUT /users/me` sends `address`, but server `buildProfileUpdateData` does not persist `address`.
2. Nearby events include `distanceKm` from server, but attendee mobile maps response into generic `Event` and does not use/preserve distance.
3. Organizer import attendees returns useful `{successCount, failCount, errors}`, but mobile expects `Unit`, so user cannot see partial import failures.
4. Organizer broadcast returns `{success, sentTo}`, but mobile expects `Unit`, so delivery count is discarded.
5. Organizer app has no cancel-event workflow even though server supports `DELETE /events/:eventId`.
6. Mobile logout uses current-session logout only; server `POST /auth/logout-all` exists but is unused.

## Worker False Positives Corrected

1. Attendee recommendations are compatible: mobile expects bare `List<EventDto>`, and server returns a bare array.
2. User profile field names are intentionally mapped server-side: `name -> userName`, `bio -> aboutMe`, `profilePicUrl -> profilePictureUrl`.
3. Organizer `GET /organizer/me/events` is compatible: server returns `{ data: events }`, matching mobile `MyEventsResponse`.
4. Event media JSON is compatible: server supports `req.body.mediaItems`; multipart is an additional path, not the only path.

## Refactor Guardrails For Business Redesign

Before changing any business behavior:

1. Keep auth response shape stable: `user`, `accessToken`, `refreshToken`.
2. Keep `/users/me` mapped to mobile names: `userName`, `profilePictureUrl`, `aboutMe`.
3. Keep recommendations as a bare array.
4. Keep list/search/nearby as `{events, pagination}`.
5. Keep organizer my-events as `{data: [...]}`.
6. Keep QR check-in legacy invalid-ticket payload shape.
7. Keep both JSON and multipart support for `POST /events/:eventId/media`.
8. Do not change ticket/payment write order without a dedicated device smoke: book ticket, get ticket, create ZaloPay order.

## Next Slice Candidates

1. O6-S1: add contract smoke tests for the mobile-facing shapes above.
2. O6-S2: decide whether to persist attendee `address` or remove it from mobile update payload.
3. O6-S3: expose `distanceKm` in attendee map UI or intentionally document that it is unused.
4. O6-S4: make organizer attendee-import parse and display `{successCount, failCount, errors}`.
5. O6-S5: add organizer cancel-event UX only if product flow needs it.
