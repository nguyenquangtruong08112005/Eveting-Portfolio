# 04 — Data Integrity

Đây là tiêu chí **yếu nhất** của DB. Phân tích theo 4 khía cạnh: referential integrity, domain integrity, migration runner safety, destructive migrations.

## 1. Referential Integrity — Thiếu FK diện rộng

### 1.1. Đánh giá hoàn toàn (FK count mới)
- Tổng số bảng có FK đang đổi sang **15 bảng** (không phải “7/30 bảng có FK” như diễn tả trước).
- Các bảng còn thiếu FK quan trọng: `tickets`, `orders`, `notifications`, `reviews`, `events`, `payment_attempts`, `ledger_entries`, `organizer_balances`, `organizer_profiles`, `organizer_settings`, `featured_profiles`, `vouchers`, `analytics`, `seat_holds`, `organizer_settings`.

| Bảng | Cột có FK | Tham chiếu | ON DELETE |
|---|---|---|---|
| `sessions` | `user_id` | `auth_users(id)` | CASCADE (`002:30`) |
| `order_items` | `order_id` | `orders(id)` | CASCADE (`019:28`, `021:33`) |
| `payment_attempts` | `order_id` | `orders(id)` | CASCADE (`019:47`, `021:50`) |
| `seat_sections` | `seat_map_id` | `seat_maps(id)` | CASCADE (`022:14`) |
| `seats` | `seat_section_id` | `seat_sections(id)` | CASCADE (`022:22`) |
| `seat_holds` | `event_id`, `seat_id` | `events(id)`, `seats(id)` | CASCADE (`027:6-7`) |
| `organization_memberships` | `organization_id`, `user_id` | `organizations(id)`, `auth_users(id)` | CASCADE (`017:42-43`) |
| `role_permissions` | `role_id`, `permission_id` | `roles(id)`, `permissions(id)` | CASCADE (`017:25-26`) |
| `user_memberships` | `user_id`, `tier_id` | `auth_users(id)`, `membership_tiers(id)` | CASCADE / NO ACTION (`029:11-12`) |
| `loyalty_points_ledger` | `user_id` | `auth_users(id)` | CASCADE (`029:20`) |
| `vouchers` | `event_id` | `events(id)` | NO ACTION (`030:13`) |
| `ledger_entries` | `order_id` | `orders(id)` | NO ACTION (`023:12`) |

### 1.2. Bảng thiếu FK (23/30) — chi tiết

#### `events` (thiếu 2 FK)
- `venue_id TEXT` (`010:19`) — không FK `venues(id)`. Có thể venue bị xóa nhưng event vẫn ref.
- `organizer_id TEXT` (`010:26`) — không FK `auth_users(id)` hoặc `organizer_profiles(id)`.

#### `tickets` (thiếu 6 FK) ⚠️
- `event_id TEXT NOT NULL` (`011:6`) — không FK `events(id)`.
- `user_id TEXT NOT NULL` (`011:7`) — không FK `auth_users(id)` hoặc `user_profiles(id)`.
- `organizer_id TEXT` (`011:8`) — không FK.
- `order_id TEXT` (`019:69`, `021:70`) — không FK `orders(id)`.
- `order_item_id TEXT` (`019:70`, `021:71`) — không FK `order_items(id)`.
- `payment_attempt_id TEXT` (`019:71`, `021:72`) — không FK `payment_attempts(id)`.

#### `orders` (thiếu 3 FK)
- `user_id TEXT NOT NULL` (`019:7`) — không FK `auth_users(id)`.
- `event_id TEXT` (`019:8`, `020:6`) — không FK `events(id)`.
- `organizer_id TEXT` (`019:9`, `020:7`) — không FK.

#### `order_items` (thiếu 3 FK)
- `event_id TEXT` (`019:31`, `021:36`) — không FK `events(id)`.
- `ticket_id TEXT` (`019:33`, `021:38`) — không FK `tickets(id)`.
- `seat_id TEXT` (`019:34`, `021:39`) — không FK `seats(id)`.

#### `payment_attempts` (thiếu 1 FK)
- `ticket_id TEXT` (`020:24`, `021:51`) — không FK `tickets(id)`.

