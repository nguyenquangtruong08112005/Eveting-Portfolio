# Báo cáo Rà soát Mã nguồn — Server-2025-Eventing

> **Phạm vi:** Backend (`Server-2025-Eventing`)  
> **Ngày:** 20/06/2026  
> **Tổng file phân tích:** ~118 files

---

## 1. FILE QUÁ LỚN

| # | File | Dòng |
|---|------|------|
| 1 | `postgres.order.repository.js` | 662 |
| 2 | `tickets/application/service.js` | 613 |
| 3 | `postgres.event.repository.js` | 537 |
| 4 | `postgres.user.repository.js` | 495 |
| 5 | `auth/application/service.js` | 416 |
| 6 | `events/application/service.js` | 393 |
| 7 | `postgres.rbac.repository.js` | 354 |

---

## 2. ĐÁNH GIÁ CẤU TRÚC THƯ MỤC

### 2.1 Ưu điểm
- Module layout rõ ràng: `api/controller + routes` | `application/service + helpers` | `domain/` | `index.js`
- Shared middleware, config, errors tách biệt tốt
- Provider pattern cho database, storage, notification, cache, auth

### 2.2 Nhược điểm

| Vấn đề | Mô tả | Mức |
|--------|-------|-----|
| **Alias bootstrap hack** | `alias-bootstrap.js` monkey-patch `Module._resolveFilename` — không ổn định, fragile khi upgrade Node.js | 🔴 Critical |
| **Dual repository layers** | Vừa có `event.repository.js` vừa có `postgres.event.repository.js` — gây nhầm lẫn, khó biết cái nào đang dùng | 🟡 High |
| **Archive legacy** | `archive/legacy-shims/` chứa 80+ file copy của module cũ — dead code, nhưng không ai biết có dùng không | 🟡 High |
| **Controller inconsistency** | 50% dùng `asyncHandler`, 50% dùng `try/catch` thủ công → một số endpoint bypass global error handler | 🟡 High |
| **Missing error boundaries** | Không có `error.js` global handler pattern cho từng module | 🟡 Medium |
| **N+1 queries pattern phổ biến** | organizer service, notification service, reviews service đều có N+1 | 🟡 High |
| **Side-effect khi import** | `logger/index.js` override `console` ngay khi require, `server.js` gọi `dotenv.config()` — ai import riêng sẽ gặp bug | 🟡 Medium |

---

## 3. SECURITY — 🚨 14 vấn đề

| # | File | Dòng | Vấn đề | Mức |
|---|------|------|--------|-----|
| S1 | `auth/application/service.js` | 167 | `Math.random()` tạo password social login — không an toàn mật mã | 🔴 Critical |
| S2 | `auth/application/service.js` | 229 | `AUTH_SOCIAL_DEV_BYPASS` — attacker đăng nhập bằng email cố định không cần Google token | 🔴 Critical |
| S3 | `featuredProfile/controller.js` | 33 | **Privilege Escalation**: `ownerUserId` từ request body → attacker claim profile người khác | 🔴 Critical |
| S4 | `socket-server.js` | 24 | Hardcoded JWT secret fallback trong source code (`'dev_access_token_secret...'`) | 🔴 Critical |
| S5 | `promotions/application/service.js` | 100 | Spread entire promo object vào response → leak `usageLimit`, `usedCount` | 🔴 Critical |
| S6 | `postgres.auth.repository.js` | 23-36 | Expose `password_hash` trong result — có thể leak ra log/response | 🔴 Critical |
| S7 | `postgres.user.repository.js` | 209-449 | **SQL Injection via string concatenation**: column names từ key không validate | 🔴 Critical |
| S8 | `auth/application/service.js` | 241 | `idToken` truyền qua query param → log server lộ Google token | 🟡 High |
| S9 | `auth/application/service.js` | 286 | Facebook `app_secret` trong URL query param → lộ trong server logs | 🟡 High |
| S10 | `env.config.js` | 6-9 | JWT secrets không validate → nếu thiếu, auth vẫn chạy với secret rỗng | 🟡 High |
| S11 | `auth/middleware.js` | 9-13 | Khi authProvider='backend', trust roles từ JWT không verify DB — role escalation | 🟡 High |
| S12 | `auth/api/routes.js` | 10 | Password chỉ check `notEmpty`, không check độ dài tối thiểu | 🟡 High |
| S13 | `tickets/api/routes.js` | 9-55 | Không rate limiting trên bất kỳ endpoint ticket nào | 🟡 High |
| S14 | `payments/api/routes.js` | 17 | `/callback` không auth, không IP whitelist, không rate limit | 🟡 High |

---

## 4. CRITICAL BUGS — 🔴 12 lỗi

