/**
 * Deterministic Vietnam Event Portfolio Seeder (Phase 03).
 *
 * Seeds realistic Vietnam event-marketplace portfolio data:
 *  - Auth accounts (admin / organizers / attendees) with password: 123456
 *  - 22 real-world VN venues across 8 cities/provinces
 *  - 50 public future events (10 music, 10 theater/arts, 10 workshops/tech, 10 sports, 10 exhibitions)
 *  - 1 seat-map-ready event with seat map, sections, and seats
 *  - 1 submitted event for admin moderation queue
 *  - Featured profiles, ticket types (VND), promotions, reviews, media assets with attribution
 *
 * Usage (from server/):
 *   npm run db:seed:platform
 *   node scripts/seed/seed.platform.postgres.js
 */
require('../../src/alias-bootstrap');
require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is required.');
  process.exit(1);
}

const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const { query } = require('@/providers/database/postgres.client');
const venueRepo = require('@/providers/database/venue.repository');
const eventRepo = require('@/providers/database/event.repository');
const seatRepo = require('@/providers/database/postgres.seat.repository');
const reviewRepo = require('@/providers/database/postgres.review.repository');
const mediaRepo = require('@/providers/database/postgres.media.repository');
const { LIFECYCLE, STATUS, VISIBILITY } = require('@/modules/events/domain/event-lifecycle');
const { toDb, nowDb } = require('@/providers/database/time.helper');

const DEMO_PASSWORD = '123456';

const futureDay = (daysFromNow) => Date.now() + daysFromNow * 24 * 60 * 60 * 1000;
const hours = (n) => n * 60 * 60 * 1000;

// ─── 1. Auth Users & Profiles ──────────────────────────────────────────────
const USERS = [
  {
    id: 'demo_admin_001',
    email: 'admin@eventing.com',
    name: 'Platform Admin',
    roles: ['admin'],
  },
  {
    id: 'demo_admin_002',
    email: 'admin@eventing.moteo.fun',
    name: 'Moteo Admin',
    roles: ['admin'],
  },
  {
    id: 'demo_organizer_saigon',
    email: 'organizer@eventing.com',
    name: 'Saigon Live Events',
    roles: ['organizer'],
    org: {
      companyName: 'Saigon Live Events Co., Ltd',
      description: 'Mạng lưới tổ chức sự kiện âm nhạc, văn hóa & hội nghị hàng đầu tại TP. Hồ Chí Minh.',
      website: 'https://saigonlive.example.com',
    },
  },
  {
    id: 'demo_organizer_hanoi',
    email: 'hanoi.events@eventing.com',
    name: 'Hanoi Stage Productions',
    roles: ['organizer'],
    org: {
      companyName: 'Hanoi Stage Productions',
      description: 'Đơn vị sản xuất nghệ thuật sân khấu, concert giao hưởng & lễ hội công nghệ tại Hà Nội.',
      website: 'https://hanoistage.example.com',
    },
  },
  {
    id: 'demo_organizer_moteo',
    email: 'organizer@eventing.moteo.fun',
    name: 'Moteo Events Vietnam',
    roles: ['organizer'],
    org: {
      companyName: 'Moteo Events Vietnam',
      description: 'Ban tổ chức thể thao, marathon và triển lãm công nghệ quy mô quốc tế.',
      website: 'https://moteo.example.com',
    },
  },
  {
    id: 'demo_attendee_alice',
    email: 'alice@email.com',
    name: 'Alice Nguyễn',
    roles: ['user'],
  },
  {
    id: 'demo_attendee_moteo',
    email: 'attendee@eventing.moteo.fun',
    name: 'Moteo Attendee',
    roles: ['user'],
  },
  {
    id: 'demo_attendee_an',
    email: 'nguyen.an@email.com',
    name: 'Nguyễn Minh An',
    roles: ['user'],
  },
  {
    id: 'demo_attendee_linh',
    email: 'tran.linh@email.com',
    name: 'Trần Khánh Linh',
    roles: ['user'],
  },
  {
    id: 'demo_attendee_hung',
    email: 'le.hung@email.com',
    name: 'Lê Quốc Hùng',
    roles: ['user'],
  },
];

async function upsertAuthUser({ id, email, name, roles }, passwordHash) {
  const existing = await query(
    `SELECT id FROM auth_users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );
  let userId = id;
  if (existing.rows.length) {
    userId = existing.rows[0].id;
    await query(
      `UPDATE auth_users SET password_hash = $2, roles = $3, is_active = true,
         email_verified = true, updated_at = NOW() WHERE id = $1`,
      [userId, passwordHash, roles]
    );
  } else {
    await query(
      `INSERT INTO auth_users (id, email, password_hash, roles, is_active, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
         roles = EXCLUDED.roles, is_active = true, email_verified = true, updated_at = NOW()`,
      [userId, email, passwordHash, roles]
    );
  }
  await query(
    `INSERT INTO user_profiles (id, name, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
    [userId, name]
  );
  try {
    for (const roleName of roles) {
      const r = await query(`SELECT id FROM roles WHERE name = $1 LIMIT 1`, [roleName]);
      if (r.rows[0]) {
        await query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, r.rows[0].id]
        );
      }
    }
  } catch {
    /* junction fallback */
  }
  return userId;
}

