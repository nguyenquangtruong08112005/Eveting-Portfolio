# 03 — Normalization Analysis

## 1. Đánh giá chuẩn hóa tổng thể

DB **chưa đạt 3NF** ở nhiều entity. Phân tích theo từng dạng vi phạm.

## 2. Vi phạm 1NF — Atomic value

### 2.1. Mảng ID trong cột (anti-pattern)
Đây là vi phạm 1NF nghiêm trọng nhất: một ô chứa tập hợp giá trị.

| Bảng | Cột | File | Vấn đề |
|---|---|---|---|
| `events` | `featured_profile_ids TEXT[]` | `010:10` | Nhiều featured profile per event |
| `events` | `category TEXT[]` | `010:11` | Multi-category |
| `events` | `tags TEXT[]` | `010:12` | Multi-tag |
| `user_profiles` | `roles TEXT[]` | `008:16` | Multi-role (cũ) |
| `user_profiles` | `followed_profile_ids TEXT[]` | `008:18` | Multi-follow |
| `user_profiles` | `history_event_ids TEXT[]` | `008:19` | Multi-event history |
| `user_profiles` | `fcm_tokens TEXT[]` | `008:26` | Multi-device token |
| `featured_profiles` | `genres TEXT[]` | `012:10` | Multi-genre |
| `auth_users` | `roles TEXT[]` | `002:20` | Multi-role (cũ) |
| `organization_memberships` | `permissions_override TEXT[]` | `017:45` | Override permissions |

**Tác động:**
- Không thể JOIN hiệu quả — phải dùng `ANY()`/`@>` operator.
- Không có referential integrity — ID trong array không FK được.
- Update array atomic lock cả row → contention.
- Row phình khi array lớn (user theo dõi 10k profile → row vài KB).
- Không thể thêm metadata per relationship (ví dụ "followed at", "featured order").

**Khuyến nghị:**
- `events.featured_profile_ids` → bảng `event_featured_profiles(event_id, featured_profile_id, display_order, added_at)`.
- `user_profiles.followed_profile_ids` → bảng `user_follows(follower_id, followee_id, followed_at)`.
- `user_profiles.history_event_ids` → bảng `user_event_history(user_id, event_id, attended_at, ticket_id)`.
- `user_profiles.fcm_tokens` → bảng `user_devices(user_id, fcm_token, device_id, platform, last_active_at)`.
- `events.category`/`events.tags` → giữ array (tag là tập hợp label, không cần entity riêng) HOẶC tách `tags` + `event_tags` nếu cần metadata.
- `roles` → bỏ TEXT[], dùng `user_roles(user_id, role_id)` bảng trung gian.

### 2.2. JSONB chứa entity con
JSONB không vi phạm 1NF về mặt lý thuyết (PostgreSQL JSONB là atomic), nhưng che giấu structure không chuẩn hóa:

| Bảng | Cột | Entity con ẩn | Nên tách |
|---|---|---|---|
| `venues` | `data JSONB` | address, capacity, lat, lng, city, amenities | tách cột |
| `events` | `ticket_types JSONB` | danh sách ticket type (name, price, qty) | `event_ticket_types` bảng |
| `events` | `sponsors JSONB` | danh sách sponsor (name, logo, tier) | `event_sponsors` bảng |
| `events` | `recurring_rule JSONB` | RRULE structure | giữ JSONB (OK) |
| `events` | `location JSONB` | lat, lng, address | tách cột |
| `analytics` | `tickets_sold JSONB` | breakdown theo ticket type | `analytics_ticket_breakdown` |
| `analytics` | `daily_sales JSONB` | time series | `analytics_daily_sales` |
| `analytics` | `views_over_time JSONB` | time series | `analytics_views_daily` |
| `user_profiles` | `matching_preferences JSONB` | preferences object | giữ JSONB (OK) |
| `user_profiles` | `shared_media JSONB` | list of media | `user_shared_media` bảng |
| `user_profiles` | `organizer_info JSONB` | organizer details | đã có `organizer_profiles` |
| `promotions` | `data JSONB` | discount rules | tách cột |
| `membership_tiers` | `perks JSONB` | list of perks | giữ JSONB (OK) |

