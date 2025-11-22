// services/event.service.js
const { db, FieldValue } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');
const geofire = require('geofire-common');
const { calculateMinPrice } = require('../utils/tickets/calculateMinPrice.tickets');
const esClient = require('../config/elasticsearch.config');
const moment = require('moment');
const axios = require('axios');
const fcmService = require('./fcm.service');
const notificationService = require('./notification.service'); // <-- Import
const admin = require('firebase-admin'); // Cần để dùng FieldPat
// Import axios cho Weather

const ELASTIC_INDEX = 'events';
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;


// --- HÀM HỖ TRỢ ---
const mapPublicTicketTypes = (ticketTypes) => {
    if (!ticketTypes) return {};
    const publicTypes = {};
    for (const key in ticketTypes) {
        publicTypes[key] = { price: ticketTypes[key].price };
    } return publicTypes;
};

const mapPublicVenue = (venueData) => {
    if (!venueData) return null;
    const { seatMapTemplate, ...publicVenue } = venueData;
    return publicVenue;
};


/**
 * Helper: Lọc dữ liệu để đẩy lên Elastic
 */
const buildElasticData = async (eventData) => {
    let featuredProfileNames = [];

    if (eventData.featuredProfileIds && eventData.featuredProfileIds.length > 0) {
        try {
            const profilesSnapshot = await db.collection("FeaturedProfiles").where("id", "in", eventData.featuredProfileIds).get();

            featuredProfileNames = profilesSnapshot.docs.map((doc) => doc.data().name);

        } catch (error) {
            console.error("Lỗi lấy profile names:", error);

        }
    }
    const data = {
        name: eventData.name || null,
        description: eventData.description || null, 
        tags: eventData.tags || [],
        city: eventData.city || null, 
        category: eventData.category || [], 
        minPrice: eventData.minPrice !== undefined ? eventData.minPrice : null,
        date: eventData.date || null, 
        featuredProfileIds: eventData.featuredProfileIds || [], 
        featuredProfileNames: featuredProfileNames,
        status: eventData.status || null, 
        visibility: eventData.visibility || null,
        imageUrl: eventData.imageUrl || null, 
        bannerUrl: eventData.bannerUrl || null, 
        videoUrl: eventData.videoUrl || null,
        location: eventData.location || null, 
        venueName: eventData.venueName || null, 
        eventType: eventData.eventType || null,

    };

    Object.keys(data).forEach(key => {
        if (data[key] === undefined) data[key] = null;

    });

    return data;

};


// --- CÁC HÀM CRUD ---

const getAllEvents = async (page = 1, limit = 10) => {
    const eventsRef = db.collection('Events').where('visibility', '==', 'public').where('status', '==', 'active');

    const offset = (page - 1) * limit;

    const countSnapshot = await eventsRef.count().get();

    const totalEvents = countSnapshot.data().count;

    const eventsSnapshot = await eventsRef.orderBy('date', 'asc').limit(limit).offset(offset).select("id", "name", "date", "imageUrl", "bannerUrl", "videoUrl", "location", "city", "venueName", "eventType", "minPrice").get();

    const events = [];

    eventsSnapshot.forEach((doc) => {
        const data = doc.data();

        events.push({
            id: doc.id, name: data.name, date: data.date, category: data.category, imageUrl: data.imageUrl, bannerUrl: data.bannerUrl,
            videoUrl: data.videoUrl, location: data.location, city: data.city || null, venueName: data.venueName || null,
            eventType: data.eventType || 'physical', minPrice: data.minPrice !== undefined ? data.minPrice : null,
        });

    });

    return { events, pagination: { currentPage: page, limit: limit, totalPages: Math.ceil(totalEvents / limit), totalItems: totalEvents } };

};