#### `notifications` (thiếu 2 FK)
- `user_id TEXT NOT NULL` (`003:3`) — không FK `auth_users(id)`.
- `event_id TEXT` (`003:6`) — không FK `events(id)`.

#### `event_media` (thiếu 2 FK)
- `event_id TEXT NOT NULL` (`004:9`) — không FK `events(id)`.
- `user_id TEXT NOT NULL` (`004:8`) — không FK `auth_users(id)`.

#### `reviews` (thiếu 2 FK)
- `event_id TEXT NOT NULL` (`006:8`) — không FK `events(id)`.
- `user_id TEXT NOT NULL` (`006:9`) — không FK `auth_users(id)`.

#### `promotions` (thiếu 2 FK)
- `organizer_id TEXT NOT NULL` (`005:3`) — không FK `auth_users(id)`.
- `event_id TEXT` (`005:4`) — không FK `events(id)`.

#### `analytics` (thiếu 1 FK)
- `event_id TEXT NOT NULL` (`014:6`) — không FK `events(id)`.

#### `ledger_entries` (thiếu 1 FK)
- `organizer_id TEXT NOT NULL` (`023:13`) — không FK `auth_users(id)` hoặc `organizer_profiles(id)`.

#### `organizer_balances` (thiếu 1 FK)
- `organizer_id TEXT PRIMARY KEY` (`028:5`) — không FK.

#### `featured_profiles` (thiếu 1 FK)
- `owner_user_id TEXT` (`012:12`) — không FK `auth_users(id)`.

#### `organizer_profiles` (thiếu 1 FK)
- `user_id TEXT NOT NULL` (`013:6`) — không FK `auth_users(id)`.

#### `organizer_settings` (thiếu 1 FK)
- `organizer_id TEXT PRIMARY KEY` (`023:5`) — không FK.

### 1.3. Tác động của thiếu FK

1. **Orphan rows:** User xóa khỏi `auth_users` nhưng `tickets.user_id` vẫn ref → query JOIN trả null.
2. **No cascade:** DELETE event không tự xóa tickets/reviews/media liên quan → dữ liệu mồ côi tích tụ.
3. **No protection:** INSERT ticket với `event_id` không tồn tại → vẫn thành công → dữ liệu sai.
4. **No FK index optimization:** Query JOIN không tận dụng được FK statistics của planner.
5. **Reporting sai:** COUNT tickets có thể đếm cả ticket cho event đã xóa.

### 1.4. Lý do có thể (không оправдав được)

Comment trong migration `004:3-4` và `006:3-4`:
```sql
-- No FK to tickets/events yet -- those tables may not exist
-- at the time this migration runs.
```

Đây là lý do sai. Migration chạy theo thứ tự số:
- `004_create_event_media.sql` chạy trước `010_create_events.sql` → đúng là events chưa tồn tại.
- Nhưng `010` chạy sau → có thể `ALTER TABLE event_media ADD CONSTRAINT ... REFERENCES events(id)`.

**Giải pháp:** Thêm migration mới (031+) `ALTER TABLE ... ADD CONSTRAINT ... REFERENCES ...` sau khi tất cả bảng đã tồn tại. Cần cleanup orphan rows trước khi add FK (script đếm + xóa).

## 2. Domain Integrity — Thiếu CHECK / ENUM

### 2.1. Bảng CHECK hiện có (chỉ 2)

```sql
-- 029_create_memberships.sql:22
transaction_type TEXT NOT NULL CHECK (transaction_type IN ('ticket_purchase', 'referral', 'bonus', 'refund'))

-- 030_create_vouchers.sql:5
discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed'))
```

### 2.2. Cột status/type cần CHECK/ENUM nhưng thiếu

