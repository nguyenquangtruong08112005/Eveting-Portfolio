# R1 Contract Consistency Audit

> Date: 2026-07-22  
> Scope: server, web, mobile-attendee, mobile-organizer  
> Mode: local read-only audit with server CodeGraph + local `rg`  
> Status: COMPLETE - implementation fixes pending

## 1. Context

OpenCode was not used for this audit because the approval reviewer blocked multi-repo source exposure to an external worker. This audit was done locally.

Server CodeGraph:

- synced before audit
- index status: up to date
- project: `server`
- files: 362
- nodes: 1,974
- edges: 4,005

## 2. Server Route Mounts

Canonical mobile-facing mounts:

| Mount | Router |
|---|---|
| `/auth` | auth |
| `/users` | users |
| `/events` | events |
| `/tickets` | tickets |
| `/payments` | payments |
| `/profiles` | featured profiles |
| `/reviews` | reviews |
| `/promotions` | promotions |
| `/notifications` | notifications |
| `/organizer` | organizer |
| `/admin` | admin |
| `/storage` | storage |

Web aliases:

| Mount | Router |
|---|---|
| `/api/web/auth` | auth |
| `/api/web/events` | events |
| `/api/web/tickets` | tickets |
| `/api/web/payments` | payments |
| `/api/web/memberships` | memberships |
| `/api/web/vouchers` | vouchers |
| `/api/web/profiles` | featured profiles |
| `/api/organizer` | organizer |
| `/api/admin` | admin |

Important gap:

- There is no `/api/web/users`, `/api/web/notifications`, `/api/web/promotions`, `/api/web/storage`, or `/api/web/venues` alias.
- Web currently mixes `/api/web/*` and canonical mobile paths. This works, but it weakens the future BFF boundary.

## 3. Contract Matrix