| # | File | Dòng | Vấn đề | Mức |
|---|------|------|--------|-----|
| B1 | `utils/qr.generator.js` | toàn file | **File RỖNG** — `generateTicketQR` được import nhưng không export gì → runtime crash khi booking | 🔴 Critical |
| B2 | `tickets/application/service.js` | 119-161 | Shadow order: lỗi tạo order bị silent catch, ticket vẫn tạo không có order reference | 🔴 Critical |
| B3 | `tickets/application/service.js` | 225-265 | Shadow payment/ledger update bị silent catch — mất tiền, mất sổ sách | 🔴 Critical |
| B4 | `organizer/application/service.js` | 130 | `importAttendees` tự động `confirmTicketPayment` → **bypass payment flow** | 🔴 Critical |
| B5 | `payments/api/controller.js` | 59 | `handleZaloPayCallback` không wrap `asyncHandler` — synchronous throw treo request vĩnh viễn | 🔴 Critical |
| B6 | `postgres.client.js` | 5-13 | **Race condition pool init**: nhiều request đồng thời tạo nhiều pool instances | 🔴 Critical |
| B7 | `postgres.user.repository.js` | 467-474 | `addHistoryEventIdInTransaction` bỏ qua transaction param — dùng global query → mất atomic | 🔴 Critical |
| B8 | `notification/onesignal.provider.js` | 53-81 | Silent error swallowing: lỗi notif chỉ log không throw → không biết gửi thông báo failed | 🔴 Critical |
| B9 | `app.js` | 69-83 | Catch-all route `/public/:key` che giấu mọi lỗi thành 404 — storage die không ai biết | 🟡 High |
| B10 | `events/application/service.js` | 354 | `searchEvents` gọi với `date: 'upcoming'` nhưng param real là `q` → sai query | 🟡 High |
| B11 | `events/application/helpers/venue-handler.js` | 29-96 | `latitude=0` (xích đạo) bị falsy → mất geohash, sai dữ liệu | 🟡 High |
| B12 | `promotions/application/service.js` | 17-19 | Race condition: check code tồn tại rồi mới create → không transaction → duplicate code | 🟡 High |

---

## 5. GOD CLASS / SERVICE QUÁ LỚN

| File | Dòng | Vấn đề |
|------|------|--------|
| `postgres.order.repository.js` | 662 | Quản lý 5+ thực entities: orders, items, payments, ledger, settings |
| `tickets/application/service.js` | 613 | Gom booking, hold, payment, notification, QR, ledger — 8+ responsibilities |
| `postgres.event.repository.js` | 537 | Mapping phức tạp + geo query + raw_data merge |
| `postgres.user.repository.js` | 495 | User CRUD + history + profile + raw_data |
| `postgres.rbac.repository.js` | 354 | Roles + permissions + audit log |
| `app.js` | — | Route mounting không có tổ chức, authRouter mount 3 lần |

---

## 6. ANTI-PATTERNS NỔI BẬT

### 6.1 Silent Catch Blocks

| File | Dòng | Vấn đề |
|------|------|--------|
| `auth/application/service.js` | 211 | `catch (e) { /* Ignore */ }` |
| `tickets/application/service.js` | 160,265,291 | 3 shadow operations bị silent catch |
| `notification/onesignal.provider.js` | 53-81 | Silent catch — không biết notif failed |

### 6.2 N+1 Queries

| File | Dòng |
|------|------|
| `organizer/application/service.js` | 67-91 | Loop từng event gọi `getEventRawById` + `getAttendeeTicketsByEventId` |
| `organizer/application/service.js` | 114-138 | Loop từng row import attendees |

### 6.3 Missing AsyncHandler Pattern

- **Venues controller**: lines 3-19 — dùng try/catch thủ công
- **FeaturedProfile controller**: toàn bộ file — 7 handlers
- **Promotions controller**: toàn bộ file
- **Reviews controller**: toàn bộ file
- **Notifications controller**: toàn bộ file
- **Analytics controller**: toàn bộ file
- **Storage controller**: toàn bộ file

→ Các module này bypass global error handler → Express HTML error fallback

### 6.4 Monkey-patching Conflict

- `authz.middleware.js` (line 91) và `idempotency.middleware.js` (line 99) **đều** monkey-patch `res.json` — nếu dùng cả 2, middleware sau sẽ ghi đè middleware trước

### 6.5 Hành vi Inconsistent Status Mapping

| File | Giá trị | 
|------|---------|
| `events/domain/event-lifecycle.js:37` | PENDING → DRAFT |
| `admin/application/service.js:61` | PENDING → SUBMITTED |

Cùng giá trị input `PENDING` nhưng map ra output khác nhau → bug tiềm ẩn

---

## 7. CODE DUPLICATION

