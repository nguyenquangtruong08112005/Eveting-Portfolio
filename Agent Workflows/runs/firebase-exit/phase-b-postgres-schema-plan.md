# Phase B – Postgres Schema Plan

Trạng thái: draft
Ngày: 2026-05-28
Nguồn: `phase-a-audit.md`, `phase-b-backend-ports-plan.md`

---

## 1. Bảng Postgres Đề Xuất

### Nhóm Users / Auth

| Bảng | Mục đích | Ghi chú |
|---|---|---|
| `users` | Profile, Firebase UID → internal PK | `uid VARCHAR(128) UNIQUE NOT NULL`, `email`, `display_name`, `avatar_url`, `created_at` |
| `user_roles` | Many-to-many role | `user_id FK → users`, `role VARCHAR(64)` |
| `user_push_tokens` | FCM/OneSignal tokens | `user_id FK → users`, `token TEXT UNIQUE`, `provider VARCHAR(16)`, `created_at` |
| `user_follows` | Replace `arrayUnion`/`arrayRemove` | `follower_id FK → users`, `target_id FK → users`, `UNIQUE(follower_id, target_id)` |
| `user_event_history` | Replace array history | `user_id FK → users`, `event_id FK → events`, `viewed_at` |

### Nhóm Events

| Bảng | Mục đích | Ghi chú |
|---|---|---|
| `events` | Core event data | `id UUID PK`, `organizer_id FK → users`, `title`, `description`, `start_time`, `end_time`, `status`, `created_at` |
| `event_categories` | Category mapping | `event_id FK → events`, `category VARCHAR(64)`, `UNIQUE(event_id, category)` |
| `event_tags` | Tag mapping | `event_id FK → events`, `tag VARCHAR(64)`, `UNIQUE(event_id, tag)` |
| `event_featured_profiles` | Featured profile/artist links | `event_id FK → events`, `profile_id FK → featured_profiles`, `UNIQUE(event_id, profile_id)` |
| `event_locations` | Location/Venue linkage | `event_id FK → events UNIQUE`, `venue_id FK → venues`, `address TEXT`, `lat`, `lng` |

### Nhóm Tickets / Payments

| Bảng | Mục đích | Ghi chú |
|---|---|---|
| `ticket_types` | Normalised từ nested map | `id UUID PK`, `event_id FK → events`, `name`, `price NUMERIC`, `quantity_total INT`, `quantity_sold INT DEFAULT 0`, `UNIQUE(event_id, name)` |
| `tickets` | Purchased ticket | `id UUID PK`, `event_id FK → events`, `user_id FK → users`, `ticket_type_id FK → ticket_types`, `status VARCHAR(32)`, `payment_id UUID`, `check_in_time TIMESTAMPTZ`, `purchased_at` |
| `payments` | Payment transaction log | `id UUID PK`, `ticket_id FK → tickets`, `user_id FK → users`, `amount NUMERIC`, `provider VARCHAR(32)`, `provider_txn_id TEXT`, `status VARCHAR(32)`, `idempotency_key VARCHAR(255) UNIQUE`, `created_at` |
| `promotions` | Promo code catalog | `id UUID PK`, `code VARCHAR(64) UNIQUE`, `discount_type VARCHAR(16)`, `discount_value NUMERIC`, `max_redemptions INT`, `redemption_count INT DEFAULT 0` |
| `promotion_redemptions` | One row per redemption | `id UUID PK`, `promotion_id FK → promotions`, `user_id FK → users`, `ticket_id FK → tickets`, `redeemed_at`, `UNIQUE(promotion_id, user_id)` |

### Nhóm Notifications

| Bảng | Mục đích | Ghi chú |
|---|---|---|
| `notifications` | In-app notification records | `id UUID PK`, `user_id FK → users`, `type VARCHAR(64)`, `title TEXT`, `body TEXT`, `data JSONB`, `is_read BOOLEAN DEFAULT FALSE`, `created_at` |
| `notification_outbox` | Outbox cho reliable delivery | `id UUID PK`, `notification_id FK → notifications`, `channel VARCHAR(16)`, `status VARCHAR(32) DEFAULT 'pending'`, `retry_count INT DEFAULT 0`, `last_error TEXT` |

### Nhóm Storage / Media

| Bảng | Mục đích | Ghi chú |
|---|---|---|
| `event_media` | Media records (provider-neutral) | `id UUID PK`, `event_id FK → events`, `uploader_id FK → users`, `object_key TEXT NOT NULL`, `mime_type VARCHAR(64)`, `size_bytes BIGINT`, `created_at` |
| `media_uploads` | Upload session tracking | `id UUID PK`, `user_id FK → users`, `file_name TEXT`, `object_key TEXT`, `status VARCHAR(32)`, `expires_at TIMESTAMPTZ` |