**Đặc biệt nguy hiểm:**
- `events.ticket_types JSONB` — đây là entity quan trọng (kiểu vé), không thể query "tất cả event có vé VIP" mà không seq scan + JSONB extract. Nên tách thành:
  ```sql
  CREATE TABLE event_ticket_types (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price NUMERIC NOT NULL,
      quantity INT NOT NULL,
      sold_count INT NOT NULL DEFAULT 0,
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX idx_event_ticket_types_event ON event_ticket_types(event_id);
  ```

## 3. Vi phạm 2NF — Partial dependency

### 3.1. Composite key với dependency từng phần
Hầu hết PK là `TEXT` đơn → không vi phạm 2NF. Ngoại lệ:

- `role_permissions(role_id, permission_id)` (`017:24-28`): PK composite, không có cột non-key → OK.
- `organization_memberships` có `UNIQUE(organization_id, user_id)` nhưng PK là `id TEXT` → không vi phạm.

### 3.2. Dependency bắc cầu qua non-key
- `order_items.event_name` (`019:33`) — phụ thuộc `event_id` (non-key), không phụ thuộc `order_item_id` (PK). Vi phạm 3NF.
  - Lý do: snapshot để order history hiển thị đúng tên cũ.
  - Giải pháp: chấp nhận (đã có lý do business), nhưng document rõ "snapshot field, không update".

- `events.venue_name`, `events.city` (`010:20-21`) — phụ thuộc `venue_id` (non-key). Vi phạm 3NF.
  - Lý do:optimize read (không JOIN venue).
  - Vấn đề: không sync → venue đổi tên, event vẫn tên cũ.
  - Giải pháp: thêm trigger sync HOẶC bỏ cột, JOIN khi cần.

## 4. Vi phạm 3NF — Transitive dependency

### 4.1. Denormalize không có sync mechanism

| Bảng | Cột | Phụ thuộc bắc tiếp | Nguồn sự thật |
|---|---|---|---|
| `events` | `venue_name`, `city` | qua `venue_id` | `venues.data` JSONB |
| `order_items` | `event_name` | qua `event_id` | `events.name` |
| `tickets` | `organizer_id` | qua `event_id` | `events.organizer_id` |
| `user_profiles` | `followers_count` | qua `followed_profile_ids` array | array itself |
| `user_profiles` | `following_count` | qua `followed_profile_ids` (đếm) | array itself |
| `events` | `min_price` | qua `ticket_types` JSONB | JSONB |
| `tickets` | `unit_price`, `original_price` | qua `type` | `events.ticket_types[type]` |

**Tác động:**
- Inconsistency im lặng: counter mảng lệch, min_price lệch.
- Update 1 nơi quên update nơi khác.

**Khuyến nghị:**
- Snapshot có business reason (order_items.event_name) → giữ, document rõ.
- Counter (`followers_count`) → dùng trigger HOẶC tính online (`COUNT(*)` + cache).
- `events.min_price` → trigger update khi ticket_types thay, hoặc tính online.

### 4.2. Counter không có trigger

```sql
-- user_profiles
followers_count INT NOT NULL DEFAULT 0,
following_count INT NOT NULL DEFAULT 0,
points INT NOT NULL DEFAULT 0,
```

- `followers_count` phải khớp `COUNT(*) FROM user_follows WHERE followee_id = this.id`.
- `following_count` phải khớp `COUNT(*) FROM user_follows WHERE follower_id = this.id`.
- `points` phải khớp `SUM(points) FROM loyalty_points_ledger WHERE user_id = this.id`.

Hiện không có trigger. App phải update 2 nơi (insert follow + update counter). Nếu fail giữa chừng → lệch vĩnh viễn.

**Khuyến nghị:**
- Sau khi tách `user_follows` bảng, thêm trigger AFTER INSERT/DELETE update counter.
- `points` → trigger trên `loyalty_points_ledger` update `user_memberships.points_balance`.
- Hoặc bỏ counter, tính online với cache Redis.

## 5. Denormalization chủ định (acceptable)

Một số denormalize là cố ý và chấp nhận được:

### 5.1. `reviews.user_name`, `reviews.user_profile_pic_url` (`007`)
- Snapshot user info tại thời điểm review.
- Lý do: user đổi tên, review vẫn hiển thị tên cũ (history integrity).
- OK — document rõ.

### 5.2. `order_items.event_name`, `order_items.ticket_type` (`019`)
- Snapshot cho order history.
- OK — document rõ.

### 5.3. `events.raw_data`, `tickets.raw_data`, `user_profiles.raw_data`
- Raw payload từ external source (Firebase, ZaloPay, etc.).
- OK — debug/migration purpose.

