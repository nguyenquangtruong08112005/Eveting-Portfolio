# 09 — Table Inventory

Liệt kê chi tiết 30 bảng + schema_migrations. Mỗi bảng: cột, kiểu, default, constraint, index, FK.

## 1. `schema_migrations` (framework)
- Tạo bởi `db/migrate.js:16-21`.
- Cột: `filename TEXT PRIMARY KEY`, `applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.

## 2. `venues` (`001_create_venues.sql`)

| Cột | Kiểu | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `id` | TEXT | NOT NULL | - | PK |
| `name` | TEXT | NOT NULL | - | |
| `data` | JSONB | NOT NULL | `'{}'` | Toàn bộ entity con ẩn trong đây |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | ✓ |

**Index:** `idx_venues_name` (btree).
**FK:** Không.
**Vấn đề:** `data JSONB` che giấu schema. Không có `updated_at`.

## 3. `auth_users` (`002_create_auth_tables.sql`)

| Cột | Kiểu | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `id` | TEXT | NOT NULL | - | PK |
| `email` | TEXT | NOT NULL | - | UNIQUE |
| `name` | TEXT | NOT NULL | `''` | |
| `password_hash` | TEXT | NOT NULL | - | |
| `roles` | TEXT[] | NOT NULL | `'{user}'` | Anti-pattern |
| `profile_pic_url` | TEXT | - | `''` | Duplicate với user_profiles |
| `bio` | TEXT | - | `''` | Duplicate |
| `is_active` | BOOLEAN | NOT NULL | `true` | |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | ✓ |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | ✓ Không có trigger auto-update |
| `email_verified` | BOOLEAN | - | `false` | Thêm bởi `016:17` |

**Index:** `idx_auth_users_email` (btree, trùng với UNIQUE constraint).
**FK:** Không có outgoing. `sessions`, `organization_memberships`, `user_memberships`, `loyalty_points_ledger` reference bảng này.

## 4. `sessions` (`002_create_auth_tables.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `refresh_token_hash` | TEXT | NOT NULL | - |
| `user_agent` | TEXT | - | `''` |
| `ip_address` | TEXT | - | `''` |
| `expires_at` | TIMESTAMPTZ | NOT NULL | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |
| `revoked_at` | TIMESTAMPTZ | - | - |

**Index:** `idx_sessions_user_id`, `idx_sessions_refresh_token_hash` (UNIQUE auto), `idx_sessions_expires_at`, `idx_sessions_revoked_at`.
**FK:** `user_id REFERENCES auth_users(id) ON DELETE CASCADE`.
**Vấn đề:** `refresh_token_hash` không UNIQUE constraint tường minh (chỉ index). Nên `UNIQUE`.

## 5. `notifications` (`003_create_notifications.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `title` | TEXT | NOT NULL | - |
| `message` | TEXT | NOT NULL | - |
| `type` | TEXT | NOT NULL | - |
| `event_id` | TEXT | - | - |
| `is_read` | BOOLEAN | NOT NULL | `false` |
| `created_at` | BIGINT | NOT NULL | - |

**Index:** `idx_notifications_user_id`, `idx_notifications_created_at_desc`.
**FK:** Không.
**Vấn đề:** `type` không CHECK. `created_at` BIGINT không default. Thiếu FK `user_id`, `event_id`. Thiếu composite `(user_id, is_read, created_at DESC)`.

## 6. `event_media` (`004_create_event_media.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `event_id` | TEXT | NOT NULL | - |
| `url` | TEXT | NOT NULL | - |
| `type` | TEXT | NOT NULL | `'image'` |
| `caption` | TEXT | - | `''` |
| `created_at` | BIGINT | NOT NULL | - |

**Index:** `idx_event_media_event_id_created_at` (composite), `idx_event_media_user_id`.
**FK:** Không.
**Vấn đề:** Thiếu FK. `type` không CHECK. `created_at` BIGINT.

## 7. `promotions` (`005_create_promotions.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `organizer_id` | TEXT | NOT NULL | - |
| `code` | TEXT | NOT NULL | - |
| `event_id` | TEXT | - | - |
| `valid_from` | BIGINT | NOT NULL | - |
| `valid_until` | BIGINT | NOT NULL | - |
| `usage_limit` | INT | NOT NULL | `0` |
| `used_count` | INT | NOT NULL | `0` |
| `is_public` | BOOLEAN | NOT NULL | `false` |
| `data` | JSONB | NOT NULL | `'{}'` |
| `created_at` | BIGINT | NOT NULL | - |