const getEventById = async (eventId, requestingUser = null) => {
    const eventDoc = await db.collection('Events').doc(eventId).get();

    if (!eventDoc.exists || eventDoc.data().status === 'cancelled') return null;

    const eventData = eventDoc.data();

    let venueData = null;

    let featuredProfilesData = [];

    if (eventData.venueId) {
        const venueDoc = await db.collection('Venues').doc(eventData.venueId).get();

        if (venueDoc.exists) venueData = venueDoc.data();

    }
    if (eventData.featuredProfileIds && eventData.featuredProfileIds.length > 0) {
        const profilesSnapshot = await db.collection('FeaturedProfiles').where('id', 'in', eventData.featuredProfileIds).get();

        profilesSnapshot.forEach(doc => {
            featuredProfilesData.push(doc.data());

        });

    }
    let isOwnerOrAdmin = false;

    if (requestingUser) {
        const isAdmin = requestingUser.roles?.includes('organizer');

        const isOwner = eventData.organizerId === requestingUser.uid;

        isOwnerOrAdmin = isAdmin || isOwner;

    }
    if (isOwnerOrAdmin) return { id: eventDoc.id, ...eventData, venue: venueData, featuredProfiles: featuredProfilesData };

    const publicEventView = {
        id: eventDoc.id, name: eventData.name, description: eventData.description, imageUrl: eventData.imageUrl, bannerUrl: eventData.bannerUrl,
        category: eventData.category, tags: eventData.tags, date: eventData.date, endDate: eventData.endDate, eventType: eventData.eventType,
        onlineUrl: eventData.onlineUrl, location: eventData.location, geohash: eventData.geohash, city: eventData.city, venueName: eventData.venueName,
        videoUrl: eventData.videoUrl, isOutdoor: eventData.isOutdoor, status: eventData.status, visibility: eventData.visibility,
        requiredAge: eventData.requiredAge, sponsors: eventData.sponsors, minPrice: eventData.minPrice, featuredProfiles: featuredProfilesData,
        ticketTypes: mapPublicTicketTypes(eventData.ticketTypes), venue: mapPublicVenue(venueData)
    };

    if (eventData.visibility === 'public') return publicEventView;

    if (eventData.visibility === 'unlisted' && requestingUser) return publicEventView;

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

    if (!eventData.date || typeof eventData.date !== 'number') throw new Error('Invalid or missing event date.');

    let geohash = null, location = eventData.location || null, venueName = null, city = null, onlineUrl = eventData.onlineUrl || null;

    const eventType = eventData.eventType || 'physical';

    if (eventType === 'physical') {
        if (eventData.venueId) {
            const venueDoc = await db.collection('Venues').doc(eventData.venueId).get();

            if (venueDoc.exists) {
                const venue = venueDoc.data();
                venueName = venue.name;
                if (venue.addressDetails) city = venue.addressDetails.city || null;
                if (!location && venue.location) location = venue.location;

            } else throw new Error(`Venue with ID ${eventData.venueId} not found.`);

        } else throw new Error('Physical event must have a venueId.');

        if (location?.latitude && location?.longitude) geohash = geofire.geohashForLocation([location.latitude, location.longitude]);

        onlineUrl = null;

    } else if (eventType === 'online') {
        location = null;
        geohash = null;
        venueName = "Online";
        city = "Online";
        if (!onlineUrl) throw new Error('Online event must have an onlineUrl.');

    }
    const minPrice = calculateMinPrice(eventData.ticketTypes || {});

    const now = new Date().getTime();

    const newEventData = {
        id: eventId, name: eventData.name, description: eventData.description || '', imageUrl: eventData.imageUrl || null, bannerUrl: eventData.bannerUrl || null,
        featuredProfileIds: eventData.featuredProfileIds || [], category: eventData.category || [], tags: eventData.tags || [], date: eventData.date, endDate: eventData.endDate || null,
        eventType: eventType, onlineUrl: onlineUrl, location: location, geohash: geohash, venueId: eventData.venueId || null, venueName: venueName, city: city,
        ticketTypes: eventData.ticketTypes || {}, minPrice: minPrice, videoUrl: eventData.videoUrl || '', isOutdoor: eventData.isOutdoor || false,
        organizerId: organizerId, status: 'active', visibility: eventData.visibility || 'public', recurringRule: eventData.recurringRule || null,
        hotScore: 0, viewCount: 0, requiredAge: eventData.requiredAge || 0, sponsors: eventData.sponsors || [], createdAt: now, lastUpdatedAt: now,
    };

    await eventRef.set(newEventData);

    // Gửi cho những ai đang follow Organizer/Artist này
    // Mobile cần subscribe vào topic: `organizer_${organizerId}`
    // Hoặc nếu event có featuredProfileIds, gửi cho từng artist topic

    const topic = `organizer_${organizerId}`;
    const title = "Sự kiện mới!";
    const body = `${newEventData.name} vừa được công bố. Đặt vé ngay!`;
    const data = { eventId: eventId, type: "new_event" };

    // Chạy async không cần await để không chặn response
    fcmService.sendToTopic(topic, title, body, data);

    // Nếu muốn gửi cho fan của Artist nữa:
    if (newEventData.featuredProfileIds) {
        newEventData.featuredProfileIds.forEach(artistId => {
            fcmService.sendToTopic(`artist_${artistId}`, "Idol có show mới!", `${newEventData.name}`, data);
        });
    }

    if (esClient) {
        try {
            const elasticData = await buildElasticData(newEventData);
            await esClient.index({ index: ELASTIC_INDEX, id: eventId, body: elasticData });
        } catch (error) {
            console.error(`❌ [Elastic] Failed to create event: ${eventId}`, error);

        }
    }
    return newEventData;

};