### 5.4. `payment_attempts.request_payload`, `response_payload`, `gateway_response` (`019`)
- Snapshot gateway payload.
- OK — audit/debug.

## 6. Đánh giá chuẩn hóa theo bảng

| Bảng | 1NF | 2NF | 3NF | Ghi chú |
|---|---|---|---|---|
| `venues` | FAIL | OK | FAIL | `data JSONB` chứa entity con |
| `auth_users` | FAIL | OK | OK | `roles TEXT[]` |
| `sessions` | OK | OK | OK | clean |
| `auth_tokens` | OK | OK | OK | clean |
| `user_profiles` | FAIL | OK | FAIL | arrays + counters |
| `featured_profiles` | OK (genres OK) | OK | OK | clean |
| `organizer_profiles` | OK | OK | OK | clean |
| `events` | FAIL | OK | FAIL | arrays + ticket_types JSONB + venue snapshot |
| `event_media` | OK | OK | OK | clean |
| `tickets` | OK | OK | FAIL | payment/check-in mix |
| `orders` | OK | OK | OK | clean |
| `order_items` | OK | OK | FAIL | event_name snapshot (acceptable) |
| `payment_attempts` | OK | OK | OK | clean |
| `seat_maps`/`seat_sections`/`seats` | OK | OK | OK | clean |
| `seat_holds` | OK | OK | OK | clean |
| `notifications` | OK | OK | OK | clean |
| `reviews` | OK | OK | FAIL | user_name snapshot (acceptable) |
| `promotions` | OK | OK | OK | `data JSONB` che giấu |
| `vouchers` | OK | OK | OK | clean |
| `analytics` | FAIL | OK | OK | JSONB time series |
| `organizer_settings` | OK | OK | OK | clean |
| `ledger_entries` | OK | OK | OK | clean |
| `organizer_balances` | OK | OK | OK | clean (counter, có ledger backing) |
| `platform_fees` | OK | OK | OK | singleton (anti-pattern) |
| `outbox` | OK | OK | OK | clean |
| `idempotency_keys` | OK | OK | OK | clean |
| `audit_logs` (017) | OK | OK | OK | clean |
| `audit_logs` (025) | OK | OK | OK | clean (nhưng conflict) |
| RBAC tables | FAIL | OK | OK | `permissions_override TEXT[]` |
| `membership_tiers` | OK | OK | OK | `perks JSONB` OK |
| `user_memberships` | OK | OK | OK | clean |
| `loyalty_points_ledger` | OK | OK | OK | clean |

**Tổng kết:** 6/30 bảng vi phạm 1NF (arrays), 7/30 vi phạm 3NF (denormalize không sync). Tỷ lệ vi phạm cao → cần refactor dữ liệu.

## 7. Khuyến nghị chuẩn hóa

### 7.1. Ưu tiên cao (P1)
1. Tách `events.featured_profile_ids` → `event_featured_profiles`.
2. Tách `user_profiles.followed_profile_ids` → `user_follows`.
3. Tách `user_profiles.history_event_ids` → `user_event_history`.
4. Tách `user_profiles.fcm_tokens` → `user_devices`.
5. Tách `events.ticket_types` JSONB → `event_ticket_types` bảng.
6. Thêm trigger sync counter (`followers_count`, `following_count`, `points`).

### 7.2. Ưu tiên trung (P2)
7. Tách `venues.data` JSONB → cột quan hệ.
8. Tách `analytics.tickets_sold/daily_sales/views_over_time` → bảng con.
9. Tách `events.sponsors` → `event_sponsors`.
10. Merge `promotions` + `vouchers` → `discount_codes` + `discount_code_usages`.

### 7.3. Ưu tiên thấp (P3)
11. Bỏ `auth_users.roles` + `user_profiles.roles` TEXT[], dùng `user_roles` bảng trung gian.
12. Tách `organization_memberships.permissions_override` → `membership_permission_overrides`.
13. `user_profiles.shared_media` JSONB → `user_shared_media` bảng.

### 7.4. Giữ nguyên (acceptable denormalization)
- `reviews.user_name`, `reviews.user_profile_pic_url` (snapshot).
- `order_items.event_name`, `order_items.ticket_type` (snapshot).
- `*.raw_data` (debug).
- `payment_attempts.*_payload` (audit).
- `events.recurring_rule` (RRULE).
- `user_profiles.matching_preferences` (preferences).
- `membership_tiers.perks` (perks list).
