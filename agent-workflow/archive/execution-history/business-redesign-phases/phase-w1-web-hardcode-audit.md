# Phase W1: Web Frontend Hardcode Audit

Date: 2026-06-22

## Purpose

Rà soát toàn bộ `web-2025-eventing/src` tìm các giá trị hardcode cần chuyển sang dynamic (API, DB, CMS, i18n, env config). Phân loại theo mức độ ưu tiên, đề xuất giải pháp cụ thể.

---

## 1. Critical — Dữ liệu cứng cần chuyển sang API/DB

### 1.1 Event Images — `constants.ts:88-107`

- **Vấn đề**: 20+ URL Unsplash hardcode theo `event.id`. Nếu sự kiện mới không nằm trong map → hiện fallback generic.
- **Risk**: URL Unsplash có thể 404 bất cứ lúc nào (đã xảy ra: `photo-1540575467063`).
- **Fix**: API trả `imageUrl` cho mỗi event. Frontend chỉ dùng fallback chung nếu thiếu.
- **Libraries**: Không cần thêm — chỉ cần backend sửa response.

### 1.2 Event Descriptions — `constants.ts:110-129`

- **Vấn đề**: 20+ mô tả tiếng Việt hardcode theo `event.id`. Không có bản dịch EN.
- **Risk**: Mô tả không nhất quán với dữ liệu thật trên DB.
- **Fix**: API trả `description` (có thể多语言 bằng `description_vi`, `description_en` hoặc dùng i18n key).
- **Pattern**: Localized content — mỗi field có hậu tố `_vi`, `_en`, hoặc dùng content object `{ vi: "...", en: "..." }`.

### 1.3 enrichEvent() Function — `constants.ts:132-141`

- **Vấn đề**: Function gộp硬cód `EVENT_IMAGES` + `EVENT_DESCRIPTIONS` vào event object.
- **Fix**: Xóa `enrichEvent()`. Frontend dùng data từ API trực tiếp. Fallback chỉ là generic image + `{name} — {city}`.

### 1.4 PopularDestinations — `PopularDestinations.tsx:5-26`

- **Vấn đề**: 4 destination hardcode (HCM, HN, Đà Lạt, "Vị trí khác") với Unsplash URL.
- **Fix**: Tạo endpoint `GET /api/destinations` trả danh sách thành phố + ảnh + query.
- **Libraries**: Không cần thêm.

### 1.5 ArtistStars Portraits — `ArtistStars.tsx:9-16`

- **Vấn đề**: 6 portrait URL hardcode theo tên nghệ sĩ. Nếu artist mới không có portrait → fallback generic.
- **Fix**: API `GET /api/profiles/:id` trả `imageUrl` (portrait). Loại bỏ `PORTRAITS` map.
- **Note**: ProfileService đã có — chỉ cần đảm bảo API trả `imageUrl` đúng.

### 1.6 HeroCarousel Fallback — `HeroCarousel.tsx:55`

- **Vấn đề**: Fallback image URL hardcode.
- **Fix**: Dùng env config `NEXT_PUBLIC_FALLBACK_IMAGE` hoặc constant chung.

---

## 2. High — UI Text cần i18n

### 2.1 Section Titles trong `page.tsx`

Các dòng hardcode cần thêm vào `messages/vi.json` + `messages/en.json`:

| Line | Hardcode | i18n Key đề xuất |
|------|----------|-------------------|
| 188 | "Sự kiện đặc biệt" | `home.special_events` |
| 276 | "🔥 Sự kiện xu hướng" | `home.trending_events` |
| 395 | "Nhạc sống" | `home.live_music` |
| 417 | "Sân khấu & Nghệ thuật" | `home.theater_arts` |
| 461 | "Hội thảo & Workshop" | `home.workshops` |
| 483 | "Khoa học & Công nghệ" | `home.tech_science` |
| 502 | "Điểm đến thú vị" | `home.popular_destinations` |
| 83 (ArtistStars) | "Nghệ sĩ & Diễn giả nổi bật" | `home.featured_artists` |

### 2.2 Promo Banner Content — `page.tsx`

3 banner promo (VIB, ShopeePay, HDBank) hardcode toàn bộ text + điều kiện.

- **Option A** (CMS): Tạo `GET /api/promotions` trả nội dung banner động.
- **Option B** (Config): Chuyển nội dung vào i18n + config object.
- **Recommendation**: Option A — linh hoạt nhất, marketer tự thay đổi mà không cần deploy.

### 2.3 Checkout Page Vietnamese Strings — `checkout/page.tsx`

Hardcode tiếng Việt ở nhiều nơi:

