// services/event.service.js
const { db } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');
const geofire = require('geofire-common');

const getAllEvents = async (page = 1, limit = 10) => { // Thêm tham số page, limit với giá trị mặc định
    const eventsRef = db.collection('Events');
    const offset = (page - 1) * limit;

    // Lấy tổng số lượng documents (cần cho việc tính tổng số trang)
    const countSnapshot = await eventsRef.count().get();
    const totalEvents = countSnapshot.data().count;

    // Truy vấn dữ liệu cho trang hiện tại
    const eventsSnapshot = await eventsRef
        .orderBy('createdAt', 'desc') // Sắp xếp theo ngày tạo mới nhất (hoặc 'date')
        .limit(limit)
        .offset(offset)
        .get();

    const events = [];
    eventsSnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
    });

    // Trả về cả dữ liệu và thông tin phân trang
    return {
        events,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalEvents / limit),
            totalEvents: totalEvents
        }
    };
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
    if (queryParams.q) {
        const keyword = queryParams.q;
        query = query.where('name', '>=', keyword)
                     .where('name', '<=', keyword + '\uf8ff');
    }

    // --- LỌC THEO DANH MỤC (CATEGORY) ---
    if (queryParams.category) {
        query = query.where('category', 'array-contains', queryParams.category);
    }

    // --- LỌC THEO THỜI GIAN (DATE) ---
    const now = new Date().getTime();
    if (queryParams.date === 'upcoming') {
        query = query.where('date', '>=', now);
    } else if (queryParams.date === 'past') {
        query = query.where('date', '<', now);
    }

    // --- LỌC THEO ĐỊA ĐIỂM (OUTDOOR/INDOOR) ---
    if (queryParams.isOutdoor === 'true' || queryParams.isOutdoor === 'false') {
        query = query.where('isOutdoor', '==', queryParams.isOutdoor === 'true');
    }

    // --- ĐẾM TỔNG SỐ KẾT QUẢ PHÙ HỢP (TRƯỚC KHI PHÂN TRANG) ---
    // Clone query hiện tại để đếm mà không ảnh hưởng đến query chính
    const countQuery = query;
    const countSnapshot = await countQuery.count().get();
    const totalEvents = countSnapshot.data().count;

    // --- SẮP XẾP KẾT QUẢ ---
    let sortBy = queryParams.sortBy || 'date'; // Mặc định sort theo date
    let sortOrder = queryParams.sortOrder || 'asc'; // Mặc định tăng dần

    // Đảm bảo chỉ sort theo các trường hợp lệ và thứ tự hợp lệ
    if (sortBy !== 'date' && sortBy !== 'hotScore') {
        sortBy = 'date'; // Reset về mặc định nếu sortBy không hợp lệ
    }
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
        sortOrder = 'asc'; // Reset về mặc định nếu sortOrder không hợp lệ
    }

    // Firestore yêu cầu phải có một bộ lọc bất đẳng thức đầu tiên
    // trước khi orderBy trường khác. Nếu sắp xếp theo hotScore mà có lọc date,
    // ta cần orderBy date trước, sau đó mới orderBy hotScore.
    // Nếu chỉ sắp xếp theo hotScore (không có lọc date), thì orderBy hotScore là đủ.
    if (sortBy === 'hotScore' && (queryParams.date === 'upcoming' || queryParams.date === 'past')) {
        query = query.orderBy('date', sortOrder).orderBy('hotScore', sortOrder);
    } else {
        query = query.orderBy(sortBy, sortOrder);
    }


    // --- PHÂN TRANG ---
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const offset = (page - 1) * limit;

    query = query.limit(limit).offset(offset);

    // --- LẤY DỮ LIỆU CUỐI CÙNG ---
    const snapshot = await query.get();
    const events = [];
    snapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() });
    });

    // Trả về kết quả kèm thông tin phân trang
    return {
        events,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalEvents / limit),
            totalItems: totalEvents
        }
    };
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEvent,
  searchEvents,
};