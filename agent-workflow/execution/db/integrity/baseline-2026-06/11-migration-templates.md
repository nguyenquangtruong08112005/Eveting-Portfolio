# 11 — Migration Templates

SQL template sẵn sàng cho các fix chính. Mỗi template là 1 file migration độc lập, idempotent, có rollback note.

## Quy ước
- Filename: `NNN_description.sql` (số thứ tự tiếp theo sau 030).
- Mỗi file bắt đầu bằng comment block: mô tả, dependency, rollback note.
- Tất cả statement idempotent (`IF NOT EXISTS`, `IF EXISTS`).
- Không dùng `DROP TABLE` trong forward migration.
- Test trên staging trước khi production.

---

## Template 031 — Reconcile audit_logs schema

```sql
-- Migration: 031_reconcile_audit_logs
-- Description: Thống nhất schema audit_logs sau khi 025 DROP CASCADE tạo xung đột.
--              Giữ schema 017 (actor_id, metadata, TIMESTAMPTZ) làm chuẩn.
-- Dependency: 017_create_rbac_tables.sql, 025_create_audit_logs.sql
-- Rollback: Khó — cần backup trước khi chạy. Nếu sai, restore từ backup.
-- Idempotent: Có (ADD COLUMN IF NOT EXISTS, DROP COLUMN IF EXISTS)

-- Bước 1: Thêm cột thiếu từ schema 017
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Bước 2: Backfill actor_id từ user_id (nếu user_id tồn tại)
UPDATE audit_logs
SET actor_id = user_id
WHERE actor_id IS NULL AND user_id IS NOT NULL;

-- Bước 3: Backfill metadata từ changes (nếu changes tồn tại)
UPDATE audit_logs
SET metadata = changes
WHERE metadata = '{}'::jsonb AND changes IS NOT NULL;

-- Bước 4: Bước 4 — Đổi created_at BIGINT → TIMESTAMPTZ nếu đang là BIGINT
-- Cần kiểm tra kiểu trước:
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'created_at'
        AND data_type = 'bigint'
    ) THEN
        ALTER TABLE audit_logs
          ALTER COLUMN created_at TYPE TIMESTAMPTZ
          USING to_timestamp(created_at / 1000.0);
        ALTER TABLE audit_logs
          ALTER COLUMN created_at SET DEFAULT NOW();
    END IF;
END $$;

-- Bước 5: Đặt NOT NULL
ALTER TABLE audit_logs
  ALTER COLUMN actor_id SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- Bước 6: Thêm index đã mất từ schema 017
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- Bước 7: Bỏ cột thừa từ schema 025 (sau khi backfill)
-- CẢNH BÁO: Chỉ DROP sau khi verify app code không dùng. Comment lại nếu chưa chắc.
-- ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE audit_logs DROP COLUMN IF EXISTS changes;

-- Bước 8: Đổi tên actor_id → user_id nếu code dùng user_id (tùy business decision)
-- Giữ actor_id (rộng hơn — có thể là system user cho cron jobs).

-- Bước 9: Thêm CHECK constraint (optional, sau khi audit data)
-- ALTER TABLE audit_logs ADD CONSTRAINT chk_audit_logs_action
--   CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'export', 'config_change'));
```

## Template 032 — Fix idempotency_keys non-destructive