**Index:** `idx_promotions_code` (UNIQUE), `idx_promotions_organizer_created`, `idx_promotions_active_public` (partial).
**FK:** Không.
**Vấn đề:** Trùng domain với `vouchers`. `data JSONB` che giấu. BIGINT timestamps. Thiếu FK.

## 8. `reviews` (`006_create_reviews.sql` + `007`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `event_id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `rating` | INT | NOT NULL | - |
| `comment` | TEXT | - | `''` |
| `created_at` | BIGINT | NOT NULL | - |
| `user_name` | TEXT | - | - | (snapshot, `007:7`) |
| `user_profile_pic_url` | TEXT | - | - | (snapshot, `007:8`) |

**Index:** `idx_reviews_event_id_created_at`, `idx_reviews_user_id`.
**FK:** Không.
**Vấn đề:** `rating` không CHECK range. Thiếu UNIQUE `(event_id, user_id)`. BIGINT timestamp. Thiếu FK.

## 9. `user_profiles` (`008_create_user_profiles.sql` + `009`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `email` | TEXT | NOT NULL | `''` |
| `name` | TEXT | NOT NULL | `''` |
| `profile_pic_url` | TEXT | - | `''` |
| `cover_photo_url` | TEXT | - | `''` |
| `bio` | TEXT | - | `''` |
| `birth_date` | BIGINT | - | - |
| `roles` | TEXT[] | NOT NULL | `'{attendee}'` |
| `created_at` | BIGINT | NOT NULL | - |
| `followed_profile_ids` | TEXT[] | NOT NULL | `'{}'` |
| `history_event_ids` | TEXT[] | NOT NULL | `'{}'` |
| `followers_count` | INT | NOT NULL | `0` |
| `following_count` | INT | NOT NULL | `0` |
| `points` | INT | NOT NULL | `0` |
| `level` | TEXT | NOT NULL | `'bronze'` |
| `matching_preferences` | JSONB | - | `'{}'` |
| `shared_media` | JSONB | - | `'[]'` |
| `fcm_tokens` | TEXT[] | NOT NULL | `'{}'` |
| `organizer_info` | JSONB | - | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |
| `raw_data` | JSONB | - | `NULL` | (`009`) |

**Index:** `idx_user_profiles_email`, `idx_user_profiles_roles` (GIN).
**FK:** Không.
**Vấn đề:** Mix BIGINT + TIMESTAMPTZ. Roles duplicate với auth_users. Arrays thay vì bảng trung gian. Counter không sync. Email/name duplicate với auth_users.

## 10. `events` (`010_create_events.sql` + `018`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `name` | TEXT | NOT NULL | - |
| `description` | TEXT | - | `''` |
| `image_url` | TEXT | - | - |
| `banner_url` | TEXT | - | - |
| `featured_profile_ids` | TEXT[] | - | `'{}'` |
| `category` | TEXT[] | - | `'{}'` |
| `tags` | TEXT[] | - | `'{}'` |
| `date` | BIGINT | - | - |
| `end_date` | BIGINT | - | - |
| `event_type` | TEXT | - | `'physical'` |
| `online_url` | TEXT | - | - |
| `location` | JSONB | - | - |
| `geohash` | TEXT | - | - |
| `venue_id` | TEXT | - | - |
| `venue_name` | TEXT | - | - |
| `city` | TEXT | - | - |
| `ticket_types` | JSONB | - | `'{}'` |
| `min_price` | NUMERIC | - | `0` |
| `video_url` | TEXT | - | - |
| `is_outdoor` | BOOLEAN | - | `false` |
| `organizer_id` | TEXT | - | - |
| `status` | TEXT | - | `'pending'` |
| `visibility` | TEXT | - | `'private'` |
| `recurring_rule` | JSONB | - | - |
| `hot_score` | NUMERIC | - | `0` |
| `view_count` | INT | - | `0` |
| `required_age` | INT | - | `0` |
| `sponsors` | JSONB | - | `'[]'` |
| `created_at` | BIGINT | - | - |
| `last_updated_at` | BIGINT | - | - |
| `raw_data` | JSONB | - | `'{}'` |
| `lifecycle_status` | TEXT | - | `NULL` | (`018:5`) |