const updateEvent = async (eventId, eventData) => {
    const eventRef = db.collection('Events').doc(eventId);

    let geohash = undefined;

    if (eventData.location?.latitude && eventData.location?.longitude) geohash = geofire.geohashForLocation([eventData.location.latitude, eventData.location.longitude]);

    const updatePayload = { ...eventData, lastUpdatedAt: new Date().getTime(), ...(geohash !== undefined && { geohash: geohash }) };

    if (eventData.venueId) {
        const venueDoc = await db.collection('Venues').doc(eventData.venueId).get();

        if (venueDoc.exists) {
            const venue = venueDoc.data();
            updatePayload.venueName = venue.name;
            if (venue.addressDetails) updatePayload.city = venue.addressDetails.city || null;

            if (venue.location) {
                updatePayload.location = venue.location;
                updatePayload.geohash = geofire.geohashForLocation([venue.location.latitude, venue.location.longitude]);

            }
        }
    } else if (eventData.venueId === null) {
        updatePayload.venueName = null;
        updatePayload.city = null;
        updatePayload.location = null;
        updatePayload.geohash = null;

    }
    if (eventData.eventType === 'online') {
        updatePayload.location = null;
        updatePayload.geohash = null;
        updatePayload.venueId = null;
        updatePayload.venueName = "Online";
        updatePayload.city = "Online";

    }
    if (eventData.ticketTypes) {
        updatePayload.minPrice = calculateMinPrice(eventData.ticketTypes);

    }
    delete updatePayload.id;
    delete updatePayload.organizerId;
    delete updatePayload.createdAt;

    await eventRef.update(updatePayload);

    const updatedDoc = await eventRef.get();

    const fullEventData = updatedDoc.data();

    console.log(`[DEBUG] Đã update Firestore. Video URL mới là:`, fullEventData.videoUrl); // <-- Log 1

    if (esClient) {
        console.log(`[DEBUG] esClient tồn tại, chuẩn bị update Elastic...`); // <-- Log 2
        try {
            if (fullEventData.status !== 'active' || fullEventData.visibility === 'private') {
                await esClient.delete({ index: ELASTIC_INDEX, id: eventId }).catch(() => { });
                console.log(`✅ [Elastic] Removed non-public/inactive event: ${eventId}`);
            } else {
                const elasticData = await buildElasticData(fullEventData);
                console.log(`[DEBUG] Dữ liệu chuẩn bị đẩy lên Elastic:`, JSON.stringify(elasticData.videoUrl)); // <-- Log 3

                const response = await esClient.index({
                    index: ELASTIC_INDEX,
                    id: eventId,
                    body: elasticData
                });
                console.log(`✅ [Elastic] Updated event result:`, response.result); // <-- Log 4 (kết quả từ Elastic)
            }
        } catch (error) {
            console.error(`❌ [Elastic] Failed to update event: ${eventId}`, error);
        }
    } else {
        console.error(`[DEBUG] ⚠️ esClient KHÔNG tồn tại! Kiểm tra lại file config.`); // <-- Log cảnh báo
    }

    return { id: updatedDoc.id, ...fullEventData };

};


