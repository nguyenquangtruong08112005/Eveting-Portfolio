# 01 — Executive Summary

## 1. Tổng quan hệ thống

### 1.1. Stack
- **DB Engine:** PostgreSQL (phiên bản không xác định trong repo, mặc định 13+)
- **Client:** `pg` (node-postgres), Pool singleton trong `src/providers/database/postgres.client.js`
- **Migration framework:** Custom script `db/migrate.js` (không dùng Knex/Prisma/Flyway)
- **Repository pattern:** `src/providers/database/postgres.*.repository.js` (19 file)
- **Domain modules:** 18 module trong `src/modules/`

### 1.2. Quy mô schema
- **30 file migration** (001 → 030) trong `db/migrations/`
- **~30 bảng** trải đều các domain:
  - Auth: `auth_users`, `sessions`, `auth_tokens`
  - Users: `user_profiles`, `featured_profiles`, `organizer_profiles`
  - Events: `events`, `venues`, `event_media`
  - Tickets/Orders: `tickets`, `orders`, `order_items`, `payment_attempts`
  - Seating: `seat_maps`, `seat_sections`, `seats`, `seat_holds`
  - Finance: `organizer_settings`, `ledger_entries`, `organizer_balances`, `platform_fees`
  - Engagement: `notifications`, `reviews`, `promotions`, `vouchers`
  - Analytics: `analytics`
  - RBAC: `roles`, `permissions`, `role_permissions`, `organizations`, `organization_memberships`, `audit_logs`
  - Loyalty: `membership_tiers`, `user_memberships`, `loyalty_points_ledger`
  - Infrastructure: `outbox`, `idempotency_keys`, `schema_migrations`

### 1.3. Đặc điểm kiến trúc nổi bật
DB mang phong cách **hybrid relational + document (JSONB)**, thiên về OLTP transactional. Có 4 pattern đáng khen:
1. **Transactional outbox** (`024_create_outbox.sql`) cho event delivery bền vững.
2. **Idempotency keys** (`026_create_idempotency_keys.sql`) + `orders.idempotency_key` unique partial index (`020_refine_order_foundation.sql:40`) cho checkout an toàn.
3. **Ledger append-only** (`023_create_ledger.sql`) + balances (`028_create_balances_and_fees.sql`) cho bookkeeping tài chính.
4. **Seat holds** với partial unique index `WHERE status='held'` (`027_create_seat_holds.sql:16`) cho concurrent seat reservation.

## 2. Đánh giá theo 7 tiêu chí

### 2.1. Kiến trúc DB — 7/10 (Khá)

**Điểm mạnh:**
- Phân domain rõ: mỗi module có repository riêng, ánh xạ 1-1 sang bảng.
- Pattern hạ tầng (outbox/idempotency/ledger) đặt nền móng tốt cho eventual consistency và tách service sau này.
- RBAC đã normalize (`roles`/`permissions`/`role_permissions`/`organizations`/`organization_memberships`) ở `017_create_rbac_tables.sql`.

**Điểm yếu:**
- **Nhân đôi identity:** `auth_users` và `user_profiles` tồn tại song song, cùng `id`, không FK → source of truth không rõ.
- **Hai hệ promo song song:** `promotions` (`005`) và `vouchers` (`030`) — cùng `code` UNIQUE, trách nhiệm chồng chéo.
- **`audit_logs` bị định nghĩa 2 lần** với schema khác nhau (`017` và `025`); `025` dùng `DROP TABLE ... CASCADE` → mất dữ liệu.
- **`tickets` quá tải:** chứa cả payment + check-in + seat + QR + order linkage → god table.
- **`venues` là JSONB blob** (`data JSONB NOT NULL DEFAULT '{}'`) — không tận dụng được relational.

### 2.2. Chuẩn hóa dữ liệu — 4/10 (Yếu)

**Chưa đạt 3NF** ở nhiều nơi:
- Thiếu FK diện rộng → bảng rời rạc như "table-per-aggregate".
- **Array thay vì bảng trung gian:**
  - `events.featured_profile_ids TEXT[]` (`010_create_events.sql:10`)
  - `user_profiles.followed_profile_ids TEXT[]` (`008_create_user_profiles.sql:18`)
  - `user_profiles.history_event_ids TEXT[]` (`008_create_user_profiles.sql:19`)
- **Denormalize không có sync mechanism:**
  - `events.venue_name`, `events.city` snapshot từ `venues`.
  - `order_items.event_name` snapshot từ `events`.
  - `user_profiles.followers_count`/`following_count` — counter không khớp array.
- **JSONB lạm dụng:** `events.ticket_types`, `events.sponsors`, `events.recurring_rule`, `events.location`, `analytics.tickets_sold/daily_sales/views_over_time`, `user_profiles.matching_preferences/shared_media`, `promotions.data`, `venues.data`.

