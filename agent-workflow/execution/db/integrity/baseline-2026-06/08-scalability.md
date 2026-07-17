# 08 — Scalability

## 1. Hiện trạng Scalability

### 1.1. Topology
- **Single PostgreSQL instance.** Không có read replica, không có sharding.
- Connection pool `pg.Pool` default `max=10` (`postgres.client.js:8-11`).
- Không có PgBouncer/pgcat config trong repo.

### 1.2. Data growth projection (ước tính)

Giả sử platform 10k DAU, 100 events active/tháng, 5% conversion → 500 ticket mua/ngày.

| Bảng | Growth/day | Growth/year | Sau 3 năm |
|---|---|---|---|
| `tickets` | 500 rows | 182k | ~550k |
| `orders` | 500 rows | 182k | ~550k |
| `order_items` | 1000 rows (2 items/order) | 365k | ~1.1M |
| `payment_attempts` | 600 rows (1.2 attempt/order) | 219k | ~660k |
| `notifications` | 5000 rows | 1.8M | ~5.5M |
| `audit_logs` | 2000 rows | 730k | ~2.2M |
| `outbox` | 500 rows | 182k | ~550k |
| `ledger_entries` | 500 rows | 182k | ~550k |
| `event_media` | 100 rows | 36k | ~110k |
| `loyalty_points_ledger` | 500 rows | 182k | ~550k |
| `idempotency_keys` | 500 rows (retention 90d) | 45k steady-state | 45k |
| `seat_holds` | 200 rows (held 15min) | <1k steady-state | <1k |

**Bảng phình nhanh nhất:** `notifications`, `audit_logs`, `order_items`, `tickets`.

### 1.3. Thresholds cần để ý

| Bảng | Threshold | Lý do |
|---|---|---|
| `tickets`, `orders` | 10M rows | Index size > 1GB, cache hit giảm |
| `audit_logs` | 50M rows | 100GB+ disk, query slow |
| `notifications` | 100M rows | 200GB+ disk, retention cần thiết |
| `outbox` | 1M rows | Pending backlog ảnh hưởng event delivery |

## 2. Vấn đề Scalability

### 2.1. Không có partitioning

**Bảng nên partition (priority order):**

1. **`audit_logs`** (P1) — growth cao, query theo time range, retention tự nhiên.
2. **`outbox`** (P1) — growth cao, processing theo time, retention 30 ngày.
3. **`notifications`** (P1) — growth rất cao, query theo user + time, retention 90 ngày.
4. **`idempotency_keys`** (P2) — retention 7 ngày, partition weekly.
5. **`ledger_entries`** (P2) — append-only, reporting theo year.
6. **`tickets`** (P3) — khi đạt 10M rows, partition theo `purchase_date` yearly.
7. **`orders`** (P3) — tương tự tickets.
8. **`payment_attempts`** (P3) — tương tự.
9. **`event_media`** (P3) — partition theo `created_at` yearly.
10. **`loyalty_points_ledger`** (P3) — partition theo `created_at` yearly.

**Yêu cầu kỹ thuật:**
- Partition key phải nằm trong PK (composite PK).
- Timestamp phải là `TIMESTAMPTZ` (không phải BIGINT) → cần fix `06-consistency.md` trước.
- Code insert phải include partition key (vd. `created_at` trong INSERT, không default).

**Template partition:**
```sql
CREATE TABLE audit_logs (
    id TEXT,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2026_q3 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

-- Auto-create partition monthly via pg_partman extension:
-- SELECT partman.create_parent('public.audit_logs', 'created_at', 'native', 'monthly');
```

### 2.2. Hot-row Lock Contentions

#### a. Counter updates
Phân tích tại `05-performance.md` section 3. Hot-row trên:
- `events.view_count` (event hot)
- `user_profiles.followers_count` (celebrity)
- `user_profiles.points` (high-activity user)
- `promotions.used_count` (viral promo)
- `vouchers.used_count` (viral voucher)
- `tickets.check_in_count` (event door)
- `analytics.check_ins`, `analytics.views`

**Giải pháp:** Tách counter sang bảng riêng (per-bucket) hoặc Redis cache + batch flush.

#### b. Outbox processing
```sql
-- Worker poll:
SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED;
-- Update:
UPDATE outbox SET status = 'processing' WHERE id IN (...);
```
- Nếu nhiều worker poll cùng lúc → lock contention trên outbox rows.
- `SKIP LOCKED` giảm contention, nhưng vẫn scan index `idx_outbox_status_retry`.
- Khi outbox lớn (1M+ pending), index scan chậm.

**Giải pháp:**
- Partition outbox theo `created_at` → worker chỉ scan partition gần đây.
- Thêm `next_attempt_at` + index `(status, next_attempt_at)` để worker chỉ poll due items.
- Thêm `locked_by` (worker id) + `locked_at` để distribute work.

### 2.3. TEXT PK Index Bloat

Phân tích tại `05-performance.md` section 4. TEXT PK (36-byte UUID string) lớn hơn BIGINT (8-byte) 4.5x.

**Tác động:**
- Index secondary chứa PK → phình tương ứng.
- `idx_tickets_event_id` (btree) = (event_id TEXT + ticket_id TEXT PK) = ~72 bytes/entry.
- 10M tickets → `idx_tickets_event_id` ~720 MB.
- Cache hit giảm → disk I/O tăng.

**Giải pháp:**
- P3: Đổi PK sang BIGINT identity (bảng lớn) hoặc UUID v7 binary (time-ordered, better locality).

### 2.4. JSONB Bloat

