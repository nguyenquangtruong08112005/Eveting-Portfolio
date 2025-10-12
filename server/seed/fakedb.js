import { faker } from '@faker-js/faker';
import fs from 'fs';

// --- Hàm tạo dữ liệu giả lập (Fake Data Generation Functions) ---

const ORGANIZER_ID = 'org_pro_asia';
const ATTENDEE_ID_1 = 'user_alice_123';
const ATTENDEE_ID_2 = 'user_bob_456';
const ARTIST_ID_ROCK = 'artist_thunder';
const ARTIST_ID_POP = 'artist_starlight';
const EVENT_ID_1 = 'event_ai_summit';
const EVENT_ID_2 = 'event_rock_fest';

// Hàm tạo User
const createFakeUser = (role, id, name, email, history) => ({
  id,
  email: email || faker.internet.email(),
  passwordHash: 'FIREBASE_AUTH_REF', // Dùng Firebase Auth
  role,
  name: name || faker.person.fullName(),
  profilePicUrl: faker.image.avatar(),
  historyEventIds: history || [faker.database.mongodbObjectId()],
  followedArtistIds: role === 'attendee' ? [ARTIST_ID_ROCK] : [],
  points: role === 'attendee' ? faker.number.int({ min: 50, max: 5000 }) : 0,
  level: role === 'attendee' ? (faker.datatype.boolean() ? 'premium' : 'basic') : 'organizer',
  matchingPreferences: {
    ageRange: '20-30',
    interests: role === 'attendee' ? ['music', 'tech'] : ['business', 'marketing']
  },
  sharedMedia: [],
});

// Hàm tạo Event
const createFakeEvent = (id, name, organizerId, category, isOutdoor, hotScore, revenue) => {
  const date = faker.date.future({ years: 1 }).getTime();
  const lat = faker.location.latitude({ min: 10.7, max: 10.9, precision: 6 });
  const long = faker.location.longitude({ min: 106.6, max: 106.8, precision: 6 });

  return {
    id,
    name,
    description: faker.lorem.paragraph(),
    artistIds: category.includes('music') ? [ARTIST_ID_ROCK, ARTIST_ID_POP] : [],
    category,
    date,
    location: { latitude: lat, longitude: long },
    venueDetails: { lat, long, nearby: [faker.company.name() + ' Cafe'] },
    ticketTypes: {
      "VIP": { price: 5000000, quantity: 100, available: 100 - faker.number.int({ min: 5, max: 20 }) },
      "Standard": { price: 1000000, quantity: 500, available: 500 - faker.number.int({ min: 50, max: 150 }) }
    },
    seatMap: category.includes('conference') ? { "A1": true, "A2": false, "B1": true } : {},
    videoUrl: 'https://youtube.com/event_trailer',
    isOutdoor,
    organizerId,
    hotScore,
    revenue,
  };
};

// Hàm tạo Ticket
const createFakeTicket = (id, eventId, userId, type, price, status) => ({
  id,
  eventId,
  userId,
  type,
  price,
  seat: type === 'VIP' ? 'A' + faker.number.int({ min: 1, max: 10 }) : 'N/A',
  qrCode: `QR_${id}_${faker.string.alphanumeric(6)}`,
  status,
  purchaseDate: faker.date.past({ years: 1 }).getTime(),
  groupId: status === 'paid' ? 'group_' + faker.string.alphanumeric(4) : null,
  collaboratorId: status === 'checkedIn' ? 'collab_john' : null,
});

// --- Lắp ráp dữ liệu ---

