# 05 — Performance

## 1. Indexing Strategy

### 1.1. Index hiện có — Inventory

| Bảng | Index | Loại | File |
|---|---|---|---|
| `venues` | `idx_venues_name` | btree | `001:8` |
| `auth_users` | `idx_auth_users_email` | btree | `002:39` |
| `sessions` | `idx_sessions_user_id`, `idx_sessions_refresh_token_hash`, `idx_sessions_expires_at`, `idx_sessions_revoked_at` | btree | `002:40-43` |
| `user_profiles` | `idx_user_profiles_email`, `idx_user_profiles_roles` (GIN) | btree + GIN | `008:31-32` |
| `notifications` | `idx_notifications_user_id`, `idx_notifications_created_at_desc` | btree | `003:12-13` |
| `event_media` | `idx_event_media_event_id_created_at`, `idx_event_media_user_id` | btree composite | `004:16-17` |
| `promotions` | `idx_promotions_code` (UNIQUE), `idx_promotions_organizer_created`, `idx_promotions_active_public` (partial) | btree + partial | `005:15-17` |
| `reviews` | `idx_reviews_event_id_created_at`, `idx_reviews_user_id` | btree composite | `006:15-16` |
| `events` | `idx_events_date`, `idx_events_status_visibility`, `idx_events_organizer_id`, `idx_events_geohash`, `idx_events_lifecycle_status` | btree | `010:39-42`, `018:18` |
| `tickets` | `idx_tickets_event_id`, `idx_tickets_user_id`, `idx_tickets_status`, `idx_tickets_order_id` | btree | `011:28-30`, `021:94` |
| `featured_profiles` | `idx_featured_profiles_name`, `idx_featured_profiles_owner_user_id` | btree | `012:18-19` |
| `organizer_profiles` | `idx_organizer_profiles_user_id` | btree | `013:16` |
| `analytics` | `idx_analytics_event_id` | btree | `014:16` |
| `auth_tokens` | `idx_auth_tokens_hash`, `idx_auth_tokens_email` | btree | `016:14-15` |
| `roles` | `idx_roles_name` | btree | `017:61` |
| `permissions` | `idx_permissions_name`, `idx_permissions_resource_action` | btree | `017:62-63` |
| `role_permissions` | `idx_role_permissions_role_id`, `idx_role_permissions_permission_id` | btree | `017:64-65` |
| `organizations` | `idx_organizations_slug` (UNIQUE đã có) | btree | `017:66` |
| `organization_memberships` | `idx_organization_memberships_org`, `idx_organization_memberships_user` | btree | `017:67-68` |
| `audit_logs` (017) | `idx_audit_logs_actor`, `idx_audit_logs_action`, `idx_audit_logs_resource`, `idx_audit_logs_created_at` | btree | `017:69-72` |
| `audit_logs` (025) | `idx_audit_logs_user`, `idx_audit_logs_resource` | btree | `025:17-18` |
| `orders` | `idx_orders_user_id`, `idx_orders_event_id`, `idx_orders_organizer_id`, `idx_orders_status`, `idx_orders_idempotency_key`, `idx_orders_unique_idempotency` (partial UNIQUE) | btree + partial | `020:35-40`, `021:75-80` |
| `order_items` | `idx_order_items_order_id`, `idx_order_items_event_id`, `idx_order_items_ticket_id` | btree | `019:43`, `020:42-43`, `021:83-85` |
| `payment_attempts` | `idx_payment_attempts_order_id`, `idx_payment_attempts_provider_order_id`, `idx_payment_attempts_status`, `idx_payment_attempts_ticket_id` | btree | `019:66`, `020:45-47`, `021:88-91` |
| `seat_maps`/`seat_sections`/`seats` | `idx_seats_section_row_num` (UNIQUE) | btree | `022:29` |
| `organizer_settings` | (no index) | - | `023` |
| `ledger_entries` | `idx_ledger_organizer` | btree | `023:20` |
| `outbox` | `idx_outbox_status_retry` | btree composite | `024:15` |
| `idempotency_keys` | `idx_idempotency_keys_expires` | btree | `026:14` |
| `seat_holds` | `idx_active_seat_holds` (partial UNIQUE), `idx_seat_holds_expires_at`, `idx_seat_holds_event_id` | btree + partial | `027:16-22` |
| `organizer_balances` | (PK only) | - | `028` |
| `platform_fees` | (PK only) | - | `028` |
| `membership_tiers` | (name UNIQUE đã có) | - | `029` |
| `user_memberships` | (PK + tier_id nên có index) | - | `029` |
| `loyalty_points_ledger` | `idx_loyalty_user` | btree | `029:27` |
| `vouchers` | `idx_vouchers_code`, `idx_vouchers_event_id` | btree | `030:17-18` |