### 2.3. Tính toàn vẹn dữ liệu — 3/10 (Rất yếu) ⚠️

**Đây là vấn đề nghiêm trọng nhất.**

#### a. Referential integrity thiếu hụt
15/30 bảng có FK. Tuy nhiên, nhiều relationship quan trọng vẫn thiếu FK (tickets→events, orders→users, notifications→users, reviews→events, event_media→events, ledger_entries→organizer_profiles, organizer_balances→organizer_profiles, organizer_profiles→auth_users, seat_holds→auth_users, featured_profiles→auth_users, auth_tokens→auth_users) → orphan rows không thể ngăn được. Chi tiết bảng tại `04-data-integrity.md`.

#### b. Domain integrity yếu
Chỉ 2 CHECK constraint trong toàn DB:
- `loyalty_points_ledger.transaction_type` (`029_create_memberships.sql:22`)
- `vouchers.discount_type` (`030_create_vouchers.sql:5`)

Các cột status/type (`tickets.status`, `orders.status`, `events.status`, `seats.status`, `seat_holds.status`, `user_profiles.level`...) **nhận chuỗi tự do**, không constraint.

#### c. Migration runner không an toàn
`db/migrate.js:38-42` chạy mỗi migration file qua `client.query(sql)` **không bọc trong transaction**:
```js
await client.query(sql);  // ← nếu fail giữa chừng, thay đổi không rollback
await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
```
Nếu migration đa statement thất bại ở statement thứ N, các statement trước đó đã commit, filename chưa được ghi → chạy lại có thể fail (`CREATE TABLE` không `IF NOT EXISTS`) hoặc để DB ở trạng thái nửa vời.

#### d. Migration destructive & không idempotent
- `025_create_audit_logs.sql:4` — `DROP TABLE IF EXISTS audit_logs CASCADE;` → **mất dữ liệu audit cũ**.
- `026_create_idempotency_keys.sql:4` — cũng `DROP TABLE ... CASCADE`.
- `030_create_vouchers.sql:17-18` — index không `IF NOT EXISTS` → chạy lại fail.
- `021_order_foundation_hardening.sql` — "defensive re-declaration" toàn bộ 019/020, dấu hiệu migration history bị sửa tay.

### 2.4. Hiệu suất — 6/10 (Trung bình)

**Tốt:**
- Index cơ bản đủ cho hầu hết truy vấn (user_id, event_id, status).
- Partial index thông minh: `idx_orders_unique_idempotency WHERE idempotency_key IS NOT NULL`, `idx_active_seat_holds WHERE status='held'`, `idx_promotions_active_public WHERE is_public=true`.

**Thiếu:**
- **Không có GIN index cho `TEXT[]`** arrays: `events.category`, `events.tags` (`010`). Chỉ `user_profiles.roles` có GIN (`008:32`). Truy vấn `'music' = ANY(category)` seq scan.
- **Không có GIN cho JSONB** dù query vào `events.location`, `events.ticket_types`.
- **Thiếu composite index:** `notifications(user_id, is_read, created_at DESC)` cho "unread inbox", `tickets(event_id, status)` cho listing, `events(date, status, visibility)` cho discovery.
- **`SELECT *`** trong `postgres.order.repository.js:90` → kéo cột JSONB thừa.
- **Counter hot-row:** `view_count`, `followers_count`, `used_count`, `check_ins` update nguyên row → lock contention.
- **TEXT PK** lớn hơn UUID/BIGINT ~2x → index phình, cache hit giảm.

### 2.5. Consistency — 4/10 (Yếu)

#### a. Timestamp type lộn xộn ⚠️
- `TIMESTAMPTZ DEFAULT NOW()`: `venues`, `auth_users`, `sessions`, `auth_tokens`, `roles`, `permissions`, `organizations`, `organization_memberships`, `audit_logs`(017), `featured_profiles`, `organizer_profiles.updated_at`.
- `BIGINT` (epoch millis, không default): `notifications`, `event_media`, `promotions`, `reviews`, `events`, `tickets`, `orders`, `order_items`, `payment_attempts`, `analytics`, `ledger_entries`, `outbox`, `idempotency_keys`, `seat_maps`, `seat_sections`, `seats`, `seat_holds`, `organizer_balances`, `platform_fees`, `membership_tiers`, `user_memberships`, `loyalty_points_ledger`.
- **Bảng trộn lẫn 2 loại:** `organizer_profiles` (`created_at BIGINT` + `updated_at TIMESTAMPTZ`), `user_profiles` (`created_at BIGINT` + `updated_at TIMESTAMPTZ`), `vouchers` (`valid_from/valid_to TIMESTAMPTZ` + `created_at TIMESTAMPTZ DEFAULT NOW()`, nhưng các bảng cùng domain dùng BIGINT).
- BIGINT không default → app phải set `Date.now()`, dễ quên → null/giá trị sai. Không thể dùng `NOW()`/partition tự nhiên.