### Nhóm Analytics

| Bảng | Mục đích | Ghi chú |
|---|---|---|
| `event_analytics` | Read-model / materialised | `event_id FK → events PK`, `total_tickets_sold INT`, `total_revenue NUMERIC`, `total_check_ins INT`, `updated_at TIMESTAMPTZ` |
| `analytics_events` | Raw event log | `id UUID PK`, `event_id FK → events`, `event_type VARCHAR(64)`, `payload JSONB`, `occurred_at` |

### Bảng khác (Venues, FeaturedProfiles, Reviews)

| Bảng | Mục đích |
|---|---|
| `venues` | Venue catalog (id, name, address, lat, lng, capacity) |
| `venue_amenities` | Many-to-many venue amenities |
| `featured_profiles` | Artist/organizer profiles (id, user_id FK, bio, avatar) |
| `profile_followers` | Join table (profile_id FK, user_id FK) |
| `reviews` | Event reviews (id, event_id FK, user_id FK, rating, body) |

---

## 2. Transaction / Idempotency Boundaries

### Buy Ticket

```
BEGIN;
  -- 1. Validate promotion idempotency (check promotion_redemptions)
  -- 2. SELECT quantity_sold FROM ticket_types WHERE id = $ticketTypeId FOR UPDATE
  -- 3. Validate quantity_sold + requested <= quantity_total
  -- 4. UPDATE ticket_types SET quantity_sold = quantity_sold + $qty WHERE id = $ticketTypeId
  -- 5. INSERT INTO tickets (...) VALUES (...)
  -- 6. INSERT INTO payments (..., idempotency_key = $idempotencyKey) ON CONFLICT(idempotency_key) DO NOTHING
  -- 7. If promotion: INSERT INTO promotion_redemptions ON CONFLICT DO NOTHING
  -- 8. UPDATE promotions SET redemption_count = redemption_count + 1 WHERE id = $promoId (nếu còn slot)
COMMIT;
```

Idempotency key: `payment.service` tạo `sha256(userId + eventId + ticketTypeId + timestamp)` ở client, backend kiểm tra `ON CONFLICT(idempotency_key)`.

### Payment Callback

```
BEGIN;
  -- 1. SELECT ... FROM payments WHERE id = $paymentId FOR UPDATE
  -- 2. UPDATE payments SET status = $newStatus, provider_txn_id = $txnId WHERE id = $paymentId
  -- 3. If success: UPDATE tickets SET status = 'confirmed' WHERE id = $ticketId
  -- 4. If failure: UPDATE tickets SET status = 'failed' WHERE id = $ticketId;
  --               UPDATE ticket_types SET quantity_sold = quantity_sold - 1 WHERE id = $ticketTypeId
COMMIT;
```

Callback phải idempotent: `provider_txn_id` làm dedup key. ZaloPay/OnePay callback có thể gọi nhiều lần.

### Check-in

```
BEGIN;
  -- 1. SELECT ... FROM tickets WHERE id = $ticketId FOR UPDATE
  -- 2. Validate ticket.status = 'confirmed' AND ticket.check_in_time IS NULL
  -- 3. UPDATE tickets SET status = 'checked_in', check_in_time = NOW() WHERE id = $ticketId
  -- 4. UPSERT event_analytics (total_check_ins = total_check_ins + 1)
COMMIT;
```

### Cancel Event

```
BEGIN;
  -- 1. SELECT ... FROM events WHERE id = $eventId FOR UPDATE
  -- 2. UPDATE events SET status = 'cancelled'
  -- 3. FOR EACH ticket WHERE event_id = $eventId AND status IN ('confirmed', 'pending'):
  --      UPDATE tickets SET status = 'refunded'
  --      UPDATE ticket_types SET quantity_sold = quantity_sold - 1
  --      INSERT INTO notification_outbox (notification_id, ...)
  -- 4. UPSERT event_analytics (reset counters)
COMMIT;
```

Lưu ý: cancel event transaction có thể lớn (nhiều ticket). Xem xét batch async nếu > 1000 tickets.

### Broadcast / Reminder

```
BEGIN;
  -- 1. INSERT INTO notifications (...) VALUES (...) RETURNING id
  -- 2. INSERT INTO notification_outbox (notification_id, channel, status) VALUES (...) 
COMMIT;
-- Outbox worker (outside transaction): gửi push qua OneSignal/FCM, update status → 'sent' / 'failed'
```

---

## 3. Mapping Firestore → Relational

