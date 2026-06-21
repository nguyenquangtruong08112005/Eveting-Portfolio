# Phase W1: Web Hardcode Refactor — Execution Backlog

Date: 2026-06-22

## Global Rules

- Worker: OpenCode
- Frontend: `web-2025-eventing`
- Backend: `Server-2025-Eventing`
- Mỗi slice = 1 commit + 1 smoke test
- Không đổi mobile contracts (API response shapes phải backward-compatible)
- i18n: dùng `next-intl` — keys trong `messages/vi.json` + `messages/en.json`
- Env config: `.env.local` + `next.config.ts` env vars

## Verification Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\web-2025-eventing
npx tsc --noEmit
npx next build
```

---

## Slice W1.1: i18n — Section Titles & Strings

**Files changed:**
- `web-2025-eventing/messages/vi.json`
- `web-2025-eventing/messages/en.json`
- `web-2025-eventing/src/app/page.tsx`
- `web-2025-eventing/src/components/home/ArtistStars.tsx`
- `web-2025-eventing/src/components/home/HeroCarousel.tsx`
- `web-2025-eventing/src/app/checkout/page.tsx`

**Task:** Thêm keys cho tất cả Vietnamese strings, thay thế hardcode.

### Keys to add to `vi.json`:

```json
{
  "home": {
    "special_events": "Sự kiện đặc biệt",
    "trending_events": "Sự kiện xu hướng",
    "live_music": "Nhạc sống",
    "theater_arts": "Sân khấu & Nghệ thuật",
    "workshops": "Hội thảo & Workshop",
    "tech_science": "Khoa học & Công nghệ",
    "popular_destinations": "Điểm đến thú vị",
    "featured_artists": "Nghệ sĩ & Diễn giả nổi bật",
    "see_more": "Xem thêm",
    "showing_recent": "Hiển thị các sự kiện gần nhất",
    "no_events": "Không tìm thấy sự kiện nào",
    "no_events_hint": "Hãy thử kiểm tra lại chính tả hoặc chuyển sang danh mục khác.",
    "search_results": "Kết quả tìm kiếm",
    "clear_filter": "Xóa bộ lọc",
    "events_found": "Tìm thấy {count} sự kiện cho \"{query}\"",
    "hot": "HOT",
    "tags": ["ĐỀ XUẤT", "XU HƯỚNG", "SỰ KIỆN NỔI BẬT"]
  },
  "checkout": {
    "voucher_empty": "Vui lòng nhập mã giảm giá.",
    "voucher_applied_20": "Đã áp dụng voucher giảm giá 20% thành công!",
    "voucher_applied_10": "Đã áp dụng voucher chào mừng 10% (tối đa 50k) thành công!",
    "voucher_invalid": "Mã giảm giá không hợp lệ hoặc đã hết hạn.",
    "fill_info": "Vui lòng điền đầy đủ thông tin cá nhân.",
    "no_ticket": "Không nhận được mã vé từ hệ thống đặt chỗ.",
    "no_payment_url": "Hệ thống thanh toán không trả về liên kết giao dịch.",
    "payment_not_configured": "Phương thức thanh toán bằng Thẻ quốc tế/ATM chưa được cấu hình. Vui lòng thanh toán qua ZaloPay.",
    "loading": "Đang tải hóa đơn đặt vé...",
    "event_not_found": "Không tìm thấy thông tin sự kiện",
    "event_not_found_desc": "Sự kiện bạn yêu cầu thanh toán không tồn tại hoặc đã bị hủy.",
    "back_home": "Quay lại trang chủ",
    "error_generic": "Có lỗi xảy ra khi tạo giao dịch. Vui lòng thử lại."
  }
}
```

### Keys to add to `en.json`:

```json
{
  "home": {
    "special_events": "Special Events",
    "trending_events": "Trending Events",
    "live_music": "Live Music",
    "theater_arts": "Theater & Arts",
    "workshops": "Workshops",
    "tech_science": "Science & Technology",
    "popular_destinations": "Popular Destinations",
    "featured_artists": "Featured Artists & Speakers",
    "see_more": "See more",
    "showing_recent": "Showing most recent events",
    "no_events": "No events found",
    "no_events_hint": "Try checking your spelling or switch to a different category.",
    "search_results": "Search Results",
    "clear_filter": "Clear filter",
    "events_found": "Found {count} events for \"{query}\"",
    "hot": "HOT",
    "tags": ["RECOMMENDED", "TRENDING", "HOT EVENT"]
  },
  "checkout": {
    "voucher_empty": "Please enter a voucher code.",
    "voucher_applied_20": "20% discount voucher applied successfully!",
    "voucher_applied_10": "10% welcome voucher applied (max 50k)!",
    "voucher_invalid": "Invalid or expired voucher code.",
    "fill_info": "Please fill in all personal information.",
    "no_ticket": "No ticket code received from the booking system.",
    "no_payment_url": "Payment system did not return a transaction link.",
    "payment_not_configured": "International card/ATM payment is not configured. Please pay via ZaloPay.",
    "loading": "Loading checkout...",
    "event_not_found": "Event not found",
    "event_not_found_desc": "The event you requested does not exist or has been cancelled.",
    "back_home": "Back to homepage",
    "error_generic": "An error occurred. Please try again."
  }
}
```

**Pattern:** `useTranslations('home')` trong page.tsx, `useTranslations('checkout')` trong checkout page.

**Libraries:** `next-intl` (đã có)

---

## Slice W1.2: API — Event Images & Descriptions from DB

**Files changed:**
- `Server-2025-Eventing/db/migrations/XXX_add_event_media_fields.sql`
- `Server-2025-Eventing/src/providers/database/postgres.event.repository.js`
- `Server-2025-Eventing/src/modules/events/api/routes.js`
- `web-2025-eventing/src/lib/constants.ts` (xóa EVENT_IMAGES, EVENT_DESCRIPTIONS, enrichEvent)
- `web-2025-eventing/src/app/page.tsx`
- `web-2025-eventing/src/app/checkout/page.tsx`
- `web-2025-eventing/src/components/events/EventCard.tsx`

**Task:** API trả `image_url` và `description` trực tiếp từ DB. Frontend bỏ enrichEvent().

### DB Schema

```sql
-- events table đã có: image_url, description
-- Kiểm tra và thêm nếu thiếu:
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS description_vi TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS description_en TEXT;
```

### Backend Changes

1. `event.repository.js`: Query SELECT thêm `image_url`, `description_vi`, `description_en`
2. `service.js`: Map `description` theo locale: `event['description_' + locale] || event.description || ''`
3. Response shape: `{ ...event, imageUrl: event.image_url, description: localized_description }`

### Frontend Changes

```typescript
// constants.ts — GIỮ enrichEvent NHƯNG ĐƠN GIẢN HÓA
export function enrichEvent(event: import('@/types').Event): import('@/types').Event {
  const FALLBACK_IMAGE = '/images/placeholder-event.jpg';
  return {
    ...event,
    imageUrl: event.imageUrl || FALLBACK_IMAGE,
    description: event.description || `${event.name} — sự kiện tại ${event.city || 'Việt Nam'}.`,
  };
}
```

- Xóa `EVENT_IMAGES` object (20+ entries)
- Xóa `EVENT_DESCRIPTIONS` object (20+ entries)
- `enrichEvent()` chỉ còn fallback generic

**Pattern:** Single Responsibility — API trả data, frontend chỉ display.

---

## Slice W1.3: Dynamic Destinations & Artist Portraits

**Files changed:**
- `Server-2025-Eventing/src/modules/events/api/routes.js` (hoặc routes mới)
- `web-2025-eventing/src/services/event.service.ts`
- `web-2025-eventing/src/components/home/PopularDestinations.tsx`
- `web-2025-eventing/src/components/home/ArtistStars.tsx`

### Task A: Dynamic Destinations

**Backend:** `GET /api/destinations` trả danh sách thành phố phổ biến từ DB:
```sql
SELECT city, COUNT(*) as event_count
FROM events
WHERE status = 'published' AND city IS NOT NULL
GROUP BY city
ORDER BY event_count DESC
LIMIT 10;
```

Response:
```json
{
  "destinations": [
    { "name": "Tp. Hồ Chí Minh", "query": "Hồ Chí Minh", "imageUrl": "..." },
    { "name": "Hà Nội", "query": "Hà Nội", "imageUrl": "..." }
  ]
}
```

**Frontend:** `PopularDestinations.tsx` fetch từ API thay vì hardcode.

### Task B: Artist Portraits from Profile

**Backend:** ProfileService.list() đã trả `imageUrl`. Kiểm tra DB có portrait không.

**Frontend:** `ArtistStars.tsx` bỏ `PORTRAITS` map, dùng `profile.imageUrl` trực tiếp:
```typescript
const imageUrl = profile.imageUrl || '/images/placeholder-avatar.jpg';
```

**Pattern:** API-driven content — frontend fetch, render, fallback khi thiếu.

---

## Slice W1.4: Voucher System

**Files changed:**
- `Server-2025-Eventing/db/migrations/XXX_create_vouchers.sql`
- `Server-2025-Eventing/src/providers/database/postgres.voucher.repository.js`
- `Server-2025-Eventing/src/modules/vouchers/api/routes.js`
- `web-2025-eventing/src/services/ticket.service.ts`
- `web-2025-eventing/src/app/checkout/page.tsx`

### DB Schema

```sql
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL,
  max_discount NUMERIC,
  min_order NUMERIC DEFAULT 0,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  event_id UUID REFERENCES events(id), -- optional: per-event voucher
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API