#### b. Roles replicate ở 3 nơi
- `auth_users.roles TEXT[] DEFAULT '{user}'` (`002:20`)
- `user_profiles.roles TEXT[] DEFAULT '{attendee}'` (`008:16`)
- Bảng `roles` + `organization_memberships.role` (`017`)
- Không có cơ chế đồng bộ → role mismatch im lặng.

#### c. Trạng thái thanh toán replicate
- `tickets.payment_status`, `tickets.zalo_app_trans_id`, `tickets.last_payment_attempt` (`015`)
- `orders.status`, `orders.paid_at`
- `payment_attempts.status`
- 3 nguồn sự thật → khó đảm bảo nhất quán khi payment fail/retry.

#### d. `events.status` vs `events.lifecycle_status`
- `018_add_lifecycle_status.sql` thêm `lifecycle_status` + backfill, nhưng **không xóa `status`** → 2 cột trạng thái song song, app phải biết dùng cái nào. Lại không có CHECK.

#### e. Hai `audit_logs` schema khác nhau
- `017`: `actor_id`, `action`, `resource_type`, `resource_id`, `metadata JSONB`, `ip_address`, `created_at TIMESTAMPTZ DEFAULT NOW()`.
- `025`: `user_id`, `action`, `resource_type`, `resource_id`, `changes JSONB`, `ip_address`, `created_at BIGINT`.
- `025` DROP CASCADE → schema của 017 bị xóa, index `actor_id`/`action` mất.

#### f. Email/name duplicate
- `auth_users.email`, `auth_users.name` vs `user_profiles.email`, `user_profiles.name`.
- Không sync → có thể user đổi name ở 1 nơi, nơi kia cũ.

### 2.6. Naming Convention — 6/10 (Trung bình)

**Tốt:**
- Bảng snake_case, số nhiều: `venues`, `events`, `tickets`, `orders`, `order_items`, `payment_attempts`, `seat_maps`, `seat_sections`, `seats`, `seat_holds`.
- Index prefix `idx_<table>_<col>` nhất quán.
- Cột snake_case.

**Không nhất quán:**
- **ID strategy lệch:** 29 bảng dùng `TEXT PRIMARY KEY` (app gen), 1 bảng (`vouchers`, `030:3`) dùng `UUID DEFAULT gen_random_uuid()`.
- **Số ít/số nhiều lẫn lộn:** `analytics` (uncountable) vs `notifications`/`audit_logs` (plural); `outbox` số ít trong khi `idempotency_keys` số nhiều.
- **Cột thời gian không convention:** `created_at`, `updated_at`, `last_updated_at`, `purchase_date`, `payment_time`, `checked_in_at`, `last_check_in_at`, `held_at`, `expires_at`, `paid_at`, `cancelled_at`, `completed_at`, `joined_at`, `used_at`.
- **Tiền tố `auth_` không đều:** `auth_users`, `auth_tokens` có prefix, nhưng `sessions` (cũng auth) không có.
- **`platform_fees.id = 'platform'`** (`028:11-18`) — singleton row bằng magic string, không có CHECK bảo vệ.
- **Trạng thái chuỗi tự do** nằm rải rác, không centralize.

### 2.7. Scalability — 5/10 (Trung bình)

**Giới hạn:**
- Single-instance Postgres, không partition, không read replica.
- Bảng tăng trưởng nhanh không partition: `audit_logs`, `notifications`, `outbox`, `ledger_entries`, `tickets`, `payment_attempts`, `event_media`. Đặc biệt `audit_logs`/`outbox` phình rất nhanh → cần partition theo `created_at` (yêu cầu TIMESTAMPTZ, đang là BIGINT → khó).
- `TEXT` PK làm index lớn → giảm cache hit. Với 10M+ tickets, chênh lệch đáng kể vs BIGINT.
- Counter updates gây hot-row lock trên row phổ biến.
- Mảng `TEXT[]` (`followed_profile_ids`, `history_event_ids`) — user theo dõi 10k profile sẽ làm row phình, update array atomic lock cả row.
- JSONB lớn (`raw_data`) kéo TOAST, làm `SELECT *` chậm.
- Không có soft-delete thống nhất → DELETE vật lý khó archiving.

**Khả năng scale tốt:**
- Outbox + idempotency cho phép hàng đợi replay → tốt cho eventual consistency khi tách service.
- Ledger append-only dễ archive/partition.
- Repository pattern tách biệt → dễ swap sang read replica hoặc sharding per organizer.

## 3. Top ưu tiên sửa chữa (P0 → P3)

