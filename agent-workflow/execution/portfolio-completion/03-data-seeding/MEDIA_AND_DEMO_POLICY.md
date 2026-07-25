# Media Asset Licensing, Demo Policy & Data Governance

## 1. Executive Summary
This document establishes the media asset licensing, attribution standards, identity guidelines, and demo account policies for the deployed Eventing platform portfolio demo.

All seeded venues, organizers, events, reviews, and featured profiles operate within a dedicated, isolated demo namespace (`demo_%`) to provide a rich, realistic visual experience without claiming real-world brand affiliation or violating intellectual property rights.

---

## 2. Media Asset Licensing & Sourcing Policy

### 2.1 External CDN & R2 Media Architecture
- **Zero Local Binary Transfer:** No heavy image or video binary files are stored on or transferred to the EC2 host filesystem.
- **Hosted Image URLs:** All banner images, venue thumbnails, avatar pictures, and event gallery assets utilize high-resolution, HTTPS-accessible royalty-free image URLs from **Unsplash** and **Pexels**.
- **Safe Video Showcase:** Video URLs link to generic, public showcase video embeds (e.g. royalty-free YouTube video streams) with metadata attribution.

### 2.2 Attribution & Licensing Requirements
- Every image and video record seeded into PostgreSQL (`events.image_url`, `events.banner_url`, `events.video_url`, `event_media.url`, `featured_profiles.image_url`) includes explicit licensing attribution:
  - **License:** Sourced under the [Unsplash Free License](https://unsplash.com/license) / [Pexels License](https://www.pexels.com/license/) permitting free commercial and non-commercial utilization.
  - **Attribution Metadata:** Embedded within the `events.raw_data` JSONB column under `attribution`:
    ```json
    {
      "imageSource": "Unsplash Royalty Free",
      "license": "Unsplash License (Free Commercial & Non-Commercial)",
      "attributionNote": "Photo sourced under Unsplash License for portfolio demonstration purposes."
    }
    ```

---

## 3. Fictional Identity & Non-Affiliation Guidelines

### 3.1 Non-Affiliation Disclaimer
- All events, titles, descriptions, and organizer profiles carry an explicit non-affiliation disclaimer appended to descriptions and stored in record metadata:
  > **[LƯU Ý DEMO]:** *Sự kiện giả định phục vụ thử nghiệm hệ thống portfolio demo. Không đại diện hay có liên kết chính thức với bất kỳ thương hiệu hoặc đơn vị tổ chức thực tế nào.*

### 3.2 Real Venue Landmark References
- Real Vietnamese architectural landmarks (e.g. *Nhà Hát Lớn Hà Nội*, *Nhà Hát Thành Phố Hồ Chí Minh*, *Nhà Hát Duyệt Thị Đường Huế*) are referenced strictly as physical geographical venues in Vietnam for location and mapping realism.
- No commercial affiliation, sponsorship, or endorsement by these real-world institutions is claimed or implied.

---

## 4. Demo Identity Namespace & Demo Accounts

### 4.1 Fixed Demo Namespace Pattern
All seeded database entities must strictly adhere to the `demo_` prefix namespace to enable 100% targeted cleanup and prevent collision with real user data:
- **Auth Users:** `demo_user_admin`, `demo_user_org_01` .. `05`, `demo_user_att_01` .. `10`
- **Known Demo Emails:** `admin@eventing.moteo.fun`, `organizer@eventing.moteo.fun`, `attendee@eventing.moteo.fun`, `organizer1@demo.eventing.moteo.fun` .. `organizer5@demo.eventing.moteo.fun`, `attendee1@demo.eventing.moteo.fun` .. `attendee10@demo.eventing.moteo.fun`
- **Venues:** `demo_venue_01` .. `demo_venue_22`
- **Events:** `demo_evt_music_01` .. `10`, `demo_evt_theater_01` .. `10`, `demo_evt_tech_01` .. `10`, `demo_evt_sports_01` .. `10`, `demo_evt_exhibition_01` .. `10`
- **Seat Maps & Seats:** `demo_seatmap_01`, `demo_sec_vip`, `demo_seat_A_1`
- **Promotions:** `demo_promo_01` .. `05` (Codes: `DEMO_WELCOME10`, `DEMO_SUMMER20`, `DEMO_VIP50`, `DEMO_TECH2026`, `DEMO_ARTS15`)
- **Reviews & Media:** `demo_rev_01` .. `15`, `demo_media_01` .. `15`

### 4.2 Demo Credentials Policy
- **Demo Password:** All demo accounts use the standard portfolio demo password `123456`.
- **Hashing Security:** Passwords are stored in PostgreSQL using the system's canonical `backendAuthProvider` hash algorithm.
- **Account Protection:** Demo admin and organizer accounts do not expose production infrastructure keys, AWS secrets, or payment credentials.

---

## 5. Execution & Container Governance

### 5.1 Manual / On-Demand Execution Only
- **No Automatic Seeding at Startup:** The API Docker container **MUST NOT** run seed scripts automatically during container boot or restarts.
- **Reasoning:** Automatic seeding risks overwriting live state or incurring unnecessary database overhead on container restart.
- **Execution Workflow:** Seeding is triggered manually by an operator executing `node scripts/seed/seed.platform.postgres.js` inside the running API container via `sudo docker compose exec`.
