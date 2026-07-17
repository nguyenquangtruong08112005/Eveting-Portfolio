# 02 — Architecture Review

## 1. Kiến trúc tổng thể

### 1.1. Mô hình
DB là **monolithic PostgreSQL** phục vụ toàn bộ domain. Không sharding, không read replica (không thấy config trong `postgres.client.js`).

Layered architecture:
```
HTTP Route → Module Service → Repository (postgres.*.repository.js) → pg Pool → PostgreSQL
```

### 1.2. Database client
`src/providers/database/postgres.client.js` (34 dòng):
- Singleton `Pool` lazy-init từ `config.databaseUrl`.
- `query(text, params)`: chạy statement trên pool.
- `transaction(callback)`: `BEGIN` → callback → `COMMIT`, `ROLLBACK` khi lỗi, `client.release()` trong finally.

```js
async function transaction(callback) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
```

**Đánh giá:**
- Đúng pattern transaction classic.
- KHÔNG config `pool.max` (mặc định 10) — bottleneck cho high-concurrency.
- KHÔNG config `statement_timeout`, `idle_timeout` — query dài treo pool.
- KHÔNG retry logic cho `ECONNRESET`/deadlock.
- KHÔNG có `query` log interceptor → khó debug slow query.

### 1.3. Repository pattern
Có 2 lớp repository song song:
- `src/providers/database/*.repository.js` (17 file) — domain contract.
- `src/providers/database/postgres.*.repository.js` (19 file) — postgres implementation.

Pattern tốt (hexagonal), cho phép swap DB engine. Nhưng không có in-memory/mock implementation → contract không test độc lập được.

Ví dụ `postgres.order.repository.js:8-18`:
```js
const createOrder = async (order) => {
    return transaction(async (client) => {
        await insertOrder(client, order);
        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                await insertOrderItem(client, item, order.id);
            }
        }
        return order.id;
    });
};
```

**Đánh giá:**
- Dùng `transaction()` wrapper → atomic.
- Có `createOrderInTransaction` để caller truyền tx từ ngoài → composable.
- Loop insert order_items tuần tự → N+1 query. Nên bulk insert.
- `order.id` do app gen, không có collision retry.

## 2. Domain decomposition

18 module trong `src/modules/`:

| Module | Bảng chính | Repository postgres |
|---|---|---|
| `auth` | `auth_users`, `sessions`, `auth_tokens` | `postgres.auth.repository.js` |
| `users` | `user_profiles` | `postgres.user.repository.js` |
| `events` | `events` | `postgres.event.repository.js` |
| `venues` | `venues` | `postgres.venue.repository.js` |
| `media` | `event_media` | `postgres.media.repository.js` |
| `tickets` | `tickets` | `postgres.ticket.repository.js` |
| `orders` | `orders`, `order_items`, `payment_attempts` | `postgres.order.repository.js` |
| `payments` | (dùng `payment_attempts`) | không có file riêng |
| `seat` | `seat_maps`, `seat_sections`, `seats`, `seat_holds` | `postgres.seat.repository.js` |
| `organizer` | `organizer_profiles`, `organizer_settings`, `organizer_balances` | `postgres.organizer.repository.js` |
| `featuredProfile` | `featured_profiles` | `postgres.featuredProfile.repository.js` |
| `notifications` | `notifications`, `outbox` | `postgres.notification.repository.js` |
| `reviews` | `reviews` | `postgres.review.repository.js` |
| `promotions` | `promotions` | `postgres.promotion.repository.js` |
| `vouchers` | `vouchers` | `postgres.voucher.repository.js` |
| `memberships` | `membership_tiers`, `user_memberships`, `loyalty_points_ledger` | `postgres.membership.repository.js` |
| `analytics` | `analytics` | `postgres.analytics.repository.js` |
| `admin` | `audit_logs`, `roles`, `permissions`, `organizations` | `postgres.admin.repository.js`, `postgres.rbac.repository.js` |

