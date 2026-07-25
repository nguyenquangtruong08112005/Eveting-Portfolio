/**
 * Platform seed — realistic Vietnam event-marketplace data (not smoke/test fixtures).
 *
 * Seeds:
 *  - Auth users (admin / organizers / attendees) password: 123456
 *  - Organizer profiles
 *  - Real-world VN venues (coords + cities)
 *  - Published public events with ticket types (VND)
 *  - Featured artists / speakers
 *  - Sample promotions
 *
 * Usage (from server/):
 *   npm run db:seed:platform
 *   node scripts/seed/seed.platform.postgres.js
 *
 * Requires DATABASE_URL + migrations applied.
 */
require('../../src/alias-bootstrap');
require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is required.');
  process.exit(1);
}

const crypto = require('crypto');
const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const { query } = require('@/providers/database/postgres.client');
const venueRepo = require('@/providers/database/venue.repository');
const eventRepo = require('@/providers/database/event.repository');
const { LIFECYCLE, STATUS, VISIBILITY } = require('@/modules/events/domain/event-lifecycle');

const PASSWORD = '123456';

// ─── Helpers ───────────────────────────────────────────────────────────────
const day = (n) => Date.now() + n * 24 * 60 * 60 * 1000;
const hours = (n) => n * 60 * 60 * 1000;

async function upsertAuthUser({ id, email, name, roles }) {
  const passwordHash = await backendAuthProvider.hashPassword(PASSWORD);
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
    /* optional RBAC junction */
  }
  return userId;
}