| Firestore pattern | Postgres mapping | Ghi chú |
|---|---|---|
| `arrayUnion` / `arrayRemove` | `INSERT INTO join_table ... ON CONFLICT DO NOTHING` / `DELETE FROM join_table` | Chuẩn SQL, không dùng mảng. |
| `FieldValue.increment` | `UPDATE table SET counter = counter + N WHERE ...` | Atomic, không race condition trong transaction. |
| `FieldPath.documentId()` | `WHERE id = ANY($1::uuid[])` | Dùng array binding, không `IN` với string list. |
| Nested map `ticketTypes.${type}.available` | `ticket_types` table riêng với `quantity_sold` | Chuẩn hoá, dùng `SELECT ... FOR UPDATE`. |
| `fcmTokens` array | `user_push_tokens` table | Mỗi token một row, dễ quản lý provider swap (OneSignal). |
| `following` array | `user_follows` table | Có `UNIQUE` constraint. |
| `eventHistory` array | `user_event_history` table | Mỗi view một row, có `viewed_at` timestamp. |
| `Notifications` subcollection | `notifications` table | Thêm `user_id` index, không cần subcollection. |
| `Promotions.usedBy` array/embedded | `promotion_redemptions` table | `UNIQUE(promotion_id, user_id)` chống dùng lại. |
| `Media.storagePath` | `event_media.object_key` | Provider-neutral, không hardcode gs://. |

---

## 4. Docker Postgres Assumptions (Minimum)

- **Image**: `postgres:15-alpine` (15+ vì `MERGE` và `UUID` support tốt hơn).
- **Extensions**: `pgcrypto` (gen_random_uuid()), `pg_trgm` (nếu cần text search cơ bản).
- **Volume**: Mount `postgres_data` cho persistence.
- **Port**: 5432 (configurable qua `POSTGRES_PORT`).
- **Connection pool**: `pgbouncer` sidecar hoặc app-level pool (`pg.Pool` với max 20).
- **Health check**: `pg_isready -U postgres`.
- **Init script**: `init.sql` chạy CREATE TABLE + CREATE INDEX.
- **Credentials**: Qua env `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.
- **docker-compose** (minimum):
  ```yaml
  services:
    postgres:
      image: postgres:15-alpine
      environment:
        POSTGRES_DB: eventing
        POSTGRES_USER: app
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      volumes:
        - postgres_data:/var/lib/postgresql/data
        - ./migrations/init.sql:/docker-entrypoint-initdb.d/init.sql
      ports:
        - "5432:5432"
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U app -d eventing"]
        interval: 5s
  ```

---

## 5. Phase C Migration File Order

Thứ tự migration dựa trên dependency:

```
001_venues.up.sql                    # Standalone
002_users.up.sql                     # FK → (none)
003_user_roles.up.sql                # FK → users
004_user_push_tokens.up.sql          # FK → users
005_featured_profiles.up.sql         # FK → users
006_promotions.up.sql                # Standalone
007_events.up.sql                    # FK → users
008_event_categories.up.sql          # FK → events
009_event_tags.up.sql                # FK → events
010_event_locations.up.sql           # FK → events, venues
011_event_featured_profiles.up.sql   # FK → events, featured_profiles
012_ticket_types.up.sql              # FK → events
013_tickets.up.sql                   # FK → events, users, ticket_types
014_payments.up.sql                  # FK → tickets, users; idempotency_key UNIQUE
015_promotion_redemptions.up.sql     # FK → promotions, users, tickets
016_reviews.up.sql                   # FK → events, users
017_notifications.up.sql             # FK → users
018_notification_outbox.up.sql       # FK → notifications
019_event_media.up.sql               # FK → events, users
020_media_uploads.up.sql             # FK → users
021_user_follows.up.sql              # FK → users (x2)
022_user_event_history.up.sql        # FK → users, events
023_profile_followers.up.sql         # FK → featured_profiles, users
024_event_analytics.up.sql           # FK → events
025_analytics_events.up.sql          # FK → events
```

Mỗi file đi kèm `*.down.sql` để rollback. Dùng migration tool (golang-migrate / node-pg-migrate / dbmate).

Index cần có:
```sql
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_payments_idempotency ON payments(idempotency_key);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);
CREATE UNIQUE INDEX idx_promotion_redemptions_dedup ON promotion_redemptions(promotion_id, user_id);
CREATE INDEX idx_user_push_tokens_user ON user_push_tokens(user_id);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_target ON user_follows(target_id);
```

---

## 6. Risks

### P0 (Critical – block Phase C)

| Risk | Mitigation |
|---|---|
| Auth: Firebase UID → Postgres user mapping sai, lock user | Dùng `ON CONFLICT DO NOTHING` khi import; map `uid` trùng khớp. Auth middleware Phase F chuyển JWT verification. |
| Ticket inventory: race condition giữa `SELECT ... FOR UPDATE` và `UPDATE quantity_sold` | Luôn dùng `SELECT ... FOR UPDATE` trong transaction. `idempotency_key` UNIQUE constraint chống double-buy. |
| Storage: object key thay đổi → media 404 | Giữ nguyên object key (copy từ Firebase Storage qua S3/Cloudflare R2). Provider-neutral `object_key` column. |

### P1 (High – cần kế hoạch xử lý)

| Risk | Mitigation |
|---|---|
| Elasticsearch sync: mất trigger Firestore | Chọn: (1) dual-write trong service, (2) outbox table cho ES events, (3) CDC listener. Không phụ thuộc Firestore trigger. |
| Notification: outbox worker failure → không gửi | `retry_count` + dead-letter queue. Transaction outbox pattern. |
| Array → join table: dữ liệu lỗi thời nếu import sai | Migration script có `COUNT(*)` verify trước và sau. |
| Nested ticket types mapping: mất thông tin khi flatten | Tạo `ticket_types` table và migrate data bằng `INSERT ... SELECT`. Verify tổng `quantity_sold` giống nhau. |

### P2 (Low – non-blocking)

| Risk | Ghi chú |
|---|---|
| OneSignal Android vẫn cần FCM transport | Là Android system constraint. App code có thể bỏ Firebase Messaging API, chỉ giữ FCM token cho OneSignal. |
| Seed scripts Firestore-dependent | Tạo seed script mới dùng SQL INSERT. Phase E thay thế hoàn toàn. |
| Dirty workspace / worktree lộn | Dùng branch riêng cho Phase C, reset `node_modules` và `.env`. |
| Migration order sai → FK violation | Dùng migration tool (golang-migrate/dbmate) enforce ordered run. |

---

## 7. CMD Verification Strategy

### Trước Phase C execution

```powershell
# 1. Kiểm tra schema plan không thiếu bảng so với audit
rg -c "^│ `" phase-a-audit.md  # đếm collection mapping rows
rg -c "^| " phase-b-postgres-schema-plan.md  # đếm bảng (section 1)