async function upsertOrganizerProfile(userId, { companyName, description, website }) {
  const orgId = `demo_org_prof_${userId.replace(/^demo_/, '')}`.slice(0, 64);
  await query(
    `INSERT INTO organizer_profiles
       (id, user_id, company_name, description, website, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       description = EXCLUDED.description,
       website = EXCLUDED.website,
       status = 'active',
       updated_at = NOW()`,
    [orgId, userId, companyName, description || '', website || null]
  ).catch(async () => {
    await query(
      `INSERT INTO organizer_profiles
         (id, user_id, company_name, description, website, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW())
       ON CONFLICT (id) DO UPDATE SET
         company_name = EXCLUDED.company_name,
         description = EXCLUDED.description,
         website = EXCLUDED.website,
         status = 'active'`,
      [orgId, userId, companyName, description || '', website || null]
    );
  });
  return orgId;
}

// ─── 2. Venues (22 Real-World Venues across VN) ──────────────────────────
const VENUES = [
  // Hà Nội (6)
  {
    id: 'demo_venue_hn_opera',
    name: 'Nhà hát Lớn Hà Nội',
    address: '1 Tràng Tiền, Phường Tràng Tiền',
    city: 'Hà Nội',
    district: 'Hoàn Kiếm',
    country: 'VN',
    lat: 21.0245,
    lng: 105.8576,
    capacity: 900,
    seatMapId: 'demo_sm_hanoi_opera',
  },
  {
    id: 'demo_venue_hn_mydinh',
    name: 'Sân vận động Quốc gia Mỹ Đình',
    address: 'Lê Đức Thọ, Phường Mỹ Đình 1',
    city: 'Hà Nội',
    district: 'Nam Từ Liêm',
    country: 'VN',
    lat: 21.0207,
    lng: 105.7623,
    capacity: 40000,
  },
  {
    id: 'demo_venue_hn_athletics',
    name: 'Cung Thể thao Điền kinh Hà Nội',
    address: 'Trần Hữu Dực, Phường Mỹ Đình 2',
    city: 'Hà Nội',
    district: 'Nam Từ Liêm',
    country: 'VN',
    lat: 21.0225,
    lng: 105.7650,
    capacity: 5000,
  },
  {
    id: 'demo_venue_hn_ncc',
    name: 'Trung tâm Hội nghị Quốc gia NCC',
    address: '57 Phạm Hùng, Phường Mễ Trì',
    city: 'Hà Nội',
    district: 'Nam Từ Liêm',
    country: 'VN',
    lat: 21.0069,
    lng: 105.7836,
    capacity: 3800,
  },
  {
    id: 'demo_venue_hn_hoguom',
    name: 'Nhà hát Hồ Gươm',
    address: '40 Hàng Bài, Phường Hàng Bài',
    city: 'Hà Nội',
    district: 'Hoàn Kiếm',
    country: 'VN',
    lat: 21.0221,
    lng: 105.8532,
    capacity: 900,
  },
  {
    id: 'demo_venue_hn_agri',
    name: 'Trung tâm Triển lãm Nông nghiệp Hà Nội',
    address: '489 Hoàng Quốc Việt, Phường Cổ Nhuế 1',
    city: 'Hà Nội',
    district: 'Bắc Từ Liêm',
    country: 'VN',
    lat: 21.0472,
    lng: 105.7845,
    capacity: 3000,
  },

  // TP. Hồ Chí Minh (7)
  {
    id: 'demo_venue_hcm_gem',
    name: 'GEM Center',
    address: '8 Nguyễn Bỉnh Khiêm, Phường Đa Kao',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    country: 'VN',
    lat: 10.7902,
    lng: 106.7023,
    capacity: 1200,
  },
  {
    id: 'demo_venue_hcm_saigon_theater',
    name: 'Nhà hát Thành phố Sài Gòn (Opera House)',
    address: '7 Công trường Lam Sơn, Phường Bến Nghé',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    country: 'VN',
    lat: 10.7766,
    lng: 106.7032,
    capacity: 500,
  },
  {
    id: 'demo_venue_hcm_youth',
    name: 'Nhà văn hóa Thanh Niên TP.HCM',
    address: '4 Phạm Ngọc Thạch, Phường Bến Nghé',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    country: 'VN',
    lat: 10.7825,
    lng: 106.6978,
    capacity: 2000,
  },
  {
    id: 'demo_venue_hcm_secc',
    name: 'SECC - Trung tâm Hội chợ & Triển lãm Sài Gòn',
    address: '799 Nguyễn Văn Linh, Phường Tân Phú',
    city: 'Hồ Chí Minh',
    district: 'Quận 7',
    country: 'VN',
    lat: 10.7295,
    lng: 106.7205,
    capacity: 15000,
  },
  {
    id: 'demo_venue_hcm_q7_stadium',
    name: 'Sân vận động Quân khu 7',
    address: '202 Hoàng Văn Thụ, Phường 9',
    city: 'Hồ Chí Minh',
    district: 'Phú Nhuận',
    country: 'VN',
    lat: 10.8034,
    lng: 106.6668,
    capacity: 25000,
  },
  {
    id: 'demo_venue_hcm_diamond',
    name: 'Diamond Place Convention Center',
    address: '15A Hồ Văn Huê, Phường 9',
    city: 'Hồ Chí Minh',
    district: 'Phú Nhuận',
    country: 'VN',
    lat: 10.8012,
    lng: 106.6745,
    capacity: 1500,
  },
  {
    id: 'demo_venue_hcm_bitexco',
    name: 'Bitexco Financial Tower - Sky Deck',
    address: '2 Hải Triều, Phường Bến Nghé',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    country: 'VN',
    lat: 10.7716,
    lng: 106.7043,
    capacity: 300,
  },

  // Đà Nẵng (3)
  {
    id: 'demo_venue_dn_trungvuong',
    name: 'Nhà hát Trưng Vương Đà Nẵng',
    address: '86 Hùng Vương, Phường Hải Châu 1',
    city: 'Đà Nẵng',
    district: 'Hải Châu',
    country: 'VN',
    lat: 16.0688,
    lng: 108.2207,
    capacity: 1200,
  },
  {
    id: 'demo_venue_dn_tuyenson',
    name: 'Cung Thể thao Tuyên Sơn',
    address: 'Đường Phan Đăng Lưu, Phường Hòa Cường Bắc',
    city: 'Đà Nẵng',
    district: 'Hải Châu',
    country: 'VN',
    lat: 16.0375,
    lng: 108.2231,
    capacity: 7000,
  },
  {
    id: 'demo_venue_dn_ariyana',
    name: 'Trung tâm Hội nghị Quốc tế Ariyana',
    address: '107 Võ Nguyên Giáp, Phường Khuê Mỹ',
    city: 'Đà Nẵng',
    district: 'Ngũ Hành Sơn',
    country: 'VN',
    lat: 16.0361,
    lng: 108.2464,
    capacity: 2500,
  },

  // Huế (2)
  {
    id: 'demo_venue_hue_culture',
    name: 'Trung tâm Văn hóa & Điện ảnh Huế',
    address: '41 Hùng Vương, Phường Phú Hội',
    city: 'Thừa Thiên Huế',
    district: 'Thành phố Huế',
    country: 'VN',
    lat: 16.4637,
    lng: 107.5908,
    capacity: 1000,
  },
  {
    id: 'demo_venue_hue_dainoi',
    name: 'Sân khấu Kỳ Đài - Đại Nội Huế',
    address: '23 Tháng 8, Phường Thuận Hòa',
    city: 'Thừa Thiên Huế',
    district: 'Thành phố Huế',
    country: 'VN',
    lat: 16.4695,
    lng: 107.5778,
    capacity: 5000,
  },

  // Cần Thơ (1)
  {
    id: 'demo_venue_cantho_expo',
    name: 'Trung tâm Hội chợ Triển lãm Cần Thơ',
    address: '108A Lê Lợi, Phường Cái Khế',
    city: 'Cần Thơ',
    district: 'Ninh Kiều',
    country: 'VN',
    lat: 10.0489,
    lng: 105.7871,
    capacity: 4000,
  },

  // Hải Phòng (1)
  {
    id: 'demo_venue_haiphong_theater',
    name: 'Nhà hát Thành phố Hải Phòng',
    address: '28 Trần Hưng Đạo, Phường Hoàng Văn Thụ',
    city: 'Hải Phòng',
    district: 'Hồng Bàng',
    country: 'VN',
    lat: 20.8601,
    lng: 106.6822,
    capacity: 800,
  },

  // Bà Rịa - Vũng Tàu (1)
  {
    id: 'demo_venue_vungtau_pullman',
    name: 'Pullman Vũng Tàu Convention Center',
    address: '15 Thi Sách, Phường 8',
    city: 'Bà Rịa - Vũng Tàu',
    district: 'Thành phố Vũng Tàu',
    country: 'VN',
    lat: 10.3541,
    lng: 107.0862,
    capacity: 2000,
  },

  // Quảng Ninh (1)
  {
    id: 'demo_venue_quangninh_expo',
    name: 'Cung Quy hoạch, Hội chợ & Triển lãm Quảng Ninh',
    address: 'Trần Quốc Nghiễn, Phường Hồng Hải',
    city: 'Quảng Ninh',
    district: 'Hạ Long',
    country: 'VN',
    lat: 20.9482,
    lng: 107.0945,
    capacity: 5000,
  },
];