const cancelEvent = async (eventId) => {
    const eventRef = db.collection('Events').doc(eventId);

    const eventDoc = await eventRef.get();
    const eventName = eventDoc.exists ? eventDoc.data().name : 'Sự kiện';

    const now = new Date().getTime();
    await eventRef.update({ status: 'cancelled', cancelledAt: now, lastUpdatedAt: now });

    if (esClient) {
        try {
            await esClient.delete({ index: ELASTIC_INDEX, id: eventId });
        } catch (error) {
            if (error.meta && error.meta.statusCode !== 404) console.error(`❌ [Elastic] Failed to delete event: ${eventId}`, error);

        }
    }

    // 1. Tìm tất cả vé đã bán của sự kiện này
    const ticketsSnapshot = await db.collection('Tickets')
        .where('eventId', '==', eventId)
        .where('status', 'in', ['paid', 'checkedIn'])
        .get();

    if (!ticketsSnapshot.empty) {
        const userIds = [...new Set(ticketsSnapshot.docs.map(doc => doc.data().userId))];

        // Chia nhỏ mảng userIds nếu quá 10 người (vì Firestore 'in' limit 10)
        // Ở đây demo đơn giản với < 10 users
        const userDocs = await db.collection('Users')
            .where(admin.firestore.FieldPath.documentId(), 'in', userIds)
            .get();

        const allTokens = [];

        // Duyệt qua từng user
        for (const doc of userDocs.docs) {
            const userData = doc.data();

            // A. Lưu thông báo vào DB (để hiện trong tab Notification)
            // Chạy async không cần await để không chặn luồng chính quá lâu
            notificationService.createNotification(
                doc.id,
                "⚠️ Sự kiện bị hủy",
                `Rất tiếc, sự kiện "${eventName}" đã bị hủy. Chúng tôi sẽ liên hệ hoàn tiền sớm nhất.`,
                "update",
                eventId
            );

            // B. Gom token để gửi Push (FCM)
            // Lấy từ mảng fcmTokens (đa thiết bị)
            if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                allTokens.push(...userData.fcmTokens);
            } else if (userData.fcmToken) {
                // Fallback cho dữ liệu cũ (string)
                allTokens.push(userData.fcmToken);
            }
        }

        // C. Gửi Push Notification (Multicast)
        if (allTokens.length > 0) {
            fcmService.sendMulticast(
                allTokens,
                "⚠️ Sự kiện bị hủy",
                `Sự kiện "${eventName}" đã bị hủy. Nhấn để xem chi tiết.`,
                { eventId: eventId, type: "event_cancelled" }
            );
        }
    }

    const updatedDoc = await eventRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
};


const findNearbyEvents = async (centerLat, centerLon, initialRadiusInKm, page = 1, limit = 10) => {
    const center = [centerLat, centerLon];

    let currentRadiusKm = initialRadiusInKm;
    const MAX_RADIUS_KM = 500;
    const RADIUS_EXPANSION_FACTOR = 2;
    const MIN_RESULTS_TARGET = limit;

    let uniqueResults = [];
    let finalRadiusUsed = currentRadiusKm;

    while (uniqueResults.length < MIN_RESULTS_TARGET && currentRadiusKm <= MAX_RADIUS_KM) {
        finalRadiusUsed = currentRadiusKm;
        const radiusInM = currentRadiusKm * 1000;

        const bounds = geofire.geohashQueryBounds(center, radiusInM);
        const promises = [];

        for (const b of bounds) {
            const q = db.collection('Events').where('status', '==', 'active').where('visibility', '==', 'public').orderBy('geohash').startAt(b[0]).endAt(b[1]);

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

                if (distanceInKm <= currentRadiusKm) {
                    matchingDocs.push({ id: doc.id, ...eventData, distanceKm: distanceInKm });
                }
            }
        }
        uniqueResults = Array.from(new Map(matchingDocs.map(item => [item.id, item])).values());

        uniqueResults.sort((a, b) => a.distanceKm - b.distanceKm);

        if (uniqueResults.length >= MIN_RESULTS_TARGET || currentRadiusKm >= MAX_RADIUS_KM) break;

        currentRadiusKm *= RADIUS_EXPANSION_FACTOR;

    }
    const totalItems = uniqueResults.length;
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;
    const paginatedEvents = uniqueResults.slice(offset, offset + limit);

    const events = paginatedEvents.map(data => ({
        id: data.id, name: data.name, date: data.date, imageUrl: data.imageUrl, bannerUrl: data.bannerUrl, videoUrl: data.videoUrl,
        location: data.location, city: data.city || null, venueName: data.venueName || null, eventType: data.eventType || 'physical',
        minPrice: data.minPrice !== undefined ? data.minPrice : null, distanceKm: data.distanceKm
    }));

    return { events, pagination: { currentPage: page, limit: limit, totalPages: totalPages, totalItems: totalItems, actualRadiusKm: finalRadiusUsed } };

};


