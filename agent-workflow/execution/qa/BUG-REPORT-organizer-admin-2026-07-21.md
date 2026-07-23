# Bug Report — Organizer + Admin (Web + API)

| Field | Value |
|--------|--------|
| **Date** | 2026-07-21 |
| **Env** | Local — API `:3000`, Web `:3001`, Postgres/Redis/ES via Docker |
| **Method** | Code survey + API probes + Chrome DevTools MCP |
| **Accounts** | `admin@eventing.com` / `hanoi.events@eventing.com` — password `123456` |
| **Related** | [organizer-admin-test-flow.md](./organizer-admin-test-flow.md) |

---

## Executive summary

Organizer **browse/list** surfaces mostly work (dashboard, events list, promotions CRUD, venues list, check-in UI shell).  
Admin **pending queue loads**, but **Approve / Reject are completely broken (HTTP 500)** — caused by audit logging writing epoch **milliseconds** into a **timestamptz** column (transaction rolls back).  
Several other buttons look clickable but are **dead UI**, **mock-only**, or hit **broken APIs**.

---

## Test flow executed

1. Login organizer → dashboard → event detail → promotions (create QA10) → venues → check-in → create-event form → notification bell  
2. Logout → login admin → moderation (click **Phê duyệt**) → users (mock)  
3. Parallel REST probes for `/api/organizer/*`, `/api/admin/*`, notifications  

### What worked

| Step | Result |
|------|--------|
| Login role routing | OK → `/organizer/dashboard`, `/admin/moderation` |
| `GET /api/organizer/me/stats`, `/me/events`, `/ledger` | 200 |
| Dashboard table, View event detail | OK |
| Event stats/attendees endpoints | 200 (empty data OK) |
| `POST /promotions/organizer` create code | 201 — UI toast “Đã tạo mã” |
| `GET /venues` | 200 |
| `GET /api/admin/events/pending` | 200 (10 items) |
| Check-in invalid QR | 400 expected `INVALID_TICKET` |
| `GET /notifications` | 200 `[]` |

---

## Bugs (ordered by severity)

### BUG-01 — P0: Admin Approve / Reject always 500

| | |
|--|--|
| **Symptom** | UI: alert `date/time field value out of range: "17…"`; Network: `POST /api/admin/events/:id/approve` → **500**. Same for reject. Buttons appear to “do nothing” after error. |
| **Evidence (Chrome)** | `POST …/approve` reqid network **500**; console error “Failed to load resource: 500”; page alert with Postgres message. |
| **Evidence (service)** | Stack: `logAction` → `audit_logs.created_at` ← `Date.now()` (millis). |
| **Root cause** | `server/src/shared/audit/audit-logger.js` inserts raw millis into `audit_logs.created_at` (**timestamptz** after migration 043). `node-pg` sends number → PG rejects. **Whole approve/reject transaction rolls back.** |
| **Fix** | Use `toDb(Date.now())` / `new Date()` / `nowDb()` from `time.helper.js` in `logAction`. Grep all other `INSERT … created_at` with `Date.now()`. |
| **Impact** | **Core admin workflow blocked** — no event can be published via moderation. |

```js
// audit-logger.js (broken)
const createdAt = Date.now();
// … VALUES (…, $8)  ← millis into timestamptz
```

---

### BUG-02 — P0: `GET /api/organizer/me` 500 (`column u.email does not exist`)

| | |
|--|--|
| **Symptom** | Any UI/client calling organizer profile crashes. |
| **Evidence** | REST: 500 `42703 column u.email does not exist`. |
| **Root cause** | `postgres.organizer.repository.js` selects `u.email` from **`user_profiles`**, but email lives on **`auth_users`**. |
| **Fix** | `JOIN auth_users a ON a.id = u.id` and select `a.email`, or drop email from profile query. |
| **Impact** | Profile / “me” surfaces broken; registration update path also hit similar timestamp issues. |

---

### BUG-03 — P1: AppShell notification bell is a dead button

| | |
|--|--|
| **Symptom** | Organizer/Admin header **Thông báo** button: click does nothing; **no network**, no dropdown. |
| **Evidence (Chrome)** | Click on `uid` notification control — zero fetch; a11y still only a bare `button`. |
| **Root cause** | `AppShell.tsx` renders decorative `<Bell />` with **no onClick / no `NotificationBell`**. Navbar (attendee) uses real `NotificationBell`; shell does not. |
| **Fix** | Wire `NotificationBell` or link to `/notifications`. |
| **Impact** | Users think notifications are broken on org/admin. |

---

### BUG-04 — P1: Admin Users / Venues are mock; actions disabled

| | |
|--|--|
| **Symptom** | `/admin/users`: fixture rows, buttons **“Khóa (chưa có)” disabled**. Banner says API not ready. `/admin/venues` uses `VenuesAdminMockView`. |
| **Root cause** | Product gap — UI shell without backend admin user/venue management. |
| **Impact** | Sidebar items look real but **cannot perform admin actions**. Label clearly as mock or hide until APIs exist. |

---

### BUG-05 — P1: Create event auto-submits (skips draft) + submit button confuses