// ─── 3. Featured Profiles ──────────────────────────────────────────────────
const FEATURED = [
  {
    id: 'demo_fp_vpop_stars',
    name: 'V-Pop & Indie Line-up',
    type: 'artist',
    bio: 'Dàn nghệ sĩ V-Pop, Indie và Band nhạc sống được yêu thích tại Việt Nam.',
    avatarUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
  },
  {
    id: 'demo_fp_tech_speakers',
    name: 'Google & Tech Experts VN',
    type: 'speaker',
    bio: 'Chuyên gia AI, Cloud Architecture và Software Engineering hàng đầu.',
    avatarUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
  },
  {
    id: 'demo_fp_symphony_conductors',
    name: 'Dàn nhạc Giao hưởng Việt Nam',
    type: 'artist',
    bio: 'Nhạc trưởng và dàn hợp xướng cổ điển trình diễn các tác phẩm đỉnh cao.',
    avatarUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80',
  },
  {
    id: 'demo_fp_sports_ambassadors',
    name: 'Đại sứ Thể thao & Marathon',
    type: 'speaker',
    bio: 'Vận động viên marathon quốc gia và huấn luyện viên sức bền.',
    avatarUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=80',
  },
  {
    id: 'demo_fp_art_curators',
    name: 'Giám tuyển Nghệ thuật Việt',
    type: 'speaker',
    bio: 'Nhà nghiên cứu mỹ thuật, thiết kế đồ họa và thị giác đương đại.',
    avatarUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&q=80',
  },
];

// Royalty-free images with attribution notes
const IMAGES = {
  music: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80',
  arts: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&q=80',
  tech: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
  workshop: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&q=80',
  sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80',
  exhibition: 'https://images.unsplash.com/photo-1531058240690-006c446962d8?w=1200&q=80',
};