```sql
-- Migration: 032_fix_idempotency_keys
-- Description: Đảm bảo idempotency_keys không destructive, bổ sung cột thiếu.
-- Dependency: 026_create_idempotency_keys.sql
-- Idempotent: Có

-- Nếu bảng không tồn tại (migration 026 chưa chạy), tạo mới
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    response_code INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    in_progress BOOLEAN NOT NULL DEFAULT false,
    in_progress_locked_at TIMESTAMPTZ,
    request_hash TEXT
);

-- Nếu đã tồn tại (BIGINT timestamps), migrate
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'idempotency_keys' AND column_name = 'created_at'
        AND data_type = 'bigint'
    ) THEN
        ALTER TABLE idempotency_keys
          ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
          ALTER COLUMN created_at SET DEFAULT NOW();
        ALTER TABLE idempotency_keys
          ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING to_timestamp(expires_at / 1000.0);
    END IF;
END $$;

-- Thêm cột mới cho in-progress state
ALTER TABLE idempotency_keys
  ADD COLUMN IF NOT EXISTS in_progress BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_progress_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS request_hash TEXT;

-- Index cho in-progress state
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_in_progress
  ON idempotency_keys (in_progress, in_progress_locked_at)
  WHERE in_progress = true;

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires
  ON idempotency_keys (expires_at);
```

## Template 033 — Add critical foreign keys

```sql
-- Migration: 033_add_critical_foreign_keys
-- Description: Thêm FK cho các relationship critical. Yêu cầu cleanup orphan rows trước.
-- Dependency: P0.1 (migrate.js transactional)
-- Rollback: ALTER TABLE ... DROP CONSTRAINT ...
-- Idempotent: Có (DO block check existence)

-- PRE-FLIGHT: Script cleanup orphan rows (chạy trước migration này)
-- Xem file fix-plan.md P0.3.2

DO $$
BEGIN
    -- tickets → events
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_event_id') THEN
        ALTER TABLE tickets
          ADD CONSTRAINT fk_tickets_event_id
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;

    -- tickets → auth_users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_user_id') THEN
        ALTER TABLE tickets
          ADD CONSTRAINT fk_tickets_user_id
          FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;

    -- tickets → orders (SET NULL vì order có thể bị cancel/xóa)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_order_id') THEN
        ALTER TABLE tickets
          ADD CONSTRAINT fk_tickets_order_id
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
    END IF;

    -- orders → auth_users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_user_id') THEN
        ALTER TABLE orders
          ADD CONSTRAINT fk_orders_user_id
          FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;

    -- orders → events (SET NULL — order có thể giữ history sau khi event xóa)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_event_id') THEN
        ALTER TABLE orders
          ADD CONSTRAINT fk_orders_event_id
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
    END IF;

    -- order_items → events
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_event_id') THEN
        ALTER TABLE order_items
          ADD CONSTRAINT fk_order_items_event_id
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;

    -- order_items → tickets (SET NULL)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_ticket_id') THEN
        ALTER TABLE order_items
          ADD CONSTRAINT fk_order_items_ticket_id
          FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL;
    END IF;

    -- payment_attempts → tickets
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_attempts_ticket_id') THEN
        ALTER TABLE payment_attempts
          ADD CONSTRAINT fk_payment_attempts_ticket_id
          FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
    END IF;

    -- notifications → auth_users, events
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_user_id') THEN
        ALTER TABLE notifications
          ADD CONSTRAINT fk_notifications_user_id
          FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_event_id') THEN
        ALTER TABLE notifications
          ADD CONSTRAINT fk_notifications_event_id
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;

    -- event_media → events, auth_users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_event_media_event_id') THEN
        ALTER TABLE event_media
          ADD CONSTRAINT fk_event_media_event_id
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_event_media_user_id') THEN
        ALTER TABLE event_media
          ADD CONSTRAINT fk_event_media_user_id
          FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;

    -- reviews → events, auth_users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reviews_event_id') THEN
        ALTER TABLE reviews
          ADD CONSTRAINT fk_reviews_event_id
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reviews_user_id') THEN
        ALTER TABLE reviews
          ADD CONSTRAINT fk_reviews_user_id
          FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;

    -- promotions → auth_users, events
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_promotions_organizer_id') THEN
        ALTER TABLE promotions
          ADD CONSTRAINT fk_promotions_organizer_id
          FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_promotions_event_id') THEN
        ALTER TABLE promotions
          ADD CONSTRAINT fk_promotions_event_id
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;

    -- analytics → events
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_analytics_event_id') THEN
        ALTER TABLE analytics
          ADD CONSTRAINT fk_analytics_event_id
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;

    -- ledger_entries → auth_users (RESTRICT — không xóa user có ledger)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ledger_entries_organizer_id') THEN
        ALTER TABLE ledger_entries
          ADD CONSTRAINT fk_ledger_entries_organizer_id
          FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE RESTRICT;
    END IF;

    -- organizer_balances → auth_users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_organizer_balances_organizer_id') THEN
        ALTER TABLE organizer_balances
          ADD CONSTRAINT fk_organizer_balances_organizer_id
          FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;

    -- organizer_settings → auth_users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_organizer_settings_organizer_id') THEN
        ALTER TABLE organizer_settings
          ADD CONSTRAINT fk_organizer_settings_organizer_id
          FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;

    -- organizer_profiles → auth_users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_organizer_profiles_user_id') THEN
        ALTER TABLE organizer_profiles
          ADD CONSTRAINT fk_organizer_profiles_user_id
          FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;

    -- featured_profiles → auth_users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_featured_profiles_owner_user_id') THEN
        ALTER TABLE featured_profiles
          ADD CONSTRAINT fk_featured_profiles_owner_user_id
          FOREIGN KEY (owner_user_id) REFERENCES auth_users(id) ON DELETE SET NULL;
    END IF;

    -- seat_holds → auth_users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_seat_holds_user_id') THEN
        ALTER TABLE seat_holds
          ADD CONSTRAINT fk_seat_holds_user_id
          FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;

    -- auth_tokens → auth_users (email)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_auth_tokens_email') THEN
        ALTER TABLE auth_tokens
          ADD CONSTRAINT fk_auth_tokens_email
          FOREIGN KEY (email) REFERENCES auth_users(email) ON DELETE CASCADE;
    END IF;
END $$;
```