**Index:** `idx_events_date`, `idx_events_status_visibility`, `idx_events_organizer_id`, `idx_events_geohash`, `idx_events_lifecycle_status`.
**FK:** Không.
**Vấn đề:** Bảng god (33 cột). BIGINT timestamps. `date` là reserved keyword. `status` + `lifecycle_status` trùng. Arrays, JSONB lạm dụng. Denormalize `venue_name`, `city`. Thiếu FK. Thiếu GIN cho arrays.

## 11. `tickets` (`011_create_tickets.sql` + `015` + `019`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `event_id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `organizer_id` | TEXT | - | - |
| `type` | TEXT | NOT NULL | - |
| `price` | NUMERIC | - | `0` |
| `original_price` | NUMERIC | - | `0` |
| `quantity` | INT | - | `1` |
| `unit_price` | NUMERIC | - | `0` |
| `applied_promo_code` | TEXT | - | - |
| `seat` | TEXT | - | - |
| `qr_code` | TEXT | - | - |
| `status` | TEXT | - | `'pending'` |
| `purchase_date` | BIGINT | - | - |
| `group_id` | TEXT | - | - |
| `check_in_count` | INT | - | `0` |
| `last_check_in_at` | BIGINT | - | - |
| `checked_in_at` | BIGINT | - | - |
| `payment_time` | BIGINT | - | - |
| `updated_at` | BIGINT | - | - |
| `raw_data` | JSONB | - | `'{}'` |
| `zalo_app_trans_id` | TEXT | - | - | (`015:5`) |
| `payment_status` | TEXT | - | - | (`015:6`) |
| `last_payment_attempt` | TEXT | - | - | (`015:7`) |
| `order_id` | TEXT | - | - | (`019:69`) |
| `order_item_id` | TEXT | - | - | (`019:70`) |
| `payment_attempt_id` | TEXT | - | - | (`019:71`) |

**Index:** `idx_tickets_event_id`, `idx_tickets_user_id`, `idx_tickets_status`, `idx_tickets_order_id`.
**FK:** Không.
**Vấn đề:** God table (27 cột). Mix identity + check-in + payment + order linkage. BIGINT timestamps. Payment status replicate 3 nơi. Thiếu FK diện rộng. Thiếu `created_at`.

## 12. `featured_profiles` (`012_create_featured_profiles.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `name` | TEXT | NOT NULL | - |
| `profile_type` | TEXT | - | `'artist'` |
| `bio` | TEXT | - | `''` |
| `image_url` | TEXT | - | `''` |
| `genres` | TEXT[] | - | `'{}'` |
| `follower_count` | INT | - | `0` |
| `owner_user_id` | TEXT | - | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |
| `raw_data` | JSONB | - | `'{}'` |

**Index:** `idx_featured_profiles_name`, `idx_featured_profiles_owner_user_id`.
**FK:** Không.
**Vấn đề:** `follower_count` không sync. Thiếu GIN cho `genres`. Thiếu FK `owner_user_id`.

## 13. `organizer_profiles` (`013_create_organizer_profiles.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `company_name` | TEXT | NOT NULL | `''` |
| `tax_code` | TEXT | - | `''` |
| `website` | TEXT | - | `''` |
| `description` | TEXT | - | `''` |
| `status` | TEXT | - | `'approved'` |
| `created_at` | BIGINT | - | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |
| `raw_data` | JSONB | - | `'{}'` |

**Index:** `idx_organizer_profiles_user_id`.
**FK:** Không.
**Vấn đề:** Mix BIGINT + TIMESTAMPTZ. `status` không CHECK. Thiếu FK `user_id`.

## 14. `analytics` (`014_create_analytics.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `event_id` | TEXT | NOT NULL | - |
| `total_revenue` | NUMERIC | - | `0` |
| `tickets_sold` | JSONB | - | `'{}'` |
| `daily_sales` | JSONB | - | `'{}'` |
| `check_ins` | INT | - | `0` |
| `views` | INT | - | `0` |
| `views_over_time` | JSONB | - | `'{}'` |
| `last_updated_at` | BIGINT | - | - |
| `raw_data` | JSONB | - | `'{}'` |

**Index:** `idx_analytics_event_id`.
**FK:** Không.
**Vấn đề:** JSONB time series (anti-pattern). Thiếu trigger sync. BIGINT timestamp. Thiếu FK.

