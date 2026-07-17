# 07 — Naming Convention

## 1. Bảng (Tables)

### 1.1. Convention áp dụng
- **snake_case**: ✓ nhất quán.
- **Số nhiều (plural)**: phần lớn nhất quán.

### 1.2. Bảng tuân thủ convention
`venues`, `events`, `tickets`, `orders`, `order_items`, `payment_attempts`, `seat_maps`, `seat_sections`, `seats`, `seat_holds`, `notifications`, `reviews`, `promotions`, `vouchers`, `event_media`, `featured_profiles`, `organizer_profiles`, `organizer_settings`, `organizer_balances`, `platform_fees`, `membership_tiers`, `user_memberships`, `loyalty_points_ledger`, `idempotency_keys`, `audit_logs`, `role_permissions`, `organization_memberships`, `auth_users`, `auth_tokens`, `sessions`, `roles`, `permissions`, `organizations`.

### 1.3. Bảng lệch convention

| Bảng | Lệch | Đề xuất |
|---|---|---|
| `analytics` | Uncountable noun (số ít) | Đổi thành `event_analytics` hoặc `analytics_records` |
| `outbox` | Số ít | Đổi thành `outbox_events` hoặc `outbox_messages` |
| `schema_migrations` | OK (framework convention) | Giữ nguyên |

### 1.4. Prefix convention
- `auth_` prefix cho auth-related: `auth_users`, `auth_tokens` ✓.
- Nhưng `sessions` (cũng auth) không có prefix → inconsistent. Đề xuất đổi `sessions` → `auth_sessions`.
- `organization_memberships` không prefix `org_` → OK (full name clear).

## 2. Cột (Columns)

### 2.1. Convention áp dụng
- **snake_case**: ✓ nhất quán.
- Timestamp: `created_at`, `updated_at` ✓.

### 2.2. Cột lệch convention

| Bảng | Cột | Lệch | Đề xuất |
|---|---|---|---|
| `events` | `last_updated_at` (`010:35`) | Không đồng nhất với `updated_at` ở bảng khác | Đổi thành `updated_at` |
| `tickets` | `purchase_date` (`011:18`) | `_date` suffix thay vì `_at` | OK (ngày, không phải timestamp) hoặc đổi `purchased_at` |
| `tickets` | `payment_time` (`011:23`) | `_time` suffix | Đổi thành `paid_at` |
| `tickets` | `last_check_in_at` (`011:21`) | OK | Giữ |
| `tickets` | `checked_in_at` (`011:22`) | Single timestamp nhưng có `check_in_count` → semantic conflict | Bỏ, dùng `last_check_in_at` |
| `orders` | `paid_at`, `cancelled_at`, `expires_at` (`019:18-20`) | OK | Giữ |
| `seat_holds` | `held_at`, `expires_at` (`027:9-10`) | OK | Giữ |
| `payment_attempts` | `completed_at` (`019:60`) | OK | Giữ |
| `auth_tokens` | `used_at` (`016:11`) | OK | Giữ |
| `sessions` | `revoked_at` (`002:36`) | OK | Giữ |
| `organization_memberships` | `joined_at` (`017:46`) | OK | Giữ |
| `promotions` | `valid_from`, `valid_until` (`005:6-7`) | `_until` thay vì `_to` | Đổi `valid_until` → `valid_to` (đồng nhất với vouchers `030:12`) |
| `vouchers` | `valid_from`, `valid_to` (`030:11-12`) | OK | Giữ, đồng nhất promotions sang `_to` |
| `audit_logs` (025) | `changes JSONB` | Không rõ semantic | Đổi thành `metadata` (đồng nhất 017) hoặc `diff` |

### 2.3. Cột ID naming
- `id TEXT PRIMARY KEY`: ✓ nhất quán.
- `<table>_id` cho FK: ✓ (`user_id`, `event_id`, `order_id`, `organization_id`, `seat_id`).
- `organizer_id` (không phải `user_id` khi ref organizer): ✓ rõ nghĩa.
- `actor_id` (audit_logs 017): ✓ rõ hơn `user_id`.

## 3. Index Naming