## Template 034 — Add CHECK constraints

```sql
-- Migration: 034_add_check_constraints
-- Description: Thêm CHECK constraint cho cột status/type/level.
-- Dependency: 033_add_critical_foreign_keys.sql (cần data cleanup trước)
-- Idempotent: Có (DO block check existence)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tickets_status') THEN
        ALTER TABLE tickets
          ADD CONSTRAINT chk_tickets_status
          CHECK (status IN ('pending', 'confirmed', 'cancelled', 'used', 'refunded', 'expired'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_status') THEN
        ALTER TABLE orders
          ADD CONSTRAINT chk_orders_status
          CHECK (status IN ('pending_payment', 'paid', 'cancelled', 'refunded', 'expired'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_attempts_status') THEN
        ALTER TABLE payment_attempts
          ADD CONSTRAINT chk_payment_attempts_status
          CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_events_lifecycle_status') THEN
        ALTER TABLE events
          ADD CONSTRAINT chk_events_lifecycle_status
          CHECK (lifecycle_status IS NULL OR lifecycle_status IN ('draft', 'submitted', 'published', 'rejected', 'cancelled', 'archived'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_events_visibility') THEN
        ALTER TABLE events
          ADD CONSTRAINT chk_events_visibility
          CHECK (visibility IN ('private', 'public', 'unlisted'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_events_event_type') THEN
        ALTER TABLE events
          ADD CONSTRAINT chk_events_event_type
          CHECK (event_type IN ('physical', 'online', 'hybrid'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_seats_status') THEN
        ALTER TABLE seats
          ADD CONSTRAINT chk_seats_status
          CHECK (status IN ('available', 'blocked', 'sold'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_seat_holds_status') THEN
        ALTER TABLE seat_holds
          ADD CONSTRAINT chk_seat_holds_status
          CHECK (status IN ('held', 'released', 'sold'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_outbox_status') THEN
        ALTER TABLE outbox
          ADD CONSTRAINT chk_outbox_status
          CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_profiles_level') THEN
        ALTER TABLE user_profiles
          ADD CONSTRAINT chk_user_profiles_level
          CHECK (level IN ('bronze', 'silver', 'gold', 'platinum'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizer_profiles_status') THEN
        ALTER TABLE organizer_profiles
          ADD CONSTRAINT chk_organizer_profiles_status
          CHECK (status IN ('approved', 'pending', 'rejected', 'suspended'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reviews_rating') THEN
        ALTER TABLE reviews
          ADD CONSTRAINT chk_reviews_rating
          CHECK (rating BETWEEN 1 AND 5);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_unique_review_per_user_event') THEN
        ALTER TABLE reviews
          ADD CONSTRAINT chk_unique_review_per_user_event
          UNIQUE (event_id, user_id);
    END IF;
END $$;
```