## 15. `auth_tokens` (`016_create_password_reset_and_verification_tables.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `token_hash` | TEXT | NOT NULL | - |
| `purpose` | TEXT | NOT NULL | - |
| `email` | TEXT | NOT NULL | - |
| `expires_at` | TIMESTAMPTZ | NOT NULL | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |
| `used_at` | TIMESTAMPTZ | - | - |

**Index:** `idx_auth_tokens_hash`, `idx_auth_tokens_email`.
**FK:** Không.
**Vấn đề:** `purpose` không CHECK. Thiếu FK `email` → `auth_users(email)`.

## 16. `roles` (`017_create_rbac_tables.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `name` | TEXT | NOT NULL | - |
| `description` | TEXT | NOT NULL | `''` |
| `is_system` | BOOLEAN | NOT NULL | `false` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |

**Index:** `idx_roles_name` (trùng UNIQUE).
**FK:** Không. `role_permissions.role_id` reference.
**Vấn đề:** Index trùng. Không seed data.

## 17. `permissions` (`017`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `name` | TEXT | NOT NULL | - |
| `description` | TEXT | NOT NULL | `''` |
| `resource` | TEXT | NOT NULL | - |
| `action` | TEXT | NOT NULL | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |

**Index:** `idx_permissions_name` (trùng), `idx_permissions_resource_action`.
**Vấn đề:** Index trùng. Không seed data. `resource`/`action` không CHECK.

## 18. `role_permissions` (`017`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `role_id` | TEXT | NOT NULL | - |
| `permission_id` | TEXT | NOT NULL | - |

**PK:** Composite `(role_id, permission_id)`.
**FK:** `role_id REFERENCES roles(id) ON DELETE CASCADE`, `permission_id REFERENCES permissions(id) ON DELETE CASCADE`.
**Index:** `idx_role_permissions_role_id`, `idx_role_permissions_permission_id` (có thể trùng PK).
**Vấn đề:** Index trùng PK.

## 19. `organizations` (`017`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `name` | TEXT | NOT NULL | - |
| `slug` | TEXT | NOT NULL | - |
| `description` | TEXT | NOT NULL | `''` |
| `logo_url` | TEXT | - | `''` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |

**Index:** `idx_organizations_slug` (trùng UNIQUE).
**FK:** Không. `organization_memberships.organization_id` reference.
**Vấn đề:** Index trùng.

