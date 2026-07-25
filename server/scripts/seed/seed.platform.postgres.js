/**
 * Platform Seed — Realistic Vietnam Event-Marketplace Data for Portfolio Demo.
 *
 * Seeds:
 *  - 16 Auth Users (admin, organizers, attendees) with password `123456`
 *  - 5 Organizer Profiles
 *  - 22 Real-world Vietnam Venues (Hanoi, HCMC, Da Nang, Hue, Can Tho, etc.)
 *  - 1 Seat Map with 3 Sections and 120 Seats
 *  - 6 Featured Profiles (artists, speakers, athletes)
 *  - 50 Published Future Public Events (10 Music, 10 Theater/Arts, 10 Tech/Workshop, 10 Sports, 10 Exhibition)
 *  - Event Ticket Types with VND prices
 *  - 5 Promotion Vouchers
 *  - 15 Reviews with ratings & Vietnamese comments
 *  - 15 Event Media Gallery items with licensing attribution metadata
 *
 * Usage (from server/):
 *   node scripts/seed/seed.platform.postgres.js
 *   npm run db:seed:platform
 */
require('../../src/alias-bootstrap');
require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is required.');
  process.exit(1);
}

const { query } = require('@/providers/database/postgres.client');
const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const { STATUS, VISIBILITY, LIFECYCLE } = require('@/modules/events/domain/event-lifecycle');

const PASSWORD = '123456';
const DISCLAIMER = '\n\n[LƯU Ý DEMO]: Sự kiện giả định phục vụ thử nghiệm hệ thống portfolio demo. Không đại diện hay có liên kết chính thức với bất kỳ thương hiệu hoặc đơn vị tổ chức thực tế nào. Hình ảnh được sử dụng theo Unsplash / Pexels License.';

// ─── Helpers ───────────────────────────────────────────────────────────────
const dayMs = 24 * 60 * 60 * 1000;
const futureDate = (offsetDays, hoursAdd = 19) => {
  const d = new Date(Date.now() + offsetDays * dayMs);
  d.setHours(hoursAdd, 0, 0, 0);
  return d;
};