| Bảng | Cột | Giá trị expect (từ comment/code) | Nguồn |
|---|---|---|---|
| `auth_users` | `roles TEXT[]` | `user`, `organizer`, `admin` | `002:13` comment |
| `events` | `status TEXT` | `pending`, `active`, `rejected`, `cancelled` | `018:10-14` CASE |
| `events` | `lifecycle_status TEXT` | `submitted`, `published`, `rejected`, `cancelled` | `018:4` comment |
| `events` | `visibility TEXT` | `private`, `public` | `010:28` default |
| `events` | `event_type TEXT` | `physical`, `online`, `hybrid`? | `010:15` default |
| `tickets` | `status TEXT` | `pending`, `confirmed`, `cancelled`, `used`, `refunded`? | `011:17` default |
| `tickets` | `payment_status TEXT` | `pending`, `paid`, `failed`, `refunded`? | `015:6` |
| `orders` | `status TEXT` | `pending_payment`, `paid`, `cancelled`, `refunded`, `expired` | `019:10`, `020:33` |
| `payment_attempts` | `status TEXT` | `pending`, `succeeded`, `failed`, `refunded` | `019:49` |
| `seats` | `status TEXT` | `available`, `blocked` | `022:25` comment |
| `seat_holds` | `status TEXT` | `held`, `released`, `sold` | `027:11` comment |
| `outbox` | `status TEXT` | `pending`, `processing`, `completed`, `failed` | `024:8` comment |
| `user_profiles` | `level TEXT` | `bronze`, `silver`, `gold`, `platinum`? | `008:23` default |
| `organizer_profiles` | `status TEXT` | `approved`, `pending`, `rejected`? | `013:11` default |
| `organization_memberships` | `role TEXT` | `member`, `admin`, `owner`? | `017:44` default |
| `promotions` | (no status) | - | - |
| `reviews` | `rating INT` | 1-5 | `006:10` (no range CHECK) |

**Tác động:**
- Có thể INSERT `status='foobar'` → app crash khi switch case.
- `reviews.rating` có thể = -1 hoặc 999.
- `user_profiles.level` có thể = 'platinum' hoặc 'super_saiyan'.

### 2.3. Khuyến nghị

Dùng `CREATE TYPE ... AS ENUM` cho giá trị cố định (status, type), dùng `CHECK` cho range:

```sql
CREATE TYPE event_status AS ENUM ('pending', 'active', 'rejected', 'cancelled');
CREATE TYPE event_lifecycle AS ENUM ('submitted', 'published', 'rejected', 'cancelled');
CREATE TYPE ticket_status AS ENUM ('pending', 'confirmed', 'cancelled', 'used', 'refunded');
CREATE TYPE order_status AS ENUM ('pending_payment', 'paid', 'cancelled', 'refunded', 'expired');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE seat_status AS ENUM ('available', 'blocked');
CREATE TYPE seat_hold_status AS ENUM ('held', 'released', 'sold');
CREATE TYPE outbox_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE organizer_status AS ENUM ('approved', 'pending', 'rejected');
CREATE TYPE membership_level AS ENUM ('bronze', 'silver', 'gold', 'platinum');

ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5);
```

Lưu ý: ENUM khó thay (cần ALTER TYPE ADD VALUE). Nếu giá trị thay đổi thường, dùng `CHECK (col IN (...))` dễ hơn.

## 3. Migration Runner Safety — Không transactional

### 3.1. Code hiện tại

`db/migrate.js:31-44`:
```js
for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (appliedSet.has(file)) {
        console.log('SKIP  ' + file + ' (already applied)');
        continue;
    }
    var sql = readFileSync(join(migrationsDir, file), 'utf8');
    await client.query(sql);                                    // ← không BEGIN
    await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
    );
    console.log('OK    ' + file);
}
```

### 3.2. Vấn đề

1. **Không bọc trong transaction:** Nếu migration `025_create_audit_logs.sql` có 5 statement, fail ở statement 3 → 2 statement đầu đã commit, 3 còn lại không chạy, `schema_migrations` không ghi filename `025` → chạy lại migration 025 sẽ `DROP TABLE` rồi CREATE (idempotent may mắn), nhưng không phải migration nào cũng idempotent.