| File 1 | File 2 | Nội dung |
|--------|--------|----------|
| `events/helpers/event-mappers.js:17-47` | `admin/service.js:14-50` | `buildElasticData` gần giống hệt |
| `postgres.event.repository.js:40-82` | `postgres.admin.repository.js:4-46` | `rowToFirebaseDoc` copy-paste |
| `postgres.event.repository.js` | `postgres.promotion.repository.js:57` | `getEventById` copy-paste |
| `postgres.order.repository.js:310-339` | `postgres.order.repository.js:341-370` | `linkTicketToOrder` khác transaction vs không transaction |

---

## 8. DATABASE / CONCURRENCY BUGS

| # | File | Vấn đề |
|---|------|--------|
| DB1 | `postgres.client.js:5-13` | Race condition tạo Pool — nhiều instance |
| DB2 | `postgres.client.js:8` | Pool thiếu error handler — disconnect âm thầm |
| DB3 | `postgres.ticket.repository.js:135` | `getTicketInTransaction` thiếu `FOR UPDATE` |
| DB4 | `postgres.event.repository.js:84-89` | `getEventById` thiếu `FOR UPDATE` |
| DB5 | `postgres.event.repository.js:494-510` | Geo query không LIMIT — trả về triệu records |
| DB6 | `postgres.seat.repository.js:187-251` | Race condition giữa 3 query riêng lẻ |
| DB7 | `postgres.organizer.repository.js:47-78` | Update 2 bảng không transaction |
| DB8 | `postgres.media.repository.js:172-199` | Batch insert không transaction |
| DB9 | `postgres.analytics.repository.js:6-28` | `JSON.parse` không validate → crash nếu JSON hỏng |
| DB10 | `outbox-processor.js:104` | `SELECT ... LIMIT 10` không `FOR UPDATE SKIP LOCKED` |

---

## 9. BẢO MẬT — AUTH & TOKEN

| # | File | Dòng | Vấn đề |
|---|------|------|--------|
| A1 | `auth/service.js` | 335 | Token reset password gửi plain text trong email, không link secure |
| A2 | `email.helper.js` | 29 | `console.log` toàn bộ nội dung email + token ra console |
| A3 | `env.config.js` | 2 | `NODE_ENV` default 'development' → production thiếu env này sẽ bật debug mode |
| A4 | `server.js` | 10 | HTTP thuần, không HTTPS — ứng dụng xử lý payments |

---

## 10. TỔNG HỢP FINDINGS — SERVER

| Mức | Số lượng | Ghi chú |
|-----|----------|---------|
| 🔴 **Critical** | 16 | 5 bảo mật, 7 crash bugs, 5 race condition, 2 mất tiền, 2 silent data loss, 1 dead file |
| 🟡 **High** | 32 | |
| 🟢 **Medium** | ~25 | |
| 🔵 **Low** | ~12 | |
| **Tổng** | **~85** | |

### 🔴 Critical — Tóp 5 cần xử lý ngay

| # | Vấn đề | File | Hậu quả |
|---|--------|------|---------|
| 1 | **`qr.generator.js` rỗng** | `utils/qr.generator.js` | Runtime crash khi booking ticket |
| 2 | **Privilege Escalation** | `featuredProfile/controller.js` | Attacker claim profile người khác |
| 3 | **JWT secret hardcode trong source** | `socket-server.js` | Toàn bộ JWT có thể bị forge |
| 4 | **Shadow order silent catch** | `tickets/service.js` | Vé được tạo nhưng không có order → mất doanh thu |
| 5 | **SQL Injection** | `postgres.user.repository.js` | Column names từ key không validate |

---

## 11. KIẾN TRÚC THƯ MỤC

```
Server-2025-Eventing/src/
├── app.js                    ← Route mounting: authRouter mount 3 lần, catch-all 404
├── server.js                 ← HTTP thuần, không HTTPS
├── alias-bootstrap.js        ← ⚠️ Monkey-patch Node internal API
├── modules/                  ← 12 modules (tốt)
│   ├── auth/
│   ├── events/
│   ├── tickets/
│   ├── payments/
│   ├── admin/
│   ├── organizer/
│   ├── reviews/
│   ├── promotions/
│   ├── media/
│   ├── venues/
│   ├── featuredProfile/
│   ├── analytics/
│   └── notifications/
├── providers/                ← Tốt: database, cache, storage, auth, notification
│   └── database/             ← ⚠️ Dual layer (event.repository.js + postgres.event.repository.js)
├── shared/                   ← Tốt: middleware, config, errors, logger, events, audit
│   └── middleware/           ← ⚠️ Monkey-patch conflict (authz + idempotency cùng patch res.json)
├── utils/                    ← qr.generator.js RỖNG
└── jobs/                     ← reminder.job.js không kiểm tra overlap
```