- `POST /api/vouchers/validate` — body: `{ code, orderTotal }` → response: `{ valid, discountType, discountValue, maxDiscount, message }`

### Frontend

```typescript
// checkout/page.tsx — thay hardcoded voucher logic
const handleApplyVoucher = async () => {
  const result = await TicketService.validateVoucher(voucherCode, subtotal);
  if (result.valid) {
    setDiscount(result.discountAmount);
    setVoucherSuccess(result.message);
  } else {
    setVoucherError(result.message);
  }
};
```

**Pattern:** Repository Pattern + Service Layer cho voucher validation.

**Libraries:** Không cần thêm — PostgreSQL +现有 infrastructure.

---

## Slice W1.5: Env Config — Company Info & Social Links

**Files changed:**
- `web-2025-eventing/.env.local`
- `web-2025-eventing/next.config.ts`
- `web-2025-eventing/src/components/layout/Footer.tsx`

### Env Variables

```env
# Company
NEXT_PUBLIC_HOTLINE=1900.6408
NEXT_PUBLIC_HOTLINE_HOURS=Thứ 2 - Chủ Nhật (8:00 - 23:00)
NEXT_PUBLIC_EMAIL=support@eventing.vn
NEXT_PUBLIC_OFFICE_ADDRESS=Tầng 12, Tòa nhà Viettel, 285 Cách Mạng Tháng Tám, Phường 12, Quận 10, TP. Hồ Chí Minh
NEXT_PUBLIC_COMPANY_NAME=Công ty TNHH Eventing

# Social
NEXT_PUBLIC_FACEBOOK_URL=https://facebook.com/eventing
NEXT_PUBLIC_INSTAGRAM_URL=https://instagram.com/eventing
NEXT_PUBLIC_TIKTOK_URL=https://tiktok.com/@eventing
NEXT_PUBLIC_LINKEDIN_URL=https://linkedin.com/company/eventing
```