// ─── 4. Build 50 Public Future Events + 1 Pending Event ─────────────────────
function buildEvents(orgSaigon, orgHanoi, orgMoteo) {
  const events = [];

  // ------------------- Group 1: MUSIC (10 Events) -------------------
  const musicTitles = [
    { name: 'Đêm Nhạc Acoustic: Mùa Thu Sài Gòn', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_gem', org: orgSaigon, days: 7, price: 350000 },
    { name: 'Ravolution Music Festival 2026', city: 'Hà Nội', venue: 'demo_venue_hn_mydinh', org: orgHanoi, days: 14, price: 950000 },
    { name: 'V-Pop Wave Concert Tour Đà Nẵng', city: 'Đà Nẵng', venue: 'demo_venue_dn_tuyenson', org: orgMoteo, days: 21, price: 500000 },
    { name: 'Hòa Nhạc Jazz Under The Stars', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_bitexco', org: orgSaigon, days: 28, price: 750000 },
    { name: 'Lễ Hội Âm Nhạc Bãi Biển Vũng Tàu', city: 'Bà Rịa - Vũng Tàu', venue: 'demo_venue_vungtau_pullman', org: orgMoteo, days: 35, price: 450000 },
    { name: 'Live Concert: Giai Điệu Cố Đô Huế', city: 'Thừa Thiên Huế', venue: 'demo_venue_hue_dainoi', org: orgHanoi, days: 42, price: 400000 },
    { name: 'EDM Night: Bass Nation Hải Phòng', city: 'Hải Phòng', venue: 'demo_venue_haiphong_theater', org: orgHanoi, days: 49, price: 300000 },
    { name: 'Indie Vietnam Showcase Cần Thơ', city: 'Cần Thơ', venue: 'demo_venue_cantho_expo', org: orgSaigon, days: 56, price: 250000 },
    { name: 'Đêm Nhạc Rock Đất Mỏ Hạ Long', city: 'Quảng Ninh', venue: 'demo_venue_quangninh_expo', org: orgMoteo, days: 63, price: 350000 },
    { name: 'Sài Gòn Hip-Hop Underground Jam', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_youth', org: orgSaigon, days: 70, price: 200000 },
  ];

  musicTitles.forEach((m, idx) => {
    const num = (idx + 1).toString().padStart(2, '0');
    events.push({
      id: `demo_evt_music_${num}`,
      name: m.name,
      description: `${m.name} quy tụ các nghệ sĩ biểu diễn hàng đầu tại ${m.city}. Trải nghiệm âm thanh và ánh sáng đẳng cấp quốc tế.`,
      category: ['music'],
      tags: ['music', 'concert', 'v-pop', 'edm', 'show'],
      date: futureDay(m.days),
      endDate: futureDay(m.days) + hours(4),
      venueId: m.venue,
      city: m.city,
      eventType: 'physical',
      ticketTypes: {
        Standard: { price: m.price, quantity: 500, available: 320, name: 'Vé Tiêu Chuẩn' },
        VIP: { price: m.price * 2, quantity: 100, available: 45, name: 'Vé VIP Pass' },
      },
      minPrice: m.price,
      isOutdoor: idx % 2 === 1,
      organizerId: m.org,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 90 - idx * 2,
      viewCount: 15000 - idx * 1000,
      imageUrl: IMAGES.music,
      bannerUrl: IMAGES.music,
      featuredProfileIds: ['demo_fp_vpop_stars'],
    });
  });

  // ------------------- Group 2: THEATER & ARTS (10 Events) -------------------
  // Event 01 is seat-map-ready at Hanoi Opera House
  const artsTitles = [
    { name: 'Đêm Giao Hưởng Mùa Thu — Vietnam Philharmonic', city: 'Hà Nội', venue: 'demo_venue_hn_opera', org: orgHanoi, days: 10, price: 600000, seatMapId: 'demo_sm_hanoi_opera' },
    { name: 'Kịch Nói: Đêm Trắng Sài Gòn', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_saigon_theater', org: orgSaigon, days: 16, price: 400000 },
    { name: 'Múa Đương Đại: Dòng Sông Ký Ức Huế', city: 'Thừa Thiên Huế', venue: 'demo_venue_hue_culture', org: orgHanoi, days: 22, price: 300000 },
    { name: 'Sân Khấu Kịch Nói Trưng Vương Đà Nẵng', city: 'Đà Nẵng', venue: 'demo_venue_dn_trungvuong', org: orgMoteo, days: 29, price: 350000 },
    { name: 'Vở Cải Lương Đương Đại: Tiếng Sóng', city: 'Cần Thơ', venue: 'demo_venue_cantho_expo', org: orgSaigon, days: 36, price: 250000 },
    { name: 'Nhạc Kịch Broadway: Les Misérables VN', city: 'Hà Nội', venue: 'demo_venue_hn_hoguom', org: orgHanoi, days: 43, price: 800000 },
    { name: 'Hòa Nhạc Cổ Điển Tchaikovsky Sài Gòn', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_diamond', org: orgSaigon, days: 50, price: 500000 },
    { name: 'Chương Trình Nghệ Thuật Di Sản Hạ Long', city: 'Quảng Ninh', venue: 'demo_venue_quangninh_expo', org: orgMoteo, days: 57, price: 350000 },
    { name: 'Trình Diễn Thời Trang & Triển Lãm Áo Dài', city: 'Hà Nội', venue: 'demo_venue_hn_ncc', org: orgHanoi, days: 64, price: 450000 },
    { name: 'Đêm Nhạc kịch & Hợp Xướng Hải Phòng', city: 'Hải Phòng', venue: 'demo_venue_haiphong_theater', org: orgHanoi, days: 71, price: 300000 },
  ];

  artsTitles.forEach((a, idx) => {
    const num = (idx + 1).toString().padStart(2, '0');
    const evtObj = {
      id: `demo_evt_arts_${num}`,
      name: a.name,
      description: `${a.name} mang đến trải nghiệm thưởng thức nghệ thuật đỉnh cao, kịch nghệ và trình diễn âm nhạc cổ điển tại ${a.city}.`,
      category: ['arts'],
      tags: ['arts', 'theater', 'sân khấu', 'culture', 'opera'],
      date: futureDay(a.days),
      endDate: futureDay(a.days) + hours(3),
      venueId: a.venue,
      city: a.city,
      eventType: 'physical',
      ticketTypes: {
        Standard: { price: a.price, quantity: 300, available: 190, name: 'Vé Thường' },
        VIP: { price: a.price * 2, quantity: 80, available: 30, name: 'Vé VIP Box' },
      },
      minPrice: a.price,
      isOutdoor: false,
      organizerId: a.org,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 85 - idx * 2,
      viewCount: 12000 - idx * 800,
      imageUrl: IMAGES.arts,
      bannerUrl: IMAGES.arts,
      featuredProfileIds: ['demo_fp_symphony_conductors'],
    };
    if (a.seatMapId) {
      evtObj.seatMapId = a.seatMapId;
    }
    events.push(evtObj);
  });

  // ------------------- Group 3: WORKSHOPS & TECH (10 Events) -------------------
  const techTitles = [
    { name: 'Vietnam Developer Festival 2026 (DevFest)', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_diamond', org: orgSaigon, days: 8, price: 700000, cat: ['workshop', 'tech'] },
    { name: 'AI & Cloud Summit Hà Nội 2026', city: 'Hà Nội', venue: 'demo_venue_hn_ncc', org: orgHanoi, days: 15, price: 1200000, cat: ['tech'] },
    { name: 'Hội Thảo Startup & Venture Capital Đà Nẵng', city: 'Đà Nẵng', venue: 'demo_venue_dn_ariyana', org: orgMoteo, days: 23, price: 500000, cat: ['workshop'] },
    { name: 'Workshop Mobile App Engineering & UI/UX', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_gem', org: orgSaigon, days: 30, price: 400000, cat: ['workshop', 'tech'] },
    { name: 'Diễn Đàn Chuyển Đổi Số Nông Nghiệp Cần Thơ', city: 'Cần Thơ', venue: 'demo_venue_cantho_expo', org: orgSaigon, days: 37, price: 300000, cat: ['workshop'] },
    { name: 'Tech Leaders Executive Roundtable', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_bitexco', org: orgSaigon, days: 44, price: 1500000, cat: ['tech'] },
    { name: 'Hội Thảo An Ninh Mạng & Cybersecurity VN', city: 'Hà Nội', venue: 'demo_venue_hn_agri', org: orgHanoi, days: 51, price: 800000, cat: ['tech'] },
    { name: 'Workshop AI In Creative Design & Marketing', city: 'Bà Rịa - Vũng Tàu', venue: 'demo_venue_vungtau_pullman', org: orgMoteo, days: 58, price: 350000, cat: ['workshop'] },
    { name: 'Công Nghệ Xanh & Năng Lượng Tái Tạo Quảng Ninh', city: 'Quảng Ninh', venue: 'demo_venue_quangninh_expo', org: orgMoteo, days: 65, price: 500000, cat: ['workshop', 'tech'] },
    { name: 'IoT & Smart City Forum Hải Phòng', city: 'Hải Phòng', venue: 'demo_venue_haiphong_theater', org: orgHanoi, days: 72, price: 450000, cat: ['tech'] },
  ];

  techTitles.forEach((t, idx) => {
    const num = (idx + 1).toString().padStart(2, '0');
    events.push({
      id: `demo_evt_workshop_${num}`,
      name: t.name,
      description: `${t.name} cung cấp kiến thức chuyên sâu, thảo luận xu hướng công nghệ mới và cơ hội kết nối dành cho các chuyên gia tại ${t.city}.`,
      category: t.cat,
      tags: ['workshop', 'tech', 'conference', 'education', 'developer'],
      date: futureDay(t.days),
      endDate: futureDay(t.days) + hours(8),
      venueId: t.venue,
      city: t.city,
      eventType: 'physical',
      ticketTypes: {
        Standard: { price: t.price, quantity: 400, available: 250, name: 'Vé Tham Dự' },
        VIP: { price: t.price * 1.8, quantity: 80, available: 35, name: 'Vé VIP Networking' },
      },
      minPrice: t.price,
      isOutdoor: false,
      organizerId: t.org,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 92 - idx * 2,
      viewCount: 18000 - idx * 1100,
      imageUrl: IMAGES.tech,
      bannerUrl: IMAGES.tech,
      featuredProfileIds: ['demo_fp_tech_speakers'],
    });
  });

  // ------------------- Group 4: SPORTS (10 Events) -------------------
  const sportsTitles = [
    { name: 'Giải Run For Green Marathon Hà Nội 2026', city: 'Hà Nội', venue: 'demo_venue_hn_athletics', org: orgHanoi, days: 12, price: 450000 },
    { name: 'Saigon Night Run Half Marathon 2026', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_q7_stadium', org: orgSaigon, days: 18, price: 500000 },
    { name: 'Giải Marathon Quốc Tế Biển Đà Nẵng', city: 'Đà Nẵng', venue: 'demo_venue_dn_tuyenson', org: orgMoteo, days: 25, price: 600000 },
    { name: 'Giải Đua Xe Đạp Địa Hình Cố Đô Huế', city: 'Thừa Thiên Huế', venue: 'demo_venue_hue_dainoi', org: orgHanoi, days: 32, price: 350000 },
    { name: 'Giải Cầu Lông Mở Rộng Cần Thơ 2026', city: 'Cần Thơ', venue: 'demo_venue_cantho_expo', org: orgSaigon, days: 39, price: 200000 },
    { name: 'Vũng Tàu Aquathlon & Swim Run 2026', city: 'Bà Rịa - Vũng Tàu', venue: 'demo_venue_vungtau_pullman', org: orgMoteo, days: 46, price: 550000 },
    { name: 'Giải Bóng Rổ 3x3 Vietnam Challenge', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_youth', org: orgSaigon, days: 53, price: 150000 },
    { name: 'Giải Marathon Khám Phá Kỳ Quan Hạ Long', city: 'Quảng Ninh', venue: 'demo_venue_quangninh_expo', org: orgMoteo, days: 60, price: 650000 },
    { name: 'Ngày Hội Fitness & Yoga Community Hà Nội', city: 'Hà Nội', venue: 'demo_venue_hn_agri', org: orgHanoi, days: 67, price: 250000 },
    { name: 'Giải Thể Thao Học Đường Hải Phòng', city: 'Hải Phòng', venue: 'demo_venue_haiphong_theater', org: orgHanoi, days: 74, price: 100000 },
  ];

  sportsTitles.forEach((s, idx) => {
    const num = (idx + 1).toString().padStart(2, '0');
    events.push({
      id: `demo_evt_sports_${num}`,
      name: s.name,
      description: `${s.name} là giải đấu thể thao phong trào quy mô lớn tại ${s.city}, khuyến khích tinh thần rèn luyện sức khỏe cộng đồng.`,
      category: ['sports'],
      tags: ['sports', 'marathon', 'running', 'fitness', 'wellness'],
      date: futureDay(s.days),
      endDate: futureDay(s.days) + hours(6),
      venueId: s.venue,
      city: s.city,
      eventType: 'physical',
      ticketTypes: {
        BibRunner: { price: s.price, quantity: 1500, available: 950, name: 'Vé Đăng Ký (BIB)' },
        VIPRunner: { price: s.price * 2, quantity: 200, available: 120, name: 'Vé VIP Race Kit' },
      },
      minPrice: s.price,
      isOutdoor: true,
      organizerId: s.org,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 88 - idx * 2,
      viewCount: 14000 - idx * 900,
      imageUrl: IMAGES.sports,
      bannerUrl: IMAGES.sports,
      featuredProfileIds: ['demo_fp_sports_ambassadors'],
    });
  });

  // ------------------- Group 5: EXHIBITIONS (10 Events) -------------------
  const exhibitionTitles = [
    { name: 'Triển Lãm Công Nghệ & Thiết Bị Điện Tử SECC 2026', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_secc', org: orgSaigon, days: 11, price: 100000 },
    { name: 'Triển Lãm Mỹ Thuật & Đồ Họa Đương Đại Hà Nội', city: 'Hà Nội', venue: 'demo_venue_hn_agri', org: orgHanoi, days: 17, price: 150000 },
    { name: 'Triển Lãm Nông Nghiệp Công Nghệ Cao Cần Thơ', city: 'Cần Thơ', venue: 'demo_venue_cantho_expo', org: orgSaigon, days: 24, price: 50000 },
    { name: 'Expo Du Lịch & Văn Hóa Biển Đà Nẵng', city: 'Đà Nẵng', venue: 'demo_venue_dn_ariyana', org: orgMoteo, days: 31, price: 100000 },
    { name: 'Triển Lãm Mỹ Nghệ & Kim Hoàn Cố Đô Huế', city: 'Thừa Thiên Huế', venue: 'demo_venue_hue_culture', org: orgHanoi, days: 38, price: 80000 },
    { name: 'Vietnam Industrial & Automation Expo Quảng Ninh', city: 'Quảng Ninh', venue: 'demo_venue_quangninh_expo', org: orgMoteo, days: 45, price: 200000 },
    { name: 'Triển Lãm Nhiếp Ảnh Kiến Trúc & Đô Thị Sài Gòn', city: 'Hồ Chí Minh', venue: 'demo_venue_hcm_youth', org: orgSaigon, days: 52, price: 120000 },
    { name: 'Triển Lãm Thiết Kế & Nội Thất Cao Cấp Vũng Tàu', city: 'Bà Rịa - Vũng Tàu', venue: 'demo_venue_vungtau_pullman', org: orgMoteo, days: 59, price: 150000 },
    { name: 'Expo Sách & Văn Hóa Đọc Thủ Đô 2026', city: 'Hà Nội', venue: 'demo_venue_hn_ncc', org: orgHanoi, days: 66, price: 0 },
    { name: 'Triển Lãm Xe Máy & Động Cơ Hải Phòng', city: 'Hải Phòng', venue: 'demo_venue_haiphong_theater', org: orgHanoi, days: 73, price: 100000 },
  ];

  exhibitionTitles.forEach((e, idx) => {
    const num = (idx + 1).toString().padStart(2, '0');
    events.push({
      id: `demo_evt_exhibition_${num}`,
      name: e.name,
      description: `${e.name} trưng bày hàng trăm gian hàng, sản phẩm sáng tạo và công nghệ tiên tiến tại ${e.city}.`,
      category: ['arts', 'exhibition'],
      tags: ['exhibition', 'arts', 'expo', 'museum', 'culture'],
      date: futureDay(e.days),
      endDate: futureDay(e.days) + hours(10),
      venueId: e.venue,
      city: e.city,
      eventType: 'physical',
      ticketTypes: {
        DayPass: { price: e.price, quantity: 2000, available: 1400, name: 'Vé Vào Cổng 1 Ngày' },
      },
      minPrice: e.price,
      isOutdoor: false,
      organizerId: e.org,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 82 - idx * 2,
      viewCount: 11000 - idx * 700,
      imageUrl: IMAGES.exhibition,
      bannerUrl: IMAGES.exhibition,
      featuredProfileIds: ['demo_fp_art_curators'],
    });
  });

  // ------------------- Admin Moderation Queue Event (Submitted/Pending) -------------------
  events.push({
    id: 'demo_evt_pending_01',
    name: 'Sunrise Yoga Fest Đà Nẵng 2026',
    description: 'Buổi tập yoga ngoài trời chào bình minh bãi biển Mỹ Khê — Đang chờ phê duyệt ban quản trị.',
    category: ['sports'],
    tags: ['yoga', 'outdoor', 'danang'],
    date: futureDay(20),
    endDate: futureDay(20) + hours(2),
    venueId: 'demo_venue_dn_ariyana',
    city: 'Đà Nẵng',
    eventType: 'physical',
    ticketTypes: {
      Standard: { price: 200000, quantity: 100, available: 100, name: 'Vé Đồng Đồng' },
    },
    minPrice: 200000,
    isOutdoor: true,
    organizerId: orgMoteo,
    status: STATUS.PENDING,
    lifecycleStatus: LIFECYCLE.SUBMITTED,
    visibility: VISIBILITY.PRIVATE,
    hotScore: 10,
    viewCount: 50,
    imageUrl: IMAGES.sports,
    bannerUrl: IMAGES.sports,
  });

  return events;
}

// ─── 5. Promotions ────────────────────────────────────────────────────────
const PROMOS = [
  {
    id: 'demo_promo_01',
    code: 'MUSICVIP10',
    name: 'Giảm 10% vé Music Fest',
    discountType: 'percent',
    discountValue: 10,
    eventId: 'demo_evt_music_01',
  },
  {
    id: 'demo_promo_02',
    code: 'TECHFAR50K',
    name: 'Giảm 50k vé DevFest 2026',
    discountType: 'fixed',
    discountValue: 50000,
    eventId: 'demo_evt_workshop_01',
  },
  {
    id: 'demo_promo_03',
    code: 'ARTS50',
    name: 'Ưu đãi 50% Vé Giao Hưởng',
    discountType: 'percent',
    discountValue: 50,
    eventId: 'demo_evt_arts_01',
  },
  {
    id: 'demo_promo_04',
    code: 'RUN2026',
    name: 'Giảm 20k Giải Đua Run For Green',
    discountType: 'fixed',
    discountValue: 20000,
    eventId: 'demo_evt_sports_01',
  },
  {
    id: 'demo_promo_05',
    code: 'EXPOFREE',
    name: 'Vé Miễn Phí Triển Lãm SECC',
    discountType: 'percent',
    discountValue: 100,
    eventId: 'demo_evt_exhibition_01',
  },
];

// ─── Seed Execution Functions ──────────────────────────────────────────────
async function seedFeatured() {
  for (const p of FEATURED) {
    try {
      await query(
        `INSERT INTO featured_profiles
           (id, name, profile_type, bio, image_url, genres, follower_count, created_at, updated_at, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8::jsonb)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           profile_type = EXCLUDED.profile_type,
           bio = EXCLUDED.bio,
           image_url = EXCLUDED.image_url,
           genres = EXCLUDED.genres,
           raw_data = EXCLUDED.raw_data,
           updated_at = NOW()`,
        [
          p.id,
          p.name,
          p.type || 'artist',
          p.bio || '',
          p.avatarUrl || null,
          p.genres || [],
          p.followerCount || 0,
          JSON.stringify(p),
        ]
      );
    } catch (e) {
      console.warn(`[featured] skip ${p.id}: ${e.message}`);
    }
  }
}

async function seedPromotions(organizerId) {
  const from = new Date();
  const until = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  for (const p of PROMOS) {
    try {
      const data = {
        name: p.name,
        description: p.name,
        code: p.code,
        discountType: p.discountType,
        discountValue: p.discountValue,
        eventId: p.eventId,
      };
      await query(
        `INSERT INTO promotions
           (id, organizer_id, code, event_id, valid_from, valid_until,
            usage_limit, used_count, is_public, data, created_at,
            discount_type, discount_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, true, $8::jsonb, NOW(), $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           code = EXCLUDED.code,
           event_id = EXCLUDED.event_id,
           valid_from = EXCLUDED.valid_from,
           valid_until = EXCLUDED.valid_until,
           data = EXCLUDED.data,
           discount_type = EXCLUDED.discount_type,
           discount_value = EXCLUDED.discount_value`,
        [
          p.id,
          organizerId,
          p.code,
          p.eventId,
          from,
          until,
          500,
          JSON.stringify(data),
          p.discountType,
          p.discountValue,
        ]
      );
    } catch (e) {
      console.warn(`[promo] skip ${p.id}: ${e.message}`);
    }
  }
}

async function seedSeatMap() {
  const mapId = 'demo_sm_hanoi_opera';
  const now = nowDb();
  await seatRepo.createSeatMap(mapId, {
    name: 'Sơ đồ Ghế Nhà hát Lớn Hà Nội',
    totalRows: 3,
    totalCols: 10,
    createdAt: now,
  });

  const sections = [
    { id: 'demo_sec_vip', seatMapId: mapId, name: 'Khu vực VIP (Tầng 1)', priceMultiplier: 1.5, createdAt: now },
    { id: 'demo_sec_std', seatMapId: mapId, name: 'Khu vực Tiêu chuẩn (Tầng 2)', priceMultiplier: 1.0, createdAt: now },
  ];
  await seatRepo.createSeatSections(sections);

  const seats = [];
  // VIP Seats (Rows A, B, C)
  ['A', 'B', 'C'].forEach((row) => {
    for (let col = 1; col <= 5; col++) {
      seats.push({
        id: `demo_seat_vip_${row}${col}`,
        seatSectionId: 'demo_sec_vip',
        rowName: row,
        seatNumber: col,
        status: 'available',
        createdAt: now,
      });
    }
  });
  // Standard Seats (Rows D, E, F)
  ['D', 'E', 'F'].forEach((row) => {
    for (let col = 1; col <= 5; col++) {
      seats.push({
        id: `demo_seat_std_${row}${col}`,
        seatSectionId: 'demo_sec_std',
        rowName: row,
        seatNumber: col,
        status: 'available',
        createdAt: now,
      });
    }
  });
  await seatRepo.createSeats(seats);
}

async function seedReviews(userMap) {
  const reviews = [
    { id: 'demo_rev_01', eventId: 'demo_evt_arts_01', userId: userMap['alice@email.com'], rating: 5, comment: 'Sự kiện nghệ thuật tuyệt vời, dàn nhạc giao hưởng trình diễn vô cùng chuyên nghiệp!', createdAt: toDb(Date.now() - 3 * 24 * 3600 * 1000) },
    { id: 'demo_rev_02', eventId: 'demo_evt_arts_01', userId: userMap['nguyen.an@email.com'], rating: 5, comment: 'Sân khấu Nhà hát Lớn hoành tráng, tổ chức vô cùng chu đáo.', createdAt: toDb(Date.now() - 2 * 24 * 3600 * 1000) },
    { id: 'demo_rev_03', eventId: 'demo_evt_arts_01', userId: userMap['tran.linh@email.com'], rating: 4, comment: 'Âm thanh sống động, trải nghiệm thưởng thức âm nhạc tuyệt vời.', createdAt: toDb(Date.now() - 1 * 24 * 3600 * 1000) },
    { id: 'demo_rev_04', eventId: 'demo_evt_music_01', userId: userMap['le.hung@email.com'], rating: 5, comment: 'Đêm nhạc acoustic bùng nổ không khí, hệ thống âm thanh ánh sáng hiện đại!', createdAt: toDb(Date.now() - 1 * 24 * 3600 * 1000) },
  ];
  for (const r of reviews) {
    await reviewRepo.createReview(r.id, r);
  }
}

async function seedMedia(eventId, userId) {
  const mediaItems = [
    {
      id: 'demo_media_01',
      media: {
        eventId,
        userId,
        url: IMAGES.music,
        type: 'image',
        caption: 'Sân khấu chính rực rỡ sắc màu — Unsplash Royalty Free',
        createdAt: toDb(Date.now() - 2 * 24 * 3600 * 1000),
      },
    },
    {
      id: 'demo_media_02',
      media: {
        eventId,
        userId,
        url: IMAGES.tech,
        type: 'image',
        caption: 'Các lập trình viên thảo luận sôi nổi tại workshop — Unsplash Royalty Free',
        createdAt: toDb(Date.now() - 1 * 24 * 3600 * 1000),
      },
    },
  ];
  await mediaRepo.createEventMediaBatch(mediaItems);
}

async function runSeed() {
  console.log('\n=== Seeding Deterministic Vietnam Event Portfolio ===\n');

  const passwordHash = await backendAuthProvider.hashPassword(DEMO_PASSWORD);

  // 1) Users & Roles & Organizer Profiles
  console.log('[1/7] Auth users & profiles…');
  const userMap = {};
  for (const u of USERS) {
    const uid = await upsertAuthUser(u, passwordHash);
    userMap[u.email] = uid;
    if (u.org) {
      await upsertOrganizerProfile(uid, u.org);
    }
  }
  const orgSaigon = userMap['organizer@eventing.com'];
  const orgHanoi = userMap['hanoi.events@eventing.com'];
  const orgMoteo = userMap['organizer@eventing.moteo.fun'];
  const attendeeAlice = userMap['alice@email.com'];

  // 2) Venues
  console.log('[2/7] Venues (22 across 8 cities)…');
  for (const v of VENUES) {
    await venueRepo.createVenue(v.id, v);
  }

  // 3) Featured Profiles
  console.log('[3/7] Featured profiles…');
  await seedFeatured();

  // 4) Seat Map Setup
  console.log('[4/7] Seat map (Hanoi Opera House)…');
  await seedSeatMap();

  // 5) Events
  console.log('[5/7] Events (50 public future + 1 pending)…');
  const events = buildEvents(orgSaigon, orgHanoi, orgMoteo);
  for (const e of events) {
    e.createdAt = Date.now() - 7 * 24 * 60 * 60 * 1000;
    e.lastUpdatedAt = Date.now();
    await eventRepo.createEvent(e.id, e);
  }

  // 6) Promotions
  console.log('[6/7] Promotions…');
  await seedPromotions(orgSaigon);

  // 7) Reviews & Media
  console.log('[7/7] Reviews & Media…');
  await seedReviews(userMap);
  await seedMedia('demo_evt_arts_01', attendeeAlice);

  console.log('\n--- Demo accounts (password: 123456) ---');
  console.log('| Role      | Email                         | Name                  |');
  console.log('|-----------|-------------------------------|-----------------------|');
  console.log('| Admin     | admin@eventing.com            | Platform Admin        |');
  console.log('| Admin     | admin@eventing.moteo.fun      | Moteo Admin           |');
  console.log('| Organizer | organizer@eventing.com        | Saigon Live Events    |');
  console.log('| Organizer | hanoi.events@eventing.com     | Hanoi Stage           |');
  console.log('| Organizer | organizer@eventing.moteo.fun  | Moteo Events Vietnam  |');
  console.log('| Attendee  | alice@email.com               | Alice Nguyễn          |');
  console.log('| Attendee  | attendee@eventing.moteo.fun   | Moteo Attendee        |');
  console.log('\nSeeding completed successfully.\n');
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err.message || err);
      if (err.stack) console.error(err.stack);
      process.exit(1);
    });
}

module.exports = { runSeed, USERS, VENUES, FEATURED, PROMOS };
