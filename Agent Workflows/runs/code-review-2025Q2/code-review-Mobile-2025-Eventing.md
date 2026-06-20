# Báo cáo Rà soát Mã nguồn — Mobile Consumer (Mobile-2025-Eventing)

> **Phạm vi:** Mobile Application Consumer (`Mobile-2025-Eventing`)  
> **Ngày:** 20/06/2026  
> **Tổng file phân tích:** 247 files (.kt)

> **Ghi chú:** Báo cáo này dựa trên phân tích file và cấu trúc hiện tại. Cần rà soát code chi tiết từng file để có đánh giá đầy đủ.

---

## 1. FILE QUÁ LỚN — GOD CLASS TIỀM ẨN

| # | File | Dòng | Vấn đề |
|---|------|------|--------|
| 1 | `HomeScreen.kt` | **1005** | **GOD CLASS** — Màn hình chính quá lớn, 9+ section UI (header, search, categories, events list, booking status, v.v.) |
| 2 | `EventDetailsScreen.kt` | **735** | Chi tiết sự kiện quá dài — gom event info, ticket selection, reviews, map |
| 3 | `EventRepositoryImpl.kt` | **613** | Repository quá lớn — mapping + caching + query logic trong 1 file |

---

## 2. KIẾN TRÚC TỔNG THỂ

```
Mobile-2025-Eventing/
├── app/
│   ├── MainActivity.kt
│   └── ...
├── data/
│   └── repository/          ← EventRepositoryImpl.kt (613 dòng)
├── ui/
│   ├── screens/
│   │   ├── HomeScreen.kt    ← 1005 dòng
│   │   └── EventDetailsScreen.kt ← 735 dòng
│   ├── components/
│   └── theme/
└── di/                      ← Dependency Injection
```

### Nhận xét sơ bộ

- **Không tách ViewModel riêng cho HomeScreen** — 1005 dòng trong 1 file Screen vi phạm Single Responsibility
- **EventRepositoryImpl.kt quá lớn** — 613 dòng cho thấy repository đang làm quá nhiều việc (mapping, caching, business logic)
- **Thiếu phân tích chi tiết** — Cần rà soát từng file để phát hiện lỗi business logic, security, anti-pattern, memory leak (Compose), missing error handling

---

## 3. KHUYẾN NGHỊ NGAY

| # | Vấn đề | Mức |
|---|--------|-----|
| R1 | **Refactor HomeScreen.kt**: Tách thành HomeScreen (orchestrator) + các component nhỏ (SearchBar, CategoryGrid, EventList, BookingStatusCard) | 🟡 High |
| R2 | **Refactor EventDetailsScreen.kt**: Tách EventInfoSection, TicketSelector, ReviewList, MapSection | 🟡 High |
| R3 | **Tách EventRepositoryImpl**: Tách caching layer + mapping layer ra khỏi repository | 🟡 High |
| R4 | **Xem xét ViewModel pattern**: Đảm bảo mỗi màn hình có ViewModel riêng, không nhồi logic UI vào Screen | 🟡 Medium |

---

## 4. TỔNG HỢP FINDINGS — MOBILE CONSUMER

| Mức | Số lượng | Ghi chú |
|-----|----------|---------|
| 🟡 **High** | 3 | 3 file quá lớn cần refactor |
| 🟢 **Medium** | 1 | ViewModel pattern cần kiểm tra |
| **Tổng (ước lượng)** | **4+** | Cần rà soát chi tiết thêm |