## Template 035 — Normalize timestamps

```sql
-- Migration: 035_normalize_timestamps
-- Description: Chuyển BIGINT timestamp sang TIMESTAMPTZ DEFAULT NOW() cho toàn bộ bảng.
-- Dependency: P0.1 (migrate.js transactional)
-- Risk: CAO — data migration lớn, cần backup trước, test trên staging.
-- Rollback: Tạo migration reverse chuyển ngược lại BIGINT.
-- Idempotent: Có (DO block check data_type)

-- Helper function
CREATE OR REPLACE FUNCTION migrate_bigint_to_timestamptz(
    tbl TEXT, col TEXT
) RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = tbl AND column_name = col AND data_type = 'bigint'
    ) THEN
        EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING to_timestamp(%I / 1000.0)',
            tbl, col, col
        );
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT NOW()', tbl, col);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- notifications
PERFORM migrate_bigint_to_timestamptz('notifications', 'created_at');

-- event_media
PERFORM migrate_bigint_to_timestamptz('event_media', 'created_at');

-- promotions
PERFORM migrate_bigint_to_timestamptz('promotions', 'valid_from');
PERFORM migrate_bigint_to_timestamptz('promotions', 'valid_until');
PERFORM migrate_bigint_to_timestamptz('promotions', 'created_at');

-- reviews
PERFORM migrate_bigint_to_timestamptz('reviews', 'created_at');

-- events
PERFORM migrate_bigint_to_timestamptz('events', 'date');
PERFORM migrate_bigint_to_timestamptz('events', 'end_date');
PERFORM migrate_bigint_to_timestamptz('events', 'created_at');
PERFORM migrate_bigint_to_timestamptz('events', 'last_updated_at');

-- tickets
PERFORM migrate_bigint_to_timestamptz('tickets', 'purchase_date');
PERFORM migrate_bigint_to_timestamptz('tickets', 'last_check_in_at');
PERFORM migrate_bigint_to_timestamptz('tickets', 'checked_in_at');
PERFORM migrate_bigint_to_timestamptz('tickets', 'payment_time');
PERFORM migrate_bigint_to_timestamptz('tickets', 'updated_at');

-- orders
PERFORM migrate_bigint_to_timestamptz('orders', 'expires_at');
PERFORM migrate_bigint_to_timestamptz('orders', 'paid_at');
PERFORM migrate_bigint_to_timestamptz('orders', 'cancelled_at');
PERFORM migrate_bigint_to_timestamptz('orders', 'created_at');
PERFORM migrate_bigint_to_timestamptz('orders', 'updated_at');

-- order_items
PERFORM migrate_bigint_to_timestamptz('order_items', 'created_at');

-- payment_attempts
PERFORM migrate_bigint_to_timestamptz('payment_attempts', 'completed_at');
PERFORM migrate_bigint_to_timestamptz('payment_attempts', 'created_at');
PERFORM migrate_bigint_to_timestamptz('payment_attempts', 'updated_at');

-- analytics
PERFORM migrate_bigint_to_timestamptz('analytics', 'last_updated_at');

-- organizer_settings
PERFORM migrate_bigint_to_timestamptz('organizer_settings', 'created_at');

-- ledger_entries
PERFORM migrate_bigint_to_timestamptz('ledger_entries', 'created_at');

-- outbox
PERFORM migrate_bigint_to_timestamptz('outbox', 'created_at');
PERFORM migrate_bigint_to_timestamptz('outbox', 'updated_at');

-- idempotency_keys (nếu vẫn còn BIGINT)
PERFORM migrate_bigint_to_timestamptz('idempotency_keys', 'created_at');
PERFORM migrate_bigint_to_timestamptz('idempotency_keys', 'expires_at');

-- seat_maps, seat_sections, seats
PERFORM migrate_bigint_to_timestamptz('seat_maps', 'created_at');
PERFORM migrate_bigint_to_timestamptz('seat_sections', 'created_at');
PERFORM migrate_bigint_to_timestamptz('seats', 'created_at');

-- seat_holds
PERFORM migrate_bigint_to_timestamptz('seat_holds', 'held_at');
PERFORM migrate_bigint_to_timestamptz('seat_holds', 'expires_at');
PERFORM migrate_bigint_to_timestamptz('seat_holds', 'created_at');

-- organizer_balances
PERFORM migrate_bigint_to_timestamptz('organizer_balances', 'updated_at');

-- platform_fees
PERFORM migrate_bigint_to_timestamptz('platform_fees', 'updated_at');

-- membership_tiers
PERFORM migrate_bigint_to_timestamptz('membership_tiers', 'created_at');

-- user_memberships
PERFORM migrate_bigint_to_timestamptz('user_memberships', 'updated_at');

-- loyalty_points_ledger
PERFORM migrate_bigint_to_timestamptz('loyalty_points_ledger', 'created_at');

-- organizer_profiles (chỉ created_at, updated_at đã là TIMESTAMPTZ)
PERFORM migrate_bigint_to_timestamptz('organizer_profiles', 'created_at');

-- user_profiles (chỉ created_at, updated_at đã là TIMESTAMPTZ)
PERFORM migrate_bigint_to_timestamptz('user_profiles', 'created_at');

-- Cleanup function
DROP FUNCTION migrate_bigint_to_timestamptz(TEXT, TEXT);
$$ LANGUAGE plpgsql;

-- Đổi tên events.last_updated_at → updated_at cho đồng nhất
ALTER TABLE events RENAME COLUMN last_updated_at TO updated_at;

-- Set NOT NULL cho các cột audit bắt buộc
ALTER TABLE events ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE events ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE orders ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN created_at SET NOT NULL;
```

