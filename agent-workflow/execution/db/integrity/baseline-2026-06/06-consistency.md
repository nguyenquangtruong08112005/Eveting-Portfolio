# 06 — Consistency

Phân tích các vấn đề nhất quán dữ liệu: timestamp type, duplicate fields, dual schemas, replication sources.

## 1. Timestamp Type Lộn xộn — Vấn đề lớn nhất ⚠️

### 1.1. Bảng dùng `TIMESTAMPTZ DEFAULT NOW()` (10 bảng)

| Bảng | Cột | File |
|---|---|---|
| `venues` | `created_at` | `001:5` |
| `auth_users` | `created_at`, `updated_at` | `002:24-25` |
| `sessions` | `created_at`, `expires_at`, `revoked_at` | `002:34-36` |
| `auth_tokens` | `created_at`, `expires_at`, `used_at` | `016:9-11` |
| `roles` | `created_at` | `017:12` |
| `permissions` | `created_at` | `017:21` |
| `organizations` | `created_at`, `updated_at` | `017:36-37` |
| `organization_memberships` | `joined_at` | `017:46` |
| `audit_logs` (017 schema) | `created_at` | `017:58` |
| `featured_profiles` | `created_at`, `updated_at` | `012:13-14` |
| `organizer_profiles` (một phần) | `updated_at` | `013:13` |
| `vouchers` | `valid_from`, `valid_to`, `created_at` | `030:11-14` |

### 1.2. Bảng dùng `BIGINT` (epoch millis, không default) (20+ bảng)

| Bảng | Cột | File |
|---|---|---|
| `notifications` | `created_at` | `003:9` |
| `event_media` | `created_at` | `004:13` |
| `promotions` | `valid_from`, `valid_until`, `created_at` | `005:6-7,12` |
| `reviews` | `created_at` | `006:12` |
| `events` | `date`, `end_date`, `created_at`, `last_updated_at` | `010:13-14,34-35` |
| `tickets` | `purchase_date`, `last_check_in_at`, `checked_in_at`, `payment_time`, `updated_at` | `011:18,21-23` |
| `orders` | `expires_at`, `paid_at`, `cancelled_at`, `created_at`, `updated_at` | `019:18-22` |
| `order_items` | `created_at` | `019:40` |
| `payment_attempts` | `completed_at`, `created_at`, `updated_at` | `019:60-62` |
| `analytics` | `last_updated_at` | `014:13` |
| `organizer_settings` | `created_at` | `023:7` |
| `ledger_entries` | `created_at` | `023:17` |
| `outbox` | `created_at`, `updated_at` | `024:11-12` |
| `audit_logs` (025 schema) | `created_at` | `025:14` |
| `idempotency_keys` | `created_at`, `expires_at` | `026:10-11` |
| `seat_maps` | `created_at` | `022:9` |
| `seat_sections` | `created_at` | `022:17` |
| `seats` | `created_at` | `022:26` |
| `seat_holds` | `held_at`, `expires_at`, `created_at` | `027:9-12` |
| `organizer_balances` | `updated_at` | `028:7` |
| `platform_fees` | `updated_at` | `028:13` |
| `membership_tiers` | `created_at` | `029:7` |
| `user_memberships` | `updated_at` | `029:15` |
| `loyalty_points_ledger` | `created_at` | `029:24` |
| `organizer_profiles` (một phần) | `created_at` | `013:12` |
| `user_profiles` (một phần) | `created_at` | `008:17` |

### 1.3. Bảng trộn lẫn 2 loại (3 bảng) ⚠️⚠️⚠️

#### `organizer_profiles`
```sql
-- 013_create_organizer_profiles.sql
created_at BIGINT,                              -- epoch millis, không default
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- native timestamp
```

#### `user_profiles`
```sql
-- 008_create_user_profiles.sql
created_at BIGINT NOT NULL,                     -- epoch millis, không default
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- native timestamp
```

#### `vouchers`
```sql
-- 030_create_vouchers.sql
valid_from TIMESTAMPTZ,        -- native
valid_to TIMESTAMPTZ,          -- native
created_at TIMESTAMPTZ DEFAULT NOW(),  -- native
```
(vouchers đồng nhất TIMESTAMPTZ nhưng lệch với promotions cùng domain)

### 1.4. Tác động

1. **Không thể query thống nhất:**
   ```sql
   -- Lấy records tạo hôm qua
   -- Bảng TIMESTAMPTZ:
   WHERE created_at >= NOW() - INTERVAL '1 day'
   -- Bảng BIGINT:
   WHERE created_at >= EXTRACT(EPOCH FROM NOW() - INTERVAL '1 day') * 1000
   ```
   App phải biết từng bảng dùng loại nào.