2. **Một số migration có nhiều statement** và không idempotent:
   - `018_add_lifecycle_status.sql`: ALTER + UPDATE + CREATE INDEX. Nếu fail ở UPDATE → cột `lifecycle_status` tồn tại (NULL) nhưng không có index → chạy lại fail tại ALTER (ADD COLUMN IF NOT EXISTS OK) nhưng UPDATE chạy lại (OK) → may mắn.
   - `021_order_foundation_hardening.sql`: 30+ ALTER + CREATE INDEX. Nếu fail giữa chừng → trạng thái nửa vời.

3. **Không rollback filename ghi:** Nếu `client.query(sql)` thành công nhưng `INSERT INTO schema_migrations` fail (vd. duplicate key) → migration đã apply nhưng runner nghĩ chưa → chạy lại.

### 3.3. Khuyến nghị fix

```js
for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (appliedSet.has(file)) {
        console.log('SKIP  ' + file);
        continue;
    }
    var sql = readFileSync(join(migrationsDir, file), 'utf8');
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [file]
        );
        await client.query('COMMIT');
        console.log('OK    ' + file);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('FAIL  ' + file + ': ' + err.message);
        throw err;
    }
}
```

**Caveat:** Một số statement không thể chạy trong transaction block:
- `CREATE DATABASE`, `CREATE TABLESPACE`
- `VACUUM` (không trong block)
- `CREATE INDEX CONCURRENTLY` (không trong block)

DB này không dùng các statement đó trong migration → safe to wrap.

## 4. Destructive & Non-idempotent Migrations

### 4.1. `025_create_audit_logs.sql` — DESTRUCTIVE ⚠️

```sql
-- 025:4
DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    changes JSONB,
    ip_address TEXT,
    created_at BIGINT NOT NULL
);
```

**Vấn đề:**
- `DROP TABLE ... CASCADE` xóa bảng + toàn bộ dữ liệu + index + FK liên quan.
- Migration `017` đã tạo `audit_logs` với schema khác (`actor_id`, `metadata`, `TIMESTAMPTZ`). Toàn bộ dữ liệu audit cũ mất.
- Index `idx_audit_logs_actor`, `idx_audit_logs_action`, `idx_audit_logs_created_at` mất.
- Nếu migration `017` đã apply, `025` xóa rồi tạo lại → schema không nhất quán với code mong đợi.
- Code hiện tại (`src/shared/audit/`) dùng schema nào? Cần audit code.

**Khuyến nghị:**
- Viết migration `031_reconcile_audit_logs.sql`:
  - Nếu `audit_logs` có cột `actor_id` (schema 017) → rename `actor_id` → `user_id`, `metadata` → `changes`, `created_at TIMESTAMPTZ` → `created_at BIGINT` (epoch millis), hoặc ngược lại.
  - Đảm bảo 1 schema thống nhất.
  - Bổ sung index đã mất.

### 4.2. `026_create_idempotency_keys.sql` — DESTRUCTIVE ⚠️

```sql
-- 026:4
DROP TABLE IF EXISTS idempotency_keys CASCADE;

CREATE TABLE idempotency_keys (...);
```

- Destructive tương tự `025`.
- `idempotency_keys` là bảng runtime (key có expires_at) → mất dữ liệu có thể gây retry double-request, nhưng recoverable.
- Nguy cơ thấp hơn audit_logs nhưng vẫn sai pattern.

**Khuyến nghị:** Đổi thành `CREATE TABLE IF NOT EXISTS`.

### 4.3. `030_create_vouchers.sql` — Non-idempotent

```sql
-- 030:17-18
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_event_id ON vouchers(event_id);
```

- Không có `IF NOT EXISTS`.
- Nếu chạy lại (do runner fail giữa chừng), 2 CREATE INDEX fail → migration stuck.

**Khuyến nghị:** Đổi thành `CREATE INDEX IF NOT EXISTS`.

### 4.4. `021_order_foundation_hardening.sql` — Code smell

Migration này re-declare toàn bộ schema của 019/020 bằng `ADD COLUMN IF NOT EXISTS`:
```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS id TEXT,
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ...
```

**Vấn đề:**
- Dấu hiệu migration history bị sửa tay: 019/020 đã apply nhưng schema sai → viết 021 "hardening" để fix.
- `ADD COLUMN IF NOT EXISTS id TEXT` trên cột đã tồn tại → no-op, không add PK constraint.
- Không thực sự "harden" — chỉ đảm bảo cột tồn tại, không đảm bảo type/default/constraint đúng.