### P0 — Critical (làm ngay, risk mất dữ liệu)
1. **Bọc mỗi migration trong transaction** trong `db/migrate.js` (BEGIN → chạy SQL + insert schema_migrations → COMMIT; ROLLBACK khi fail).
2. **Sửa `025_create_audit_logs.sql` và `026`**: bỏ `DROP TABLE ... CASCADE`, chuyển sang `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Cần migration mới để merge 2 schema audit_logs.
3. **Thêm FK** cho các relationship critical: `tickets→events`, `tickets→users`, `tickets→orders`, `orders→users`, `notifications→users`, `reviews→events`, `reviews→users`, `event_media→events`, `ledger_entries→organizer_profiles`.
4. **Thêm CHECK/ENUM** cho mọi cột status/type/level.

### P1 — High (trong 1–2 sprint)
5. **Chuẩn hóa timestamp** toàn bộ sang `TIMESTAMPTZ DEFAULT NOW()`; bỏ BIGINT epoch (cần data migration + app change song song).
6. **Merge `auth_users` + `user_profiles`** thành 1 bảng, hoặc thêm FK + trigger sync; bỏ TEXT[] roles, dùng `organization_memberships` làm source of truth.
7. **Thêm GIN index** cho `events.category`, `events.tags`, JSONB thường query (`events.location`, `events.ticket_types`).
8. **Thêm composite index** cho các query inbox/listing phổ biến.
9. **Centralize payment status** vào `payment_attempts` làm source of truth, bỏ `tickets.payment_status` (giữ snapshot nếu cần, có trigger sync).
10. **Xóa `events.status`** hoặc `events.lifecycle_status` (giữ 1), thêm CHECK.

### P2 — Medium (trong 1–2 tháng)
11. **Tách `tickets`** god table: move payment fields sang `payment_attempts`, check-in sang `ticket_check_ins`, QR sang `ticket_qr_codes`.
12. **Chuyển mảng ID sang bảng trung gian:** `event_featured_profiles`, `user_follows`, `user_event_history`.
13. **Tách `venues.data` JSONB** thành cột quan hệ (address, capacity, lat, lng, city, district...).
14. **Merge `promotions` + `vouchers`** thành 1 bảng `discount_codes` với `type` discriminator.
15. **Partition** `audit_logs`, `outbox`, `notifications`, `ledger_entries` theo `created_at` (sau khi chuyển TIMESTAMPTZ).
16. **Counter tách bảng** hoặc dùng `pg_advisory_xact_lock` + upsert.

### P3 — Low (long-term)
17. **Đổi PK strategy** sang BIGINT identity hoặc UUID v7 cho các bảng lớn (tickets, orders, payment_attempts, audit_logs). Yêu cầu data migration lớn.
18. **Read replica** cho analytics/reporting queries.
19. **Sharding per organizer** cho `tickets`/`orders`/`ledger_entries` khi organizer vượt 10k.
20. **Soft-delete column** thống nhất (`deleted_at TIMESTAMPTZ`) cho các entity cần archiving (events, users, organizers, venues).
21. **Retention policy + archival job** cho `audit_logs`, `outbox`, `notifications`, `idempotency_keys`.

## 4. Khuyến nghị chiến lược

### 4.1. Ưu tiên "Stop the bleeding" trước
Không cố refactor lớn ngay. Trước hết:
- Fix `migrate.js` để các migration sau an toàn.
- Viết migration mới (031+) để **bổ sung FK + CHECK** mà không đổi kiểu dữ liệu → ít risk, hiệu quả cao.
- Backup production ngay và lên lịch retention.

### 4.2. Tách thành nhiều migration nhỏ
Mỗi fix là 1 migration riêng (031, 032, ...), idempotent, có rollback note. Không gộp nhiều thay đổi vào 1 file.

### 4.3. Tránh destructive migration
Tuyệt đối không `DROP TABLE`, không `DROP COLUMN` trong migration forward. Dùng 2-phase: (1) add column mới + backfill + dual-write, (2) sau 1 release, drop column cũ.

### 4.4. Cần app-level change song song
Một số fix (timestamp, PK, centralize payment status) yêu cầu code change ở repository layer. Lên kế hoạch song song giữa DB migration và app refactor, có feature flag để rollback.

### 4.5. Test trên staging
Tất cả migration phải chạy trên staging trước, đặc biệt là migration thêm FK (có thể fail do orphan rows hiện hữu → cần script cleanup trước).

## 5. Lịch sử audit
- **2026-06-22:** Audit đầu tiên bởi opencode. Phạm vi: 30 migration files + 1 runner + 1 client + sample repository. Không audit production data (chỉ schema).
- Lần audit tiếp theo đề xuất: sau khi hoàn tất P0 + P1 (dự kiến 2026Q3).