2. **Không default cho BIGINT:**
   - App phải set `Date.now()` mỗi INSERT.
   - Quên → NULL (nếu cột cho phép) hoặc fail (NOT NULL).
   - Migration backfill không set default → NULL.

3. **Không thể partition native:**
   - PostgreSQL RANGE partitioning works best với `TIMESTAMPTZ`/`DATE`.
   - BIGINT partitioning phải dùng expression, phức tạp hơn.

4. **Time zone handling:**
   - `TIMESTAMPTZ` tự handle timezone (UTC trong DB).
   - BIGINT epoch millis là UTC tuyệt đối, nhưng app phải convert khi hiển thị.

5. **Index efficiency:**
   - `TIMESTAMPTZ` sort tự nhiên theo time.
   - BIGINT cũng sort được nhưng là số, không dùng được date functions.

### 1.5. Khuyến nghị

**Chuẩn hóa toàn bộ sang `TIMESTAMPTZ DEFAULT NOW()`:**

Migration template:
```sql
-- 032_normalize_timestamps.sql
ALTER TABLE organizer_profiles
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE user_profiles
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

-- ... tương tự cho 20+ bảng khác
```

**Lưu ý:**
- Cần data migration cho cột có dữ liệu NULL: `COALESCE(to_timestamp(created_at / 1000.0), NOW())`.
- App code phải đổi: không set `Date.now()`, để DB default.
- BIGINT millis → TIMESTAMPTZ mất milisecond precision (chỉ giữ microsecond, OK).
- Cột `events.date`, `events.end_date` là "event time" (lịch sự kiện) — có thể giữ BIGINT hoặc đổi sang TIMESTAMPTZ tùy preference (đổi sang TIMESTAMPTZ để đồng bộ).

**Migration app song song:**
- Viết repository wrapper: nếu cột đã có default NOW(), không set trong INSERT.
- Hoặc dùng feature flag: app support cả BIGINT và TIMESTAMPTZ trong 1 release, rồi migrate DB, rồi remove support BIGINT.

## 2. Roles Replicate ở 3 Nơi

### 2.1. Hiện trạng

| Vị trí | Cột | Default | File |
|---|---|---|---|
| `auth_users.roles TEXT[]` | `'{user}'` | `002:20` |
| `user_profiles.roles TEXT[]` | `'{attendee}'` | `008:16` |
| `roles` table (normalized) | - | `017:7` |
| `organization_memberships.role TEXT` | `'member'` | `017:44` |

### 2.2. Vấn đề

1. **Default khác nhau:** `auth_users` mặc định `user`, `user_profiles` mặc định `attendee` → user mới có role là `user` hay `attendee`?
2. **Không sync:** Thêm role `admin` cho `auth_users` không tự update `user_profiles` → app đọc `user_profiles.roles` không thấy admin.
3. **`organization_memberships.role` không FK `roles(id)`** → có thể set role "foobar".
4. **TEXT[] không constraint:** có thể `'{user, attendee, random_string}'`.
5. **RBAC chuẩn hóa (`roles` table) không được dùng** — `auth_users.roles` vẫn là source of truth thực tế trong code.

### 2.3. Khuyến nghị

**Bước 1:** Quyết định source of truth.
- Option A: `organization_memberships` (RBAC chuẩn, multi-org). User thuộc org nào → có role gì trong org đó.
- Option B: `user_roles` bảng trung gian (global role, không gắn org).

**Bước 2:** Bỏ TEXT[] roles khỏi `auth_users` và `user_profiles`.

**Bước 3:** Backfill:
```sql
INSERT INTO user_roles (user_id, role_id)
SELECT id, 'role_user' FROM auth_users WHERE 'user' = ANY(roles);
-- Tương tự cho organizer, admin.
```

**Bước 4:** Code change: tất cả `auth.users.roles.includes('admin')` → query `user_roles` + `role_permissions`.

## 3. Payment Status Replicate

### 3.1. Hiện trạng

| Bảng | Cột | Mục đích | File |
|---|---|---|---|
| `tickets.payment_status TEXT` | Trạng thái thanh toán ticket | `015:6` |
| `tickets.zalo_app_trans_id TEXT` | ZaloPay trans id | `015:5` |
| `tickets.last_payment_attempt TEXT` | ID attempt cuối | `015:7` |
| `tickets.payment_time BIGINT` | Thời gian thanh toán | `011:23` |
| `orders.status TEXT` | Trạng thái đơn hàng (pending_payment/paid/...) | `019:10` |
| `orders.paid_at BIGINT` | Thời gian order paid | `019:19` |
| `payment_attempts.status TEXT` | Trạng thái attempt (pending/succeeded/failed) | `019:49` |
| `payment_attempts.completed_at BIGINT` | Thời gian attempt completed | `019:60` |
| `payment_attempts.provider_order_id TEXT` | Provider (ZaloPay) order id | `020:26` |
| `payment_attempts.provider_transaction_id TEXT` | Provider trans id | `020:27` |