**Tổng: ~60 index** trên 30 bảng. Mật độ index trung bình.

### 1.2. Index thiếu — Critical

#### a. GIN index cho TEXT[] arrays

Hiện chỉ `user_profiles.roles` có GIN (`008:32`). Thiếu:

| Bảng | Cột | Query pattern | Index đề xuất |
|---|---|---|---|
| `events` | `category TEXT[]` | `WHERE 'music' = ANY(category)` | `CREATE INDEX idx_events_category_gin ON events USING GIN (category);` |
| `events` | `tags TEXT[]` | `WHERE 'festival' = ANY(tags)` | `CREATE INDEX idx_events_tags_gin ON events USING GIN (tags);` |
| `featured_profiles` | `genres TEXT[]` | filter by genre | `CREATE INDEX idx_featured_profiles_genres_gin ON featured_profiles USING GIN (genres);` |
| `auth_users` | `roles TEXT[]` | filter by role | `CREATE INDEX idx_auth_users_roles_gin ON auth_users USING GIN (roles);` |
| `user_profiles` | `fcm_tokens TEXT[]` | push notification | `CREATE INDEX idx_user_profiles_fcm_gin ON user_profiles USING GIN (fcm_tokens);` |

Không có GIN → truy vấn array dùng `ANY()` hoặc `@>` sẽ seq scan toàn bảng.

#### b. GIN index cho JSONB thường query

| Bảng | Cột | Query pattern |
|---|---|---|
| `events` | `location JSONB` | `WHERE location->>'city' = 'Hanoi'` |
| `events` | `ticket_types JSONB` | filter ticket type by name/price |
| `venues` | `data JSONB` | filter by city/capacity |
| `user_profiles` | `matching_preferences JSONB` | matching algorithm |
| `analytics` | `daily_sales JSONB` | time series query |

Đề xuất:
```sql
CREATE INDEX idx_events_location_city ON events USING GIN ((location->'city'));
CREATE INDEX idx_venues_data_city ON venues USING GIN ((data->'city'));
```

Hoặc dùng `jsonb_path_ops` cho query `@>`:
```sql
CREATE INDEX idx_events_location_path ON events USING GIN (location jsonb_path_ops);
```

#### c. Composite index cho query inbox/listing phổ biến

| Query pattern | Index đề xuất |
|---|---|
| "Unread notifications of user X, newest first" | `CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE is_read = false;` |
| "Tickets of user X by status" | `CREATE INDEX idx_tickets_user_status ON tickets (user_id, status);` |
| "Tickets of event X by status" | `CREATE INDEX idx_tickets_event_status ON tickets (event_id, status);` |
| "Published events sorted by date" | `CREATE INDEX idx_events_published_date ON events (date) WHERE lifecycle_status = 'published';` |
| "Events in city X by date" | `CREATE INDEX idx_events_city_date ON events (city, date);` |
| "Orders of user X by status, newest" | `CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at DESC);` |
| "Pending outbox oldest first" | `CREATE INDEX idx_outbox_pending_created ON outbox (created_at) WHERE status = 'pending';` |
| "Active seat holds expiring soon" | `CREATE INDEX idx_seat_holds_active_expires ON seat_holds (expires_at) WHERE status = 'held';` |