**Đánh giá:**
- Phân module hợp lý, ranh giới rõ.
- `payments` module không có repository postgres riêng → có thể lọt logic thanh toán vào `orders` module.
- `admin` module ôm cả RBAC + audit → nên tách `rbac` và `audit` thành module riêng.

## 3. Pattern kiến trúc tốt

### 3.1. Transactional outbox (`024_create_outbox.sql`)
```sql
CREATE TABLE outbox (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);
CREATE INDEX idx_outbox_status_retry ON outbox (status, retry_count);
```
- Đúng pattern: ghi outbox cùng transaction với domain change → đảm bảo at-least-once delivery.
- Thiếu: `next_attempt_at` cho backoff, `max_retries` config, `locked_by` cho worker claim.
- `status` không CHECK → có thể nhận giá trị bậy.
- Thiếu index trên `created_at` cho archival/purging.

### 3.2. Idempotency keys (`026_create_idempotency_keys.sql` + `020:40`)
```sql
CREATE TABLE idempotency_keys (
    key TEXT PRIMARY KEY,
    response_code INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
);
CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys (expires_at);

-- orders.idempotency_key
CREATE UNIQUE INDEX idx_orders_unique_idempotency
  ON orders (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```
- Pattern đúng: unique partial index cho idempotency ở order level.
- Đáng lẽ dùng `TIMESTAMPTZ` để partition/purge dễ.
- Thiếu `in_progress` state (hiện tại chỉ lưu response final → không chống double-request khi request đầu đang xử lý).

### 3.3. Ledger + balances (`023`, `028`)
```sql
CREATE TABLE ledger_entries (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    organizer_id TEXT NOT NULL,
    gross_amount NUMERIC NOT NULL,
    platform_fee NUMERIC NOT NULL,
    net_amount NUMERIC NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE TABLE organizer_balances (
    organizer_id TEXT PRIMARY KEY,
    balance NUMERIC NOT NULL DEFAULT 0.00,
    updated_at BIGINT NOT NULL
);

CREATE TABLE platform_fees (
    id TEXT PRIMARY KEY,  -- 'platform'
    balance NUMERIC NOT NULL DEFAULT 0.00,
    updated_at BIGINT NOT NULL
);
```
- Pattern đúng: ledger append-only, balance là materialized view của ledger.
- `platform_fees` là singleton row (`id='platform'`) → anti-pattern. Nên dùng bảng `system_balances(name TEXT PRIMARY KEY, balance, updated_at)`.
- Balance update không có optimistic lock (`version`) → concurrent update có thể mất.
- `ledger_entries` không có `reference_type`/`reference_id` cho refund/adjustment → khó reconcile.
- `organizer_id` không FK → có thể ghi ledger cho organizer không tồn tại.

### 3.4. Seat holds (`027_create_seat_holds.sql`)
```sql
CREATE TABLE seat_holds (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    held_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'held',
    created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX idx_active_seat_holds
  ON seat_holds (event_id, seat_id)
  WHERE (status = 'held');
```
- Pattern xuất sắc: partial unique index đảm bảo 1 seat chỉ có 1 active hold.
- `status` không CHECK (`held`/`released`/`sold`).
- Thiếu `released_at`/`sold_at` để audit lifecycle.
- Thiếu job/constraint auto-release hold hết hạn → phụ thuộc app cron.

### 3.5. RBAC chuẩn hóa (`017_create_rbac_tables.sql`)
```sql
roles(id, name UNIQUE, description, is_system, created_at)
permissions(id, name UNIQUE, description, resource, action, created_at)
role_permissions(role_id FK, permission_id FK, PK(role_id, permission_id))
organizations(id, name, slug UNIQUE, description, logo_url, created_at, updated_at)
organization_memberships(id, organization_id FK, user_id FK, role, permissions_override TEXT[], joined_at, UNIQUE(org, user))
```
- Đúng thiết kế RBAC chuẩn.
- `permissions_override TEXT[]` thay vì bảng trung gian → khó query/validate.
- Không có `user_roles` bảng trung gian → user thuộc role nào? Chỉ có `auth_users.roles TEXT[]` (cũ) và `organization_memberships.role` (text tự do, không FK `roles`).
- `organization_memberships.role` không FK `roles(id)` → có thể role không tồn tại.