async function upsertOrganizerProfile(userId, { companyName, description, website }) {
  const orgId = `org_${userId}`.slice(0, 64);
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
    // Some schemas use id as PK only
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

// ─── Domain data (Vietnam event marketplace) ───────────────────────────────
const USERS = [
  {
    id: 'plat_admin_01',
    email: 'admin@eventing.com',
    name: 'Platform Admin',
    roles: ['admin'],
  },
  {
    id: 'plat_org_saigon',
    email: 'organizer@eventing.com',
    name: 'Saigon Live Events',
    roles: ['organizer'],
    org: {
      companyName: 'Saigon Live Events Co., Ltd',
      description:
        'Organizer sự kiện âm nhạc & hội nghị tại TP.HCM. Hợp tác Ticketbox / sân khấu lớn.',
      website: 'https://saigonlive.example',
    },
  },
  {
    id: 'plat_org_hanoi',
    email: 'hanoi.events@eventing.com',
    name: 'Hanoi Stage Productions',
    roles: ['organizer'],
    org: {
      companyName: 'Hanoi Stage Productions',
      description: 'Festival EDM, hội thảo tech và show indoor tại Hà Nội.',
      website: 'https://hanoistage.example',
    },
  },
  {
    id: 'plat_user_an',
    email: 'nguyen.an@email.com',
    name: 'Nguyễn Minh An',
    roles: ['user'],
  },
  {
    id: 'plat_user_linh',
    email: 'tran.linh@email.com',
    name: 'Trần Khánh Linh',
    roles: ['user'],
  },
  {
    id: 'plat_user_hung',
    email: 'le.hung@email.com',
    name: 'Lê Quốc Hùng',
    roles: ['user'],
  },
  // Keep alice alias for existing demos
  {
    id: 'plat_user_alice',
    email: 'alice@email.com',
    name: 'Alice Nguyễn',
    roles: ['user'],
  },
];

const VENUES = [
  {
    id: 'venue_gem_center',
    name: 'GEM Center',
    address: '8 Nguyễn Bỉnh Khiêm, Đa Kao, Quận 1',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    country: 'VN',
    lat: 10.790167,
    lng: 106.70234,
    capacity: 1000,
  },
  {
    id: 'venue_mydinh_stadium',
    name: 'Sân vận động Quốc gia Mỹ Đình',
    address: 'Lê Đức Thọ, Mỹ Đình 1, Nam Từ Liêm',
    city: 'Hà Nội',
    district: 'Nam Từ Liêm',
    country: 'VN',
    lat: 21.0207,
    lng: 105.7623,
    capacity: 40000,
  },
  {
    id: 'venue_trungvuong_theatre',
    name: 'Nhà hát Trưng Vương',
    address: '86 Hùng Vương, Hải Châu',
    city: 'Đà Nẵng',
    district: 'Hải Châu',
    country: 'VN',
    lat: 16.06877,
    lng: 108.22074,
    capacity: 1200,
  },
  {
    id: 'venue_diamond_place',
    name: 'Diamond Place Convention Center',
    address: '16 Phan Văn Trị, Gò Vấp',
    city: 'Hồ Chí Minh',
    district: 'Gò Vấp',
    country: 'VN',
    lat: 10.80087,
    lng: 106.67544,
    capacity: 2500,
  },
  {
    id: 'venue_nha_hat_lon_hn',
    name: 'Nhà hát Lớn Hà Nội',
    address: '1 Tràng Tiền, Hoàn Kiếm',
    city: 'Hà Nội',
    district: 'Hoàn Kiếm',
    country: 'VN',
    lat: 21.0245,
    lng: 105.8576,
    capacity: 900,
  },
  {
    id: 'venue_secc',
    name: 'SECC – Trung tâm Hội chợ & Triển lãm Sài Gòn',
    address: '799 Nguyễn Văn Linh, Tân Phú, Quận 7',
    city: 'Hồ Chí Minh',
    district: 'Quận 7',
    country: 'VN',
    lat: 10.7295,
    lng: 106.7205,
    capacity: 10000,
  },
  {
    id: 'venue_bitexco',
    name: 'Bitexco Financial Tower – Sky Deck Event',
    address: '2 Hải Triều, Bến Nghé, Quận 1',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    country: 'VN',
    lat: 10.7716,
    lng: 106.7043,
    capacity: 300,
  },
];

const FEATURED = [
  {
    id: 'fp_ravolution_djs',
    name: 'Ravolution Line-up',
    type: 'artist',
    bio: 'Dàn DJ quốc tế & Việt Nam cho festival EDM.',
    avatarUrl: 'https://images.unsplash.com/photo-1571266028247-e673f0d1f1c2?w=400&q=80',
  },
  {
    id: 'fp_google_experts',
    name: 'Google Developer Experts VN',
    type: 'speaker',
    bio: 'Chuyên gia Android, Cloud, AI tại Việt Nam.',
    avatarUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
  },
  {
    id: 'fp_tedx_speakers',
    name: 'TEDx Speakers',
    type: 'speaker',
    bio: 'Diễn giả TEDx với các ý tưởng đáng lan tỏa.',
    avatarUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&q=80',
  },
  {
    id: 'fp_indie_vn',
    name: 'Indie Việt Line-up',
    type: 'artist',
    bio: 'Nghệ sĩ indie / alternative Việt Nam.',
    avatarUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
  },
];

function buildEvents(orgSaigon, orgHanoi) {
  const img = {
    concert: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80',
    tech: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
    food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80',
    theater: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&q=80',
    outdoor: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80',
    business: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80',
  };

  return [
    {
      id: 'evt_devfest_hcm_2026',
      name: 'Vietnam Developer Festival 2026',
      description:
        'Hội nghị lập trình viên lớn tại TP.HCM: AI, Cloud, Mobile, Web. Keynote từ Google Developer Experts, workshop hands-on, networking với 2000+ dev.',
      category: ['conference', 'tech'],
      tags: ['devfest', 'ai', 'cloud', 'developer'],
      date: day(21),
      endDate: day(21) + hours(10),
      location: { latitude: 10.80087, longitude: 106.67544 },
      venueId: 'venue_diamond_place',
      venueName: 'Diamond Place Convention Center',
      city: 'Hồ Chí Minh',
      eventType: 'physical',
      ticketTypes: {
        EarlyBird: { price: 700000, quantity: 300, available: 180, name: 'Early Bird' },
        Standard: { price: 1200000, quantity: 800, available: 620, name: 'Standard' },
        VIP: { price: 2500000, quantity: 100, available: 70, name: 'VIP' },
      },
      minPrice: 700000,
      isOutdoor: false,
      organizerId: orgSaigon,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 96,
      viewCount: 18420,
      requiredAge: 0,
      imageUrl: img.tech,
      bannerUrl: img.tech,
      featuredProfileIds: ['fp_google_experts'],
      sponsors: [{ name: 'Google for Developers', level: 'platinum' }],
    },
    {
      id: 'evt_ravolution_hn_2026',
      name: 'Ravolution Music Festival — Hà Nội',
      description:
        'Đêm nhạc điện tử ngoài trời tại Mỹ Đình. Line-up DJ quốc tế & Việt Nam, stage production chuẩn festival châu Á.',
      category: ['music', 'festival'],
      tags: ['edm', 'rave', 'festival', 'hanoi'],
      date: day(45),
      endDate: day(45) + hours(8),
      location: { latitude: 21.0207, longitude: 105.7623 },
      venueId: 'venue_mydinh_stadium',
      venueName: 'Sân vận động Quốc gia Mỹ Đình',
      city: 'Hà Nội',
      eventType: 'physical',
      ticketTypes: {
        GA: { price: 950000, quantity: 15000, available: 8200, name: 'General Admission' },
        VIP: { price: 2800000, quantity: 1500, available: 900, name: 'VIP' },
      },
      minPrice: 950000,
      isOutdoor: true,
      organizerId: orgHanoi,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 99,
      viewCount: 52000,
      requiredAge: 18,
      imageUrl: img.concert,
      bannerUrl: img.outdoor,
      featuredProfileIds: ['fp_ravolution_djs'],
    },
    {
      id: 'evt_tedx_danang_2026',
      name: 'TEDx Da Nang: Bridges',
      description:
        'Những câu chuyện kết nối cộng đồng, công nghệ và văn hóa. Sân khấu TED-style tại Nhà hát Trưng Vương.',
      category: ['conference', 'inspiration'],
      tags: ['tedx', 'danang', 'ideas'],
      date: day(30),
      endDate: day(30) + hours(6),
      location: { latitude: 16.06877, longitude: 108.22074 },
      venueId: 'venue_trungvuong_theatre',
      venueName: 'Nhà hát Trưng Vương',
      city: 'Đà Nẵng',
      eventType: 'physical',
      ticketTypes: {
        Standard: { price: 450000, quantity: 400, available: 120, name: 'Standard' },
      },
      minPrice: 450000,
      isOutdoor: false,
      organizerId: orgSaigon,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 82,
      viewCount: 6400,
      requiredAge: 0,
      imageUrl: img.theater,
      bannerUrl: img.theater,
      featuredProfileIds: ['fp_tedx_speakers'],
    },
    {
      id: 'evt_foodfest_sg_2026',
      name: 'Saigon International Food Fest',
      description:
        'Lễ hội ẩm thực quốc tế: 80+ gian hàng, cooking show, craft beer & street food châu Á.',
      category: ['food', 'festival'],
      tags: ['food', 'saigon', 'streetfood'],
      date: day(14),
      endDate: day(16),
      location: { latitude: 10.7295, longitude: 106.7205 },
      venueId: 'venue_secc',
      venueName: 'SECC – Trung tâm Hội chợ & Triển lãm Sài Gòn',
      city: 'Hồ Chí Minh',
      eventType: 'physical',
      ticketTypes: {
        DayPass: { price: 150000, quantity: 5000, available: 3100, name: 'Day pass' },
        Weekend: { price: 350000, quantity: 2000, available: 1400, name: 'Weekend pass' },
      },
      minPrice: 150000,
      isOutdoor: false,
      organizerId: orgSaigon,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 88,
      viewCount: 22100,
      requiredAge: 0,
      imageUrl: img.food,
      bannerUrl: img.food,
    },
    {
      id: 'evt_symphony_hn_2026',
      name: 'Đêm nhạc giao hưởng: Classica Hà Nội',
      description:
        'Chương trình giao hưởng cổ điển tại Nhà hát Lớn Hà Nội — Beethoven & Tchaikovsky.',
      category: ['music', 'classical'],
      tags: ['orchestra', 'hanoi', 'opera house'],
      date: day(28),
      endDate: day(28) + hours(3),
      location: { latitude: 21.0245, longitude: 105.8576 },
      venueId: 'venue_nha_hat_lon_hn',
      venueName: 'Nhà hát Lớn Hà Nội',
      city: 'Hà Nội',
      eventType: 'physical',
      ticketTypes: {
        Balcony: { price: 400000, quantity: 200, available: 90, name: 'Balcony' },
        Stall: { price: 900000, quantity: 300, available: 140, name: 'Stall' },
        VIP: { price: 1800000, quantity: 80, available: 35, name: 'VIP Box' },
      },
      minPrice: 400000,
      isOutdoor: false,
      organizerId: orgHanoi,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 75,
      viewCount: 4100,
      requiredAge: 0,
      imageUrl: img.theater,
      bannerUrl: img.theater,
    },
    {
      id: 'evt_startup_summit_sg',
      name: 'Saigon Startup Summit 2026',
      description:
        'Hội nghị startup & venture: pitch session, demo day, fireside với quỹ đầu tư Đông Nam Á.',
      category: ['business', 'conference'],
      tags: ['startup', 'venture', 'networking'],
      date: day(35),
      endDate: day(36),
      location: { latitude: 10.790167, longitude: 106.70234 },
      venueId: 'venue_gem_center',
      venueName: 'GEM Center',
      city: 'Hồ Chí Minh',
      eventType: 'physical',
      ticketTypes: {
        Founder: { price: 1500000, quantity: 400, available: 260, name: 'Founder' },
        Investor: { price: 0, quantity: 80, available: 40, name: 'Investor (invite)' },
      },
      minPrice: 0,
      isOutdoor: false,
      organizerId: orgSaigon,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 90,
      viewCount: 9800,
      requiredAge: 0,
      imageUrl: img.business,
      bannerUrl: img.business,
    },
    {
      id: 'evt_indie_night_gem',
      name: 'Indie Night Saigon — Live at GEM',
      description:
        'Đêm nhạc indie Việt: acoustic & full band. Hỗ trợ nghệ sĩ mới nổi + headliner indie.',
      category: ['music'],
      tags: ['indie', 'live', 'saigon'],
      date: day(10),
      endDate: day(10) + hours(5),
      location: { latitude: 10.790167, longitude: 106.70234 },
      venueId: 'venue_gem_center',
      venueName: 'GEM Center',
      city: 'Hồ Chí Minh',
      eventType: 'physical',
      ticketTypes: {
        Standing: { price: 350000, quantity: 600, available: 220, name: 'Standing' },
        Seated: { price: 550000, quantity: 200, available: 80, name: 'Seated' },
      },
      minPrice: 350000,
      isOutdoor: false,
      organizerId: orgSaigon,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 84,
      viewCount: 7600,
      requiredAge: 16,
      imageUrl: img.concert,
      bannerUrl: img.concert,
      featuredProfileIds: ['fp_indie_vn'],
    },
    {
      id: 'evt_sky_networking',
      name: 'Skyline Founders Networking',
      description:
        'Networking exclusive trên không gian event Bitexco — founders, PMs, designers.',
      category: ['networking', 'business'],
      tags: ['networking', 'founders', 'bitexco'],
      date: day(7),
      endDate: day(7) + hours(3),
      location: { latitude: 10.7716, longitude: 106.7043 },
      venueId: 'venue_bitexco',
      venueName: 'Bitexco Financial Tower – Sky Deck Event',
      city: 'Hồ Chí Minh',
      eventType: 'physical',
      ticketTypes: {
        Guest: { price: 800000, quantity: 120, available: 45, name: 'Guest' },
      },
      minPrice: 800000,
      isOutdoor: false,
      organizerId: orgSaigon,
      status: STATUS.ACTIVE,
      lifecycleStatus: LIFECYCLE.PUBLISHED,
      visibility: VISIBILITY.PUBLIC,
      hotScore: 70,
      viewCount: 2100,
      requiredAge: 21,
      imageUrl: img.business,
      bannerUrl: img.business,
    },
    // Pending review — for admin moderation queue
    {
      id: 'evt_pending_yoga_sg',
      name: 'Sunrise Yoga by the River',
      description: 'Buổi yoga ngoài trời ven sông Sài Gòn — đăng ký chờ duyệt nền tảng.',
      category: ['wellness', 'sports'],
      tags: ['yoga', 'outdoor'],
      date: day(20),
      endDate: day(20) + hours(2),
      location: { latitude: 10.7716, longitude: 106.7043 },
      venueName: 'Bạch Đằng Wharf',
      city: 'Hồ Chí Minh',
      eventType: 'physical',
      ticketTypes: {
        DropIn: { price: 200000, quantity: 80, available: 80, name: 'Drop-in' },
      },
      minPrice: 200000,
      isOutdoor: true,
      organizerId: orgSaigon,
      status: STATUS.PENDING,
      lifecycleStatus: LIFECYCLE.SUBMITTED,
      visibility: VISIBILITY.PRIVATE,
      hotScore: 10,
      viewCount: 40,
      requiredAge: 0,
      imageUrl: img.outdoor,
      bannerUrl: img.outdoor,
    },
  ];
}

const PROMOS = [
  {
    id: 'promo_early_devfest',
    code: 'DEVFEST10',
    name: 'DevFest 10% off',
    discountType: 'percent',
    discountValue: 10,
    eventId: 'evt_devfest_hcm_2026',
  },
  {
    id: 'promo_food_weekend',
    code: 'FOODFEST50K',
    name: 'Food Fest 50k off',
    discountType: 'fixed',
    discountValue: 50000,
    eventId: 'evt_foodfest_sg_2026',
  },
];

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
  console.log(`  featured profiles: ${FEATURED.length}`);
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
          p.usageLimit || 500,
          JSON.stringify(data),
          p.discountType,
          p.discountValue,
        ]
      );
    } catch (e) {
      console.warn(`[promo] skip ${p.id}: ${e.message}`);
    }
  }
  console.log(`  promotions: ${PROMOS.length}`);
}