### 3.2. Vấn đề

1. **3 nguồn sự thật cho payment status:** `tickets.payment_status`, `orders.status` (đoán từ `pending_payment`/`paid`), `payment_attempts.status`.
2. **ZaloPay trans id ở 2 nơi:** `tickets.zalo_app_trans_id` và `payment_attempts.provider_transaction_id`.
3. **Payment time ở 3 nơi:** `tickets.payment_time`, `orders.paid_at`, `payment_attempts.completed_at`.
4. **Update 1 nơi quên nơi khác:** Payment succeeded → update `payment_attempts.status='succeeded'` + `completed_at`, nhưng quên update `tickets.payment_status='paid'` + `orders.status='paid'` + `paid_at`.

### 3.3. Khuyến nghị

**Source of truth:** `payment_attempts` (append-only, có đầy đủ context).

**Tickets/Orders chỉ lưu reference, không lưu status:**
- `tickets.payment_attempt_id TEXT REFERENCES payment_attempts(id)` — attempt hiện tại.
- `orders.status` derive từ `payment_attempts.status` mới nhất (query khi cần).

**Hoặc:** Giữ `orders.status` làm order-level state machine, nhưng trigger sync từ `payment_attempts`:
```sql
CREATE FUNCTION sync_order_status() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'succeeded' THEN
        UPDATE orders SET status = 'paid', paid_at = NEW.completed_at WHERE id = NEW.order_id;
        UPDATE tickets SET payment_status = 'paid', payment_time = NEW.completed_at
        WHERE order_id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_order_status
AFTER INSERT OR UPDATE ON payment_attempts
FOR EACH ROW EXECUTE FUNCTION sync_order_status();
```

**Bỏ:** `tickets.payment_status`, `tickets.zalo_app_trans_id`, `tickets.last_payment_attempt`, `tickets.payment_time` (query qua `payment_attempts` khi cần).

## 4. Events Status vs Lifecycle Status

### 4.1. Hiện trạng

```sql
-- 010_create_events.sql:27
status TEXT DEFAULT 'pending',

-- 018_add_lifecycle_status.sql:5
lifecycle_status TEXT DEFAULT NULL,
```

Migration `018:9-16` backfill:
```sql
UPDATE events SET lifecycle_status = CASE
    WHEN status = 'pending'   THEN 'submitted'
    WHEN status = 'active'    THEN 'published'
    WHEN status = 'rejected'  THEN 'rejected'
    WHEN status = 'cancelled' THEN 'cancelled'
END WHERE lifecycle_status IS NULL;
```

### 4.2. Vấn đề

1. **2 cột trạng thái song song** với giá trị khác nhau (`pending` vs `submitted`, `active` vs `published`).
2. **Không xóa `status` cũ** sau khi backfill → app phải biết dùng cái nào.
3. **Code không nhất quán:** Một số query filter `status='active'`, số khác `lifecycle_status='published'`.
4. **Không có CHECK** cho cả 2 → có thể set `status='foo'` hoặc `lifecycle_status='bar'`.
5. **Sync không có:** Update `status` không tự update `lifecycle_status` và ngược lại.

### 4.3. Khuyến nghị

**Bước 1:** Quyết định giữ `lifecycle_status` (đầy đủ hơn: `submitted`, `published`, `rejected`, `cancelled`, có thể thêm `draft`, `archived`).

**Bước 2:** Migration drop `status`:
```sql
-- 033_drop_events_status.sql
-- Phase 1: Verify code không dùng events.status
-- Phase 2: DROP COLUMN
ALTER TABLE events DROP COLUMN status;
```

**Bước 3:** Thêm CHECK:
```sql
ALTER TABLE events
  ADD CONSTRAINT chk_events_lifecycle
  CHECK (lifecycle_status IN ('draft', 'submitted', 'published', 'rejected', 'cancelled', 'archived'));
```

## 5. Email/Name Duplicate

### 5.1. Hiện trạng

| Cột | `auth_users` | `user_profiles` |
|---|---|---|
| `email` | UNIQUE NOT NULL (`002:17`) | NOT NULL DEFAULT '' (`008:10`) — không UNIQUE |
| `name` | NOT NULL DEFAULT '' (`002:18`) | NOT NULL DEFAULT '' (`008:11`) |
| `profile_pic_url` | DEFAULT '' (`002:21`) | DEFAULT '' (`008:12`) |
| `bio` | DEFAULT '' (`002:22`) | DEFAULT '' (`008:14`) |

