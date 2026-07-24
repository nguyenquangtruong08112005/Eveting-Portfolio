# Media Asset Licensing, Demo Account Policy & Search Indexing

## 1. Overview
This document defines the licensing, attribution, security, and search synchronization rules for portfolio seed data in Phase 03. All data generated for demonstrations, manual testing, and automated verification must strictly adhere to these policies.

---

## 2. Media Asset Licensing & Attribution Policy

### 2.1 Sourcing Requirements
- **Permitted Sources:** All image and visual assets used in event banners, cover photos, venue thumbnails, and media galleries must be sourced from royalty-free, commercially permissible repositories (primarily Unsplash or Pexels under standard open licenses).
- **Prohibited Content:** No proprietary logos, copyrighted posters, or un-credited personal media of real individuals may be used without explicit permission.
- **Fictional Personas & Organizers:** All organizer names (e.g., *Saigon Live Events Co., Ltd*, *Hanoi Stage Productions*, *Moteo Events Vietnam*) and featured artist personas are entirely fictional or community-representative line-ups.

### 2.2 Metadata & Attribution Scheme
Media objects seeded into `event_media` or event image fields store attribution metadata where applicable:
```json
{
  "url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80",
  "license": "Unsplash License (Free to use under commercial and non-commercial terms)",
  "attribution": "Photo by Evangeline Shaw on Unsplash"
}
```

---

## 3. Demo Account & Security Policy

### 3.1 Account Credentials & Standard Password
- **Default Password:** `123456`
- **Hashing Policy:** All demo user accounts must have their password hashed **strictly** through the application's `backendAuthProvider.hashPassword()`. Raw or hardcoded hashes outside `backendAuthProvider` are forbidden.

### 3.2 Standard Demo Accounts

| Role | Email | Password | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@eventing.com` / `admin@eventing.moteo.fun` | `123456` | Admin moderation, event review queue, governance |
| **Organizer (Saigon)** | `organizer@eventing.com` / `organizer@eventing.moteo.fun` | `123456` | Event creation, ticketing, promotions (Southern VN) |
| **Organizer (Hanoi)** | `hanoi.events@eventing.com` | `123456` | Event creation, ticketing, promotions (Northern VN) |
| **Attendee** | `alice@email.com` / `attendee@eventing.moteo.fun` | `123456` | Ticket booking, seat map selection, reviews, media upload |
| **Attendee** | `nguyen.an@email.com` | `123456` | Secondary attendee QA |
| **Attendee** | `tran.linh@email.com` | `123456` | Secondary attendee QA |
| **Attendee** | `le.hung@email.com` | `123456` | Secondary attendee QA |

### 3.3 Non-Padding Policy
Lookup tables (e.g. `roles`), audit logs (`audit_logs`), financial ledgers (`ledger_entries`), and transaction state tables are **explicitly exempt** from arbitrary row padding targets (e.g. 10 or 20 rows). Synthetic row padding in audit or ledger tables degrades system realism and creates false test signals.

### 3.4 Fixed Demo Namespace & Targeted Cleanup
All seeded portfolio entity IDs are prefixed with `demo_` (e.g. `demo_evt_music_01`, `demo_venue_hn_opera`, `demo_admin_001`).
The cleanup script `server/scripts/seed/clean-demo.js` operates exclusively on this fixed `demo_` namespace using FK-safe deletion ordering. Destructive operations (`DROP TABLE`, `DROP SCHEMA`, `TRUNCATE CASCADE`) are strictly prohibited.

---

## 4. Search Indexing & Elasticsearch Sync Policy

### 4.1 Index Compatibility
The Elasticsearch re-indexing pipeline (`server/scripts/maintenance/reindex.elasticsearch.js`) selects events matching:
```sql
SELECT * FROM events WHERE status = 'active' AND visibility = 'public' ORDER BY date ASC
```
Every public active seeded event in the portfolio data is automatically eligible for Elasticsearch indexing.

### 4.2 Indexing Verification
Running `npm run search:reindex` or `npm run db:seed:reindex` populates the `events` Elasticsearch index with canonical event documents containing:
- `name`, `description`, `category`, `tags`
- `city`, `venueName`, `location` (latitude, longitude)
- `minPrice`, `date`, `eventType`, `status`, `visibility`
- `featuredProfileNames`

Querying Elasticsearch for Vietnamese terms (e.g., `"Hà Nội"`, `"Hồ Chí Minh"`, `"Âm nhạc"`, `"Thể thao"`) must yield seeded public events with low latency (< 50ms).