### 3.1. Convention áp dụng
- `idx_<table>_<columns>`: ✓ nhất quán.
- `idx_<table>_<col1>_<col2>` cho composite: ✓ (`idx_events_status_visibility`, `idx_order_items_event_id_created_at`).

### 3.2. Index lệch

| Index | Lệch | Đề xuất |
|---|---|---|
| `idx_orders_unique_idempotency` (`020:40`) | Tên mô tả behavior, không phải cột | OK (unique partial, mô tả mục đích) hoặc đổi `idx_orders_user_idempotency_unique` |
| `idx_active_seat_holds` (`027:16`) | Tên mô tả behavior | OK hoặc đổi `idx_seat_holds_event_seat_active` |
| `idx_promotions_active_public` (`005:17`) | Tên mô tả behavior | OK hoặc đổi `idx_promotions_public_until` |
| `idx_notifications_created_at_desc` (`003:13`) | `_desc` suffix (DESC sort) | OK (đặc tả sort order) |

### 3.3. Unique constraint naming
- `UNIQUE (code)` không có tên → auto-gen `promotions_code_key`.
- Đề xuất đặt tên tường minh: `CONSTRAINT uq_promotions_code UNIQUE (code)`.

## 4. ID Strategy — Không nhất quán ⚠️

### 4.1. Hiện trạng

| Loại | Số bảng | Ví dụ |
|---|---|---|
| `TEXT PRIMARY KEY` (app gen) | 29 | `venues`, `auth_users`, `events`, `tickets`, ... |
| `UUID DEFAULT gen_random_uuid()` | 1 | `vouchers` (`030:3`) |
| Composite PK | 1 | `role_permissions(role_id, permission_id)` |

### 4.2. Vấn đề

1. **Mix TEXT và UUID** trong cùng DB → query không đồng nhất.
2. **TEXT không default** → app phải gen ID, không dùng được DB auto-gen.
3. **TEXT format không quy định** → có thể là UUID string (36 chars), nanoid (21 chars), cuid, Firebase UID (28 chars) → mix.
4. **`vouchers` là ngoại lệ** dùng UUID native (16 bytes binary) → hiệu quả hơn TEXT.

### 4.3. Khuyến nghị

**Option A (đồng nhất TEXT):** Đổi `vouchers.id` sang `TEXT`, app gen UUID string.
- Pro: đồng nhất.
- Con: mất hiệu quả UUID binary.

**Option B (đồng nhất UUID):** Đổi 29 bảng sang `UUID DEFAULT gen_random_uuid()`.
- Pro: hiệu quả, default có sẵn, an toàn collision.
- Con: migration lớn, app code change.

**Option C (BIGINT identity cho bảng lớn, TEXT cho reference):**
- Bảng lớn (`tickets`, `orders`, `payment_attempts`, `audit_logs`, `ledger_entries`, `outbox`): `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`.
- Bảng reference (`roles`, `permissions`, `membership_tiers`): `TEXT PRIMARY KEY` (slug-based).
- Bảng domain (`events`, `users`): `TEXT PRIMARY KEY` (public ID, UUID string).
- Pro: best performance cho bảng lớn, public ID cho domain.
- Con: phức tạp nhất.

**Khuyến nghị:** Option C (long-term). Option A (short-term, dễ nhất).

## 5. Magic Strings

### 5.1. `platform_fees.id = 'platform'`

`028_create_balances_and_fees.sql:11-18`:
```sql
CREATE TABLE platform_fees (
    id TEXT PRIMARY KEY,  -- 'platform'
    balance NUMERIC NOT NULL DEFAULT 0.00,
    updated_at BIGINT NOT NULL
);

INSERT INTO platform_fees (id, balance, updated_at)
VALUES ('platform', 0.00, 0)
ON CONFLICT (id) DO NOTHING;
```

**Vấn đề:**
- Singleton row bằng magic string `'platform'`.
- Không có CHECK bảo vệ: có thể INSERT row `id='other'`.
- App phải biết magic string `'platform'`.