## 20. `organization_memberships` (`017`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `organization_id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `role` | TEXT | NOT NULL | `'member'` |
| `permissions_override` | TEXT[] | - | - |
| `joined_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |

**Constraint:** `UNIQUE(organization_id, user_id)`.
**Index:** `idx_organization_memberships_org`, `idx_organization_memberships_user`.
**FK:** `organization_id REFERENCES organizations(id) ON DELETE CASCADE`, `user_id REFERENCES auth_users(id) ON DELETE CASCADE`.
**Vấn đề:** `role` không FK `roles(id)`. `permissions_override TEXT[]` anti-pattern.

## 21. `audit_logs` (017 schema — bị DROP ở 025)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `actor_id` | TEXT | NOT NULL | - |
| `action` | TEXT | NOT NULL | - |
| `resource_type` | TEXT | NOT NULL | - |
| `resource_id` | TEXT | NOT NULL | - |
| `metadata` | JSONB | - | `'{}'` |
| `ip_address` | TEXT | - | `''` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |

**Index:** `idx_audit_logs_actor`, `idx_audit_logs_action`, `idx_audit_logs_resource`, `idx_audit_logs_created_at`.
**Vấn đề:** Bị DROP ở `025`.

## 22. `audit_logs` (025 schema — hiện tại)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `action` | TEXT | NOT NULL | - |
| `resource_type` | TEXT | NOT NULL | - |
| `resource_id` | TEXT | NOT NULL | - |
| `changes` | JSONB | - | - |
| `ip_address` | TEXT | - | - |
| `created_at` | BIGINT | NOT NULL | - |

**Index:** `idx_audit_logs_user`, `idx_audit_logs_resource`.
**FK:** Không.
**Vấn đề:** Schema lệch 017. Destructive migration. BIGINT timestamp. Thiếu index `action`, `created_at`. `changes` không default. `ip_address` không default.

## 23. `orders` (`019` + `020` + `021`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `event_id` | TEXT | - | - |
| `organizer_id` | TEXT | - | - |
| `status` | TEXT | NOT NULL | `'pending_payment'` |
| `subtotal_amount` | NUMERIC | - | `0` |
| `discount_amount` | NUMERIC | - | `0` |
| `fee_amount` | NUMERIC | - | `0` |
| `total_amount` | NUMERIC | - | `0` |
| `currency` | TEXT | - | `'VND'` |
| `idempotency_key` | TEXT | - | - |
| `notes` | TEXT | - | - |
| `expires_at` | BIGINT | - | - |
| `paid_at` | BIGINT | - | - |
| `cancelled_at` | BIGINT | - | - |
| `created_at` | BIGINT | - | - |
| `updated_at` | BIGINT | - | - |
| `raw_data` | JSONB | - | `'{}'` |

**Index:** `idx_orders_user_id`, `idx_orders_event_id`, `idx_orders_organizer_id`, `idx_orders_status`, `idx_orders_idempotency_key`, `idx_orders_unique_idempotency` (partial UNIQUE).
**FK:** Không outgoing. `order_items`, `payment_attempts`, `ledger_entries` reference.
**Vấn đề:** BIGINT timestamps. `status` không CHECK. Thiếu FK `user_id`, `event_id`. NUMERIC không precision.

## 24. `order_items` (`019` + `021`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `order_id` | TEXT | NOT NULL | - |
| `ticket_type_id` | TEXT | - | - |
| `ticket_type` | TEXT | - | - |
| `event_id` | TEXT | - | - |
| `event_name` | TEXT | - | - |
| `ticket_id` | TEXT | - | - |
| `seat_id` | TEXT | - | - |
| `quantity` | INT | - | `1` |
| `unit_price` | NUMERIC | - | `0` |
| `subtotal` | NUMERIC | - | `0` |
| `total_amount` | NUMERIC | - | `0` |
| `status` | TEXT | - | - |
| `created_at` | BIGINT | - | - |

**Index:** `idx_order_items_order_id`, `idx_order_items_event_id`, `idx_order_items_ticket_id`.
**FK:** `order_id REFERENCES orders(id) ON DELETE CASCADE`.
**Vấn đề:** BIGINT timestamp. Thiếu FK `event_id`, `ticket_id`, `seat_id`. `event_name` snapshot.

## 25. `payment_attempts` (`019` + `020` + `021`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `order_id` | TEXT | NOT NULL | - |
| `ticket_id` | TEXT | - | - |
| `status` | TEXT | NOT NULL | `'pending'` |
| `payment_method` | TEXT | - | - |
| `provider` | TEXT | - | - |
| `provider_order_id` | TEXT | - | - |
| `provider_transaction_id` | TEXT | - | - |
| `transaction_id` | TEXT | - | - |
| `amount` | NUMERIC | - | `0` |
| `currency` | TEXT | - | `'VND'` |
| `request_payload` | JSONB | - | - |
| `response_payload` | JSONB | - | - |
| `gateway_response` | JSONB | - | - |
| `completed_at` | BIGINT | - | - |
| `failure_reason` | TEXT | - | - |
| `created_at` | BIGINT | - | - |
| `updated_at` | BIGINT | - | - |

**Index:** `idx_payment_attempts_order_id`, `idx_payment_attempts_provider_order_id`, `idx_payment_attempts_status`, `idx_payment_attempts_ticket_id`.
**FK:** `order_id REFERENCES orders(id) ON DELETE CASCADE`.
**Vấn đề:** BIGINT timestamps. `status` không CHECK. Thiếu FK `ticket_id`. `transaction_id` vs `provider_transaction_id` confusing.

## 26. `seat_maps` (`022_create_seat_maps.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `name` | TEXT | NOT NULL | - |
| `total_rows` | INT | NOT NULL | - |
| `total_cols` | INT | NOT NULL | - |
| `created_at` | BIGINT | NOT NULL | - |

**FK:** Không. `seat_sections.seat_map_id` reference.
**Vấn đề:** BIGINT timestamp. Thiếu `event_id` (1 seat_map cho 1 event?). Thiếu `updated_at`.

## 27. `seat_sections` (`022`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `seat_map_id` | TEXT | NOT NULL | - |
| `name` | TEXT | NOT NULL | - |
| `price_multiplier` | NUMERIC | - | `1.0` |
| `created_at` | BIGINT | NOT NULL | - |

