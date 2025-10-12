// services/event.service.js
const { db } = require('../config/firebase.config');

const getAllEvents = async () => {
  const eventsSnapshot = await db.collection('Events').get();
  const events = [];
  eventsSnapshot.forEach((doc) => {

    events.push({ id: doc.id, ...doc.data() });
  });
  return events;
};

const getEventById = async (eventId) => {
  const eventDoc = await db.collection('Events').doc(eventId).get();
  if (!eventDoc.exists) {
    return null; // Trả về null nếu không tìm thấy or deleted 
  }
  return { id: eventDoc.id, ...eventDoc.data() };
}

const createEvent = async (eventData, organizerId) => {
  const newEventData = {
    ...eventData,
    isDeleted: false,
    organizerId: organizerId,
    createdAt: new Date().getTime()
  };

  const newEventRef = await db.collection('Events').add(newEventData);

  return { id: newEventData.id, ...newEventData.data };
}

const updateEvent = async (eventId, eventData) => {
  const eventRef = db.collection('Events').doc(eventId);

  await eventRef.update(eventData);
  const updatedDoc = await eventRef.get();

  return { id: updatedDoc.id, ...updatedDoc.data() };
}

const cancelEvent = async (eventId) => {
  const eventRef = db.collection('Events').doc(eventId);
  await eventRef.update({
    status: 'cancelled',
    cancelledAt: new Date().getTime()
  });

  const updatedDoc = await eventRef.get();
  return { id: updatedDoc.id, ...updatedDoc.data() };
};

const searchEvents = async (queryParams) => {
  let query = db.collection('Events');

  // --- BỘ LỌC CƠ BẢN ---
  // Mặc định luôn lọc ra các sự kiện chưa bị hủy
  query = query.where('status', '!=', 'cancelled');

  // --- LỌC THEO TỪ KHÓA (TÊN SỰ KIỆN) ---
  // Firestore không hỗ trợ tìm kiếm "contains" hiệu quả. 
  // Mẹo: tìm các tên bắt đầu bằng từ khóa (case-sensitive).
  // TODO: Tích hợp một dịch vụ tìm kiếm chuyên dụng (Algolia, Elasticsearch) 
  // để có kết quả tìm kiếm full-text mạnh mẽ hơn.
  if (queryParams.q) {
    const keyword = queryParams.q;
    query = query.where('name', '>=', keyword)
      .where('name', '<=', keyword + '\uf8ff');
  }

  // --- LỌC THEO DANH MỤC (CATEGORY) ---
  // /events/search?category=music
  if (queryParams.category) {
    query = query.where('category', 'array-contains', queryParams.category);
  }

  // --- LỌC THEO THỜI GIAN (DATE) ---
  // /events/search?date=upcoming hoặc /events/search?date=past
  const now = new Date().getTime();
  if (queryParams.date === 'upcoming') {
    query = query.where('date', '>=', now);
  } else if (queryParams.date === 'past') {
    query = query.where('date', '<', now);
  }

  // --- LỌC THEO ĐỊA ĐIỂM (OUTDOOR/INDOOR) ---
  // /events/search?isOutdoor=true
  if (queryParams.isOutdoor === 'true' || queryParams.isOutdoor === 'false') {
    query = query.where('isOutdoor', '==', queryParams.isOutdoor === 'true');
  }

  // --- SẮP XẾP KẾT QUẢ ---
  // Mặc định sắp xếp theo sự kiện sắp diễn ra gần nhất
  // TODO: Cho phép người dùng tùy chọn sắp xếp theo 'hotScore' hoặc 'date'
  // Ví dụ: /events/search?sortBy=hotScore
  query = query.orderBy('date', 'asc'); // 'asc' = ascending = tăng dần

  // TODO: Thêm phân trang (pagination) để không tải tất cả dữ liệu cùng lúc
  // Ví dụ: /events/search?page=1&limit=10

  const snapshot = await query.get();
  const events = [];
  snapshot.forEach(doc => {
    events.push({ id: doc.id, ...doc.data() });
  });

  return events;
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEvent,
  searchEvents,
};