// ─── Main Seeder ───────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== Starting Deterministic Vietnam Portfolio Demo Seed ===\n');

  const passwordHash = await backendAuthProvider.hashPassword(PASSWORD);

  // 1. Seed Auth Users & Profiles
  console.log('1. Seeding Demo Users & Profiles...');
  const users = [
    { id: 'demo_user_admin', email: 'admin@eventing.moteo.fun', name: 'Quản Trị Viên Demo', roles: ['admin'] },
    { id: 'demo_user_org_01', email: 'organizer@eventing.moteo.fun', name: 'Ban Tổ Chức Sự Kiện Hà Nội', roles: ['organizer'] },
    { id: 'demo_user_org_02', email: 'organizer1@demo.eventing.moteo.fun', name: 'Sài Gòn Music & Entertainment', roles: ['organizer'] },
    { id: 'demo_user_org_03', email: 'organizer2@demo.eventing.moteo.fun', name: 'Đà Nẵng Tech Community', roles: ['organizer'] },
    { id: 'demo_user_org_04', email: 'organizer3@demo.eventing.moteo.fun', name: 'CLB Thể Thao & Văn Hóa Việt', roles: ['organizer'] },
    { id: 'demo_user_org_05', email: 'organizer4@demo.eventing.moteo.fun', name: 'Hội Nghệ Thuật & Triển Lãm', roles: ['organizer'] },
    { id: 'demo_user_att_01', email: 'attendee@eventing.moteo.fun', name: 'Nguyễn Văn An', roles: ['attendee'] },
    { id: 'demo_user_att_02', email: 'attendee1@demo.eventing.moteo.fun', name: 'Trần Thị Bình', roles: ['attendee'] },
    { id: 'demo_user_att_03', email: 'attendee2@demo.eventing.moteo.fun', name: 'Lê Hoàng Cường', roles: ['attendee'] },
    { id: 'demo_user_att_04', email: 'attendee3@demo.eventing.moteo.fun', name: 'Phạm Minh Đức', roles: ['attendee'] },
    { id: 'demo_user_att_05', email: 'attendee4@demo.eventing.moteo.fun', name: 'Vũ Thu Giang', roles: ['attendee'] },
    { id: 'demo_user_att_06', email: 'attendee5@demo.eventing.moteo.fun', name: 'Hoàng Quốc Khánh', roles: ['attendee'] },
    { id: 'demo_user_att_07', email: 'attendee6@demo.eventing.moteo.fun', name: 'Đỗ Phương Linh', roles: ['attendee'] },
    { id: 'demo_user_att_08', email: 'attendee7@demo.eventing.moteo.fun', name: 'Ngô Thanh Nam', roles: ['attendee'] },
    { id: 'demo_user_att_09', email: 'attendee8@demo.eventing.moteo.fun', name: 'Bùi Hồng Phúc', roles: ['attendee'] },
    { id: 'demo_user_att_10', email: 'attendee9@demo.eventing.moteo.fun', name: 'Đặng Ngọc Quỳnh', roles: ['attendee'] },
  ];

  for (const u of users) {
    await query(
      `INSERT INTO auth_users (id, email, password_hash, roles, is_active, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
         roles = EXCLUDED.roles, is_active = true, email_verified = true, updated_at = NOW()`,
      [u.id, u.email, passwordHash, u.roles]
    );

    await query(
      `INSERT INTO user_profiles (id, name, profile_pic_url, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
      [u.id, u.name, `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`]
    );
  }

  // 2. Seed Organizer Profiles
  console.log('2. Seeding Organizer Profiles...');
  const organizers = [
    { id: 'demo_org_prof_01', userId: 'demo_user_org_01', company: 'Hanoi Event Association', desc: 'Đơn vị tổ chức sự kiện âm nhạc và văn hóa hàng đầu tại Hà Nội.', web: 'https://hanoievents.demo' },
    { id: 'demo_org_prof_02', userId: 'demo_user_org_02', company: 'Saigon Live Entertainment', desc: 'Chuyên tổ chức hòa nhạc, festival và chương trình giải trí sôi động.', web: 'https://saigonlive.demo' },
    { id: 'demo_org_prof_03', userId: 'demo_user_org_03', company: 'Vietnam Tech Network', desc: 'Kết nối cộng đồng công nghệ, tổ chức workshop và hội thảo công nghệ quốc tế.', web: 'https://vietnamtech.demo' },
    { id: 'demo_org_prof_04', userId: 'demo_user_org_04', company: 'VN Sports Alliance', desc: 'Đơn vị đồng hành cùng các giải đấu thể thao chuyên nghiệp và phong trào.', web: 'https://vnsports.demo' },
    { id: 'demo_org_prof_05', userId: 'demo_user_org_05', company: 'Art & Design House Vietnam', desc: 'Không gian sáng tạo, triển lãm nghệ thuật đương đại và sự kiện thiết kế.', web: 'https://artdesignhouse.demo' },
  ];

  for (const org of organizers) {
    await query(
      `INSERT INTO organizer_profiles (id, user_id, company_name, description, website, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         company_name = EXCLUDED.company_name, description = EXCLUDED.description,
         website = EXCLUDED.website, status = 'active', updated_at = NOW()`,
      [org.id, org.userId, org.company, org.desc, org.web]
    );
  }

  // 3. Seed 22 Venues across Vietnam
  console.log('3. Seeding 22 Venues across Vietnam...');
  const venuesData = [
    { id: 'demo_venue_01', name: 'Nhà Hát Lớn Hà Nội', address: '01 Tràng Tiền, Phường Tràng Tiền', district: 'Quận Hoàn Kiếm', city: 'Hà Nội', lat: 21.0243, lng: 105.8576, capacity: 600, seatMapId: 'demo_seatmap_01' },
    { id: 'demo_venue_02', name: 'Nhà Hát Thành Phố Hồ Chí Minh', address: '07 Công Trường Lam Sơn, Bến Nghé', district: 'Quận 1', city: 'Hồ Chí Minh', lat: 10.7766, lng: 106.7032, capacity: 500 },
    { id: 'demo_venue_03', name: 'Nhà Hát Hòa Bình', address: '240 Đường 3 Tháng 2, Phường 12', district: 'Quận 10', city: 'Hồ Chí Minh', lat: 10.7725, lng: 106.6698, capacity: 2500 },
    { id: 'demo_venue_04', name: 'Cung Điền Kinh Mỹ Đình', address: 'Đường Tân Mỹ, Phường Mỹ Đình 1', district: 'Quận Nam Từ Liêm', city: 'Hà Nội', lat: 21.0185, lng: 105.7652, capacity: 3000 },
    { id: 'demo_venue_05', name: 'Trung Tâm Hội Chợ Triển Lãm Đà Nẵng', address: '09 Cách Mạng Tháng 8, Phường Khuê Trung', district: 'Quận Cẩm Lệ', city: 'Đà Nẵng', lat: 16.0354, lng: 108.2104, capacity: 4000 },
    { id: 'demo_venue_06', name: 'Nhà Hát Duyệt Thị Đường - Cố Đô Huế', address: 'Đại Nội Huế, Phường Thuận Thành', district: 'Thành phố Huế', city: 'Thừa Thiên Huế', lat: 16.4693, lng: 107.5794, capacity: 350 },
    { id: 'demo_venue_07', name: 'Trung Tâm Hội Nghị Cần Thơ', address: '109 KĐT Mới Hưng Phú', district: 'Quận Cái Răng', city: 'Cần Thơ', lat: 10.0192, lng: 105.7765, capacity: 1200 },
    { id: 'demo_venue_08', name: 'Trung Tâm Hội Nghị Nha Trang', address: '46 Trần Phú, Phường Lộc Thọ', district: 'Thành phố Nha Trang', city: 'Khánh Hòa', lat: 12.2388, lng: 109.1961, capacity: 1500 },
    { id: 'demo_venue_09', name: 'Sân Vận Động Quân Khu 7', address: '202 Hoàng Văn Thụ, Phường 9', district: 'Quận Phú Nhuận', city: 'Hồ Chí Minh', lat: 10.8035, lng: 106.6664, capacity: 15000 },
    { id: 'demo_venue_10', name: 'Trung Tâm Triển Lãm Nghệ Thuật Đà Lạt', address: '01 Đường Trần Quốc Toản, Phường 1', district: 'Thành phố Đà Lạt', city: 'Lâm Đồng', lat: 11.9404, lng: 108.4379, capacity: 800 },
    { id: 'demo_venue_11', name: 'Nhà Hát Lớn Hải Phòng', address: '28 Phố Hoàng Văn Thụ, Phường Quang Trung', district: 'Quận Hồng Bàng', city: 'Hải Phòng', lat: 20.8601, lng: 106.6822, capacity: 650 },
    { id: 'demo_venue_12', name: 'Nhà Thi Đấu Nguyễn Du', address: '116 Nguyễn Du, Phường Bến Thành', district: 'Quận 1', city: 'Hồ Chí Minh', lat: 10.7741, lng: 106.6923, capacity: 3000 },
    { id: 'demo_venue_13', name: 'Trung Tâm Hội Nghị Quốc Gia', address: '57 Phạm Hùng, Phường Mễ Trì', district: 'Quận Nam Từ Liêm', city: 'Hà Nội', lat: 21.0069, lng: 105.7865, capacity: 3800 },
    { id: 'demo_venue_14', name: 'Trung Tâm Hội Chợ & Triển Lãm Sài Gòn (SECC)', address: '799 Nguyễn Văn Linh, Phường Tân Phú', district: 'Quận 7', city: 'Hồ Chí Minh', lat: 10.7303, lng: 106.7214, capacity: 5000 },
    { id: 'demo_venue_15', name: 'Nhà Hát Trưng Vương Đà Nẵng', address: '86 Hùng Vương, Phường Hải Châu 1', district: 'Quận Hải Châu', city: 'Đà Nẵng', lat: 16.0683, lng: 108.2209, capacity: 1200 },
    { id: 'demo_venue_16', name: 'Nhà Văn Hóa Thanh Niên TP.HCM', address: '04 Phạm Ngọc Thạch, Phường Bến Nghé', district: 'Quận 1', city: 'Hồ Chí Minh', lat: 10.7828, lng: 106.6974, capacity: 1800 },
    { id: 'demo_venue_17', name: 'Cung Văn Hóa Hữu Nghị Việt Xô', address: '91 Trần Hưng Đạo, Phường Trần Hưng Đạo', district: 'Quận Hoàn Kiếm', city: 'Hà Nội', lat: 21.0224, lng: 105.8449, capacity: 1100 },
    { id: 'demo_venue_18', name: 'Trung Tâm Hội Nghị Quy Nhơn', address: '01 Nguyễn Tất Thành, Phường Lý Thường Kiệt', district: 'Thành phố Quy Nhơn', city: 'Bình Định', lat: 13.7749, lng: 109.2235, capacity: 900 },
    { id: 'demo_venue_19', name: 'Trung Tâm Sự Kiện Vũng Tàu', address: '02 Thi Sách, Phường Thắng Tam', district: 'Thành phố Vũng Tàu', city: 'Bà Rịa - Vũng Tàu', lat: 10.3541, lng: 107.0863, capacity: 1400 },
    { id: 'demo_venue_20', name: 'Trung Tâm Văn Hóa Phan Thiết', address: '15 Nguyễn Tất Thành, Phường Bình Hưng', district: 'Thành phố Phan Thiết', city: 'Bình Thuận', lat: 10.9332, lng: 108.1002, capacity: 750 },
    { id: 'demo_venue_21', name: 'Công Viên Sự Kiện Buôn Ma Thuột', address: '01 Lê Duẩn, Phường Tân Tiến', district: 'Thành phố Buôn Ma Thuột', city: 'Đắk Lắk', lat: 12.6784, lng: 108.0383, capacity: 2000 },
    { id: 'demo_venue_22', name: 'Trung Tâm Hội Nghị Quốc Tế Phú Quốc', address: 'Khu Bãi Dài, Phước Gành', district: 'Thành phố Phú Quốc', city: 'Kiên Giang', lat: 10.3275, lng: 103.8569, capacity: 1500 },
  ];

  for (const v of venuesData) {
    const bag = { seatMapId: v.seatMapId || null, description: `Địa điểm sự kiện quy mô ${v.capacity} chỗ ngồi tại ${v.city}.` };
    await query(
      `INSERT INTO venues (id, name, data, address, city, district, country, lat, lng, capacity, created_at)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, 'VN', $7, $8, $9, NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, data = EXCLUDED.data, address = EXCLUDED.address,
         city = EXCLUDED.city, district = EXCLUDED.district, country = 'VN',
         lat = EXCLUDED.lat, lng = EXCLUDED.lng, capacity = EXCLUDED.capacity`,
      [v.id, v.name, JSON.stringify(bag), v.address, v.city, v.district, v.lat, v.lng, v.capacity]
    );
  }

  // 4. Seed Seat Map & Sections & Seats
  console.log('4. Seeding Seat Map & Seats for Seat-Map-Ready Event...');
  await query(
    `INSERT INTO seat_maps (id, name, total_rows, total_cols, created_at)
     VALUES ('demo_seatmap_01', 'Sơ Đồ Ghế Nhà Hát Lớn Hà Nội', 10, 12, NOW())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, total_rows = 10, total_cols = 12`
  );

  const sections = [
    { id: 'demo_sec_vip', mapId: 'demo_seatmap_01', name: 'Khu Vực VIP Front', mult: 1.5 },
    { id: 'demo_sec_std', mapId: 'demo_seatmap_01', name: 'Khu Vực Standard', mult: 1.0 },
    { id: 'demo_sec_balcony', mapId: 'demo_seatmap_01', name: 'Khu Vực Tầng Tầng Tầng Tầng Balcony', mult: 0.8 },
  ];

  for (const sec of sections) {
    await query(
      `INSERT INTO seat_sections (id, seat_map_id, name, price_multiplier, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_multiplier = EXCLUDED.price_multiplier`,
      [sec.id, sec.mapId, sec.name, sec.mult]
    );
  }

  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  for (let rIdx = 0; rIdx < rowLetters.length; rIdx++) {
    const rowName = rowLetters[rIdx];
    const secId = rIdx < 3 ? 'demo_sec_vip' : (rIdx < 7 ? 'demo_sec_std' : 'demo_sec_balcony');
    for (let sNum = 1; sNum <= 12; sNum++) {
      const seatId = `demo_seat_${rowName}_${sNum}`;
      await query(
        `INSERT INTO seats (id, seat_section_id, row_name, seat_number, status, created_at)
         VALUES ($1, $2, $3, $4, 'available', NOW())
         ON CONFLICT (id) DO UPDATE SET status = 'available'`,
        [seatId, secId, rowName, sNum]
      );
    }
  }

  // 5. Seed Featured Profiles
  console.log('5. Seeding Featured Profiles...');
  const featProfiles = [
    { id: 'demo_feat_01', name: 'Sơn Tùng M-TP', type: 'artist', bio: 'Ca sĩ, nhạc sĩ nhạc pop hàng đầu Việt Nam.', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', genres: ['V-Pop', 'Dance'], count: 5000000 },
    { id: 'demo_feat_02', name: 'Mỹ Tâm', type: 'artist', bio: 'Nữ ca sĩ hàng đầu nền âm nhạc Việt Nam.', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', genres: ['Pop', 'Ballad'], count: 4200000 },
    { id: 'demo_feat_03', name: 'NSƯT Thành Lộc', type: 'artist', bio: 'Nghệ sĩ kịch nói tài năng và kỳ cựu.', img: 'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?w=400', genres: ['Kịch Nói', 'Sân Khấu'], count: 1200000 },
    { id: 'demo_feat_04', name: 'GS. Ngô Bảo Châu', type: 'speaker', bio: 'Nhà toán học nổi tiếng thế giới, Huy chương Fields 2010.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', genres: ['Khoa Học', 'Giáo Dục'], count: 850000 },
    { id: 'demo_feat_05', name: 'VĐV Nguyễn Thị Oanh', type: 'athlete', bio: 'Vận động viên điền kinh Vàng SEA Games.', img: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400', genres: ['Điền Kinh', 'Thể Thao'], count: 620000 },
    { id: 'demo_feat_06', name: 'Họa Sĩ Trần Văn Cẩn', type: 'artist', bio: 'Danh họa mỹ thuật hiện đại Việt Nam.', img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400', genres: ['Mỹ Thuật', 'Triển Lãm'], count: 410000 },
  ];

  for (const fp of featProfiles) {
    await query(
      `INSERT INTO featured_profiles (id, name, profile_type, bio, image_url, genres, follower_count, owner_user_id, raw_data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, null, $8::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, profile_type = EXCLUDED.profile_type, bio = EXCLUDED.bio,
         image_url = EXCLUDED.image_url, genres = EXCLUDED.genres, follower_count = EXCLUDED.follower_count,
         raw_data = EXCLUDED.raw_data, updated_at = NOW()`,
      [fp.id, fp.name, fp.type, fp.bio, fp.img, fp.genres, fp.count, JSON.stringify(fp)]
    );
  }

  // 6. Seed 50 Published Future Public Events (10 per category)
  console.log('6. Seeding 50 Published Future Public Events...');

  const categoryConfigs = [
    {
      cat: 'music',
      label: 'Âm Nhạc',
      titlePrefixes: ['Đêm Nhạc Acoustics', 'Concert Âm Nhạc Mùa Hè', 'Symphony Orchestral Gala', 'Festival V-Pop Alive', 'Liveshow Giai Điệu Mới', 'Đêm Nhạc Trịnh Công Sơn', 'Hòa Nhạc Tháp Rùa', 'Saigon Sunset Jazz', 'Mộc Acoustic Night', 'Việt Nam Rock Fest'],
      imgs: [
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800',
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
        'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800',
      ],
      orgId: 'demo_user_org_01',
    },
    {
      cat: 'theater',
      label: 'Sân Khấu / Nghệ Thuật',
      titlePrefixes: ['Vở Kịch Kinh Điển', 'Đêm Nhạc Kịch Sài Gòn', 'Kịch Nói Dân Gian', 'Múa Đương Đại Việt Nam', 'Tuồng Cổ Hào Khí', 'Múa Rối Nước Dân Gian', 'Sân Khấu Cải Lương Mới', 'Hài Kịch Mùa Cười', 'Vở Diễn Hồn Trống Đồng', 'Show Diễn Ký Ức Việt'],
      imgs: [
        'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?w=800',
        'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800',
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
        'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=800',
        'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800',
      ],
      orgId: 'demo_user_org_02',
    },
    {
      cat: 'workshop',
      label: 'Hội Thảo / Công Nghệ',
      titlePrefixes: ['Vietnam AI & Cloud Summit', 'Mobile App TechDay 2026', 'Hội Thảo Startup Innovation', 'DevOps & Cyber Security', 'UI/UX Design Masterclass', 'Blockchain & Web3 Summit', 'Hội Thảo Kỹ Thuật Phần Mềm', 'Lập Trình Web Modern Summit', 'Data Science & BigData Day', 'Sáng Tạo Sản Phẩm Số'],
      imgs: [
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800',
        'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800',
        'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
      ],
      orgId: 'demo_user_org_03',
    },
    {
      cat: 'sports',
      label: 'Thể Thao',
      titlePrefixes: ['Giải Marathon Quốc Tế', 'Giải Bóng Rổ Động Lực', 'Hội Thao Thể Thao Biển', 'Giải Cầu Lông Mở Rộng', 'Giải Bơi Lội Miền Trung', 'Giải Đạp Xe Chinh Phục', 'Giải Quần Vợt Toàn Quốc', 'Hội Thao Yoga & Wellness', 'Giải Điền Kinh Thanh Niên', 'Giải Võ Thuật Cổ Truyền'],
      imgs: [
        'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
        'https://images.unsplash.com/photo-1471295253337-4ceaaed65897?w=800',
        'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=800',
        'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800',
        'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=800',
      ],
      orgId: 'demo_user_org_04',
    },
    {
      cat: 'exhibition',
      label: 'Triển Lãm',
      titlePrefixes: ['Triển Lãm Hội Hội Mỹ Thuật', 'Triển Lãm Nhiếp Ảnh Việt Nam', 'Triển Lãm Công Nghệ Số', 'Triển Lãm Di Sản Văn Hóa', 'Triển Lãm Thời Trang Đương Đại', 'Triển Lãm Kiến Trúc Đô Thị', 'Triển Lãm Thủ Công Mỹ Nghệ', 'Triển Lãm Gốm Sứ Truyền Thống', 'Triển Lãm Sách & Tri Thức', 'Triển Lãm Sáng Tạo Trẻ'],
      imgs: [
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800',
        'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800',
        'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800',
        'https://images.unsplash.com/photo-1563089145-599997674d42?w=800',
        'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800',
      ],
      orgId: 'demo_user_org_05',
    },
  ];

  let eventCounter = 1;

  for (const cfg of categoryConfigs) {
    for (let i = 0; i < 10; i++) {
      const evtId = `demo_evt_${cfg.cat}_${String(i + 1).padStart(2, '0')}`;
      const venueIdx = (eventCounter - 1) % venuesData.length;
      const venue = venuesData[venueIdx];
      const start = futureDate(3 + i * 4 + eventCounter % 5);
      const end = new Date(start.getTime() + 3 * 3600 * 1000);
      const title = `${cfg.titlePrefixes[i]} - ${venue.city}`;
      const img = cfg.imgs[i % cfg.imgs.length];
      const isSeatMapEvent = evtId === 'demo_evt_music_01';

      const rawData = {
        seatMapId: isSeatMapEvent ? 'demo_seatmap_01' : null,
        sponsors: ['Moteo Demo Sponsor', 'Vietnam Arts Trust', 'Tech Hub VN'],
        attribution: {
          imageSource: 'Unsplash Royalty Free',
          license: 'Unsplash License (Free Commercial & Non-Commercial)',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          attributionNote: 'Photo sourced under Unsplash License for portfolio demonstration purposes.'
        }
      };

      const desc = `Sự kiện ${title} diễn ra tại ${venue.name}, địa chỉ ${venue.address}, ${venue.city}. Chương trình quy tụ những gương mặt nghệ sĩ và chuyên gia hàng đầu, hứa hẹn mang lại trải nghiệm tuyệt vời cho khán giả.${DISCLAIMER}`;

      await query(
        `INSERT INTO events (
          id, name, description, image_url, banner_url,
          category, tags, start_at, end_at, event_type, online_url, location,
          geohash, venue_id, venue_name, city, min_price,
          video_url, is_outdoor, organizer_id, status, visibility,
          recurring_rule, hot_score, view_count, required_age, sponsors,
          created_at, last_updated_at, raw_data, lifecycle_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'physical', null, $10::jsonb,
          null, $11, $12, $13, $14, $15, $16, $17, $18, $19,
          null, $20, $21, 0, $22,
          NOW(), NOW(), $23::jsonb, $24
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url,
          banner_url = EXCLUDED.banner_url, category = EXCLUDED.category, tags = EXCLUDED.tags,
          start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, venue_id = EXCLUDED.venue_id,
          venue_name = EXCLUDED.venue_name, city = EXCLUDED.city, min_price = EXCLUDED.min_price,
          video_url = EXCLUDED.video_url, is_outdoor = EXCLUDED.is_outdoor, organizer_id = EXCLUDED.organizer_id,
          status = EXCLUDED.status, visibility = EXCLUDED.visibility, hot_score = EXCLUDED.hot_score,
          view_count = EXCLUDED.view_count, sponsors = EXCLUDED.sponsors, last_updated_at = NOW(),
          raw_data = EXCLUDED.raw_data, lifecycle_status = EXCLUDED.lifecycle_status`,
        [
          evtId,
          title,
          desc,
          img,
          img,
          [cfg.cat],
          [cfg.cat, 'vietnam', 'demo', venue.city.toLowerCase().replace(/\s+/g, '')],
          start,
          end,
          JSON.stringify({ address: venue.address, city: venue.city, lat: venue.lat, lng: venue.lng }),
          venue.id,
          venue.name,
          venue.city,
          150000,
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          i % 2 === 0,
          cfg.orgId,
          STATUS.ACTIVE,
          VISIBILITY.PUBLIC,
          85 + (i * 2),
          120 + (i * 15),
          JSON.stringify(['Moteo Demo Sponsor', 'Vietnam Arts Trust']),
          JSON.stringify(rawData),
          LIFECYCLE.PUBLISHED,
        ]
      );

      // Seed ticket types for this event
      const ttVip = { id: `demo_tt_${evtId}_vip`, evtId, name: 'Vé VIP', code: 'VIP', price: 500000, cap: 50, rem: 50 };
      const ttStd = { id: `demo_tt_${evtId}_std`, evtId, name: 'Vé Phổ Thông', code: 'STD', price: 250000, cap: 150, rem: 150 };
      const ttEb  = { id: `demo_tt_${evtId}_eb`,  evtId, name: 'Vé Early Bird', code: 'EB',  price: 150000, cap: 30, rem: 30 };

      for (const tt of [ttVip, ttStd, ttEb]) {
        await query(
          `INSERT INTO event_ticket_types (id, event_id, name, code, price, capacity, available, sold_count, is_active, raw_data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 0, true, '{}'::jsonb, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, code = EXCLUDED.code, price = EXCLUDED.price,
             capacity = EXCLUDED.capacity, available = EXCLUDED.available, sold_count = EXCLUDED.sold_count,
             is_active = true, updated_at = NOW()`,
          [tt.id, tt.evtId, tt.name, tt.code, tt.price, tt.cap, tt.rem]
        );
      }

      // Link featured profiles to music & theater events
      if (cfg.cat === 'music' || cfg.cat === 'theater') {
        const fpId = cfg.cat === 'music' ? (i % 2 === 0 ? 'demo_feat_01' : 'demo_feat_02') : 'demo_feat_03';
        await query(
          `INSERT INTO event_featured_profiles (event_id, featured_profile_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [evtId, fpId]
        );
      }

      eventCounter++;
    }
  }

  // 7. Seed Promotions
  console.log('7. Seeding Promotions...');
  const promos = [
    { id: 'demo_promo_01', orgId: 'demo_user_org_01', code: 'DEMO_WELCOME10', evtId: null, limit: 1000, used: 15, isPub: true, data: { discountPercent: 10, maxDiscountVnd: 50000 } },
    { id: 'demo_promo_02', orgId: 'demo_user_org_02', code: 'DEMO_SUMMER20', evtId: null, limit: 500, used: 42, isPub: true, data: { discountPercent: 20, maxDiscountVnd: 100000 } },
    { id: 'demo_promo_03', orgId: 'demo_user_org_03', code: 'DEMO_VIP50', evtId: null, limit: 200, used: 8, isPub: true, data: { fixedDiscountVnd: 50000 } },
    { id: 'demo_promo_04', orgId: 'demo_user_org_04', code: 'DEMO_TECH2026', evtId: null, limit: 300, used: 12, isPub: true, data: { discountPercent: 15, maxDiscountVnd: 75000 } },
    { id: 'demo_promo_05', orgId: 'demo_user_org_05', code: 'DEMO_ARTS15', evtId: null, limit: 400, used: 20, isPub: true, data: { discountPercent: 15, maxDiscountVnd: 60000 } },
  ];

  for (const pr of promos) {
    const validUntil = new Date(Date.now() + 90 * dayMs);
    await query(
      `INSERT INTO promotions (id, organizer_id, code, event_id, valid_from, valid_until, usage_limit, used_count, is_public, created_at, data)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, NOW(), $9::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         organizer_id = EXCLUDED.organizer_id, code = EXCLUDED.code, valid_until = EXCLUDED.valid_until,
         usage_limit = EXCLUDED.usage_limit, used_count = EXCLUDED.used_count, is_public = EXCLUDED.is_public, data = EXCLUDED.data`,
      [pr.id, pr.orgId, pr.code, pr.evtId, validUntil, pr.limit, pr.used, pr.isPub, JSON.stringify(pr.data)]
    );
  }

  // 8. Seed Reviews
  console.log('8. Seeding Reviews...');
  const reviewComments = [
    'Sự kiện tuyệt vời, âm thanh ánh sáng vô cùng chuyên nghiệp!',
    'Tổ chức chu đáo, không gian đẹp và lịch sự. Sẽ tham gia lần sau.',
    'Diễn giả chia sẻ rất nhiều kiến thức bổ ích và thực tế.',
    'Không khí sôi động, công tác an ninh và hướng dẫn khách rất tốt.',
    'Trải nghiệm tuyệt vời, rất đáng giá vé!',
    'Mọi thứ được sắp xếp chỉn chu, đúng giờ.',
    'Chương trình ấn tượng, dàn nghệ sĩ biểu diễn hết mình.',
    'Khâu check-in nhanh chóng, vé điện tử tiện lợi.',
    'Nội dung phong phú, nhiều hoạt động trải nghiệm hấp dẫn.',
    'Rất ấn tượng với công tác tổ chức và sự chu đáo của BTC.',
    'Sân khấu và hiệu ứng hình ảnh đỉnh cao.',
    'Chất lượng sự kiện vượt ngoài mong đợi.',
    'Không gian rộng rãi, thoáng mát và nhiều góc check-in đẹp.',
    'Giải đấu tổ chức kịch tính, chuyên nghiệp.',
    'Triển Lãm trình bày tinh tế, mang lại nhiều cảm xúc.',
  ];

  for (let i = 1; i <= 15; i++) {
    const revId = `demo_rev_${String(i).padStart(2, '0')}`;
    const evtId = `demo_evt_music_${String((i % 10) + 1).padStart(2, '0')}`;
    const attIdx = (i % 10) + 1;
    const attUser = users.find(u => u.id === `demo_user_att_${String(attIdx).padStart(2, '0')}`) || users[6];
    const rating = (i % 3 === 0) ? 4 : 5;
    const comment = reviewComments[i - 1];

    await query(
      `INSERT INTO reviews (id, event_id, user_id, rating, comment, created_at, user_name, user_profile_pic_url)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
       ON CONFLICT (user_id, event_id) DO UPDATE SET
         id = EXCLUDED.id, rating = EXCLUDED.rating,
         comment = EXCLUDED.comment, user_name = EXCLUDED.user_name, user_profile_pic_url = EXCLUDED.user_profile_pic_url`,
      [revId, evtId, attUser.id, rating, comment, attUser.name, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150']
    );
  }

  // 9. Seed Event Media Gallery
  console.log('9. Seeding Event Media Gallery...');
  const mediaImages = [
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1000',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000',
  ];

  for (let i = 1; i <= 15; i++) {
    const medId = `demo_media_${String(i).padStart(2, '0')}`;
    const evtId = `demo_evt_music_${String((i % 10) + 1).padStart(2, '0')}`;
    const attIdx = (i % 10) + 1;
    const attUser = users.find(u => u.id === `demo_user_att_${String(attIdx).padStart(2, '0')}`) || users[6];
    const url = mediaImages[i % mediaImages.length];
    const caption = `Hình ảnh khoảnh khắc đẹp tại sự kiện demo #${i} (Sử dụng theo Unsplash License attribution)`;

    await query(
      `INSERT INTO event_media (id, user_id, event_id, url, type, caption, created_at)
       VALUES ($1, $2, $3, $4, 'image', $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         user_id = EXCLUDED.user_id, event_id = EXCLUDED.event_id, url = EXCLUDED.url,
         type = 'image', caption = EXCLUDED.caption`,
      [medId, attUser.id, evtId, url, caption]
    );
  }

  console.log('\n=== Deterministic Vietnam Portfolio Demo Seed Completed Successfully! ===\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL: seed.platform.postgres.js failed:', err.message || err);
  process.exit(1);
});