| Flow | Server route | Auth | Web caller | Attendee mobile | Organizer mobile | Contract state |
|---|---|---|---|---|---|---|
| Login | `POST /auth/login`, `POST /api/web/auth/login` | public | `/api/web/auth/login` | `auth/login` | `auth/login` | OK |
| Register | `POST /auth/register`, `POST /api/web/auth/register` | public | `/api/web/auth/register` | `auth/register` | auth DTO exists | OK |
| Refresh | `POST /auth/refresh`, `POST /api/web/auth/refresh` | public refresh token | web interceptor | attendee interceptor | organizer interceptor | OK |
| Logout | `POST /auth/logout` | public refresh token | not exposed in web service | attendee API | organizer DTO exists | Partial |
| Logout all | `POST /auth/logout-all`, `/api/web/auth/logout-all` | JWT | web service | not found | not found | Web-only |
| Google login | `POST /auth/google-login`, `/api/web/auth/google-login` | public | web service | attendee API | organizer DTO exists | OK if provider configured |
| Facebook login | `POST /auth/facebook-login`, `/api/web/auth/facebook-login` | public | web service | attendee API | organizer DTO exists | OK if provider configured |
| Current user | `GET /users/me` | JWT | canonical `/users/me` | `users/me` | `users/me` in splash/comments | OK |
| Update user | `PUT /users/me` | JWT | canonical `/users/me` | `users/me` | organizer has DTO/API | OK |
| User tickets | `GET /users/me/tickets` and `GET /tickets` | JWT | web uses `/api/web/tickets` | `users/me/tickets` | `users/me/tickets` | OK, two equivalent entrypoints |
| Event list | `GET /events`, `/api/web/events` | public | `/api/web/events` | `events` | `events` | OK |
| Event search | `GET /events/search`, `/api/web/events/search` | public | `/api/web/events/search` | `events/search` | `events/search` | Mostly OK |
| Nearby events | `GET /events/nearby`, `/api/web/events/nearby` | public | `/api/web/events/nearby` | `events/nearby` | `events/nearby` | OK |
| Recommendations | `GET /events/recommendations`, `/api/web/events/recommendations` | JWT | expects `{ events }` | expects raw `List<EventDto>` | expects raw `List<EventDto>` | **Mismatch: web expects wrapper, server returns raw array** |
| Event detail | `GET /events/:eventId`, `/api/web/events/:eventId` | optional JWT | `/api/web/events/:id` | `events/{id}` | `events/{id}` | OK |
| Weather | `GET /events/:eventId/weather` | public | `/api/web/events/:id/weather` | `events/{id}/weather` | `events/{id}/weather` | OK, may return message object when not applicable |
| Reviews list/create | nested `/events/:eventId/reviews` | list public, create JWT | `/api/web/events/:id/reviews` | `events/{id}/reviews` | `events/{id}/reviews` | OK |
| Media list | nested `/events/:eventId/media` | public | `/api/web/events/:id/media` | `events/{id}/media` | `events/{id}/media` | OK if response has `media` |
| Media upload | nested `/events/:eventId/media` | JWT | no web uploader found | attendee JSON/multipart | organizer JSON | OK, but clients differ |
| Storage upload | `POST /storage/upload` | JWT | `/storage/upload` | `storage/upload` | `storage/upload` | OK |
| Book ticket | `POST /tickets/book`, `/api/web/tickets/book` | JWT | `/api/web/tickets/book` | `tickets/book` | `tickets/book` | OK |
| Seat map | `/tickets/event/:eventId/seats`, hold/release/book-held | JWT | `/api/web/tickets/...` | not found | not found | Web-only currently |
| Ticket detail | `GET /tickets/:ticketId`, `/api/web/tickets/:ticketId` | JWT | `/api/web/tickets/:id` | `tickets/{id}` | `tickets/{id}` | OK after flat+nested compatibility |
| Payment create | `POST /payments/create-order`, `/api/web/payments/create-order` | JWT | `/api/web/payments/create-order` | `payments/create-order` | `payments/create-order` | OK |
| Payment status | `POST /payments/check-status`, `/api/web/payments/check-status` | JWT | `/api/web/payments/check-status` | not found | not found | Web-only status polling |
| Notifications list/read | `/notifications`, `/notifications/:id/read` | JWT | canonical `/notifications` | `notifications` | `notifications` | OK, returns raw array |
| Organizer profile | `/organizer/me`, `/api/organizer/me` | organizer JWT | web `/api/organizer/me` indirectly | not attendee | `organizer/me` | OK |
| Organizer events | `/organizer/me/events`, `/api/organizer/me/events` | organizer JWT | web `/api/organizer/me/events` | not attendee | `organizer/me/events` | OK, envelope `{ data }` |
| Organizer stats | `/organizer/me/stats`, `/api/organizer/me/stats` | organizer JWT | web normalizes stats | organizer DTO expects legacy stats | Potential mismatch tolerated by web only |
| Organizer attendees | `/organizer/events/:id/attendees` | organizer owner | web `/api/organizer/events/:id/attendees` | not attendee | organizer API | OK |
| Check-in QR | `/organizer/check-in-qr` | organizer JWT | web `/api/organizer/check-in-qr` | not attendee | organizer API | OK |
| Organizer promotions | `/promotions/organizer` | organizer JWT | canonical `/promotions/organizer` | not attendee | organizer API | OK |
| Admin pending events | `/admin/events/pending`, `/api/admin/events/pending` | admin JWT | web handles array or envelope | not attendee | expects raw `List<MyEventDto>` | **Mismatch: organizer mobile expects array, server returns envelope** |
| Admin approve/reject | `/admin/events/:id/approve|reject` | admin JWT | web service | not attendee | organizer admin API | OK enough |

## 4. Priority Findings

### P0 - Fix Before More Feature Work

1. **Web recommendations contract mismatch**
   - Server: `GET /events/recommendations` returns raw array.
   - Attendee mobile: expects raw `List<EventDto>`.
   - Organizer mobile: expects raw `List<EventDto>`.
   - Web: `EventService.recommendations()` expects `{ events: Event[] }`.
   - Fix: make web normalize `Event[] | { events: Event[] }`, do not change server/mobile contract.

2. **Organizer mobile admin pending events contract mismatch**
   - Server: `GET /admin/events/pending` returns `{ events, page, limit, total }`.
   - Web: already normalizes array or envelope.
   - Organizer mobile: Retrofit method returns `Response<List<MyEventDto>>`.
   - Fix: update organizer mobile DTO/repository to accept envelope, or add backward-compatible server mode. Prefer mobile DTO/repository fix because web/admin phase is moving admin to web.

### P1 - Clean Contract Boundary

3. **Web mixes BFF aliases and canonical mobile paths**
   - Examples: `/api/web/auth`, `/api/web/events`, but `/users/me`, `/notifications`, `/promotions/organizer`, `/storage/upload`.
   - Current behavior works.
   - For public release, either document this as intentional transitional state or add `/api/web/*` aliases consistently.