## Template 036 — Add GIN indexes

```sql
-- Migration: 036_add_gin_indexes
-- Description: Thêm GIN index cho TEXT[] arrays và JSONB thường query.
-- Idempotent: Có

CREATE INDEX IF NOT EXISTS idx_events_category_gin ON events USING GIN (category);
CREATE INDEX IF NOT EXISTS idx_events_tags_gin ON events USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_featured_profiles_genres_gin ON featured_profiles USING GIN (genres);
CREATE INDEX IF NOT EXISTS idx_auth_users_roles_gin ON auth_users USING GIN (roles);
CREATE INDEX IF NOT EXISTS idx_user_profiles_fcm_gin ON user_profiles USING GIN (fcm_tokens);

-- JSONB expression indexes
CREATE INDEX IF NOT EXISTS idx_events_location_city
  ON events USING GIN ((location->'city'));
CREATE INDEX IF NOT EXISTS idx_venues_data_city
  ON venues USING GIN ((data->'city'));
```

## Template 037 — Add composite + partial indexes

```sql
-- Migration: 037_add_composite_indexes
-- Description: Composite + partial index cho hot query patterns.
-- Idempotent: Có

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_tickets_user_status
  ON tickets (user_id, status);

CREATE INDEX IF NOT EXISTS idx_tickets_event_status
  ON tickets (event_id, status);

CREATE INDEX IF NOT EXISTS idx_events_published_date
  ON events (date) WHERE lifecycle_status = 'published';

CREATE INDEX IF NOT EXISTS idx_events_city_date
  ON events (city, date);

CREATE INDEX IF NOT EXISTS idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outbox_pending_created
  ON outbox (created_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_seat_holds_active_expires
  ON seat_holds (expires_at) WHERE status = 'held';

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_order_id
  ON ledger_entries (order_id);

CREATE INDEX IF NOT EXISTS idx_ledger_created_at
  ON ledger_entries (created_at);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_created_at
  ON loyalty_points_ledger (created_at);
```

