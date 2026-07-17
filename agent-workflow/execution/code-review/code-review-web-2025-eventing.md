# Báo cáo Rà soát Mã nguồn — Web Portal (web-2025-eventing)

> **Phạm vi:** Web Portal (`web-2025-eventing`)  
> **Ngày:** 20/06/2026  
> **Tổng file phân tích:** ~32 files

---

## 1. FILE QUÁ LỚN

| # | File | Dòng |
|---|------|------|
| 1 | `page.tsx` (trang chủ) | 786 |
| 2 | `checkout/page.tsx` | 476 |
| 3 | `events/[id]/page.tsx` | 469 |

---

## 2. GOD COMPONENT / PAGE QUÁ LỚN

| File | Dòng | Vấn đề |
|------|------|--------|
| `page.tsx` | 786 | 9+ section UI (hero, featured, categories, v.v.) — nên tách thành components riêng |
| `checkout/page.tsx` | 476 | Gom booking, payment, voucher, form validation — nên tách container + view |
| `events/[id]/page.tsx` | 469 | Chi tiết event + ticket selection + reviews — quá nhiều responsibility |

---

## 3. BẢO MẬT & AUTH — 🚨 4 vấn đề

| # | File | Dòng | Vấn đề | Mức |
|---|------|------|--------|-----|
| W1 | `hooks/useAuth.ts` | all | localStorage auth — không httpOnly cookie, dễ bị XSS steal token | 🔴 Critical |
| W2 | `login/page.tsx` | 44 | Auth bypass fallback — mock token cho phép login không cần server | 🔴 Critical |
| W3 | `checkout/page.tsx` | 112 | Voucher logic xử lý client-side — có thể giả mạo giảm giá | 🔴 Critical |
| W4 | `constants.ts` | 48 | `formatDate` crash khi null/undefined — không guard | 🟡 High |

---

## 4. UI / UX & ACCESSIBILITY

| # | File | Vấn đề | Mức |
|---|------|--------|-----|
| U1 | `layout.tsx` | Thiếu error boundary (`error.tsx` + `not-found.tsx`) — crash toàn bộ app nếu lỗi | 🟡 High |
| U2 | Toàn bộ form | Không `htmlFor` trên `<label>` — screen reader không đọc được | 🟡 High |
| U3 | `globals.css` + `constants.ts` | `--primary` không nhất quán (3 giá trị khác nhau) — UI lệch màu | 🟡 High |
| U4 | `globals.css` | Dual styling system (CSS class + Tailwind) — khó bảo trì | 🟡 Medium |

---

## 5. BUILD & CONFIG

| # | File | Vấn đề | Mức |
|---|------|--------|-----|
| C1 | `next.config.ts` | Trống — thiếu `images.remotePatterns`, security headers (CSP, HSTS) | 🟡 High |
| C2 | `socket.io-client` trong `package.json` | Dead dependency — không import trong bất kỳ file src/ nào | 🟢 Low |

---

## 6. DEAD CODE

| File | Dòng | Vấn đề |
|------|------|--------|
| `table.tsx` | 116 | Component không được import ở đâu trong src/ |
| `BookingDetails.tsx` | 103 | Component không được import ở đâu trong src/ |

---

## 7. TỔNG HỢP FINDINGS — WEB

| Mức | Số lượng | Ghi chú |
|-----|----------|---------|
| 🔴 **Critical** | 3 | Auth bypass, localStorage auth, voucher client-side |
| 🟡 **High** | 5 | Missing error boundary, accessibility, design token, next.config |
| 🟢 **Medium** | 1 | Dual styling system |
| 🔵 **Low** | 3 | Dead code (2 components + 1 dependency) |
| **Tổng** | **12** | |

### 🔴 Critical — Cần xử lý ngay

| # | Vấn đề | File | Hậu quả |
|---|--------|------|---------|
| 1 | **localStorage auth** | `hooks/useAuth.ts` | XSS → mất toàn bộ session |
| 2 | **Auth bypass** | `login/page.tsx` | Ai cũng login được với mock token |
| 3 | **Voucher client-side** | `checkout/page.tsx` | Attacker giả mạo giảm giá |