### 5.2. Vấn đề

1. User đổi email ở `auth_users` → `user_profiles` vẫn email cũ.
2. User đổi tên ở `user_profiles` → `auth_users` vẫn tên cũ.
3. `user_profiles.email` không UNIQUE → có thể có 2 profile cùng email.
4. Code nào đọc `email`? Code auth dùng `auth_users.email`, code profile dùng `user_profiles.email` → khác nhau cho cùng user.

### 5.3. Khuyến nghị

Theo `02-architecture-review.md` section 4.1:
- **Option A (đơn giản):** Merge `auth_users` + `user_profiles` thành 1 bảng `users`.
- **Option B (giữ 2 bảng):** Thêm FK `user_profiles.id REFERENCES auth_users(id)`, bỏ các cột trùng khỏi `user_profiles`, JOIN khi cần.
- **Option C (3 bảng):** `user_auth` (chỉ auth) + `user_profile` (display) + `user_settings` (preferences).

**Khuyến nghị:** Option B (giữ 2 bảng, FK + bỏ duplicate). Migration cost thấp, không phá vỡ existing code nhiều.

## 6. Other Consistency Issues

### 6.1. `notifications.type` free text

```sql
type TEXT NOT NULL,  -- 003:6
```
Không có CHECK → có thể `'order'`, `'event'`, `'system'`, `'random_string'`. Nên ENUM.

### 6.2. `tickets.type` free text

```sql
type TEXT NOT NULL,  -- 011:9
```
Không có CHECK → `'vip'`, `'general'`, `'early_bird'`, `'random'`. Nên ENUM hoặc bảng `ticket_types`.

### 6.3. `events.event_type` free text

```sql
event_type TEXT DEFAULT 'physical',  -- 010:15
```
Không CHECK. Nên ENUM `('physical', 'online', 'hybrid')`.

### 6.4. `user_profiles.level` không sync với `user_memberships.tier_id`

- `user_profiles.level TEXT DEFAULT 'bronze'` (`008:23`) — text.
- `user_memberships.tier_id TEXT REFERENCES membership_tiers(id)` (`029:12`) — FK.
- Hai nguồn sự thật cho membership tier.

**Khuyến nghị:** Bỏ `user_profiles.level`, query qua `user_memberships.tier_id` → `membership_tiers.name`.

### 6.5. `user_profiles.points` không sync với `loyalty_points_ledger`

- `user_profiles.points INT DEFAULT 0` (`008:22`) — counter.
- `loyalty_points_ledger.points INT NOT NULL` (`029:21`) — append-only ledger.
- `user_memberships.points_balance INT NOT NULL DEFAULT 0` (`029:14`) — counter khác.

**3 nơi lưu points!** Source of truth nên là ledger, counter là materialized view.

**Khuyến nghị:**
- Bỏ `user_profiles.points`.
- `user_memberships.points_balance` là cache, trigger update từ ledger.
- Hoặc bỏ cả `points_balance`, tính online `SUM(points) FROM loyalty_points_ledger`.

### 6.6. `analytics` aggregate không có trigger sync

- `analytics.tickets_sold JSONB`, `analytics.daily_sales JSONB`, `analytics.views_over_time JSONB`, `analytics.check_ins INT`, `analytics.views INT`.
- Không có trigger update từ `tickets`, `payment_attempts`, `event_media`.
- App phải update analytic manually → có thể stale.

**Khuyến nghị:**
- Dùng materialized view thay vì table (refresh định kỳ).
- Hoặc trigger trên `tickets`/`payment_attempts` update `analytics`.
- Hoặc ETL batch (nightly) tính lại analytics từ raw data.

### 6.7. `featured_profiles.follower_count` không sync

- Counter không có trigger sync từ `user_follows` (chưa tồn tại, hiện là array).
- Stale counter.

## 7. Đánh giá consistency tổng

| Khía cạnh | Điểm | Ghi chú |
|---|---|---|
| Timestamp type đồng nhất | 2/10 | 2 loại trộn, 3 bảng mix trong cùng row |
| Roles single source | 3/10 | 3 nơi lưu, default khác nhau |
| Payment status single source | 3/10 | 3 bảng replicate |
| Event status single source | 4/10 | 2 cột song song |
| User identity fields | 4/10 | email/name duplicate |
| Counter sync | 2/10 | Không trigger |
| Type/enum consistency | 3/10 | Free text phổ biến |

**Điểm consistency tổng: 4/10** — Yếu, cần refactor dữ liệu.