| | |
|--|--|
| **Symptom** | `POST /events` returns `lifecycleStatus: "submitted"` immediately. Follow-up `POST …/submit-draft` → 400 cannot transition submitted→submitted. |
| **Impact** | Dual CTAs “Lưu nháp” / “Gửi phê duyệt” may not match backend; duplicate submits error; pending queue fills with half-baked events. |
| **Fix** | Create as `draft` by default; only submit on explicit action. Align CreateEventForm payload. |

---

### BUG-06 — P2: `formatPrice(0)` shows “Miễn phí” for zero revenue

| | |
|--|--|
| **Symptom** | Dashboard stats **DOANH THU GỘP / PHÍ / RÒNG** show **“Miễn phí”** when value is 0. |
| **Root cause** | `formatPrice(0)` returns free label (correct for ticket price, wrong for money metrics). |
| **Fix** | Use separate formatter for currency totals (`0 ₫`). |

---

### BUG-07 — P2: Notifications API path mismatch for web BFF

| | |
|--|--|
| **Symptom** | `GET /api/web/notifications` → **404**. Working path: `GET /notifications` → 200. |
| **Impact** | Phase-2 NotificationBell may fail if it uses wrong prefix (verify `notification.service.ts`). |

---

### BUG-08 — P2: Organizer cancel / delete event inconsistent

| | |
|--|--|
| **Symptom** | Dashboard **Hủy** calls cancel path; `DELETE /events/:id` → 404 “not found or access denied” for published seed events. |
| **Impact** | Cancel button may fail depending on status/ownership; needs lifecycle-aware cancel API + clear UI errors. |

---

### BUG-09 — P2: Auth rate limit blocks QA/demo (429)

| | |
|--|--|
| **Symptom** | After a few failed/rapid logins: `429 Too many login… after 1 minute`. |
| **Impact** | Demo + automated testing fragile. Raise limit in dev or exempt localhost. |

---

### BUG-10 — P3: Create-event form UX defects

| | |
|--|--|
| **Symptom** | Section titles **“1. 1. THÔNG TIN…”** (double index); start datetime control starts **invalid/empty** (a11y `DateTime invalid=true`). |
| **Impact** | Easy to submit incomplete dates; polish only. |

---

### BUG-11 — P3: Event stats empty object

| | |
|--|--|
| **Symptom** | `GET /api/organizer/events/:id/stats` returns `{}` → UI shows 0 / empty series. |
| **Impact** | Analytics cards empty even when schema exists; may be data gap or mapper gap. |

---

## Failed API matrix (observed)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| POST | `/api/admin/events/:id/approve` | **500** | BUG-01 audit `created_at` |
| POST | `/api/admin/events/:id/reject` | **500** | BUG-01 |
| GET | `/api/organizer/me` | **500** | BUG-02 `u.email` |
| GET | `/api/web/notifications` | **404** | BUG-07 |
| POST | `/events/:id/submit-draft` | **400** | when already submitted (BUG-05) |
| DELETE | `/events/:id` | **404** | some published events (BUG-08) |
| POST | `/api/organizer/register` | **500** | date/time millis pattern (related) |

---

## Fix status (2026-07-21 debug)

| ID | Status | Change |
|----|--------|--------|
| BUG-01 | **FIXED** | `audit-logger.js` + `postgres.rbac.repository.createAuditLog` use `nowDb()` |
| BUG-02 | **FIXED** | `postgres.organizer.repository` joins `auth_users` for email/roles; `created_at` insert uses `nowDb()` |
| BUG-03 | **FIXED** | `AppShell` uses real `NotificationBell` (desktop + mobile) |
| BUG-05 | N/A (by design) | Create submits unless `saveAsDraft: true` (form already sends it on “Save draft”) |
| BUG-06 | **FIXED** | `formatMoney()` for StatsGrid revenue (0 → `0 ₫`) |
| BUG-08 | **FIXED** | Cancel uses lifecycle ownership row (not flaky getEventById) |
| PAY-01 | **FIXED** | Payment no longer writes dropped `tickets.zalo_app_trans_id`; SoT = `payment_attempts` + ticket `raw_data` |
| BUG-04, 07, 09–11 | Open | Not in this fix pass |

### Verify (API after fix)

```
GET  /api/organizer/me                          → 200
POST /api/admin/events/:id/approve              → 200 Event approved and published
POST /api/admin/events/:id/reject               → 200 Event rejected
lifecycle after approve: published / status active
```

## Recommended remaining order

1. BUG-04 — mock admin pages honesty / real APIs  
2. BUG-06 — `formatPrice(0)` for revenue  
3. BUG-08 cancel path consistency  
4. BUG-09 login rate limit for local dev

---

## Chrome DevTools session notes

- Login org: `POST /api/web/auth/login` 200 → dashboard fetches stats/events/ledger 200/304.  
- Promo create: `POST /promotions/organizer` 201.  
- Admin approve: `POST /api/admin/events/evt_…/approve` **500** + on-page error alert.  
- Admin users: **no API calls** (fixture only).  

---

## Out of scope this pass

- Mobile apps  
- Payment/ZaloPay E2E  
- Full attendee purchase path  
- Fix implementation (report only; say if you want fixes next)
