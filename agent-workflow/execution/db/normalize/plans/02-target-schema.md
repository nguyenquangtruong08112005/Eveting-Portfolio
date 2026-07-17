# 02 — Target Schema (3NF program)

ERD additions only. Existing tables stay unless noted.

---

## 1. New tables

### 1.1 `event_ticket_types` (N1)

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | App-generated or `{eventId}:{code}` |
| event_id | TEXT NOT NULL | FK → events |
| code | TEXT NOT NULL | JSON key compatibility |
| name | TEXT NOT NULL | |
| price | NUMERIC NOT NULL | |
| currency | TEXT | default VND |
| capacity | INT | |
| available | INT | optional if derived |
| sold_count | INT | default 0 |
| sales_start / sales_end | BIGINT | optional windows |
| sort_order | INT | |
| is_active | BOOLEAN | |
| created_at / updated_at | BIGINT | match events style for now |
| raw_data | JSONB | unknown JSON keys |

**Constraints**
- `UNIQUE (event_id, code)`
- `fk_event_ticket_types_event_id` ON DELETE CASCADE
- Later: `CHECK (capacity >= 0)`, `CHECK (available IS NULL OR available >= 0)`

**Relationships**
- events 1—* event_ticket_types
- order_items.ticket_type_id → event_ticket_types.id (nullable during backfill)

---

### 1.2 `user_follows` (N2)

| Column | Type |
|---|---|
| follower_id | TEXT NOT NULL → auth_users or user_profiles |
| followee_id | TEXT NOT NULL → featured_profiles or user_profiles (confirm in N0) |
| created_at | BIGINT or TIMESTAMPTZ |

PK: `(follower_id, followee_id)`  
Index: `(followee_id)` for follower counts

---

### 1.3 `event_featured_profiles` (N2)

| Column | Type |
|---|---|
| event_id | TEXT → events |
| featured_profile_id | TEXT → featured_profiles |
| sort_order | INT DEFAULT 0 |
| created_at | … |

PK: `(event_id, featured_profile_id)`

---

### 1.4 `user_event_history` (N2)

| Column | Type |
|---|---|
| user_id | TEXT → auth_users |
| event_id | TEXT → events |
| source | TEXT | e.g. attended / viewed |
| attended_at | BIGINT |

PK: `(user_id, event_id)` or add `id` if multiple visits matter

---

### 1.5 `user_devices` (N2)

| Column | Type |
|---|---|
| id | TEXT PK |
| user_id | TEXT → auth_users |
| fcm_token | TEXT UNIQUE |
| platform | TEXT |
| last_seen_at | … |

---

### 1.6 Venues expand (N3) — columns on existing `venues`

Prefer **add columns** rather than new table:

| Column | From |
|---|---|
| name | data |
| address | data |
| city | data |
| district | data |
| country | data |
| lat / lng | data |
| capacity | data |

Keep `data JSONB` as extension bag until readers migrated.

---

## 2. Columns that stay (documented denorm)

| Table.column | Status |
|---|---|
| order_items.event_name | Keep snapshot |
| order_items.ticket_type (name/code text) | Keep snapshot; id is relational |
| reviews.user_name, user_profile_pic_url | Keep snapshot |
| events.ticket_types | Keep during dual-write; drop only after N4+ stability |
| events.category, tags | Keep arrays (labels) |
| events.location JSONB | OK for geo blob or split lat/lng later |
| auth_users.roles / user_profiles.roles | Optional N4 |

---

## 3. ERD legend (same as integrity)

| Line | Meaning |
|---|---|
| Solid | PostgreSQL FK `fk_*` |
| Dashed | Snapshot / gateway / polymorphic |
| New solid after N1 | `event_ticket_types` ↔ events, order_items |