# 2. Kiểm tra transaction boundary không thiếu flow
rg -n "^### " phase-b-postgres-schema-plan.md  # liệt kê transaction sections

# 3. Kiểm tra FK references trong migration order
rg "^[0-9]+_.+FK →" phase-b-postgres-schema-plan.md | ForEach-Object { $_ -match "FK → (.+)" }
# Verify tất cả FK target tables có migration phía trước.

# 4. Kiểm tra Docker assumption không thiếu
rg "(postgres|pgbouncer|volume|healthcheck)" phase-b-postgres-schema-plan.md

# 5. Kiểm tra risks được phân loại P0/P1/P2
rg "^### P[0-9]" phase-b-postgres-schema-plan.md

# 6. Kiểm tra mapping không thiếu Firestore-specific ops từ audit
rg "\| `FieldValue|`arrayUnion|`arrayRemove|`FieldPath" phase-a-audit.md | ForEach-Object {
  $pattern = $_ -replace '.*`([^`]+)`.*', '$1'
  rg -q "$pattern" phase-b-postgres-schema-plan.md -g "*.md"
}
```

### Sau Phase C execution

```powershell
# 1. Verify migration chạy đúng order
rg -l "up.sql" migrations\ | Sort-Object

# 2. Verify data mapping (sample query)
psql -h localhost -U app -d eventing -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 3. Verify index tồn tại
psql -h localhost -U app -d eventing -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public';"
```

---

## Tóm Tắt

| Thành phần | Số lượng |
|---|---|
| Bảng Postgres | ~25 bảng (users 5, events 5, tickets/payments 5, notifications 2, media 2, analytics 2, venues 2, featured 2, reviews 1) |
| Transaction boundaries | 5 (buy_ticket, payment_callback, check_in, cancel_event, broadcast_reminder) |
| Migration files | 25 up + 25 down |
| Index khuyến nghị | ~14 index |
| Docker baseline | postgres:15-alpine + pgcrypto + pgbouncer |
| P0 risks | 3 (auth mapping, inventory race, storage URL) |
| P1 risks | 4 (ES sync, notification outbox, array migration, ticket types) |
| P2 risks | 4 (OneSignal, seed scripts, dirty workspace, migration order) |

Viết bởi OpenCode planning worker. Không chỉnh sửa source repos. Không chạy build/test.