const searchEvents = async (queryParams) => {
    if (!esClient) {
        console.error("Elasticsearch unavailable.");
        throw new Error("Dịch vụ tìm kiếm gián đoạn.");

    }
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const offset = (page - 1) * limit;

    const mustFilters = [];
    const shouldClauses = [];

    if (queryParams.category) mustFilters.push({ term: { "category.keyword": queryParams.category } });

    if (queryParams.location) mustFilters.push({ term: { "city.keyword": queryParams.location } });

    const rangeFilters = {};

    const now = () => moment().utcOffset('+07:00').startOf('day');

    if (queryParams.startDate) rangeFilters.date = { gte: Number(queryParams.startDate) };

    if (queryParams.endDate) rangeFilters.date = { ...rangeFilters.date, lte: Number(queryParams.endDate) };

    if (queryParams.date) {
        if (queryParams.date === 'today') rangeFilters.date = { gte: now().valueOf(), lt: now().add(1, 'day').valueOf() };

        else if (queryParams.date === 'tomorrow') rangeFilters.date = { gte: now().add(1, 'day').valueOf(), lt: now().add(2, 'day').valueOf() };

        else if (queryParams.date === 'this_week') rangeFilters.date = { gte: now().valueOf(), lte: now().endOf('week').valueOf() };

        else if (queryParams.date === 'upcoming') rangeFilters.date = { gte: now().valueOf() };

    }
    if (queryParams.minPrice) rangeFilters.minPrice = { gte: Number(queryParams.minPrice) };

    if (queryParams.maxPrice) rangeFilters.minPrice = { ...rangeFilters.minPrice, lte: Number(queryParams.maxPrice) };

    if (Object.keys(rangeFilters).length > 0) mustFilters.push({ range: rangeFilters });


    // --- Lọc hasVideo (Nâng cấp) ---
    if (queryParams.hasVideo === 'true') {
        mustFilters.push({ exists: { field: "videoUrl" } });

    }

    if (queryParams.q) {
        const q = queryParams.q;

        shouldClauses.push({ multi_match: { query: q, fields: ["name", "description", "tags"], fuzziness: "AUTO" } });

        shouldClauses.push({ match: { "featuredProfileNames": { query: q, fuzziness: "AUTO" } } });

        mustFilters.push({ bool: { should: shouldClauses, minimum_should_match: 1 } });

    }
    let sort = [];
    const sortBy = queryParams.sortBy || (queryParams.q ? '_score' : 'date');
    const sortOrder = queryParams.sortOrder || (sortBy === 'date' ? 'asc' : 'desc');

    if (sortBy === '_score') sort.push({ _score: { order: "desc" } });
    else if (sortBy === 'date' || sortBy === 'minPrice') sort.push({ [sortBy]: { order: sortOrder } });
    else sort.push({ date: { order: 'asc' } });

    try {
        const response = await esClient.search({ index: ELASTIC_INDEX, from: offset, size: limit, body: { query: { bool: { must: mustFilters.length > 0 ? mustFilters : { match_all: {} }, } }, sort: sort } });

        const totalItems = response.hits.total.value;

        const events = response.hits.hits.map(hit => {
            const data = hit._source;

            return {
                id: hit._id, name: data.name, date: data.date, imageUrl: data.imageUrl, bannerUrl: data.bannerUrl, videoUrl: data.videoUrl,
                location: data.location, city: data.city, venueName: data.venueName, eventType: data.eventType, minPrice: data.minPrice,
            };

        });

        return { events, pagination: { currentPage: page, limit: limit, totalPages: Math.ceil(totalItems / limit), totalItems: totalItems } };

    } catch (e) {
        console.error("Lỗi tìm kiếm:", e.meta ? e.meta.body.error : e);
        throw new Error("Lỗi máy chủ tìm kiếm.");

    }
};


/**
 * [MỚI - SMART] Lấy danh sách gợi ý sự kiện (For You) bằng Elasticsearch.
 * Dựa trên interests (sở thích) tìm kiếm trên đa trường (tags, artist, category, name...).
 */
