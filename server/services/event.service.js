// services/event.service.js
const { db, FieldValue } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');
const geofire = require('geofire-common');
const { calculateMinPrice } = require('../utils/tickets/calculateMinPrice.tickets');

// --- HÀM HỖ TRỢ MỚI ---

/**
 * Lọc đối tượng ticketTypes, chỉ giữ lại thông tin public (price).
 */
const mapPublicTicketTypes = (ticketTypes) => {
    if (!ticketTypes) return {};
    const publicTypes = {};
    for (const key in ticketTypes) {
        publicTypes[key] = {
            price: ticketTypes[key].price,
            // Ẩn đi 'quantity' và 'available'
        };
    }
    return publicTypes;
};

/**
 * Lọc đối tượng venue, loại bỏ thông tin nhạy cảm (seatMapTemplate).
 */
const mapPublicVenue = (venueData) => {
    if (!venueData) return null;
    const { seatMapTemplate, ...publicVenue } = venueData;
    return publicVenue;
};


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
            "videoUrl", "location", "city", "venueName", 
            "eventType", "minPrice"
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
            eventType: data.eventType || 'physical',
            minPrice: data.minPrice !== undefined ? data.minPrice : null, // Xử lý null
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
        return null;
    }

    const eventData = eventDoc.data();
    let venueData = null;
    let featuredProfilesData = []; // <-- Khởi tạo mảng rỗng

    // Gộp (join) thông tin Venue
    if (eventData.venueId) {
        const venueDoc = await db.collection('Venues').doc(eventData.venueId).get();
        if (venueDoc.exists) {
            venueData = venueDoc.data();
        }
    }

    // --- BẮT ĐẦU CHỈNH SỬA: Gộp (join) thông tin FeaturedProfiles ---
    if (eventData.featuredProfileIds && eventData.featuredProfileIds.length > 0) {
        // Dùng truy vấn 'in' để lấy tất cả profiles trong 1 lượt gọi API
        const profilesSnapshot = await db.collection('FeaturedProfiles')
            .where('id', 'in', eventData.featuredProfileIds)
            .get();
        
        profilesSnapshot.forEach(doc => {
            featuredProfilesData.push(doc.data());
        });
    }
    // --- KẾT THÚC CHỈNH SỬA ---

    // --- BƯỚC 1: Xác định quyền sở hữu ---
    let isOwnerOrAdmin = false;
    if (requestingUser) {
        const isAdmin = requestingUser.roles?.includes('organizer'); // Hoặc 'admin'
        const isOwner = eventData.organizerId === requestingUser.uid;
        isOwnerOrAdmin = isAdmin || isOwner;
    }

    // --- BƯỚC 2: Xử lý logic Visibility và trả về DTO phù hợp ---

    // 2a. Nếu là chủ sở hữu/Admin (Trả về Full Data)
    if (isOwnerOrAdmin) {
        return { 
            id: eventDoc.id, 
            ...eventData, 
            venue: venueData, 
            featuredProfiles: featuredProfilesData // <-- Thêm mảng profiles
        };
    }

    // 2b. Nếu là người dùng vãng lai (hoặc attendee) (Trả về DTO Public)
    
    // Tạo DTO Công Khai (lọc bỏ các trường nhạy cảm)
    const publicEventView = {
        id: eventDoc.id,
        name: eventData.name,
        description: eventData.description,
        imageUrl: eventData.imageUrl,
        bannerUrl: eventData.bannerUrl,
        // featuredProfileIds: eventData.featuredProfileIds, // <-- Xóa trường ID
        category: eventData.category,
        tags: eventData.tags,
        date: eventData.date,
        endDate: eventData.endDate,
        eventType: eventData.eventType,
        onlineUrl: eventData.onlineUrl,
        location: eventData.location,
        geohash: eventData.geohash,
        city: eventData.city,
        venueName: eventData.venueName,
        videoUrl: eventData.videoUrl,
        isOutdoor: eventData.isOutdoor,
        status: eventData.status,
        visibility: eventData.visibility,
        requiredAge: eventData.requiredAge,
        sponsors: eventData.sponsors,
        minPrice: eventData.minPrice,
        // --- DỮ LIỆU ĐÃ LỌC VÀ GỘP ---
        featuredProfiles: featuredProfilesData, // <-- Thêm mảng profiles
        ticketTypes: eventData.ticketTypes,
        venue: mapPublicVenue(venueData)
    };

    if (eventData.visibility === 'public') {
        return publicEventView;
    }

    if (eventData.visibility === 'unlisted' && requestingUser) {
        return publicEventView;
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
    const eventType = eventData.eventType || 'physical';
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
        location = null; geohash = null; venueName = "Online"; city = "Online";
        if (!onlineUrl) throw new Error('Online event must have an onlineUrl.');
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
        eventType: eventType,
        onlineUrl: onlineUrl,
        location: location,
        geohash: geohash,
        venueId: eventData.venueId || null,
        venueName: venueName,
        city: city,
        ticketTypes: eventData.ticketTypes || {},
        minPrice: minPrice, 
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

    let geohash = undefined;
    if (eventData.location && eventData.location.latitude && eventData.location.longitude) {
        geohash = geofire.geohashForLocation([eventData.location.latitude, eventData.location.longitude]);
    }

    const updatePayload = {
        ...eventData,
        lastUpdatedAt: new Date().getTime(),
        ...(geohash !== undefined && { geohash: geohash })
    };

    if (eventData.venueId) {
        const venueDoc = await db.collection('Venues').doc(eventData.venueId).get();
        if (venueDoc.exists) {
            const venue = venueDoc.data();
            updatePayload.venueName = venue.name;
            if (venue.addressDetails) {
                updatePayload.city = venue.addressDetails.city || null;
            }
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
    
    if (eventData.eventType === 'online') {
        updatePayload.location = null; updatePayload.geohash = null; updatePayload.venueId = null; updatePayload.venueName = "Online"; updatePayload.city = "Online";
    }

    if (eventData.ticketTypes) {
        updatePayload.minPrice = calculateMinPrice(eventData.ticketTypes);
    }

    delete updatePayload.id;
    delete updatePayload.organizerId;
    delete updatePayload.createdAt;
    // (Tạm thời cho phép cập nhật hotScore, viewCount, revenue qua API)
    // delete updatePayload.hotScore;
    // delete updatePayload.viewCount;
    // delete updatePayload.revenue;

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
    // ... (code giữ nguyên)
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
 * Tìm kiếm sự kiện lân cận, hỗ trợ tự động mở rộng bán kính và phân trang.
 * @param {number} centerLat - Vĩ độ trung tâm.
 * @param {number} centerLon - Kinh độ trung tâm.
 * @param {number} initialRadiusInKm - Bán kính tìm kiếm ban đầu (km).
 * @param {number} page - Trang hiện tại.
 * @param {number} limit - Số lượng mục mỗi trang.
 * @returns {Promise<object>} Object chứa danh sách sự kiện và thông tin phân trang.
 */
const findNearbyEvents = async (centerLat, centerLon, initialRadiusInKm, page = 1, limit = 10) => {
    const center = [centerLat, centerLon];

    // --- CẤU HÌNH TỰ ĐỘNG MỞ RỘNG ---
    let currentRadiusKm = initialRadiusInKm;
    const MAX_RADIUS_KM = 500; // Bán kính tìm kiếm tối đa (ví dụ: 500km)
    const RADIUS_EXPANSION_FACTOR = 2; // Hệ số mở rộng (ví dụ: 5km -> 10km -> 20km)
    const MIN_RESULTS_TARGET = limit;  // Cố gắng tìm ít nhất đủ cho 1 trang

    let uniqueResults = [];
    let finalRadiusUsed = currentRadiusKm;

    // --- VÒNG LẶP TỰ ĐỘNG MỞ RỘNG BÁN KÍNH ---
    while (uniqueResults.length < MIN_RESULTS_TARGET && currentRadiusKm <= MAX_RADIUS_KM) {
        finalRadiusUsed = currentRadiusKm; // Ghi lại bán kính cuối cùng được sử dụng
        
        const radiusInM = currentRadiusKm * 1000;
        const bounds = geofire.geohashQueryBounds(center, radiusInM);
        const promises = [];

        for (const b of bounds) {
            const q = db.collection('Events')
                .where('status', '==', 'active')
                .where('visibility', '==', 'public')
                .orderBy('geohash')
                .startAt(b[0])
                .endAt(b[1]);
            promises.push(q.get());
        }

        const snapshots = await Promise.all(promises);
        const matchingDocs = [];

        for (const snap of snapshots) {
            for (const doc of snap.docs) {
                const eventData = doc.data();
                if (!eventData.location?.latitude || !eventData.location?.longitude) continue;

                const lat = eventData.location.latitude;
                const lon = eventData.location.longitude;
                const distanceInKm = geofire.distanceBetween([lat, lon], center);

                // Lọc chính xác theo bán kính hiện tại
                if (distanceInKm <= currentRadiusKm) {
                    matchingDocs.push({ id: doc.id, ...eventData, distanceKm: distanceInKm });
                }
            }
        }

        // Khử trùng lặp và sắp xếp
        uniqueResults = Array.from(new Map(matchingDocs.map(item => [item.id, item])).values());
        uniqueResults.sort((a, b) => a.distanceKm - b.distanceKm);

        // Nếu đã đủ kết quả hoặc đã đạt bán kính tối đa, thoát vòng lặp
        if (uniqueResults.length >= MIN_RESULTS_TARGET || currentRadiusKm >= MAX_RADIUS_KM) {
            break;
        }
        currentRadiusKm *= RADIUS_EXPANSION_FACTOR;
    }


    // --- LOGIC PHÂN TRANG ---
    const totalItems = uniqueResults.length;
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;

    // Lấy các sự kiện cho trang hiện tại
    const paginatedEvents = uniqueResults.slice(offset, offset + (limit));

    // --- TỐI ƯU HÓA KẾT QUẢ TRẢ VỀ ---
    const events = paginatedEvents.map(data => ({
        id: data.id,
        name: data.name,
        date: data.date,
        imageUrl: data.imageUrl,
        bannerUrl: data.bannerUrl,
        videoUrl: data.videoUrl,
        location: data.location,
        city: data.city || null,
        venueName: data.venueName || null,
        eventType: data.eventType || 'physical',
        minPrice: data.minPrice !== undefined ? data.minPrice : null,
        distanceKm: data.distanceKm 
    }));

    // --- TRẢ VỀ KẾT QUẢ KÈM PHÂN TRANG ---
    return {
        events,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: totalPages,
            totalItems: totalItems,
            actualRadiusKm: finalRadiusUsed
        }
    };
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
    // TODO: Thêm lọc theo city
    // if (queryParams.city) {
    //     query = query.where('city', '==', queryParams.city);
    // }

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

    query = query.limit(limit).offset(offset).select(
        "id", "name", "date", "imageUrl", "bannerUrl",
        "videoUrl", "location", "city", "venueName", 
        "eventType", "minPrice"
    );

    // --- LẤY DỮ LIỆU ---
    const snapshot = await query.get();
    const events = [];
    
    // --- BẮT ĐẦU SỬA ĐỔI: Tạo summary model ---
    snapshot.forEach(doc => {
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
            eventType: data.eventType || 'physical',
            minPrice: data.minPrice !== undefined ? data.minPrice : null,
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

module.exports = {
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    cancelEvent,
    findNearbyEvents,
    searchEvents,
};