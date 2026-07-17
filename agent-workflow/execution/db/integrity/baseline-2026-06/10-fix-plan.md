# 10 — Fix Plan (P0 → P3)

Kế hoạch refactor DB theo phase ưu tiên. Mỗi task có: mô tả, file ảnh hưởng, effort ước tính, rủi ro, dependency.

## Legend
- **P0 (Critical):** Risk mất dữ liệu, làm ngay (0-2 tuần).
- **P1 (High):** Lỗi nghiêm trọng, trong 1-2 sprint (2-4 tuần).
- **P2 (Medium):** Refactor dữ liệu, trong 1-2 tháng.
- **P3 (Low):** Long-term, khi đạt scale (3-12 tháng).
- **Effort:** S (≤1 ngày), M (2-5 ngày), L (1-2 tuần), XL (1+ tháng).
- **Risk:** Thấp (chỉ thêm, không phá), Trung bình (cần test), Cao (data migration).

---

## Phase P0 — Stop the Bleeding (Critical)

### P0.1 — Fix migration runner transactional
**Mô tả:** Bọc mỗi migration file trong `BEGIN...COMMIT` block, rollback khi fail.
**File ảnh hưởng:**
- `Server-2025-Eventing/db/migrate.js` (sửa logic chính).
**Effort:** S (2 giờ).
**Risk:** Thấp — chỉ thêm transaction wrapper, không đổi behavior hiện tại.
**Dependency:** Không.
**Verify:**
- Tạo migration test fail có ý thức (vd. `CREATE TABLE foo; INSERT INTO bar VALUES(1);` — `bar` không tồn tại), chạy runner → verify `foo` không tồn tại (rollback thành công) và `schema_migrations` không ghi filename.
**Acceptance:**
- Mỗi migration chạy trong 1 transaction.
- Nếu statement thứ N fail, các statement trước rollback.
- `schema_migrations` chỉ ghi filename khi toàn bộ migration commit.