**FK:** `seat_map_id REFERENCES seat_maps(id) ON DELETE CASCADE`.
**Vấn đề:** BIGINT timestamp. Thiếu `capacity` (tính từ seats?). Thiếu `color`/`label` cho UI.

## 28. `seats` (`022`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `seat_section_id` | TEXT | NOT NULL | - |
| `row_name` | TEXT | NOT NULL | - |
| `seat_number` | INT | NOT NULL | - |
| `status` | TEXT | NOT NULL | `'available'` |
| `created_at` | BIGINT | NOT NULL | - |

**Index:** `idx_seats_section_row_num` (UNIQUE composite).
**FK:** `seat_section_id REFERENCES seat_sections(id) ON DELETE CASCADE`.
**Vấn đề:** BIGINT timestamp. `status` không CHECK. Thiếu index `seat_section_id` đơn (có trong unique).

## 29. `organizer_settings` (`023_create_ledger.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `organizer_id` | TEXT | NOT NULL | - |
| `platform_fee_rate` | NUMERIC | - | `0.05` |
| `created_at` | BIGINT | NOT NULL | - |

**PK:** `organizer_id`.
**FK:** Không.
**Vấn đề:** BIGINT timestamp. Thiếu FK `organizer_id`. Thiếu `updated_at`.

## 30. `ledger_entries` (`023`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `order_id` | TEXT | NOT NULL | - |
| `organizer_id` | TEXT | NOT NULL | - |
| `gross_amount` | NUMERIC | NOT NULL | - |
| `platform_fee` | NUMERIC | NOT NULL | - |
| `net_amount` | NUMERIC | NOT NULL | - |
| `created_at` | BIGINT | NOT NULL | - |

**Index:** `idx_ledger_organizer`.
**FK:** `order_id REFERENCES orders(id)`.
**Vấn đề:** BIGINT timestamp. Thiếu FK `organizer_id`. Thiếu index `order_id`, `created_at`. Thiếu `reference_type`/`reference_id` cho refund.

## 31. `outbox` (`024_create_outbox.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `event_type` | TEXT | NOT NULL | - |
| `payload` | JSONB | NOT NULL | - |
| `status` | TEXT | NOT NULL | `'pending'` |
| `retry_count` | INT | - | `0` |
| `error_message` | TEXT | - | - |
| `created_at` | BIGINT | NOT NULL | - |
| `updated_at` | BIGINT | NOT NULL | - |

**Index:** `idx_outbox_status_retry`.
**FK:** Không.
**Vấn đề:** BIGINT timestamps. `status` không CHECK. Thiếu `next_attempt_at`, `locked_by`, `max_retries`. Thiếu index `created_at` cho archival.

## 32. `idempotency_keys` (`026_create_idempotency_keys.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `key` | TEXT | NOT NULL | - |
| `response_code` | INT | NOT NULL | - |
| `response_body` | JSONB | NOT NULL | - |
| `created_at` | BIGINT | NOT NULL | - |
| `expires_at` | BIGINT | NOT NULL | - |

**PK:** `key`.
**Index:** `idx_idempotency_keys_expires`.
**FK:** Không.
**Vấn đề:** Destructive migration. BIGINT timestamps. Không retention job. Thiếu `in_progress` state.

## 33. `seat_holds` (`027_create_seat_holds.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `event_id` | TEXT | NOT NULL | - |
| `seat_id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `held_at` | BIGINT | NOT NULL | - |
| `expires_at` | BIGINT | NOT NULL | - |
| `status` | TEXT | NOT NULL | `'held'` |
| `created_at` | BIGINT | NOT NULL | - |

**Index:** `idx_active_seat_holds` (partial UNIQUE), `idx_seat_holds_expires_at`, `idx_seat_holds_event_id`.
**FK:** `event_id REFERENCES events(id) ON DELETE CASCADE`, `seat_id REFERENCES seats(id) ON DELETE CASCADE`.
**Vấn đề:** BIGINT timestamps. `status` không CHECK. Thiếu FK `user_id`. Thiếu `released_at`/`sold_at`.

## 34. `organizer_balances` (`028_create_balances_and_fees.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `organizer_id` | TEXT | NOT NULL | - |
| `balance` | NUMERIC | NOT NULL | `0.00` |
| `updated_at` | BIGINT | NOT NULL | - |

