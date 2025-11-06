// services/event.service.js
const { db, FieldValue } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');
const geofire = require('geofire-common'); // Import thư viện geofire
const { calculateMinPrice } = require('../utils/tickets/calculateMinPrice.tickets')
/**
 * Lấy danh sách sự kiện công khai, hỗ trợ phân trang.
 * @param {number} page - Trang hiện tại.
 * @param {number} limit - Số lượng mục mỗi trang.
 * @returns {Promise<object>} Object chứa danh sách sự kiện và thông tin phân trang.
 */
const getAllEvents = async (page = 1, limit = 10) => {
    const eventsRef = db.collection('Events')
        .where('visibility', '==', 'public')
        .where('status', '==', 'active');
    const offset = (page - 1) * limit;

    const countQuery = eventsRef;
    const countSnapshot = await countQuery.count().get();
    const totalEvents = countSnapshot.data().count;

    const eventsSnapshot = await eventsRef
        .orderBy('date', 'asc')
        .limit(limit)
        .offset(offset)
        .select(
            "id", "name", "date", "imageUrl", "bannerUrl",
            "videoUrl", "location", "city", "venueName", "eventType", "minPrice" // Thêm eventType
        )
        .get();

    const events = [];
    eventsSnapshot.forEach((doc) => {
        const data = doc.data();
        const eventSummary = {
            id: doc.id,
            name: data.name,
            date: data.date,
            imageUrl: data.imageUrl,
            bannerUrl: data.bannerUrl,
            videoUrl: data.videoUrl,
            location: data.location,
            city: data.city || null,
            venueName: data.venueName || null,
            eventType: data.eventType || 'physical', // Thêm eventType
            minPrice: data.minPrice || null,
        }
        events.push(eventSummary);
    });

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

/**
 * Lấy chi tiết một sự kiện theo ID.
 * @param {string} eventId - ID của sự kiện.
 * @param {object} [requestingUser] - (Optional) Thông tin user đang yêu cầu (từ verifyAuthToken).
 * @returns {Promise<object|null>} Dữ liệu sự kiện hoặc null nếu không tìm thấy/không có quyền xem.
 */
const getEventById = async (eventId, requestingUser = null) => {
    const eventDoc = await db.collection('Events').doc(eventId).get();

    if (!eventDoc.exists || eventDoc.data().status === 'cancelled') {
        return null; // Không tìm thấy hoặc đã bị hủy
    }

    const eventData = eventDoc.data();
    let venueData = null;

    if (eventData.venueId) {
        const venueDoc = await db.collection('Venues').doc(eventData.venueId).get();
        if (venueDoc.exists) {
            venueData = venueDoc.data();
        }
    }

    // Logic kiểm tra visibility (giữ nguyên)
    if (eventData.visibility === 'public') {
        return { id: eventDoc.id, ...eventData, venue: venueData }; // <-- Gửi kèm venue
    }

    // Nếu không phải public, cần kiểm tra người dùng đã đăng nhập chưa
    if (!requestingUser) {
        return null;
    }

    // TODO: Bổ sung logic kiểm tra quyền Admin/Organizer sau
    const isAdminOrOrganizer = requestingUser.roles?.includes('organizer'); // || requestingUser.roles?.includes('admin');

    // Organizer/Admin hoặc người tạo sự kiện có thể xem private/unlisted
    if (isAdminOrOrganizer || eventData.organizerId === requestingUser.uid) {
        return { id: eventDoc.id, ...eventData, venue: venueData }; // <-- Gửi kèm venue
    }

    // Các trường hợp khác (ví dụ: unlisted nhưng user thường) - hiện tại chưa cho xem
    // TODO: Có thể thêm logic chia sẻ link unlisted sau
    if (eventData.visibility === 'unlisted') {
        // Ai cũng xem được 'unlisted' miễn là đã đăng nhập (hoặc có link - logic này xử lý ở client/controller)
        // Tạm thời cho phép nếu đã đăng nhập
        return { id: eventDoc.id, ...eventData };
    }

    return null;
};


/**
 * Tạo một sự kiện mới.
 * @param {object} eventData - Dữ liệu sự kiện từ client.
 * @param {string} organizerId - ID của người tạo (từ req.user.uid).
 * @returns {Promise<object>} Document sự kiện vừa tạo.
 */
const createEvent = async (eventData, organizerId) => {
    const eventId = `evt_${uuidv4()}`;
    const eventRef = db.collection('Events').doc(eventId);

    if (!eventData.date || typeof eventData.date !== 'number') {
        throw new Error('Invalid or missing event date (must be a timestamp).');
    }

    let geohash = null;
    let location = eventData.location || null;
    let venueName = null;
    let city = null;

    const eventType = eventData.eventType || 'physical'; // Mặc định là 'physical'
    let onlineUrl = eventData.onlineUrl || null;

    if (eventType === 'physical') {
        // Nếu là sự kiện offline, yêu cầu location và venueId
        if (eventData.venueId) {
            const venueDoc = await db.collection('Venues').doc(eventData.venueId).get();
            if (venueDoc.exists) {
                const venue = venueDoc.data();
                venueName = venue.name;
                // Lấy city từ cấu trúc addressDetails mới
                if (venue.addressDetails) {
                    city = venue.addressDetails.city || null;
                }
                // Tự động lấy location từ Venue nếu client không gửi
                if (!location && venue.location) {
                    location = venue.location;
                }
            } else {
                throw new Error(`Venue with ID ${eventData.venueId} not found.`);
            }
        } else {
            throw new Error('Physical event must have a venueId.');
        }

        // Tính geohash từ location
        if (location && location.latitude && location.longitude) {
            geohash = geofire.geohashForLocation([location.latitude, location.longitude]);
        }
        onlineUrl = null; // Sự kiện offline không có onlineUrl

    } else if (eventType === 'online') {
        // Nếu là sự kiện online, không cần địa điểm
        location = null;
        geohash = null;
        venueName = "Online"; // Ghi rõ là online
        city = "Online";
        if (!onlineUrl) {
            throw new Error('Online event must have an onlineUrl.');
        }
    }

    const minPrice = calculateMinPrice(eventData.ticketTypes || {});

    const now = new Date().getTime();
    const newEventData = {
        id: eventId,
        name: eventData.name,
        description: eventData.description || '',
        imageUrl: eventData.imageUrl || null,
        bannerUrl: eventData.bannerUrl || null,
        featuredProfileIds: eventData.featuredProfileIds || [],
        category: eventData.category || [],
        tags: eventData.tags || [],
        date: eventData.date,
        endDate: eventData.endDate || null,

        // --- Dữ liệu đã xử lý ---
        eventType: eventType,
        onlineUrl: onlineUrl,
        location: location,
        geohash: geohash,
        venueId: eventData.venueId || null,
        venueName: venueName, // <-- Sao chép
        city: city,           // <-- Sao chép
        // ---

        minPrice: minPrice,

        ticketTypes: eventData.ticketTypes || {},
        videoUrl: eventData.videoUrl || '',
        isOutdoor: eventData.isOutdoor || false,
        organizerId: organizerId,
        status: 'active',
        visibility: eventData.visibility || 'public',
        recurringRule: eventData.recurringRule || null,
        hotScore: 0,
        viewCount: 0,
        requiredAge: eventData.requiredAge || 0,
        sponsors: eventData.sponsors || [],
        createdAt: now,
        lastUpdatedAt: now,
    };

    // TODO: Thêm validation chi tiết cho eventData (date phải là số, ticketTypes đúng cấu trúc...)

    await eventRef.set(newEventData);
    return newEventData;
};

/**
 * Cập nhật thông tin một sự kiện.
 * @param {string} eventId - ID sự kiện.
 * @param {object} eventData - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Dữ liệu sự kiện sau khi cập nhật.
 */
const updateEvent = async (eventId, eventData) => {
    const eventRef = db.collection('Events').doc(eventId);

    const updatePayload = {
        ...eventData, // Lấy dữ liệu mới từ client
        lastUpdatedAt: new Date().getTime(),
    };

    // Nếu client thay đổi venueId
    if (eventData.venueId) {
        const venueDoc = await db.collection('Venues').doc(eventData.venueId).get();
        if (venueDoc.exists) {
            const venue = venueDoc.data();
            updatePayload.venueName = venue.name;
            if (venue.addressDetails) {
                updatePayload.city = venue.addressDetails.city || null;
            }
            // Tự động cập nhật location và geohash theo venue mới
            if (venue.location) {
                updatePayload.location = venue.location;
                updatePayload.geohash = geofire.geohashForLocation([venue.location.latitude, venue.location.longitude]);
            }
        }
    } else if (eventData.venueId === null) {
        // Xử lý trường hợp xóa venue (ví dụ: chuyển sang online)
        updatePayload.venueName = null;
        updatePayload.city = null;
        updatePayload.location = null;
        updatePayload.geohash = null;
    }

    // Nếu client thay đổi eventType
    if (eventData.eventType === 'online') {
        updatePayload.location = null;
        updatePayload.geohash = null;
        updatePayload.venueId = null;
        updatePayload.venueName = "Online";
        updatePayload.city = "Online";
    } else if (eventData.eventType === 'physical' && !eventData.venueId) {
        // Nếu đổi sang physical mà quên gửi venueId, ta cần lấy venueId cũ
        const currentEvent = (await eventRef.get()).data();
        if (!currentEvent.venueId) {
            throw new Error("Cannot change to physical event without a venueId.");
        }
        // Giữ nguyên các giá trị cũ nếu không có venueId mới
    }

    if (eventData.ticketTypes) {
        updatePayload.minPrice = calculateMinPrice(eventData.ticketTypes);
    }

    // Xóa các trường không được phép cập nhật
    delete updatePayload.id;
    delete updatePayload.organizerId;
    delete updatePayload.createdAt;
    delete updatePayload.hotScore;
    delete updatePayload.viewCount;
    delete updatePayload.revenue;

    await eventRef.update(updatePayload);
    const updatedDoc = await eventRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
};

/**
 * Hủy (xóa mềm) một sự kiện.
 * @param {string} eventId - ID sự kiện.
 * @returns {Promise<object>} Dữ liệu sự kiện sau khi hủy.
 */
const cancelEvent = async (eventId) => {
    const eventRef = db.collection('Events').doc(eventId);
    const now = new Date().getTime();
    await eventRef.update({
        status: 'cancelled',
        cancelledAt: now,
        lastUpdatedAt: now
    });

    const updatedDoc = await eventRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
};

/**
 * Tìm kiếm sự kiện lân cận dựa trên Geohash.
 * @param {number} centerLat - Vĩ độ trung tâm.
 * @param {number} centerLon - Kinh độ trung tâm.
 * @param {number} radiusInKm - Bán kính tìm kiếm (km).
 * @returns {Promise<Array<object>>} Danh sách sự kiện lân cận.
 */
const findNearbyEvents = async (centerLat, centerLon, radiusInKm) => {
    const radiusInM = radiusInKm * 1000;
    const center = [centerLat, centerLon];

    const bounds = geofire.geohashQueryBounds(center, radiusInM);
    const promises = [];
    for (const b of bounds) {
        const q = db.collection('Events')
            .orderBy('geohash')
            .startAt(b[0])
            .endAt(b[1])
            .where('status', '==', 'active') // Chỉ tìm sự kiện active
            .where('visibility', '==', 'public'); // Chỉ tìm sự kiện public
        promises.push(q.get());
    }

    const snapshots = await Promise.all(promises);
    const matchingDocs = [];
    for (const snap of snapshots) {
        for (const doc of snap.docs) {
            const eventData = doc.data();
            // Bỏ qua nếu không có location
            if (!eventData.location?.latitude || !eventData.location?.longitude) continue;

            const lat = eventData.location.latitude;
            const lon = eventData.location.longitude;

            const distanceInKm = geofire.distanceBetween([lat, lon], center);
            const distanceInM = distanceInKm * 1000;
            if (distanceInM <= radiusInM) {
                matchingDocs.push({ id: doc.id, ...eventData, distanceKm: distanceInKm });
            }
        }
    }

    const uniqueResults = Array.from(new Map(matchingDocs.map(item => [item.id, item])).values());
    uniqueResults.sort((a, b) => a.distanceKm - b.distanceKm);

    return uniqueResults;
};

/**
 * Tìm kiếm sự kiện nâng cao với bộ lọc, sắp xếp và phân trang.
 * @param {object} queryParams - Các tham số query (q, category, date, isOutdoor, sortBy, sortOrder, page, limit).
 * @returns {Promise<object>} Object chứa danh sách sự kiện và thông tin phân trang.
 */
const searchEvents = async (queryParams) => {
    let query = db.collection('Events');

    // --- BỘ LỌC ---
    query = query.where('visibility', '==', 'public'); // Luôn chỉ tìm public trong search
    query = query.where('status', '==', 'active'); // Luôn chỉ tìm active trong search

    if (queryParams.q) {
        const keyword = queryParams.q;
        // Firestore chỉ hỗ trợ prefix search hiệu quả
        query = query.where('name', '>=', keyword).where('name', '<=', keyword + '\uf8ff');
    }
    if (queryParams.category) {
        query = query.where('category', 'array-contains', queryParams.category);
    }
    const now = new Date().getTime();
    if (queryParams.date === 'upcoming') {
        query = query.where('date', '>=', now);
    } else if (queryParams.date === 'past') {
        // Lưu ý: Firestore giới hạn chỉ một trường có bộ lọc bất đẳng thức (<, >, !=) trong một query
        // Nếu đã lọc theo date 'past' thì không thể lọc theo status '!=' cancelled nữa.
        // Do đó, nên đổi status thành 'active', 'finished' thay vì dùng '!=' cancelled.
        // Tạm thời bỏ qua lọc status nếu lọc theo date=past để tránh lỗi index.
        query = query.where('date', '<', now);
        // query = query.where('status', '==', 'finished'); // Cần đổi logic status
    }
    if (queryParams.isOutdoor === 'true' || queryParams.isOutdoor === 'false') {
        query = query.where('isOutdoor', '==', queryParams.isOutdoor === 'true');
    }

    // --- ĐẾM TỔNG ---
    const countQuery = query;
    const countSnapshot = await countQuery.count().get();
    const totalEvents = countSnapshot.data().count;

    // --- SẮP XẾP ---
    let sortBy = queryParams.sortBy || (queryParams.date === 'upcoming' ? 'date' : 'createdAt'); // Mặc định sort theo date (upcoming) hoặc ngày tạo (nếu không lọc date)
    let sortOrder = queryParams.sortOrder || (sortBy === 'date' ? 'asc' : 'desc'); // Mặc định asc cho date, desc cho createdAt/hotScore

    if (!['date', 'hotScore', 'createdAt'].includes(sortBy)) sortBy = (queryParams.date === 'upcoming' ? 'date' : 'createdAt');
    if (!['asc', 'desc'].includes(sortOrder)) sortOrder = (sortBy === 'date' ? 'asc' : 'desc');

    // Xử lý index phức tạp khi có nhiều orderBy và filter
    // Ưu tiên orderBy trường có filter bất đẳng thức trước (date)
    if (queryParams.date && sortBy !== 'date') {
        query = query.orderBy('date', queryParams.date === 'upcoming' ? 'asc' : 'desc').orderBy(sortBy, sortOrder);
    } else {
        query = query.orderBy(sortBy, sortOrder);
    }


    // --- PHÂN TRANG ---
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    // --- LẤY DỮ LIỆU ---
    const snapshot = await query.get();
    const events = [];
    snapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() });
    });

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
    findNearbyEvents,
    searchEvents,
};