### P0.2 — Sửa destructive migrations `025` + `026`
**Mô tả:** Đổi `DROP TABLE ... CASCADE` sang `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Viết migration mới để reconcile schema nếu cần.
**File ảnh hưởng:**
- `Server-2025-Eventing/db/migrations/025_create_audit_logs.sql` — sửa thành non-destructive. NHƯNG đã apply trên production thì không sửa migration cũ được (risk lệch schema). Thay vào đó:
  - Tạo migration mới `031_reconcile_audit_logs.sql`統 nhất schema.
  - Đánh dấu `025`, `026` là "deprecated — không chạy lại" trong comment.
**Effort:** M (3 ngày — cần audit code để quyết định schema đúng).
**Risk:** Cao — cần data migration, có thể mất dữ liệu cũ nếu sai.
**Dependency:** Cần audit `src/shared/audit/` + `postgres.admin.repository.js` để biết code dùng schema nào.
**Task con:**
- P0.2.1: Audit code đọc/ghi `audit_logs`, xác định schema mong muốn (đề xuất schema 017 với `actor_id`, `metadata`, `TIMESTAMPTZ`).
- P0.2.2: Viết migration `031_reconcile_audit_logs.sql`: thêm cột thiếu, đổi tên cột (`user_id` → `actor_id` nếu đang dùng 025 schema), chuyển `BIGINT` → `TIMESTAMPTZ`, bổ sung index đã mất (`action`, `created_at DESC`).
- P0.2.3: Tương tự cho `026_create_idempotency_keys.sql` → migration `032_fix_idempotency_keys.sql` (chỉ thêm cột nếu thiếu, không DROP).
**Verify:**
- Chạy migration `031`/`032` trên staging có dữ liệu → schema OK, data nguyên vẹn.
- Code đọc/ghi `audit_logs` hoạt động.
**Acceptance:**
- Không migration nào dùng `DROP TABLE` trong forward direction.
- Schema `audit_logs` thống nhất giữa code và DB.

### P0.3 — Thêm FK critical
**Mô tả:** Thêm FK cho các relationship critical, đảm bảo referential integrity.
**File ảnh hưởng:**
- Migration mới `033_add_critical_foreign_keys.sql`.
**Effort:** L (1 tuần — cần cleanup orphan rows trước).
**Risk:** Cao — nếu có orphan rows trong production, `ADD CONSTRAINT FK` sẽ fail. Cần script đếm + cleanup trước.
**Dependency:** P0.1 (migration runner transactional).
**Task con:**
- P0.3.1: Script audit orphan rows:
  ```sql
  SELECT COUNT(*) FROM tickets t LEFT JOIN events e ON t.event_id = e.id WHERE e.id IS NULL;
  SELECT COUNT(*) FROM tickets t LEFT JOIN auth_users u ON t.user_id = u.id WHERE u.id IS NULL;
  SELECT COUNT(*) FROM orders o LEFT JOIN auth_users u ON o.user_id = u.id WHERE u.id IS NULL;
  SELECT COUNT(*) FROM notifications n LEFT JOIN auth_users u ON n.user_id = u.id WHERE u.id IS NULL;
  -- etc.
  ```
- P0.3.2: Script cleanup orphan rows (xóa hoặc reassign):
  ```sql
  -- Ví dụ: xóa ticket không có event
  DELETE FROM tickets WHERE event_id NOT IN (SELECT id FROM events) AND event_id IS NOT NULL;
  ```
  Cần business decision: xóa hoặc tạo placeholder.
- P0.3.3: Migration add FK:
  ```sql
  -- 033_add_critical_foreign_keys.sql
  ALTER TABLE tickets
    ADD CONSTRAINT fk_tickets_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_tickets_user_id FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_tickets_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_tickets_order_item_id FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;

  ALTER TABLE orders
    ADD CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_orders_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

  ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_order_items_ticket_id FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_order_items_seat_id FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE SET NULL;

  ALTER TABLE payment_attempts
    ADD CONSTRAINT fk_payment_attempts_ticket_id FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

  ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_notifications_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

  ALTER TABLE event_media
    ADD CONSTRAINT fk_event_media_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_event_media_user_id FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;

  ALTER TABLE reviews
    ADD CONSTRAINT fk_reviews_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_reviews_user_id FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;

  ALTER TABLE promotions
    ADD CONSTRAINT fk_promotions_organizer_id FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_promotions_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

  ALTER TABLE analytics
    ADD CONSTRAINT fk_analytics_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

  ALTER TABLE ledger_entries
    ADD CONSTRAINT fk_ledger_organizer_id FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE RESTRICT;

  ALTER TABLE organizer_balances
    ADD CONSTRAINT fk_organizer_balances_organizer_id FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE CASCADE;

  ALTER TABLE organizer_settings
    ADD CONSTRAINT fk_organizer_settings_organizer_id FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE CASCADE;

  ALTER TABLE featured_profiles
    ADD CONSTRAINT fk_featured_profiles_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES auth_users(id) ON DELETE SET NULL;

  ALTER TABLE organizer_profiles
    ADD CONSTRAINT fk_organizer_profiles_user_id FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;

  ALTER TABLE seat_holds
    ADD CONSTRAINT fk_seat_holds_user_id FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;

  ALTER TABLE auth_tokens
    ADD CONSTRAINT fk_auth_tokens_email FOREIGN KEY (email) REFERENCES auth_users(email) ON DELETE CASCADE;
  ```
**Verify:**
- Migration apply thành công trên staging.
- INSERT với `event_id` không tồn tại → fail (FK constraint).
- DELETE event → cascade xóa tickets/reviews/media.
**Acceptance:**
- 18+ FK mới được thêm.
- Không còn orphan rows.

### P0.4 — Thêm CHECK constraint cho status/type
**Mô tả:** Thêm CHECK cho mọi cột status/type/level.
**File ảnh hưởng:**
- Migration `034_add_check_constraints.sql`.
**Effort:** M (3 ngày — cần audit giá trị hiện có trong DB để tránh fail migration).
**Risk:** Trung bình — nếu có data cũ với giá trị không hợp lệ, migration fail. Cần cleanup trước.
**Dependency:** P0.3.
**Task con:**
- P0.4.1: Script audit giá trị hiện có:
  ```sql
  SELECT DISTINCT status FROM tickets;
  SELECT DISTINCT status FROM orders;
  SELECT DISTINCT lifecycle_status FROM events;
  SELECT DISTINCT level FROM user_profiles;
  -- etc.
  ```
- P0.4.2: Cleanup data sai (set về default hoặc xóa).
- P0.4.3: Migration add CHECK:
  ```sql
  ALTER TABLE tickets ADD CONSTRAINT chk_tickets_status
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'used', 'refunded', 'expired'));
  ALTER TABLE orders ADD CONSTRAINT chk_orders_status
    CHECK (status IN ('pending_payment', 'paid', 'cancelled', 'refunded', 'expired'));
  ALTER TABLE payment_attempts ADD CONSTRAINT chk_payment_attempts_status
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded'));
  ALTER TABLE events ADD CONSTRAINT chk_events_lifecycle_status
    CHECK (lifecycle_status IN ('draft', 'submitted', 'published', 'rejected', 'cancelled', 'archived'));
  ALTER TABLE events ADD CONSTRAINT chk_events_visibility
    CHECK (visibility IN ('private', 'public', 'unlisted'));
  ALTER TABLE events ADD CONSTRAINT chk_events_event_type
    CHECK (event_type IN ('physical', 'online', 'hybrid'));
  ALTER TABLE seats ADD CONSTRAINT chk_seats_status
    CHECK (status IN ('available', 'blocked', 'sold'));
  ALTER TABLE seat_holds ADD CONSTRAINT chk_seat_holds_status
    CHECK (status IN ('held', 'released', 'sold'));
  ALTER TABLE outbox ADD CONSTRAINT chk_outbox_status
    CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
  ALTER TABLE user_profiles ADD CONSTRAINT chk_user_profiles_level
    CHECK (level IN ('bronze', 'silver', 'gold', 'platinum'));
  ALTER TABLE organizer_profiles ADD CONSTRAINT chk_organizer_profiles_status
    CHECK (status IN ('approved', 'pending', 'rejected', 'suspended'));
  ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type
    CHECK (type IN ('order', 'event', 'system', 'promotion', 'social'));
  ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating
    CHECK (rating BETWEEN 1 AND 5);
  ```
**Acceptance:**
- INSERT với `status='foobar'` fail.
- Data hiện tại pass constraint.

---

## Phase P1 — High Priority (1-2 sprint)

### P1.1 — Chuẩn hóa timestamp sang TIMESTAMPTZ
**Mô tả:** Chuyển toàn bộ BIGINT timestamp sang `TIMESTAMPTZ DEFAULT NOW()`.
**File ảnh hưởng:**
- Migration `035_normalize_timestamps.sql`.
- App code: tất cả repository `*.repository.js` (bỏ `Date.now()` trong INSERT).
- App code: tất cả service `*.service.js` (đổi `Date.now()` filter sang `NOW() - INTERVAL`).
**Effort:** XL (2-3 tuần — data migration lớn + app change song song).
**Risk:** Cao — data migration, app code change rộng.
**Dependency:** P0.1.
**Task con:**
- P1.1.1: Migration đổi kiểu:
  ```sql
  ALTER TABLE notifications
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN created_at SET NOT NULL;

  -- Tương tự cho: event_media, promotions (valid_from, valid_until, created_at),
  -- reviews, events (date, end_date, created_at, last_updated_at), tickets (purchase_date,
  -- last_check_in_at, checked_in_at, payment_time, updated_at), orders, order_items,
  -- payment_attempts, analytics, organizer_settings, ledger_entries, outbox,
  -- audit_logs (025 schema), idempotency_keys, seat_maps, seat_sections, seats,
  -- seat_holds (held_at, expires_at, created_at), organizer_balances, platform_fees,
  -- membership_tiers, user_memberships, loyalty_points_ledger, organizer_profiles.created_at,
  -- user_profiles.created_at.
  ```
- P1.1.2: App code change — bỏ `Date.now()` / `createdAt: Date.now()` trong INSERT, để DB default.
- P1.1.3: App code change — query filter:
  ```js
  // Trước:
  const dayAgo = Date.now() - 86400000;
  await query('SELECT * FROM orders WHERE created_at >= $1', [dayAgo]);
  // Sau:
  await query("SELECT * FROM orders WHERE created_at >= NOW() - INTERVAL '1 day'");
  ```
- P1.1.4: Test song song BIGINT + TIMESTAMPTZ trong 1 release (feature flag).
**Verify:**
- Migration apply thành công, data nguyên vẹn (so sánh `to_timestamp(created_at / 1000.0)` vs old value).
- App query hoạt động.
**Acceptance:**
- Không còn BIGINT timestamp column (trừ `birth_date` vì là ngày sinh, không phải event time).
- Tất cả timestamp có `DEFAULT NOW()`.

### P1.2 — Merge `auth_users` + `user_profiles`
**Mô tả:** Quyết định source of truth, bỏ duplicate fields.
**File ảnh hưởng:**
- Migration `036_merge_user_identity.sql`.
- App code: `postgres.auth.repository.js`, `postgres.user.repository.js`.
**Effort:** L (1-2 tuần).
**Risk:** Cao — affect auth flow, breaking change.
**Dependency:** P0.3 (FK user_id → auth_users).
**Quyết định:** Option B (giữ 2 bảng, thêm FK, bỏ duplicate).
**Task con:**
- P1.2.1: Thêm FK `user_profiles.id REFERENCES auth_users(id) ON DELETE CASCADE`.
- P1.2.2: Sync data: copy `email`, `name`, `profile_pic_url`, `bio` từ `auth_users` sang `user_profiles` (nếu user_profiles null) hoặc ngược lại (cần business decision).
- P1.2.3: Bỏ cột duplicate khỏi `user_profiles` (email, name, profile_pic_url, bio). App JOIN khi cần.
- P1.2.4: Bỏ `roles TEXT[]` khỏi cả 2 bảng, dùng `user_roles` bảng trung gian hoặc `organization_memberships` làm source of truth.
**Acceptance:**
- `user_profiles.id` FK `auth_users(id)`.
- Không còn duplicate email/name.
- Roles 1 nguồn sự thật.

### P1.3 — Thêm GIN index cho arrays + JSONB
**Mô tả:** Thêm GIN index cho các cột array và JSONB thường query.
**File ảnh hưởng:**
- Migration `037_add_gin_indexes.sql`.
**Effort:** S (1 ngày).
**Risk:** Thấp — chỉ thêm index.
**Dependency:** Không.
**Task:**
```sql
CREATE INDEX idx_events_category_gin ON events USING GIN (category);
CREATE INDEX idx_events_tags_gin ON events USING GIN (tags);
CREATE INDEX idx_featured_profiles_genres_gin ON featured_profiles USING GIN (genres);
CREATE INDEX idx_auth_users_roles_gin ON auth_users USING GIN (roles);
CREATE INDEX idx_user_profiles_fcm_gin ON user_profiles USING GIN (fcm_tokens);
CREATE INDEX idx_events_location_city ON events USING GIN ((location->'city'));
CREATE INDEX idx_venues_data_city ON venues USING GIN ((data->'city'));
```
**Acceptance:**
- Query `WHERE 'music' = ANY(category)` dùng GIN index (EXPLAIN ANALYZE verify).

### P1.4 — Thêm composite index cho hot queries
**Mô tả:** Thêm composite + partial index cho query pattern phổ biến.
**File ảnh hưởng:**
- Migration `038_add_composite_indexes.sql`.
**Effort:** S (1 ngày).
**Risk:** Thấp.
**Task:**
```sql
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_tickets_user_status ON tickets (user_id, status);
CREATE INDEX idx_tickets_event_status ON tickets (event_id, status);
CREATE INDEX idx_events_published_date ON events (date) WHERE lifecycle_status = 'published';
CREATE INDEX idx_events_city_date ON events (city, date);
CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at DESC);
CREATE INDEX idx_outbox_pending_created ON outbox (created_at) WHERE status = 'pending';
CREATE INDEX idx_seat_holds_active_expires ON seat_holds (expires_at) WHERE status = 'held';
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX idx_ledger_order_id ON ledger_entries (order_id);
CREATE INDEX idx_ledger_created_at ON ledger_entries (created_at);
```
**Acceptance:**
- Top 10 hot query dùng index (EXPLAIN ANALYZE).

### P1.5 — Drop redundant index
**Mô tả:** Xóa 6 index trùng với UNIQUE constraint.
**File ảnh hưởng:**
- Migration `039_drop_redundant_indexes.sql`.
**Effort:** S (1 giờ).
**Risk:** Thấp.
**Task:**
```sql
DROP INDEX IF EXISTS idx_auth_users_email;       -- UNIQUE đã có
DROP INDEX IF EXISTS idx_vouchers_code;            -- UNIQUE đã có
DROP INDEX IF EXISTS idx_organizations_slug;      -- UNIQUE đã có
DROP INDEX IF EXISTS idx_roles_name;               -- UNIQUE đã có
DROP INDEX IF EXISTS idx_permissions_name;         -- UNIQUE đã có
DROP INDEX IF EXISTS idx_role_permissions_role_id; -- trùng PK
DROP INDEX IF EXISTS idx_role_permissions_permission_id; -- trùng PK
```
**Acceptance:**
- Write throughput cải thiện (bớt index update).

### P1.6 — Centralize payment status
**Mô tả:** `payment_attempts` là source of truth, bỏ `tickets.payment_status` (giữ reference qua `payment_attempt_id`).
**File ảnh hưởng:**
- Migration `040_centralize_payment_status.sql`.
- App code: `postgres.ticket.repository.js`, `postgres.payment.repository.js` (tạo mới).
**Effort:** L (1 tuần).
**Risk:** Cao — affect payment flow.
**Dependency:** P0.4 (CHECK constraint).
**Task con:**
- P1.6.1: Tạo trigger sync `orders.status` từ `payment_attempts.status` mới nhất.
- P1.6.2: Bỏ `tickets.payment_status`, `tickets.zalo_app_trans_id`, `tickets.last_payment_attempt`, `tickets.payment_time` (sau 1 release dual-write).
- P1.6.3: App query payment status qua JOIN `payment_attempts`.

### P1.7 — Xóa `events.status` (giữ `lifecycle_status`)
**Mô tả:** Bỏ cột `status` cũ, chỉ giữ `lifecycle_status` + CHECK.
**File ảnh hưởng:**
- Migration `041_drop_events_status.sql`.
- App code: `postgres.event.repository.js`.
**Effort:** M (3 ngày).
**Risk:** Trung bình.
**Task con:**
- P1.7.1: Audit code dùng `events.status`, đổi sang `lifecycle_status`.
- P1.7.2: Migration drop column (sau 1 release dual-write).

### P1.8 — Connection pool config
**Mô tả:** Tăng pool size, add timeout, query log.
**File ảnh hưởng:**
- `Server-2025-Eventing/src/providers/database/postgres.client.js`.
- `.env` example.
**Effort:** S (2 giờ).
**Risk:** Thấp.
**Task:**
```js
pool = new Pool({
    connectionString: config.databaseUrl,
    max: parseInt(process.env.PG_POOL_MAX || '20'),
    statement_timeout: parseInt(process.env.PG_STATEMENT_TIMEOUT || '30000'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
```

---

## Phase P2 — Medium (1-2 tháng)

### P2.1 — Tách `tickets` god table
**Mô tả:** Tách check-in, payment, QR sang bảng con.
**File ảnh hưởng:**
- Migration `042_split_tickets.sql`.
- App code: `postgres.ticket.repository.js`.
**Effort:** XL (2-3 tuần).
**Risk:** Cao.
**Task con:**
- P2.1.1: Tạo `ticket_check_ins(id, ticket_id, checked_in_at, checked_in_by, method)`.
- P2.1.2: Tạo `ticket_qr_codes(id, ticket_id, qr_code, generated_at, expires_at)`.
- P2.1.3: Bỏ `check_in_count`, `last_check_in_at`, `checked_in_at`, `qr_code` khỏi `tickets`.
- P2.1.4: App query check-in qua `ticket_check_ins`.

### P2.2 — Tách array thành bảng trung gian
**Mô tả:** Tách `followed_profile_ids`, `history_event_ids`, `featured_profile_ids`, `fcm_tokens`.
**File ảnh hưởng:**
- Migration `043_extract_arrays.sql`.
- App code: `postgres.user.repository.js`, `postgres.event.repository.js`.
**Effort:** XL (2 tuần).
**Risk:** Cao — data migration lớn.
**Task con:**
- P2.2.1: Tạo `user_follows(follower_id, followee_id, followed_at)`.
- P2.2.2: Tạo `user_event_history(user_id, event_id, attended_at, ticket_id)`.
- P2.2.3: Tạo `event_featured_profiles(event_id, featured_profile_id, display_order)`.
- P2.2.4: Tạo `user_devices(user_id, fcm_token, device_id, platform, last_active_at)`.
- P2.2.5: Data migration: explode array → insert vào bảng trung gian.
- P2.2.6: Bỏ cột array khỏi `user_profiles`, `events`.
- P2.2.7: Thêm trigger sync counter (`followers_count`, `following_count`).

### P2.3 — Tách `venues.data` JSONB
**Mô tả:** Tách JSONB blob thành cột quan hệ.
**File ảnh hưởng:**
- Migration `044_extract_venues_data.sql`.
- App code: `postgres.venue.repository.js`.
**Effort:** L (1 tuần).
**Risk:** Trung bình.
**Task con:**
- P2.3.1: ALTER TABLE venues ADD COLUMN address TEXT, city TEXT, district TEXT, lat NUMERIC, lng NUMERIC, capacity INT, country_code TEXT, timezone TEXT.
- P2.3.2: Data migration: extract từ `data` JSONB sang cột.
- P2.3.3: Bỏ cột `data` (sau 1 release dual-read).
- P2.3.4: Thêm GIN index cho `amenities JSONB` (giữ JSONB cho phần mở rộng).

### P2.4 — Tách `events.ticket_types` JSONB
**Mô tả:** Tách thành bảng `event_ticket_types`.
**File ảnh hưởng:**
- Migration `045_extract_ticket_types.sql`.
- App code: `postgres.event.repository.js`, `postgres.ticket.repository.js`.
**Effort:** L (1 tuần).
**Risk:** Cao — affect ticket creation flow.
**Task con:**
- P2.4.1: Tạo `event_ticket_types(id, event_id, name, price, quantity, sold_count, sort_order, is_active)`.
- P2.4.2: Data migration từ `events.ticket_types` JSONB.
- P2.4.3: Bỏ cột `ticket_types` khỏi `events`.
- P2.4.4: App query ticket type qua JOIN.

### P2.5 — Merge `promotions` + `vouchers`
**Mô tả:** Gộp thành `discount_codes` + `discount_code_usages`.
**File ảnh hưởng:**
- Migration `046_merge_promotions_vouchers.sql`.
- App code: `postgres.promotion.repository.js`, `postgres.voucher.repository.js`.
**Effort:** L (1-2 tuần).
**Risk:** Cao.

### P2.6 — Partition `audit_logs`, `outbox`, `notifications`
**Mô tả:** Declarative partitioning theo `created_at` monthly.
**File ảnh hưởng:**
- Migration `047_partition_high_growth.sql`.
- App code: insert cần include `created_at` (đã có default NOW()).
**Effort:** L (1 tuần).
**Risk:** Trung bình — cần pg_partman hoặc cron tạo partition trước.
**Dependency:** P1.1 (TIMESTAMPTZ), P0.2 (audit_logs schema ổn định).
**Task con:**
- P2.6.1: Tạo partition parent + initial partitions.
- P2.6.2: Setup pg_partman hoặc cron job auto-create.
- P2.6.3: Setup retention policy (drop old partition).

### P2.7 — Counter tách bảng
**Mô tả:** Tách counter hot-row sang bảng riêng (per-bucket).
**File ảnh hưởng:**
- Migration `048_extract_counters.sql`.
- App code: `postgres.event.repository.js`, `postgres.user.repository.js`.
**Effort:** L (1 tuần).
**Risk:** Trung bình.

---

## Phase P3 — Long-term (3-12 tháng)

### P3.1 — Đổi PK sang BIGINT identity cho bảng lớn
**Effort:** XL (1+ tháng).
**Risk:** Rất cao — data migration lớn, app change toàn bộ query.

### P3.2 — Read replica cho analytics
**Effort:** L (1 tuần setup + app change).
**Risk:** Trung bình.

### P3.3 — Sharding per organizer
**Effort:** XL (2-3 tháng).
**Risk:** Rất cao.

### P3.4 — Soft-delete column thống nhất
**Effort:** L (1 tuần).
**Risk:** Thấp.

### P3.5 — Retention + archival job
**Effort:** M (3-5 ngày).
**Risk:** Thấp.

### P3.6 — CDC sang data warehouse
**Effort:** XL (1+ tháng).
**Risk:** Trung bình.

---

## Dependency Graph

```
P0.1 (migrate.js) → P0.2 (destructive fix) → P0.3 (FK) → P0.4 (CHECK)
                                              ↓
P1.1 (timestamp) ← P0.1
P1.2 (merge users) ← P0.3
P1.3 (GIN index) — độc lập
P1.4 (composite index) — độc lập
P1.5 (drop redundant) — độc lập
P1.6 (centralize payment) ← P0.4
P1.7 (drop events.status) ← P0.4
P1.8 (pool config) — độc lập
                    ↓
P2.1 (split tickets) ← P1.1, P1.6
P2.2 (extract arrays) ← P1.1
P2.3 (extract venues) — độc lập
P2.4 (extract ticket_types) ← P1.1
P2.5 (merge promo) — độc lập
P2.6 (partition) ← P1.1, P0.2
P2.7 (counter) ← P2.2
        ↓
P3.1 (PK change) ← P2.6
P3.2 (read replica) — độc lập
P3.3 (sharding) ← P3.1
P3.4 (soft-delete) — độc lập
P3.5 (retention) ← P2.6
P3.6 (CDC) ← P3.2
```

## Tracking

Mỗi task có ID (P0.1, P0.2, ...). Track trong issue tracker (GitHub/Jira) với:
- Status: TODO / IN_PROGRESS / DONE / BLOCKED.
- Assignee.
- Migration file PR link.
- App code PR link.
- Staging test result.
- Production deploy date.
