# QA Test Flow — Organizer + Admin (Web)

> **Date:** 2026-07-21  
> **Env:** local — API `http://localhost:3000`, Web `http://localhost:3001`  
> **Password (all demo seeds):** `123456`

## Demo accounts

| Role | Email | Expected landing |
|------|--------|------------------|
| Admin | `admin@eventing.com` | `/admin/moderation` |
| Organizer | `hanoi.events@eventing.com` | `/organizer/dashboard` |
| Attendee (optional) | `alice@email.com` | `/` |

## Surface map (survey)

### Organizer (`/organizer/*`)

| Route | UI | Backend surface |
|-------|-----|-----------------|
| `/organizer/dashboard` | Stats, event table, ledger | `GET /api/organizer/me/stats`, `/me/events`, `/ledger` |
| `/organizer/events/new` | Create event form | `POST /events` (+ ticket types) |
| `/organizer/events/:id` | Event detail / attendees / broadcast | `/api/organizer/events/:id/*` |
| `/organizer/events/:id/edit` | Edit form | `PUT /events/:id` |
| `/organizer/promotions` | Promo CRUD | promotions APIs |
| `/organizer/venues` | Venue management | venues APIs |
| `/organizer/check-in` | QR check-in | `POST /api/organizer/check-in-qr` |

**Table actions:** View, Edit, Submit draft, Cancel event.

### Admin (`/admin/*`)

| Route | UI | Backend surface |
|-------|-----|-----------------|
| `/admin/moderation` | Pending / approve / reject | `GET/POST /api/admin/events/*` |
| `/admin/observability` | Metrics links | often mock / external |
| `/admin/users` | **UsersMockView** | no real API |
| `/admin/venues` | **VenuesAdminMockView** | no real API |

## Test procedure (Chrome DevTools)

1. Clear site storage or use isolated context.
2. Login as **organizer** → walk every ORG_NAV item + each dashboard button.
3. Capture Network (fetch/xhr) + Console errors.
4. Logout → login as **admin** → walk ADMIN_NAV + approve/reject if pending exists.
5. Log every non-2xx, empty state that should have data, and dead buttons.

## Pass criteria (P0)

- Login routes by role.
- Organizer dashboard loads stats/events without console errors.
- Submit draft / cancel / create event call real APIs and surface errors clearly.
- Admin pending list + approve/reject work when drafts exist.
- Mock pages labeled as mock (not silent dead buttons).

## Results (2026-07-21)

| Area | Result |
|------|--------|
| Org login + dashboard | PASS |
| Org promotions create | PASS |
| Org venues list | PASS |
| Org notification bell (AppShell) | **FAIL** — dead button |
| Admin pending list | PASS |
| Admin approve / reject | **FAIL** — HTTP 500 (audit timestamptz) |
| Admin users / venues | **FAIL** — mock only, actions disabled |
| `GET /api/organizer/me` | **FAIL** — 500 missing `u.email` |

Full findings: [BUG-REPORT-organizer-admin-2026-07-21.md](./BUG-REPORT-organizer-admin-2026-07-21.md)