#### d. Index cho FK-like columns (thiếu)

| Bảng | Cột | Lý do |
|---|---|---|
| `tickets` | `organizer_id` | Organizer xem ticket của mình |
| `tickets` | `payment_status` | Filter thanh toán |
| `tickets` | `purchase_date` | Sort/theo thời gian mua |
| `tickets` | `group_id` | Group ticket lookup |
| `tickets` | `check_in_count` (partial WHERE > 0) | Đếm đã check-in |
| `events` | `city` | Filter theo thành phố |
| `events` | `is_outdoor` | Filter (low cardinality nhưng dùng cho discovery) |
| `events` | `category` (btree) | Filter đơn category |
| `notifications` | `event_id` | Notification per event |
| `notifications` | `is_read` (partial WHERE false) | Unread badge |
| `reviews` | `rating` | Sort by rating |
| `analytics` | `last_updated_at` | Staleness check |
| `ledger_entries` | `order_id` | Ledger per order |
| `ledger_entries` | `created_at` | Date range reporting |
| `outbox` | `created_at` | Archival/purge |
| `audit_logs` | `created_at` | Archival + date filter |
| `loyalty_points_ledger` | `created_at` | Date range |
| `user_memberships` | `tier_id` | Users per tier |

### 1.3. Index thừa / trùng

- `auth_users.email` đã có `UNIQUE` (tự tạo index) ở `002:17`, nhưng `002:39` lại `CREATE INDEX idx_auth_users_email ON auth_users (email)` → trùng lặp. Xóa `idx_auth_users_email`.
- `promotions.code` đã UNIQUE (`005:15`), không có index trùng → OK.
- `vouchers.code` đã UNIQUE (`030:4`), nhưng `030:17` lại `CREATE INDEX idx_vouchers_code` → trùng. Xóa `idx_vouchers_code`.
- `organizations.slug` đã UNIQUE (`017:33`), `017:66` lại `CREATE INDEX idx_organizations_slug` → trùng. Xóa `idx_organizations_slug`.
- `roles.name` UNIQUE (`017:9`), `017:61` lại `CREATE INDEX idx_roles_name` → trùng.
- `permissions.name` UNIQUE (`017:17`), `017:62` lại `CREATE INDEX idx_permissions_name` → trùng.

→ **6 index trùng** nên drop để tiết kiệm write overhead.

## 2. Query Patterns

### 2.1. `SELECT *` phổ biến

`postgres.order.repository.js:90`:
```js
const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
```

- `orders` có `raw_data JSONB`, `notes TEXT` → kéo theo dữ liệu thừa.
- Nên `SELECT id, user_id, event_id, status, total_amount, currency, created_at, paid_at FROM orders WHERE id = $1`.

Tương tự cần audit các repository khác (`postgres.ticket.repository.js`, `postgres.event.repository.js`).

### 2.2. N+1 query

`postgres.order.repository.js:11-15`:
```js
for (const item of order.items) {
    await insertOrderItem(client, item, order.id);  // N round-trips
}
```

- 10 items = 10 query. Nên bulk insert:
  ```sql
  INSERT INTO order_items (id, order_id, ...) VALUES ($1,$2,...), ($3,$4,...), ...
  ```
- Hoặc dùng `unnest`:
  ```sql
  INSERT INTO order_items (id, order_id, ...)
  SELECT * FROM unnest($1::text[], $2::text[], ...)
  ```

### 2.3. Thiếu EXPLAIN ANALYZE benchmark

Không có test suite benchmark query. Cần thêm:
- `EXPLAIN ANALYZE` cho top 10 query phổ biến.
- pg_stat_statements để monitor slow query.

## 3. Counter Hot-Row Problem

### 3.1. Các counter fields