**PK:** `organizer_id`.
**FK:** Không.
**Vấn đề:** BIGINT timestamp. Thiếu FK `organizer_id`. Không optimistic lock. NUMERIC không precision.

## 35. `platform_fees` (`028`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `balance` | NUMERIC | NOT NULL | `0.00` |
| `updated_at` | BIGINT | NOT NULL | - |

**PK:** `id`.
**FK:** Không.
**Vấn đề:** Singleton row bằng magic string `'platform'`. BIGINT timestamp. Không CHECK `id = 'platform'`.

## 36. `membership_tiers` (`029_create_memberships.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `name` | TEXT | NOT NULL | - |
| `min_points_required` | INT | NOT NULL | - |
| `discount_percentage` | NUMERIC | NOT NULL | `0.00` |
| `perks` | JSONB | NOT NULL | `'{}'` |
| `created_at` | BIGINT | NOT NULL | - |

**Constraint:** `name UNIQUE`.
**Seed:** 4 tier (standard, silver, gold, platinum).
**FK:** Không. `user_memberships.tier_id` reference.
**Vấn đề:** BIGINT timestamp. `id` duplicate với `name` (vd. `tier_silver` + `silver`).

## 37. `user_memberships` (`029`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `user_id` | TEXT | NOT NULL | - |
| `tier_id` | TEXT | NOT NULL | - |
| `points_balance` | INT | NOT NULL | `0` |
| `lifetime_points` | INT | NOT NULL | `0` |
| `updated_at` | BIGINT | NOT NULL | - |

**PK:** `user_id`.
**FK:** `user_id REFERENCES auth_users(id) ON DELETE CASCADE`, `tier_id REFERENCES membership_tiers(id)`.
**Vấn đề:** BIGINT timestamp. `points_balance` không sync với `loyalty_points_ledger`. Trùng `user_profiles.points`.

## 38. `loyalty_points_ledger` (`029`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | TEXT | NOT NULL | - |
| `user_id` | TEXT | NOT NULL | - |
| `points` | INT | NOT NULL | - |
| `transaction_type` | TEXT | NOT NULL | - |
| `reference_id` | TEXT | - | - |
| `created_at` | BIGINT | NOT NULL | - |

**Constraint:** `CHECK (transaction_type IN ('ticket_purchase', 'referral', 'bonus', 'refund'))`.
**Index:** `idx_loyalty_user`.
**FK:** `user_id REFERENCES auth_users(id) ON DELETE CASCADE`.
**Vấn đề:** BIGINT timestamp. `reference_id` không FK (polymorphic). Thiếu index `created_at`.

## 39. `vouchers` (`030_create_vouchers.sql`)

| Cột | Kiểu | Nullable | Default |
|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` |
| `code` | VARCHAR(50) | NOT NULL | - |
| `discount_type` | VARCHAR(20) | NOT NULL | - |
| `discount_value` | NUMERIC | NOT NULL | - |
| `max_discount` | NUMERIC | - | - |
| `min_order` | NUMERIC | - | `0` |
| `usage_limit` | INTEGER | - | - |
| `used_count` | INTEGER | - | `0` |
| `valid_from` | TIMESTAMPTZ | - | - |
| `valid_to` | TIMESTAMPTZ | - | - |
| `event_id` | TEXT | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |

**Constraint:** `code UNIQUE`, `CHECK (discount_type IN ('percent', 'fixed'))`.
**Index:** `idx_vouchers_code` (trùng UNIQUE, không `IF NOT EXISTS`), `idx_vouchers_event_id`.
**FK:** `event_id REFERENCES events(id)`.
**Vấn đề:** Dùng UUID thay vì TEXT (lệch). Index không idempotent. VARCHAR thay vì TEXT (không cần thiết). `used_count` counter không sync. Trùng domain với `promotions`.

## 40. Thống kê tổng

- **Tổng bảng:** 30 (user tables) + 1 (`schema_migrations`) = 31.
- **Tổng cột:** ~200.
- **Tổng index:** ~60.
- **FK:** 12.
- **CHECK constraint:** 2.
- **UNIQUE constraint:** ~8.
- **Bảng dùng BIGINT timestamp:** 20+.
- **Bảng dùng TIMESTAMPTZ:** 10.
- **Bảng mix 2 loại:** 3 (`organizer_profiles`, `user_profiles`, và một số mập mờ).
- **Bảng có FK:** 12.
- **Bảng không có FK:** 18.