| Line | Hardcode | i18n Key |
|------|----------|----------|
| 94 | "Vui lòng nhập mã giảm giá." | `checkout.voucher_empty` |
| 102 | "Đã áp dụng voucher giảm giá 20% thành công!" | `checkout.voucher_applied_20` |
| 106 | "Đã áp dụng voucher chào mừng 10%..." | `checkout.voucher_applied_10` |
| 108 | "Mã giảm giá không hợp lệ hoặc đã hết hạn." | `checkout.voucher_invalid` |
| 116 | "Vui lòng điền đầy đủ thông tin cá nhân." | `checkout.fill_info` |
| 137 | "Không nhận được mã vé từ hệ thống đặt chỗ." | `checkout.no_ticket` |
| 148 | "Hệ thống thanh toán không trả về liên kết giao dịch." | `checkout.no_payment_url` |
| 151 | "Phương thức thanh toán... chưa được cấu hình." | `checkout.payment_not_configured` |
| 163 | "Đang tải hóa đơn đặt vé..." | `checkout.loading` |
| 175 | "Không tìm thấy thông tin sự kiện" | `checkout.event_not_found` |
| 183 | "Quay lại trang chủ" | `checkout.back_home` |

### 2.4 ArtistStars Title — `ArtistStars.tsx:83`

- Hardcode "Nghệ sĩ & Diễn giả nổi bật" → i18n key.

### 2.5 HeroCarousel Tags — `HeroCarousel.tsx:37`

- Hardcode `['RECOMMENDED', 'TRENDING', 'HOT EVENT']` → i18n array.

---

## 3. Medium — Business Logic Constants

### 3.1 Voucher Codes — `checkout/page.tsx:99-110`

- **Vấn đề**: Hardcode 2 voucher: `EVENTING20` (20%), `WELCOME10` (10%/max 50k).
- **Fix**: Tạo bảng `vouchers` trong DB với fields: `code`, `discount_type` (percent/fixed), `discount_value`, `max_discount`, `min_order`, `valid_from`, `valid_to`, `usage_limit`.
- **Backend**: `POST /api/vouchers/validate` kiểm tra hợp lệ, trả discount info.

### 3.2 Fallback Prices — `checkout/page.tsx:27,58`

- **Vấn đề**: `seatPriceParam = '150000'` và VIP fallback `300000` hardcode.
- **Fix**: Giá luôn lấy từ `event.ticketTypes` trong DB. Không fallback hardcode.

### 3.3 Category Labels — `EventCard.tsx:17-45`

- **Vấn đề**: 28 category label mappings hardcode (music → "Âm nhạc", v-pop → "V-Pop"...).
- **Fix**: API trả `category_label_vi`, `category_label_en` cho mỗi category. Hoặc dùng i18n key `categories.{slug}`.

### 3.4 Company Info in Footer — `Footer.tsx:88-108`

- **Vấn đề**: Hotline "1900.6408", email "support@eventing.vn", address hardcode.
- **Fix**: Chuyển vào env config: `NEXT_PUBLIC_HOTLINE`, `NEXT_PUBLIC_EMAIL`, `NEXT_PUBLIC_ADDRESS`.

### 3.5 Social Links — `Footer.tsx:163-166`

- **Vấn đề**: Tất cả social links đều `href="#"`.
- **Fix**: Env config: `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, etc.

### 3.6 Month Filter Hardcode — `page.tsx:97`

- **Vấn đề**: `d.getMonth() === 5 || d.getMonth() === 6` (chỉ June + July).
- **Fix**: Dùng dynamic month range từ config hoặc tự động: `getMonth() === currentMonth || getMonth() === currentMonth + 1`.

### 3.7 Day Filter Hardcode — `page.tsx:94`

- **Vấn đề**: `day === 0 || day === 5 || day === 6` (Fri/Sat/Sun) cho weekend tab.
- **Fix**: OK — đây là logic "cuối tuần" chuẩn. Không cần thay đổi.

---

## 4. Low — Design Tokens (OK to Keep)

### 4.1 Color Palette — `constants.ts:4-36`

- Các color tokens như `primary: '#F76B10'` — đây là design system, nên giữ.

### 4.2 HOLD_TIMER_SECONDS — `constants.ts:38`

- `600` (10 phút) — có thể chuyển env nhưng không cấp bách.

### 4.3 CURRENCY_LOCALE — `constants.ts:40`

- `'vi-VN'` — có thể derive từ i18n locale thay vì hardcode.

---

## 5. Summary Statistics

| Category | Count | Priority |
|----------|-------|----------|
| Hardcoded event data (images, descriptions) | 6 | 🔴 Critical |
| UI text needing i18n | 15+ strings | 🟠 High |
| Business logic constants | 7 | 🟡 Medium |
| Design tokens (keep) | 3 | 🟢 Low |