**Khuyến nghị:**
```sql
CREATE TABLE platform_fees (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    balance NUMERIC NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO platform_fees (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
```
Hoặc tách thành bảng `system_settings(name TEXT PRIMARY KEY, value JSONB)`.

### 5.2. `membership_tiers.id` text slugs

`029_create_memberships.sql:31-35`:
```sql
INSERT INTO membership_tiers (id, name, min_points_required, discount_percentage, created_at)
VALUES
  ('tier_standard', 'standard', 0, 0.00, 1781976000000),
  ('tier_silver', 'silver', 100, 0.02, 1781976000000),
  ('tier_gold', 'gold', 500, 0.05, 1781976000000),
  ('tier_platinum', 'platinum', 1000, 0.10, 1781976000000)
```

- ID là slug text ✓ (OK cho reference data).
- Nhưng `name` cũng là `standard`, `silver` → duplicate với `id`.
- Nên: `id = 'tier_silver'`, `name = 'Silver Membership'` (display name khác id).

### 5.3. Status values hardcoded trong comment

```sql
status TEXT NOT NULL DEFAULT 'held', -- 'held', 'released', 'sold'   -- 027:11
status TEXT NOT NULL DEFAULT 'available', -- 'available', 'blocked'  -- 022:25
status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'  -- 024:8
```

- Magic strings chỉ có trong comment, không có CHECK.
- Code app phải biết chuỗi chính xác.

**Khuyến nghị:** Dùng ENUM hoặc CHECK, không comment.

## 6. Reserved Keywords

### 6.1. Cột trùng PostgreSQL reserved keyword

| Bảng | Cột | Keyword |
|---|---|---|
| `events` | `date` (`010:13`) | `DATE` type keyword |
| `user_profiles` | `level` (`008:23`) | (not reserved but vague) |
| `payment_attempts` | `provider` (`020:25`) | not reserved |
| `events` | `tags` (`010:12`) | not reserved |
| `events` | `category` (`010:11`) | not reserved |
| `featured_profiles` | `name` | not reserved (but ambiguous) |

`events.date` là vấn đề lớn nhất — `date` là type keyword trong SQL. Nên đổi `event_date` hoặc `start_at`.

### 6.2. Bảng trùng reserved keyword
- Không có.

## 7. Foreign Key Constraint Naming

### 7.1. Hiện trạng (updated 2026-07-17)

**Fixed.** Migration `036_rename_fk_constraints_consistent.sql` renamed all Postgres auto names (`*_fkey`) and the one-off `fk_user_profiles_auth_user` to the project style.

Live: **49/49** FKs match `fk_<from_table>_<from_column>` (e.g. `fk_tickets_event_id`, `fk_user_profiles_id`).

### 7.2. Rule (keep for new FKs)
```sql
ALTER TABLE tickets
  ADD CONSTRAINT fk_tickets_event_id
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
```
Do not rely on Postgres default `…_fkey` names.

## 8. Check Constraint Naming

### 8.1. Hiện trạng
- 2 CHECK constraint (`loyalty_points_ledger.transaction_type`, `vouchers.discount_type`) không có tên → auto-gen.

### 8.2. Khuyến nghị
```sql
ALTER TABLE vouchers
  ADD CONSTRAINT chk_vouchers_discount_type
  CHECK (discount_type IN ('percent', 'fixed'));
```

## 9. Đánh giá naming convention tổng

| Khía cạnh | Điểm | Ghi chú |
|---|---|---|
| Table naming | 8/10 | snake_case + plural, 3 bảng lệch |
| Column naming | 7/10 | snake_case OK, một số suffix lệch |
| Index naming | 8/10 | `idx_<table>_<col>` nhất quán |
| ID strategy | 4/10 | Mix TEXT/UUID, không default |
| Magic strings | 4/10 | `'platform'`, status trong comment |
| Reserved keywords | 6/10 | `events.date` |
| Constraint naming | **9/10** | All FKs `fk_<table>_<column>` (post-036); CHECKs mostly `chk_*` |

**Điểm naming convention tổng (July): ~7.5/10** — FK/index naming solid; residual: dual ID strategy (TEXT vs UUID), dual timestamps, magic singleton `platform_fees`.