const getRecommendations = async (userId, limit = 10) => {
    const userDoc = await db.collection('Users').doc(userId).get();
    if (!userDoc.exists) return [];

    const userData = userDoc.data();
    const interests = userData.matchingPreferences?.interests || [];
    const historyIds = userData.historyEventIds || [];

    console.log(userData, interests, historyIds);


    // Fallback: Nếu không có sở thích, trả về danh sách bình thường
    if (interests.length === 0) {
        return searchEvents({ date: 'upcoming', limit: limit }).then(res => res.events);
    }

    if (!esClient) {
        console.error("Elasticsearch client is not configured. Cannot get smart recommendations.");
        return [];
    }

    try {
        const now = moment().utcOffset('+07:00').valueOf();

        const mustConditions = [
            { term: { "visibility.keyword": "public" } },
            { term: { "status.keyword": "active" } },
            { range: { date: { gte: now } } }
        ];

        const mustNotConditions = [];
        if (historyIds.length > 0) {
            mustNotConditions.push({
                ids: { values: historyIds }
            });
        }

        const shouldConditions = interests.map(interest => ({
            multi_match: {
                query: interest,
                fields: [
                    "category",
                    "tags",
                    "featuredProfileNames",
                    "name",
                    "description"
                ],
                fuzziness: "AUTO"
            }
        }));

        // --- SỬA LỖI Ở ĐÂY (Bỏ { body }) ---
        const response = await esClient.search({
            index: ELASTIC_INDEX,
            size: limit,
            body: {
                query: {
                    bool: {
                        must: mustConditions,
                        must_not: mustNotConditions,
                        should: shouldConditions,
                        minimum_should_match: 1
                    }
                },
                sort: [
                    { _score: { order: "desc" } },
                    { date: { order: "asc" } }
                ]
            }
        });

        const events = response.hits.hits.map(hit => {
            const data = hit._source;
            return {
                id: hit._id,
                name: data.name,
                date: data.date,
                imageUrl: data.imageUrl,
                bannerUrl: data.bannerUrl,
                videoUrl: data.videoUrl,
                location: data.location,
                city: data.city,
                venueName: data.venueName,
                eventType: data.eventType,
                minPrice: data.minPrice,
            };
        });

        console.log(events);


        return events;

    } catch (error) {
        console.error("Lỗi khi lấy recommendations từ Elastic:", error.meta ? error.meta.body.error : error);
        // Fallback an toàn
        return getAllEvents(1, limit).then(res => res.events);
    }
};


/**
 * [MỚI] Lấy dự báo thời tiết.
 */
const getEventWeather = async (eventId) => {
    if (!OPENWEATHER_API_KEY) return null;
    // Nếu chưa cấu hình key

    const eventDoc = await db.collection('Events').doc(eventId).get();

    if (!eventDoc.exists) throw new Error('Event not found');


    const eventData = eventDoc.data();


    if (eventData.eventType === 'online' || !eventData.isOutdoor) return null;

    if (!eventData.location || !eventData.location.latitude) throw new Error('Event location is missing');


    const eventDate = moment(eventData.date);

    const now = moment();

    const daysDiff = eventDate.diff(now, 'days');


    if (daysDiff < 0) return { description: "Sự kiện đã kết thúc" };

    if (daysDiff > 5) return { description: "Dự báo chỉ khả dụng trước sự kiện 5 ngày" };


    try {
        const lat = eventData.location.latitude;

        const lon = eventData.location.longitude;

        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=vi`;


        const response = await axios.get(url);

        const forecasts = response.data.list;

        forecasts.forEach((f, i) => {
            console.log(`--- Forecast #${i} ---`);
            console.log("Time:", f.dt_txt);
            console.log("Temp:", f.main.temp);
            console.log("Weather:", f.weather[0]);
        });

        const targetTime = eventData.date / 1000;


        const bestForecast = forecasts.reduce((prev, curr) => {
            return (Math.abs(curr.dt - targetTime) < Math.abs(prev.dt - targetTime) ? curr : prev);

        });


        return {
            temperature: Math.round(bestForecast.main.temp),
            condition: bestForecast.weather[0].main.toLowerCase(),
            description: bestForecast.weather[0].description,
            iconUrl: `http://openweathermap.org/img/wn/${bestForecast.weather[0].icon}@2x.png`,
            humidity: bestForecast.main.humidity,
            windSpeed: bestForecast.wind.speed
        };

    } catch (error) {
        console.error("Error fetching weather:", error.response?.data || error.message);

        return null;
        // Trả về null thay vì lỗi nếu API thời tiết fail
    }
};


module.exports = {
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    cancelEvent,
    findNearbyEvents,
    searchEvents,
    getRecommendations,
    getEventWeather
};