async function main() {
  console.log('\n=== Platform seed (real marketplace data) ===\n');

  // 1) Users
  console.log('[1/5] Auth users & profiles…');
  const ids = {};
  for (const u of USERS) {
    const uid = await upsertAuthUser(u);
    ids[u.email] = uid;
    if (u.org) {
      await upsertOrganizerProfile(uid, u.org);
    }
    console.log(`  · ${u.roles.join('+')}  ${u.email}`);
  }
  const orgSaigon = ids['organizer@eventing.com'];
  const orgHanoi = ids['hanoi.events@eventing.com'];

  // 2) Venues
  console.log('[2/5] Venues…');
  for (const v of VENUES) {
    await venueRepo.createVenue(v.id, v);
  }
  console.log(`  venues: ${VENUES.length}`);

  // 3) Featured
  console.log('[3/5] Featured profiles…');
  await seedFeatured();

  // 4) Events
  console.log('[4/5] Events (published + 1 pending)…');
  const events = buildEvents(orgSaigon, orgHanoi);
  for (const e of events) {
    e.createdAt = Date.now() - 7 * 24 * 60 * 60 * 1000;
    e.lastUpdatedAt = Date.now();
    await eventRepo.createEvent(e.id, e);
    console.log(`  · ${e.lifecycleStatus || e.status}  ${e.name}`);
  }

  // 5) Promotions
  console.log('[5/5] Promotions…');
  await seedPromotions(orgSaigon);

  console.log('\n--- Login accounts (password: 123456) ---');
  console.log('| Role      | Email                      |');
  console.log('|-----------|----------------------------|');
  console.log('| Admin     | admin@eventing.com         |');
  console.log('| Organizer | organizer@eventing.com     |  (Saigon Live)');
  console.log('| Organizer | hanoi.events@eventing.com  |');
  console.log('| Attendee  | nguyen.an@email.com        |');
  console.log('| Attendee  | tran.linh@email.com        |');
  console.log('| Attendee  | alice@email.com            |');
  console.log('\nPublic events: home / search. Pending: admin moderation queue.');
  console.log('Tip: set ADMIN_UID=plat_admin_01 (or admin user id) in server/.env\n');
  console.log('Done.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Platform seed failed:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