| Bảng | Cột | Update pattern |
|---|---|---|
| `events` | `view_count INT` (`010:31`) | Mỗi user view event → UPDATE events SET view_count = view_count + 1 |
| `user_profiles` | `followers_count INT` (`008:20`) | Mỗi follow → UPDATE 2 rows (follower + followee) |
| `user_profiles` | `following_count INT` (`008:21`) | Tương tự |
| `user_profiles` | `points INT` (`008:22`) | Mỗi purchase → UPDATE |
| `promotions` | `used_count INT` (`005:9`) | Mỗi redemption → UPDATE |
| `vouchers` | `used_count INT` (`030:10`) | Tương tự |
| `tickets` | `check_in_count INT` (`011:20`) | Mỗi check-in → UPDATE |
| `analytics` | `check_ins INT`, `views INT` (`014:10-11`) | Aggregate |
| `featured_profiles` | `follower_count INT` (`012:11`) | Per follow |

### 3.2. Vấn đề

- Event hot (vd. concert lớn): 1000 user view cùng lúc → 1000 `UPDATE events SET view_count = view_count + 1` → **lock contention** trên 1 row.
- PostgreSQL có row lock ở mức row, nhưng update count vẫn serialize → throughput giảm.
- Tương tự `followers_count` cho celebrity.

### 3.3. Giải pháp

**Option A: Tách bảng counter**
```sql
CREATE TABLE event_view_counts (
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    bucket TIMESTAMP NOT NULL,  -- per minute/hour bucket
    count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (event_id, bucket)
);
-- Insert: INSERT INTO event_view_counts VALUES ($1, date_trunc('minute', NOW()), 1)
--   ON CONFLICT DO UPDATE SET count = count + 1;
-- Read: SELECT SUM(count) FROM event_view_counts WHERE event_id = $1;
```
- Sharding theo bucket → giảm lock contention.
- Aggregate periodically vào `events.view_count` (cron).

**Option B: pg_advisory_xact_lock + upsert**
```sql
BEGIN;
SELECT pg_advisory_xact_lock(hashtext($1));  -- lock by event_id
UPDATE events SET view_count = view_count + 1 WHERE id = $1;
COMMIT;
```
- Vẫn serialize nhưng không lock row events → giảm bloat.

**Option C: Redis cache + periodic flush**
- Increment trong Redis, flush batch vào DB mỗi 1 phút.
- Best performance, nhưng cần handle Redis failure.

**Khuyến nghị:** Option A cho `events.view_count`, Option C cho `user_profiles.followers_count` (high-cardinality celebrity).

## 4. PK Strategy — TEXT vs UUID vs BIGINT

### 4.1. Hiện trạng

- 29 bảng: `id TEXT PRIMARY KEY` (app gen, có thể là UUID/nanoid/cuid).
- 1 bảng: `vouchers.id UUID DEFAULT gen_random_uuid()` (`030:3`).
- Composite PK: `role_permissions(role_id, permission_id)` (`017:27`).

### 4.2. So sánh kích thước

| Loại | Bytes | Index size (10M rows) | Cache hit impact |
|---|---|---|---|
| TEXT (UUID v4 string) | 36 | ~720 MB | worst |
| TEXT (nanoid 21 chars) | 21 | ~420 MB | bad |
| UUID (binary) | 16 | ~320 MB | medium |
| BIGINT | 8 | ~160 MB | best |
| UUID v7 (binary) | 16 | ~320 MB | medium (time-ordered, better locality) |

TEXT PK lớn hơn BIGINT 4-9x → tất cả index secondary cũng lớn theo (vì index leaf chứa PK).

### 4.3. Vấn đề

- 10M tickets × TEXT PK (36 bytes UUID) = 360 MB chỉ PK. Index secondary `idx_tickets_event_id` (TEXT event_id + TEXT PK) = ~720 MB.
- Cache hit giảm → disk I/O tăng.
- Sort/scan chậm hơn BIGINT.

### 4.4. Khuyến nghị

- **Bảng nhỏ / reference data:** TEXT OK (roles, permissions, organizations, membership_tiers).
- **Bảng lớn (tickets, orders, payment_attempts, audit_logs, ledger_entries, outbox):** chuyển sang `BIGINT GENERATED ALWAYS AS IDENTITY` hoặc `UUID v7` (binary).
- **Migration cost:** cao — cần data migration + app change. Để P3.

