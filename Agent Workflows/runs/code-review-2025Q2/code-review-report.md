# Báo cáo Rà soát Mã nguồn tổng hợp — Eventing Platform

> **Phạm vi:** Toàn bộ hệ thống (Server + Web + Mobile Consumer + Mobile Organizer)  
> **Ngày:** 20/06/2026 (cập nhật lần 3)  
> **Tổng file phân tích:** ~573 files (118 Server + 32 Web + 247 Mobile Consumer + 176 Mobile Organizer)

Báo cáo chi tiết theo từng dự án:

| Dự án | File báo cáo |
|-------|-------------|
| Server | [`code-review-Server-2025-Eventing.md`](./code-review-Server-2025-Eventing.md) |
| Web Portal | [`code-review-web-2025-eventing.md`](./code-review-web-2025-eventing.md) |
| Mobile Consumer | [`code-review-Mobile-2025-Eventing.md`](./code-review-Mobile-2025-Eventing.md) |
| Mobile Organizer | [`code-review-Mobile-2025-Eventing-Organizer.md`](./code-review-Mobile-2025-Eventing-Organizer.md) |

---

## FILE QUÁ LỚN — TOÀN HỆ THỐNG

| # | File | Dự án | Dòng |
|---|------|-------|------|
| 1 | `HomeScreen.kt` | Mobile Consumer | 1005 |
| 2 | `EditEventScreen.kt` | Mobile Organizer | 910 |
| 3 | `page.tsx` | Web Portal | 786 |
| 4 | `EventDetailsScreen.kt` | Mobile Consumer | 735 |
| 5 | `postgres.order.repository.js` | Server | 662 |
| 6 | `CreateEventViewModel.kt` | Mobile Organizer | 648 |
| 7 | `tickets/application/service.js` | Server | 613 |
| 8 | `EventRepositoryImpl.kt` | Mobile Consumer | 613 |
| 9 | `postgres.event.repository.js` | Server | 537 |
| 10 | `postgres.user.repository.js` | Server | 495 |
| 11 | `checkout/page.tsx` | Web Portal | 476 |
| 12 | `events/[id]/page.tsx` | Web Portal | 469 |
| 13 | `auth/application/service.js` | Server | 416 |
| 14 | `events/application/service.js` | Server | 393 |
| 15 | `postgres.rbac.repository.js` | Server | 354 |

---

## CROSS-CUTTING / VẤN ĐỀ CHUNG

Các vấn đề ảnh hưởng đến nhiều hơn một dự án:

| # | Vấn đề | Dự án liên quan | Mức |
|---|--------|-----------------|-----|
| CC1 | **Thiếu xác thực API đồng bộ giữa Web và Server** — Web dùng localStorage auth, Server cũng trust JWT không verify DB | Web + Server | 🔴 Critical |
| CC2 | **Không force HTTPS ở bất kỳ dự án nào** — Server HTTP thuần, Web không có CSP/HSTS | Web + Server | 🟡 High |
| CC3 | **N+1 query pattern phổ biến** — Cả Web, Server và Mobile đều có component/service quá lớn thiếu pagination | Server + Mobile | 🟡 High |
| CC4 | **Thiếu error boundary đồng bộ** — Web không có `error.tsx`, Server có controller bypass global handler | Web + Server | 🟡 High |
| CC5 | **Dead code / dependency không dùng đến** — socket.io-client (Web), legacy-shims (Server) | Web + Server | 🟢 Medium |

---

## TỔNG HỢP FINDINGS TOÀN HỆ THỐNG

| Mức | Số lượng | Ghi chú |
|-----|----------|---------|
| 🔴 **Critical** | **22** | 16 Server + 3 Web + 0 Mobile (chưa rà chi tiết) |
| 🟡 **High** | **42+** | 32 Server + 5 Web + 3 Mobile Consumer + 3 Mobile Organizer |
| 🟢 **Medium** | **~40** | |
| 🔵 **Low** | **~20** | |
| **Tổng** | **~124+** | |

### 🔴 Critical — Tóp vấn đề nguy hiểm nhất toàn hệ thống

| # | Vấn đề | Dự án | Hậu quả |
|---|--------|-------|---------|
| 1 | **`qr.generator.js` rỗng** | Server | Runtime crash khi booking ticket |
| 2 | **Privilege Escalation** | Server | Attacker claim profile người khác |
| 3 | **JWT secret hardcode** | Server | Toàn bộ JWT có thể bị forge |
| 4 | **Shadow order silent catch** | Server | Vé tạo không order → mất doanh thu |
| 5 | **Auth bypass + localStorage** | Web | Ai cũng login được, XSS steal token |

---

> *Report tổng hợp từ 3 lần rà soát. Chi tiết theo dự án ở các file con tương ứng.*