const dbSeed = {
  Users: [
    createFakeUser('organizer', ORGANIZER_ID, 'Events Pro Asia', 'organizer@asia.com', [EVENT_ID_1, EVENT_ID_2]),
    createFakeUser('attendee', ATTENDEE_ID_1, 'Alice Wander', 'alice@mail.com', [EVENT_ID_1]),
    createFakeUser('attendee', ATTENDEE_ID_2, 'Bob The Builder', 'bob@mail.com', [EVENT_ID_2]),
    ...Array.from({ length: 5 }, () => createFakeUser('attendee', faker.database.mongodbObjectId(), null, null, [faker.helpers.arrayElement([EVENT_ID_1, EVENT_ID_2])]))
  ],

  Events: [
    createFakeEvent(EVENT_ID_1, "The Future of AI Summit 2025", ORGANIZER_ID, ["conference", "tech"], false, 85, 550000000),
    createFakeEvent(EVENT_ID_2, "Summer Music Festival - Rock Night", ORGANIZER_ID, ["music", "festival", "rock"], true, 95, 1600000000),
    ...Array.from({ length: 3 }, () => createFakeEvent(faker.database.mongodbObjectId(), faker.lorem.words(3) + ' Expo', ORGANIZER_ID, ["expo"], false, faker.number.int({ min: 50, max: 70 }), faker.number.int({ min: 100000000, max: 300000000 })))
  ],

  Tickets: [
    createFakeTicket('ticket_1a', EVENT_ID_1, ATTENDEE_ID_1, 'VIP', 4500000, 'paid'),
    createFakeTicket('ticket_2b', EVENT_ID_2, ATTENDEE_ID_2, 'Standard', 1000000, 'checkedIn'),
    createFakeTicket('ticket_3c', EVENT_ID_2, ATTENDEE_ID_1, 'Standard', 1000000, 'paid'),
    ...Array.from({ length: 5 }, (_, i) => createFakeTicket(faker.database.mongodbObjectId(), EVENT_ID_1, ATTENDEE_ID_2, 'Standard', 1000000, faker.helpers.arrayElement(['paid', 'pending', 'cancelled'])))
  ],

  Reviews: [
    { id: 'rev_1', eventId: EVENT_ID_1, userId: ATTENDEE_ID_1, rating: 5, comment: "Hội nghị rất chuyên nghiệp!", date: faker.date.past().getTime() },
    { id: 'rev_2', eventId: EVENT_ID_2, userId: ATTENDEE_ID_2, rating: 4, comment: "Âm thanh tốt, không gian tuyệt vời.", date: faker.date.past().getTime() },
    ...Array.from({ length: 3 }, () => ({ id: faker.database.mongodbObjectId(), eventId: EVENT_ID_2, userId: ATTENDEE_ID_1, rating: faker.number.int({ min: 1, max: 5 }), comment: faker.lorem.sentence(), date: faker.date.past().getTime() }))
  ],

  Artists: [
    { id: ARTIST_ID_ROCK, name: "The Thunderbolts", bio: faker.lorem.sentence(), imageUrl: faker.image.avatar(), upcomingEventIds: [EVENT_ID_2] },
    { id: ARTIST_ID_POP, name: "Starlight Diva", bio: faker.lorem.sentence(), imageUrl: faker.image.avatar(), upcomingEventIds: [] },
  ],

  Promotions: [
    { id: 'promo_eb', eventId: EVENT_ID_1, code: "EARLYBIRD20", discount: 0.2, type: "earlyBird", validUntil: faker.date.future().getTime(), usageLimit: 50 },
    { id: 'promo_mem', eventId: null, code: "MEMBER10", discount: 0.1, type: "member", validUntil: faker.date.future().getTime(), usageLimit: 1000 },
  ],

  Notifications: [
    { id: 'notif_1', userId: ATTENDEE_ID_1, type: "reminder", message: "Sự kiện AI Summit còn 24 giờ!", eventId: EVENT_ID_1, sentDate: faker.date.recent().getTime() },
    { id: 'notif_2', userId: "all", type: "update", message: "Rock Fest thay đổi lịch trình.", eventId: EVENT_ID_2, sentDate: faker.date.recent().getTime() },
  ],

  Collaborators: [
    { id: 'collab_john', organizerId: ORGANIZER_ID, name: "John Checkin", permissions: ["checkIn"] },
    { id: 'collab_jane', organizerId: ORGANIZER_ID, name: "Jane Manager", permissions: ["checkIn", "manageTickets"] },
  ],

  Analytics: [
    { eventId: EVENT_ID_1, totalRevenue: 550000000, ticketsSold: { "VIP": 20, "Standard": 50 }, views: 1500, popularTypes: ["Standard"] },
    { eventId: EVENT_ID_2, totalRevenue: 1600000000, ticketsSold: { "GA": 200 }, views: 5000, popularTypes: ["GA"] },
  ]
};

// Ghi dữ liệu ra tệp JSON để dễ dàng Import
try {
  fs.writeFileSync('firebase_seed_data.json', JSON.stringify(dbSeed, null, 2));
  console.log('✅ Dữ liệu giả lập đã được tạo thành công trong tệp firebase_seed_data.json');
} catch (err) {
  console.error('❌ Lỗi khi ghi tệp:', err);
}

// Chú ý: Bạn cần cấu hình Firebase Admin SDK để chạy lệnh import trực tiếp.
// Phần này chỉ tạo ra tệp JSON.