**Khuyến nghị:**
- Document rõ lịch sử: tại sao cần 021?
- Nếu 019/020 sai → nên viết migration fix cụ thể (ALTER COLUMN TYPE, ADD CONSTRAINT), không re-declare toàn bộ.

### 4.5. Migration `017` vs `025` conflict — Phân tích sâu

Timeline:
1. `017_create_rbac_tables.sql` chạy → tạo `audit_logs(actor_id, action, resource_type, resource_id, metadata JSONB, ip_address, created_at TIMESTAMPTZ DEFAULT NOW())` + 4 index.
2. `025_create_audit_logs.sql` chạy → `DROP TABLE audit_logs CASCADE` → CREATE lại với schema khác.

**Hệ quả:**
- Toàn bộ audit log ghi giữa `017` và `025` bị mất.
- Code đọc `audit_logs.actor_id` (nếu có) sẽ fail (cột không còn).
- Code đọc `audit_logs.metadata` sẽ fail.
- Index `idx_audit_logs_actor`, `idx_audit_logs_action`, `idx_audit_logs_created_at` mất.

**Cần xác minh:**
- Code hiện tại (`src/shared/audit/` + `postgres.admin.repository.js`) insert/read với schema nào?
- Có data audit cũ cần recover không? (Có thể đã mất vĩnh viễn.)

**Khuyến nghị:**
1. Audit code hiện tại để xác định schema đúng.
2. Viết migration `031` thống nhất schema (không DROP).
3. Thêm index đã mất.
4. Đảm bảo code nhất quán với schema.

## 5. NULL Safety

### 5.1. Cột NOT NULL thiếu

Nhiều cột quan trọng không có `NOT NULL`:

| Bảng | Cột | Lý do nên NOT NULL |
|---|---|---|
| `events` | `date BIGINT` (`010:13`) | Event phải có ngày |
| `events` | `created_at BIGINT` (`010:34`) | Audit |
| `events` | `last_updated_at BIGINT` (`010:35`) | Audit |
| `tickets` | `purchase_date BIGINT` (`011:18`) | Khi confirmed phải có |
| `tickets` | `created_at` | Không có cột! (chỉ `updated_at`) |
| `orders` | `created_at BIGINT` (`019:21`) | Audit |
| `user_profiles` | `created_at BIGINT` (`008:17`) | Audit |
| `seat_maps` | `total_rows INT NOT NULL` | OK đã có |
| `analytics` | `last_updated_at BIGINT` (`014:13`) | Audit |

**Đặc biệt:** `tickets` không có `created_at` — chỉ có `updated_at BIGINT` (`011:24`). Mất thông tin khi tạo ticket.

### 5.2. Default value thiếu

- BIGINT timestamp không có default → app phải set `Date.now()`. Quên → NULL.
- Nên chuyển sang `TIMESTAMPTZ DEFAULT NOW()`.

### 5.3. Unique constraint thiếu

- `reviews(event_id, user_id)` — user chỉ review 1 event 1 lần? Không có UNIQUE → có thể insert trùng.
- `seat_holds(event_id, seat_id, status='held')` — đã có partial unique ✓.
- `promotions.code` — UNIQUE ✓.
- `vouchers.code` — UNIQUE ✓.

**Khuyến nghị:** Thêm `UNIQUE(event_id, user_id)` cho `reviews`.

## 6. Tóm tắt điểm integrity

| Khía cạnh | Điểm | Số lượng | Tỷ lệ |
|---|---|---|---|
| FK có / tổng relationship | 3/10 | ~12 FK / ~40 relationship | 30% |
| Bảng có FK | 12/30 | - | 40% |
| CHECK constraint | 2 | - | rất ít |
| Migration transactional | 0/30 | - | 0% |
| Destructive migration | 2/30 | `025`, `026` | 6.7% |
| Non-idempotent migration | 1/30 | `030` | 3.3% |

**Điểm integrity tổng: 3/10** — Rất yếu. Cần fix ngay để tránh mất dữ liệu.