## Template 038 — Drop redundant indexes

```sql
-- Migration: 038_drop_redundant_indexes
-- Description: Xóa index trùng với UNIQUE constraint hoặc PK.
-- Idempotent: Có

DROP INDEX IF EXISTS idx_auth_users_email;             -- UNIQUE constraint đã tạo index
DROP INDEX IF EXISTS idx_vouchers_code;                -- UNIQUE constraint đã tạo index
DROP INDEX IF EXISTS idx_organizations_slug;            -- UNIQUE constraint đã tạo index
DROP INDEX IF EXISTS idx_roles_name;                    -- UNIQUE constraint đã tạo index
DROP INDEX IF EXISTS idx_permissions_name;              -- UNIQUE constraint đã tạo index
DROP INDEX IF EXISTS idx_role_permissions_role_id;      -- trùng PK composite
DROP INDEX IF EXISTS idx_role_permissions_permission_id; -- trùng PK composite
```

## Template 039 — Migrate.js fix (code, không SQL)

Sửa `Server-2025-Eventing/db/migrate.js`:

```js
require('dotenv').config({ quiet: true });
const { readdirSync, readFileSync } = require('fs');
const { join } = require('path');
const { Pool } = require('pg');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    const appliedSet = new Set(applied.map(function(r) { return r.filename; }));

    const migrationsDir = join(__dirname, 'migrations');
    var files = readdirSync(migrationsDir).filter(function(f) { return f.endsWith('.sql'); }).sort();

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (appliedSet.has(file)) {
        console.log('SKIP  ' + file + ' (already applied)');
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
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(function(err) {
  console.error('Migration failed: ' + err.message);
  process.exit(1);
});
```

## Template 040 — Pool config (code, không SQL)

Sửa `Server-2025-Eventing/src/providers/database/postgres.client.js`:

```js
const config = require('@/shared/config/env.config');

let pool = null;

function getPool() {
    if (!pool) {
        const { Pool } = require('pg');
        pool = new Pool({
            connectionString: config.databaseUrl,
            max: parseInt(process.env.PG_POOL_MAX || '20', 10),
            statement_timeout: parseInt(process.env.PG_STATEMENT_TIMEOUT || '30000', 10),
            query_timeout: parseInt(process.env.PG_QUERY_TIMEOUT || '30000', 10),
            idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
            connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || '5000', 10),
        });

        // Slow query log
        const origQuery = pool.query.bind(pool);
        pool.query = function(text, params) {
            const start = Date.now();
            return origQuery(text, params).then(function(res) {
                const duration = Date.now() - start;
                if (duration > 1000) {
                    console.warn('[slow query] ' + duration + 'ms', { text: text.substring(0, 200), params });
                }
                return res;
            });
        };
    }
    return pool;
}

async function query(text, params) {
    return getPool().query(text, params);
}

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

module.exports = { getPool, query, transaction };
```

## Lưu ý quan trọng

1. **Backup trước khi chạy** bất kỳ migration nào, đặc biệt là P0.2 (audit_logs reconcile) và P1.1 (timestamp normalize).
2. **Test trên staging** với production data dump.
3. **Verify app code** sau mỗi migration — chạy smoke test.
4. **Rollback plan** cho mỗi migration — viết migration reverse nếu có thể.
5. **Monitor** sau deploy — check error log, slow query log, connection pool metric.
6. **Communication** — thông báo cho team trước khi chạy migration production, có maintenance window.