### Frontend

```typescript
// Footer.tsx
const hotline = process.env.NEXT_PUBLIC_HOTLINE;
const email = process.env.NEXT_PUBLIC_EMAIL;
const socialLinks = {
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL,
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL,
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL,
};
```

**Pattern:** Environment Variables cho cấu hình không thay đổi theo locale.

---

## Slice W1.6: Dynamic Category Labels

**Files changed:**
- `Server-2025-Eventing/src/modules/events/api/routes.js`
- `web-2025-eventing/src/components/events/EventCard.tsx`

### API

Response event trả thêm `categoryLabels`:
```json
{
  "categoryLabels": {
    "vi": "Âm nhạc",
    "en": "Live Music"
  }
}
```

### Frontend

```typescript
// EventCard.tsx — thay CATEGORY_LABELS map
const categoryLabel = event.categoryLabels?.[locale] || localizeCategory(cat);
```

Hoặc đơn giản hơn: i18n key `categories.{slug}` trong messages.

**Pattern:** Localized Content — mỗi field có hậu tố `_vi`, `_en`.

---

## Slice W1.7: Dynamic Month Filter

**Files changed:**
- `web-2025-eventing/src/app/page.tsx`

### Fix

```typescript
// page.tsx:97 — thay hardcode month 5, 6
const tabFilteredEvents = events.filter((e) => {
  const d = new Date(e.date);
  if (weekendTab === 'weekend') {
    const day = d.getDay();
    return day === 0 || day === 5 || day === 6;
  } else {
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
}).slice(0, 4);
```

---

## Execution Order

| Slice | Effort | Dependencies | Estimate |
|-------|--------|--------------|----------|
| W1.1 i18n | Low | None | 1-2h |
| W1.2 Event Images/API | Medium | Backend schema | 2-3h |
| W1.3 Destinations/Artists | Medium | Backend endpoints | 2h |
| W1.4 Voucher System | High | Backend DB + API | 3-4h |
| W1.5 Env Config | Low | None | 30min |
| W1.6 Category Labels | Low | i18n (W1.1) | 30min |
| W1.7 Month Filter | Low | None | 15min |

**Total estimate:** ~10-12h

**Recommended order:** W1.1 → W1.5 → W1.7 → W1.2 → W1.3 → W1.6 → W1.4

---

## Libraries & Tools

| Library | Purpose | Already Installed |
|---------|---------|-------------------|
| `next-intl` | i18n translations | ✅ |
| `next/image` | Optimized images | ✅ |
| `zod` | API validation (vouchers) | Check |
| `drizzle-orm` | Type-safe DB queries | Check |
| PostgreSQL | Voucher/destination storage | ✅ |

## Design Patterns

| Pattern | Usage |
|---------|-------|
| Repository Pattern | Voucher validation, destination queries |
| Service Layer | API response enrichment, locale detection |
| Strategy Pattern | Discount calculation (percent vs fixed) |
| Environment Variables | Config that doesn't change per locale |
| Localized Content | `field_vi`, `field_en` in DB |
| Fallback Chain | `API data → generic fallback → placeholder` |