## 4. Pattern kiến trúc yếu

### 4.1. Identity split (`auth_users` vs `user_profiles`)
Hai bảng cùng `id` (Firebase UID), không FK:
- `auth_users` (`002`): `email UNIQUE`, `name`, `password_hash`, `roles TEXT[]`, `profile_pic_url`, `bio`, `is_active`, `email_verified`, `created_at`, `updated_at`.
- `user_profiles` (`008`): `email`, `name`, `profile_pic_url`, `cover_photo_url`, `bio`, `birth_date`, `roles TEXT[]`, `followed_profile_ids`, `history_event_ids`, `followers_count`, `following_count`, `points`, `level`, `matching_preferences`, `shared_media`, `fcm_tokens`, `organizer_info`, `raw_data`, `created_at`, `updated_at`.

**Vấn đề:**
- `email`, `name`, `profile_pic_url`, `bio`, `roles` **trùng lặp** ở 2 nơi, không sync.
- `roles` lại còn default khác nhau: `auth_users`='{user}', `user_profiles`='{attendee}'.
- Không có FK → có thể `user_profiles` tồn tại cho user không có `auth_users` (orphan).
- Source of truth không rõ → bug kiểu "đổi tên ở profile nhưng email vẫn gửi tên cũ".

**Khuyến nghị:**
- Option A: Merge thành 1 bảng `users` (auth + profile). Đơn giản nhất.
- Option B: Giữ 2 bảng nhưng thêm FK `user_profiles.id REFERENCES auth_users(id) ON DELETE CASCADE`, bỏ các cột trùng (`email`, `name`, `profile_pic_url`, `bio`, `roles`) khỏi `user_profiles`, dùng JOIN khi cần.
- Option C: Tách `user_auth` (chỉ auth: email, password, is_active, email_verified) + `user_profile` (display info) + `user_settings` (preferences, fcm_tokens) — 3 bảng 1-1.

### 4.2. Promo song song (`promotions` vs `vouchers`)
- `promotions` (`005`): `organizer_id`, `code UNIQUE`, `event_id`, `valid_from BIGINT`, `valid_until BIGINT`, `usage_limit`, `used_count`, `is_public`, `data JSONB`. Tạo bởi organizer.
- `vouchers` (`030`): `code UNIQUE`, `discount_type CHECK('percent','fixed')`, `discount_value`, `max_discount`, `min_order`, `usage_limit`, `used_count`, `valid_from TIMESTAMPTZ`, `valid_to TIMESTAMPTZ`, `event_id FK`. Có vẻ là platform-level.

**Vấn đề:**
- Cùng khái niệm "mã giảm giá" nhưng 2 bảng, 2 schema, 2 timestamp type, 2 cách tổ chức.
- `tickets.applied_promo_code` (`011:14`) không nói rõ áp dụng loại nào.
- Khó reporting tổng số promo đã dùng.

**Khuyến nghị:** Merge thành `discount_codes` với `scope` ('organizer'|'platform') và `discount_type` ENUM.

### 4.3. Dual `audit_logs` (`017` vs `025`)
- `017` schema: `actor_id`, `action`, `resource_type`, `resource_id`, `metadata JSONB`, `ip_address`, `created_at TIMESTAMPTZ DEFAULT NOW()`. Có index `actor_id`, `action`, `resource_type+resource_id`, `created_at DESC`.
- `025` schema: `user_id`, `action`, `resource_type`, `resource_id`, `changes JSONB`, `ip_address`, `created_at BIGINT`. Chỉ index `user_id`, `resource_type+resource_id`.
- `025:4` dùng `DROP TABLE IF EXISTS audit_logs CASCADE` rồi CREATE lại → **xóa schema 017 và toàn bộ dữ liệu**.