- `events.raw_data`, `tickets.raw_data`, `user_profiles.raw_data`, `order.raw_data`, `payment_attempts.request_payload/response_payload/gateway_response`, `audit_logs.metadata/changes` — đều JSONB, có thể lớn (KB-MB per row).
- `SELECT *` kéo theo TOAST → chậm.
- Không có GIN index cho JSONB → query filter seq scan.

**Giải pháp:**
- Bỏ `SELECT *`, chọn cột cần.
- GIN index cho JSONB thường query.
- Move `raw_data`/`payload` sang bảng con (`ticket_audit_payloads(ticket_id, payload)`) nếu ít query.
- Compression (TOAST tự compress > 2KB, OK).

### 2.5. Mảng TEXT[] phình

- `user_profiles.followed_profile_ids TEXT[]` — celebrity theo dõi 100k user → row vài MB.
- `user_profiles.history_event_ids TEXT[]` — heavy user tham gia 10k event → row 400 KB.
- `events.featured_profile_ids TEXT[]` — OK (thường < 100).
- `events.category`, `events.tags` — OK (thường < 10).

**Giải pháp:** Tách sang bảng trung gian (xem `03-normalization-analysis.md`).

### 2.6. Connection Pool Exhaustion

- Default `max=10` connections.
- 1000 RPS → queue, latency tăng.
- Outbox worker giữ connection trong transaction dài → giảm available.
- Analytics/reporting query chậm giữ connection.

**Giải pháp:**
- Tăng `max` lên 20-50 (xem `05-performance.md` section 6).
- PgBouncer transaction-mode pooling ở giữa app và DB.
- Read replica cho analytics queries.
- Worker pool riêng cho outbox (không share với request pool).

### 2.7. Không có Read Replica

- Tất cả query (read + write) về 1 instance.
- Analytics/reporting query nặng (vd. `SUM(amount) FROM ledger_entries GROUP BY organizer`) ảnh hưởng write throughput.

**Giải pháp:**
- Logical replication sang read replica.
- App split: write → primary, read → replica (cần repo pattern support).
- Đã có hexagonal repo pattern (`postgres.*.repository.js`) → swap sang `replica.*.repository.js` cho read methods.

### 2.8. Không có Sharding Strategy

- Khi 1 DB không đủ (10M+ users, 100M+ tickets), cần shard.
- Sharding key đề xuất: `organizer_id` (mỗi organizer có data liên quan: events, tickets, orders, ledger).
- Cross-shard query: admin analytics, search → cần aggregator service.

**Giải pháp:** P3+, khi đạt 10M users.

## 3. Scalability Pattern Hiện Có (Good)

### 3.1. Outbox pattern ✓
- Cho phép decouple domain change từ event delivery.
- Worker có thể scale horizontally (mỗi worker poll independent).
- Retry có backoff (cần thêm `next_attempt_at`).

### 3.2. Idempotency keys ✓
- Cho phép retry safe ở client side.
- `orders.idempotency_key` unique partial index → 1 order per key per user.

### 3.3. Ledger append-only ✓
- Append-only không update → no lock contention on existing rows.
- Dễ partition theo time.
- Balance là materialized view → có thể compute async.

### 3.4. Repository pattern ✓
- Hexagonal, dễ swap DB engine.
- Có thể thêm `replica.*.repository.js` cho read replica.

### 3.5. Seat holds partial unique index ✓
- Lock-free seat reservation (PostgreSQL row lock trên partial index).
- Worker cleanup expired holds chạy async.

## 4. Scalability Roadmap

### Phase 1 (P1 — 0-3 tháng)
1. Chuẩn hóa timestamp sang TIMESTAMPTZ (điều kiện tiên quyết cho partitioning).
2. Tăng pool size + add timeout.
3. Thêm GIN index cho arrays/JSONB (giảm seq scan).
4. Thêm composite index cho hot queries.
5. Tách `events.view_count`, `user_profiles.followers_count` counter sang bảng riêng.

### Phase 2 (P2 — 3-6 tháng)
6. Partition `audit_logs`, `outbox`, `notifications` (high-growth).
7. Retention policy + archival job cho `audit_logs` (1 year), `notifications` (90 days), `outbox` (30 days), `idempotency_keys` (7 days).
8. Read replica cho analytics/reporting.
9. PgBouncer transaction-mode pooling.

### Phase 3 (P3 — 6-12 tháng)
10. Partition `tickets`, `orders`, `payment_attempts`, `ledger_entries` (khi đạt 5M+ rows).
11. Đổi PK sang BIGINT identity cho bảng lớn.
12. Shard per organizer (khi đạt 10M users).
13. Materialized view cho `analytics` (refresh định kỳ thay vì trigger).

### Phase 4 (long-term)
14. Multi-region deployment (read replica per region).
15. CDC (Change Data Capture) sang data warehouse cho analytics (vd. Debezium → Kafka → ClickHouse).
16. Event sourcing cho critical aggregates (orders, payments).

## 5. Đánh giá scalability tổng

| Khía cạnh | Điểm | Ghi chú |
|---|---|---|
| Pattern for scale (outbox/idempotency/ledger) | 8/10 | Nền tảng tốt |
| Partitioning | 0/10 | Không có |
| Hot-row mitigation | 3/10 | Counter update nguyên row |
| Read replica | 0/10 | Không có |
| Connection pool | 3/10 | Default config |
| PK efficiency | 4/10 | TEXT lớn |
| JSONB management | 4/10 | Bloat, không GIN |
| Array management | 3/10 | Phình row |
| Sharding strategy | 0/10 | Không có |
| Retention/archival | 0/10 | Không có |

**Điểm scalability tổng: 5/10** — Pattern tốt cho eventual consistency, nhưng thiếu hạ tầng physical scaling (partition, replica, sharding).