4. **Event search pagination mismatch is tolerated, but vague**
   - Server returns `{ events, pagination }`.
   - Web search reads `events`, `total`, `page`; it ignores `pagination.totalItems`.
   - Result: search works but `hasMore` may be inaccurate.
   - Fix: make web normalize `pagination.totalItems/currentPage`.

5. **Weather not-applicable response can be a message object**
   - Server may return `{ message }` instead of a weather DTO.
   - Mobile/web DTOs should tolerate missing weather fields.

### P2 - Later Cleanup

6. **Notifications return raw array**
   - Web already accepts array or `{ notifications }`.
   - Mobile expects list.
   - Leave server raw array for mobile compatibility.

7. **Organizer stats response names differ**
   - Web normalizes both `grossRevenue/platformFees` and legacy `totalRevenue/totalTicketsSold`.
   - Organizer mobile expects legacy fields.
   - Keep server response mobile-compatible unless mobile is changed.

8. **Seat-map APIs are web-only**
   - Mobile has no seat hold/release/book-held calls.
   - This is acceptable if seat map launches on web first.

## 5. R1 Implementation Split

Recommended tasks:

1. `fix(web): normalize recommendations and search pagination`
   - Files likely:
     - `web/src/services/event.service.ts`
   - Verification:
     - `cd web`
     - `npm run lint`

2. `fix(mobile-organizer): accept admin pending event envelope`
   - Use AGY if available because this is Kotlin/Android.
   - Files likely:
     - `mobile-organizer/app/src/main/java/com/tdtuer/eventing_organizer/data/network/EventApiService.kt`
     - `mobile-organizer/app/src/main/java/com/tdtuer/eventing_organizer/data/network/model/OrganizerDtos.kt`
     - `mobile-organizer/app/src/main/java/com/tdtuer/eventing_organizer/data/repository/EventRepositoryImpl.kt`
   - Verification:
     - `cd mobile-organizer`
     - `gradlew.bat :app:compileDebugKotlin`

3. `docs(release): document transitional API aliases`
   - Decide whether `/api/web/users` and friends should be added now or kept as transitional mixed paths.

## 6. Verification Commands

Use these after fixes:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\web
npm run lint
```

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\mobile-organizer
gradlew.bat :app:compileDebugKotlin
```

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\server
node scripts\smoke\smoke.mobile-contracts.cjs
```

## 7. Decision

Do not change backend server response shapes for the two P0 issues unless absolutely necessary. The safer release-readiness path is:

- keep mobile-facing server contracts stable
- update web normalization for web-only expectations
- update organizer mobile where it still uses an admin flow that now has a web-friendly envelope

## 8. Implementation Results

> Updated: 2026-07-22

Completed P0 fixes:

1. `fix(web): normalize event response envelopes`
   - Commit: `20f8e50`
   - File: `web/src/services/event.service.ts`
   - Change:
     - `recommendations()` now accepts raw `Event[]` or `{ events }`.
     - `search()` now reads `pagination.currentPage` and `pagination.totalItems` in addition to legacy `page` and `total`.
   - Verification:
     - `npm run lint` passed with 0 errors and 10 existing warnings.

2. `fix(mobile-organizer): accept pending event envelope`
   - Commit: `1971368`
   - Files:
     - `mobile-organizer/app/src/main/java/com/tdtuer/eventing_organizer/data/network/EventApiService.kt`
     - `mobile-organizer/app/src/main/java/com/tdtuer/eventing_organizer/data/network/model/OrganizerDtos.kt`
     - `mobile-organizer/app/src/main/java/com/tdtuer/eventing_organizer/data/repository/EventRepositoryImpl.kt`
   - Change:
     - Added `PendingEventsResponse`.
     - Retrofit now expects the server envelope.
     - Repository still exposes `Flow<Result<List<MyEventDto>>>` by unwrapping `response.body()!!.events`.
   - Verification:
     - `gradlew.bat :app:compileDebugKotlin` passed.

Remaining R1 work:

1. Run server smoke contract script once local server is running.
2. Run attendee Android compile if mobile-facing contract risk needs a full mobile gate.
3. Decide whether to add `/api/web/users`, `/api/web/notifications`, `/api/web/promotions`, `/api/web/storage`, `/api/web/venues` aliases or document the mixed-path transitional state.