**Vấn đề:**
- Schema không tương thích (actor_id vs user_id, metadata vs changes, TIMESTAMPTZ vs BIGINT).
- Migration `025` destructive → mất dữ liệu audit cũ.
- Index của `017` (action, created_at DESC) bị mất.
- Code hiện tại (audit module) phải dùng schema nào? Cần check `src/shared/audit/`.

**Khuyến nghị:** Viết migration mới (031)統 nhất schema. Giữ `actor_id` (rộng hơn `user_id`, có thể là system/admin), `metadata JSONB`, `TIMESTAMPTZ`. Backfill dữ liệu cũ nếu có.

### 4.4. `tickets` god table
`tickets` (`011` + `015` + `019`) có 22 cột:
- Identity: `id`, `event_id`, `user_id`, `organizer_id`
- Type/price: `type`, `price`, `original_price`, `quantity`, `unit_price`, `applied_promo_code`
- Seat: `seat`
- QR: `qr_code`
- Status: `status`, `check_in_count`, `last_check_in_at`, `checked_in_at`
- Payment: `zalo_app_trans_id`, `payment_status`, `last_payment_attempt`, `payment_time`
- Order link: `order_id`, `order_item_id`, `payment_attempt_id`
- Group: `group_id`
- Time: `purchase_date`, `updated_at`
- Raw: `raw_data JSONB`

**Vấn đề:**
- Trộn 4 concern: ticket identity, check-in, payment, order linkage.
- Payment status replicate với `orders.status` và `payment_attempts.status`.
- Check-in có `checked_in_at` (single) nhưng cũng có `check_in_count` + `last_check_in_at` (multi) → mâu thuẫn semantic.
- Sửa 1 concern (ví dụ thêm payment method) phải ALTER bảng → lock.

**Khuyến nghị:** Tách thành:
- `tickets`: identity + type + seat + status.
- `ticket_check_ins`: 1 row per check-in event (thay `check_in_count`).
- `ticket_qr_codes`: QR data (có thể rotate).
- Payment bỏ khỏi tickets, query qua `payment_attempts`.

### 4.5. `venues` JSONB blob
```sql
CREATE TABLE venues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- Toàn bộ thông tin venue (address, capacity, lat/lng, city, district, type, amenities) nằm trong `data JSONB`.
- Không query được theo city/capacity mà không seq scan + JSONB extract.
- `events.venue_id` không FK.
- `events.city`, `events.venue_name` đã snapshot → có thể inconsistent.

**Khuyến nghị:** Tách `data` thành cột quan hệ: `address TEXT`, `city TEXT`, `district TEXT`, `lat NUMERIC`, `lng NUMERIC`, `capacity INT`, `country_code TEXT`, `timezone TEXT`, `amenities JSONB` (giữ JSONB cho phần mở rộng).

## 5. Đánh giá tổng thể kiến trúc

| Khía cạnh | Điểm | Nhận xét |
|---|---|---|
| Domain decomposition | 8/10 | Module rõ, ranh giới tốt |
| Repository pattern | 7/10 | Hexagonal, nhưng thiếu mock |
| Transactional pattern | 8/10 | Outbox/idempotency/ledger/seat-hold |
| Identity model | 4/10 | auth_users vs user_profiles split |
| Promo model | 4/10 | promotions vs vouchers trùng |
| Audit model | 3/10 | Dual schema + destructive migration |
| Tickets model | 4/10 | God table, mix concern |
| Venues model | 3/10 | JSONB blob, không query được |

**Điểm kiến trúc tổng: 5.1/10** — Nền móng pattern tốt nhưng thực thi có nhiều sai sót ở entity modeling.