### 4.5. Giải pháp trung gian

Giữ TEXT PK nhưng chuẩn hóa format:
- Tất cả dùng UUID v4 string (36 chars) — hiện có thể đang mix nanoid/cuid/UUID.
- Hoặc dùng UUID v7 string (time-ordered) → better index locality.

## 5. Partitioning

### 5.1. Bảng nên partition

| Bảng | Growth rate | Partition key | Strategy |
|---|---|---|---|
| `audit_logs` | High (mỗi admin action) | `created_at` | RANGE monthly |
| `outbox` | High (mỗi domain event) | `created_at` | RANGE monthly + retention |
| `notifications` | High | `created_at` | RANGE monthly + retention 90 days |
| `idempotency_keys` | Medium | `expires_at` | RANGE weekly + retention |
| `ledger_entries` | Medium | `created_at` | RANGE yearly |
| `tickets` | Medium | `purchase_date` hoặc `created_at` | RANGE yearly |
| `payment_attempts` | Medium | `created_at` | RANGE yearly |
| `event_media` | Medium | `created_at` | RANGE yearly |
| `loyalty_points_ledger` | Medium | `created_at` | RANGE yearly |

### 5.2. Yêu cầu kỹ thuật

- Partition key phải nằm trong PK (với PostgreSQL declarative partitioning).
- Bảng TEXT PK hiện tại sẽ cần composite PK `(id, created_at)`.
- Timestamp phải là `TIMESTAMPTZ` (không phải BIGINT) để dùng native partitioning dễ.

### 5.3. Khuyến nghị

- Phase 1: Chuyển timestamp sang TIMESTAMPTZ (P1).
- Phase 2: Partition `audit_logs` + `outbox` + `notifications` đầu tiên (high-growth).
- Phase 3: Partition `tickets` + `orders` khi đạt 10M rows.

## 6. Connection Pool

### 6.1. Hiện trạng

`postgres.client.js:8-11`:
```js
pool = new Pool({
    connectionString: config.databaseUrl,
});
```

- Không set `max` (default 10).
- Không set `statement_timeout` (default 0 = unlimited).
- Không set `idleTimeoutMillis` (default 30000).
- Không set `connectionTimeoutMillis`.

### 6.2. Vấn đề

- High-concurrency (1000 RPS) → 10 connection không đủ → queue → latency tăng.
- Query slow (vd. seq scan do thiếu GIN) treo connection → pool cạn kiệt.
- Long-running transaction (outbox worker) giữ connection → giảm available.

### 6.3. Khuyến nghị

```js
pool = new Pool({
    connectionString: config.databaseUrl,
    max: parseInt(process.env.PG_POOL_MAX || '20'),
    statement_timeout: parseInt(process.env.PG_STATEMENT_TIMEOUT || '30000'),  // 30s
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    query_timeout: 30000,
});
```

Thêm:
- `pg_stat_statements` extension để track slow query.
- Query log interceptor:
  ```js
  const origQuery = pool.query.bind(pool);
  pool.query = function(text, params) {
      const start = Date.now();
      return origQuery(text, params).then(res => {
          const duration = Date.now() - start;
          if (duration > 1000) logger.warn('slow query', { text, duration, params });
          return res;
      });
  };
  ```

## 7. Đánh giá performance tổng

| Khía cạnh | Điểm | Ghi chú |
|---|---|---|
| Index coverage | 6/10 | Đủ cơ bản, thiếu GIN + composite |
| Index redundancy | 4/10 | 6 index trùng |
| Query patterns | 5/10 | SELECT *, N+1 phổ biến |
| Counter scalability | 3/10 | Hot-row lock |
| PK strategy | 4/10 | TEXT lớn, không nhất quán |
| Partitioning | 0/10 | Không có |
| Connection pool config | 3/10 | Default, không timeout |

**Điểm performance tổng: 6/10** — Đủ chạy nhỏ, sẽ bottleneck khi scale.
