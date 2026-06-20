# Báo cáo Rà soát Mã nguồn — Mobile Organizer (Mobile-2025-Eventing-Organizer)

> **Phạm vi:** Mobile Application Organizer (`Mobile-2025-Eventing-Organizer`)  
> **Ngày:** 20/06/2026  
> **Tổng file phân tích:** 176 files (.kt)

> **Ghi chú:** Báo cáo này dựa trên phân tích file và cấu trúc hiện tại. Cần rà soát code chi tiết từng file để có đánh giá đầy đủ.

---

## 1. FILE QUÁ LỚN — GOD CLASS TIỀM ẨN

| # | File | Dòng | Vấn đề |
|---|------|------|--------|
| 1 | `EditEventScreen.kt` | **910** | **GOD CLASS** — Màn hình chỉnh sửa sự kiện quá lớn, gom form validation, image upload, ticket types, schedule |
| 2 | `CreateEventViewModel.kt` | **648** | ViewModel quá lớn — business logic + validation + API call + caching trong 1 class |

---

## 2. KIẾN TRÚC TỔNG THỂ

```
Mobile-2025-Eventing-Organizer/
├── app/
│   └── ...
├── ui/
│   ├── screens/
│   │   └── EditEventScreen.kt     ← 910 dòng
│   └── components/
├── viewmodel/
│   └── CreateEventViewModel.kt    ← 648 dòng
└── data/
    └── repository/
```

### Nhận xét sơ bộ

- **EditEventScreen.kt thiếu ViewModel riêng** — 910 dòng trong Screen gồm UI + navigation + form handling → vi phạm Single Responsibility
- **CreateEventViewModel.kt quá lớn** — 648 dòng gom business logic, validation, API, caching → cần tách thành UseCase nhỏ hơn
- **Thiếu phân tích chi tiết** — Cần rà soát từng file để phát hiện lỗi business logic, security, anti-pattern, memory leak (Compose), missing error handling

---

## 3. KHUYẾN NGHỊ NGAY

| # | Vấn đề | Mức |
|---|--------|-----|
| R1 | **Refactor EditEventScreen.kt**: Tách thành Screen (orchestrator) + components nhỏ (EventForm, ImagePicker, TicketTypeEditor, ScheduleEditor) | 🟡 High |
| R2 | **Tách CreateEventViewModel**: Chia thành CreateEventUseCase, ValidateEventUseCase, UploadImageUseCase — mỗi class 1 responsibility | 🟡 High |
| R3 | **Bổ sung ViewModel cho EditEventScreen**: Không nên để logic UI và form handling trong Screen | 🟡 High |
| R4 | **Rà soát error handling**: ViewModel 648 dòng rất dễ thiếu try/catch hoặc không handle loading/error states | 🟡 Medium |

---

## 4. TỔNG HỢP FINDINGS — MOBILE ORGANIZER

| Mức | Số lượng | Ghi chú |
|-----|----------|---------|
| 🟡 **High** | 3 | 2 file quá lớn + thiếu ViewModel pattern |
| 🟢 **Medium** | 1 | Error handling cần kiểm tra |
| **Tổng (ước lượng)** | **4+** | Cần rà soát chi tiết thêm |
