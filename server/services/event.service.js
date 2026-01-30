// services/event.service.js
const { db, FieldValue } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');
const geofire = require('geofire-common');
const { calculateMinPrice } = require('../utils/tickets/calculateMinPrice.tickets');
const esClient = require('../config/elasticsearch.config');
const moment = require('moment');
const axios = require('axios');
const fcmService = require('./fcm.service');
const notificationService = require('./notification.service'); // Import notification service
const admin = require('firebase-admin');

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
            const profilesSnapshot = await db.collection("FeaturedProfiles")
                .where("id", "in", eventData.featuredProfileIds)
                .get();
            featuredProfileNames = profilesSnapshot.docs.map((doc) => doc.data().name);
        } catch (error) {
            console.error(`Lỗi lấy profile names cho event ${eventData.id}:`, error);
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
    Object.keys(data).forEach(key => { if (data[key] === undefined) data[key] = null; });
    return data;
};

// --- LOGIC GỬI THÔNG BÁO CẬP NHẬT (MỚI) ---

/**
 * Kiểm tra xem có thay đổi quan trọng nào không.
 * Chỉ cần 1 trường thay đổi là trả về true.
 */
const hasImportantChanges = (oldData, newData) => {
    // Các trường quan trọng cần báo cho user nếu thay đổi
    const criticalFields = [
        'name',          // Tên sự kiện
        'date',          // Ngày giờ
        'venueName',     // Tên địa điểm
        'eventType',     // Online/Offline
        'onlineUrl',     // Link online
        'isOutdoor'      // Trong nhà/Ngoài trời
    ];

    for (const field of criticalFields) {
        // So sánh lỏng (loose equality) hoặc JSON stringify để an toàn với null/undefined
        if (JSON.stringify(oldData[field]) !== JSON.stringify(newData[field])) {
            console.log(`[EventUpdate] Detected change in field: ${field}`);
            return true;
        }
    }

    // Kiểm tra thay đổi địa chỉ chi tiết (nếu có)
    // (Cần logic phức tạp hơn nếu structure object khác nhau, nhưng so sánh venueName/city ở trên thường đủ)

    return false;
};

/**
 * Gửi thông báo Broadcast cho những người đã mua vé
 */
const notifyAttendeesAboutUpdate = async (eventId, eventName) => {
    try {
        // 1. Tìm tất cả vé đã bán (Paid hoặc CheckedIn)
        const ticketsSnapshot = await db.collection('Tickets')
            .where('eventId', '==', eventId)
            .where('status', 'in', ['paid', 'checkedIn'])
            .get();

        if (ticketsSnapshot.empty) return;

        // Lấy danh sách userId duy nhất
        const userIds = [...new Set(ticketsSnapshot.docs.map(doc => doc.data().userId))];
        console.log(`[EventUpdate] Found ${userIds.length} users to notify.`);

        // 2. Chuẩn bị nội dung thông báo
        const title = "⚠️ Cập nhật sự kiện";
        const body = `Sự kiện "${eventName}" vừa có thay đổi thông tin. Vui lòng kiểm tra lại vé và chi tiết sự kiện.`;
        const payloadData = {
            eventId: eventId,
            type: "event_update"
        };

        // 3. Lấy token và gửi thông báo (Batching)
        // (Tái sử dụng logic gom token giống hàm broadcastNotification)
        const tokens = [];

        // Chia mảng user thành các chunk nhỏ để query Firestore (limit 'in' query is 10/30)
        const CHUNK_SIZE = 10;
        for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
            const chunk = userIds.slice(i, i + CHUNK_SIZE);
            const userDocs = await db.collection('Users')
                .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
                .get();

            userDocs.forEach(doc => {
                const userData = doc.data();
                // Tạo thông báo trong app
                notificationService.createNotification(doc.id, title, body, "update", eventId);

                // Gom token
                if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                    tokens.push(...userData.fcmTokens);
                } else if (userData.fcmToken) {
                    tokens.push(userData.fcmToken);
                }
            });
        }

        // Gửi FCM nếu có token
        if (tokens.length > 0) {
            await fcmService.sendMulticast(tokens, title, body, payloadData);
        }

    } catch (error) {
        console.error("[EventUpdate] Failed to notify attendees:", error);
    }
};


// --- CÁC HÀM CRUD ---

const getAllEvents = async (page = 1, limit = 10) => {
    const eventsRef = db.collection('Events')
        .where('visibility', '==', 'public')
        .where('status', '==', 'active');
    const offset = (page - 1) * limit;

    const countSnapshot = await eventsRef.count().get();
    const totalEvents = countSnapshot.data().count;

    const eventsSnapshot = await eventsRef
        .orderBy('date', 'asc')
        .limit(limit)
        .offset(offset)
        .select("id", "name", "date", "imageUrl", "bannerUrl", "videoUrl", "location", "city", "venueName", "eventType", "minPrice")
        .get();

    const events = [];
    eventsSnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
            id: doc.id, name: data.name, date: data.date, category: data.category,
            imageUrl: data.imageUrl, bannerUrl: data.bannerUrl, videoUrl: data.videoUrl,
            location: data.location, city: data.city || null, venueName: data.venueName || null,
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
        const profilesSnapshot = await db.collection('FeaturedProfiles')
            .where('id', 'in', eventData.featuredProfileIds)
            .get();
        profilesSnapshot.forEach(doc => { featuredProfilesData.push(doc.data()); });
    }

    let isOwnerOrAdmin = false;
    if (requestingUser) {
        const isAdmin = requestingUser.roles?.includes('organizer');
        const isOwner = eventData.organizerId === requestingUser.uid;
        isOwnerOrAdmin = isAdmin || isOwner;
    }

    if (isOwnerOrAdmin) {
        return { id: eventDoc.id, ...eventData, venue: venueData, featuredProfiles: featuredProfilesData };
    }

    const publicEventView = {
        id: eventDoc.id, name: eventData.name, description: eventData.description,
        imageUrl: eventData.imageUrl, bannerUrl: eventData.bannerUrl,
        category: eventData.category, tags: eventData.tags, date: eventData.date, endDate: eventData.endDate,
        eventType: eventData.eventType, onlineUrl: eventData.onlineUrl, location: eventData.location,
        geohash: eventData.geohash, city: eventData.city, venueName: eventData.venueName,
        videoUrl: eventData.videoUrl, isOutdoor: eventData.isOutdoor, status: eventData.status,
        visibility: eventData.visibility, requiredAge: eventData.requiredAge, sponsors: eventData.sponsors,
        minPrice: eventData.minPrice, featuredProfiles: featuredProfilesData,
        ticketTypes: mapPublicTicketTypes(eventData.ticketTypes), venue: mapPublicVenue(venueData)
    };

    if (eventData.visibility === 'public') return publicEventView;
    if (eventData.visibility === 'unlisted' && requestingUser) return publicEventView;
    return null;
};

const createEvent = async (eventData, organizerId) => {
    const eventId = `evt_${uuidv4()}`;
    const eventRef = db.collection('Events').doc(eventId);

    if (!eventData.date || typeof eventData.date !== 'number') {
        throw new Error('Invalid or missing event date (must be a timestamp).');
    }

    if (Array.isArray(eventData.ticketTypes)) {
        throw new Error("ticketTypes must be a Map (Object), not a List (Array).");
    }
    let geohash = null;
    let location = eventData.location || null;
    let venueName = null;
    let city = null;
    let onlineUrl = eventData.onlineUrl || null;
    const eventType = eventData.eventType || 'physical';
    let finalVenueId = eventData.venueId || null;

    if (eventType === 'physical') {
        if (finalVenueId) {
            const venueDoc = await db.collection('Venues').doc(finalVenueId).get();
            if (venueDoc.exists) {
                const venue = venueDoc.data();
                venueName = venue.name;
                if (venue.addressDetails) city = venue.addressDetails.city || null;
                if (!location && venue.location) location = venue.location;
            } else {
                throw new Error(`Venue with ID ${finalVenueId} not found.`);
            }
        }
        else if (location && eventData.venueName && eventData.addressDetails) {
            const newVenueId = `venue_${uuidv4()}`;
            const lat = location.lat || location.latitude;
            const lng = location.lng || location.longitude;

            let finalAddressDetails = {};
            if (eventData.addressDetails) {
                finalAddressDetails = {
                    street: eventData.addressDetails.street || "",
                    ward: eventData.addressDetails.ward || "",
                    district: eventData.addressDetails.district || "",
                    city: eventData.addressDetails.city || "Unknown"
                };
            } else {
                finalAddressDetails = {
                    street: eventData.addressDetails || "",
                    city: eventData.addressDetails.city || "Unknown",
                    district: "",
                    ward: ""
                };
            }

            const newVenue = {
                id: newVenueId,
                name: eventData.venueName,
                addressDetails: finalAddressDetails,
                location: { latitude: lat, longitude: lng },
                seatMapTemplate: { totalSeats: 0, layout: [] }
            };

            await db.collection('Venues').doc(newVenueId).set(newVenue);

            finalVenueId = newVenueId;
            venueName = newVenue.name;
            city = newVenue.addressDetails.city;
        }
        else {
            throw new Error('Physical event must have either a valid venueId OR full location details (name, address).');
        }

        if (location && (location.latitude || location.lat) && (location.longitude || location.lng)) {
            const lat = location.latitude || location.lat;
            const lng = location.longitude || location.lng;
            geohash = geofire.geohashForLocation([lat, lng]);
            location = { latitude: lat, longitude: lng };
        }
        onlineUrl = null;

    } else if (eventType === 'online') {
        location = null;
        geohash = null;
        venueName = "Online";
        city = "Online";
        finalVenueId = null;
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
        venueId: finalVenueId,
        venueName: venueName,
        city: city,
        ticketTypes: eventData.ticketTypes || {},
        minPrice: minPrice,
        videoUrl: eventData.videoUrl || '',
        isOutdoor: eventData.isOutdoor || false,
        organizerId: organizerId,
        status: 'pending',
        visibility: 'private',
        recurringRule: eventData.recurringRule || null,
        hotScore: 0,
        viewCount: 0,
        requiredAge: eventData.requiredAge || 0,
        sponsors: eventData.sponsors || [],
        createdAt: now,
        lastUpdatedAt: now,
    };

    await eventRef.set(newEventData);

    const topic = `organizer_${organizerId}`;
    const title = "Sự kiện mới!";
    const body = `${newEventData.name} vừa được công bố. Đặt vé ngay!`;
    const data = { eventId: eventId, type: "new_event" };

    if (newEventData.featuredProfileIds) {
        newEventData.featuredProfileIds.forEach(artistId => {
            fcmService.sendToTopic(`artist_${artistId}`, "Idol có show mới!", `${newEventData.name}`, data);
        });
    }

    return newEventData;
};

const updateEvent = async (eventId, eventData) => {
    const eventRef = db.collection('Events').doc(eventId);

    if (Array.isArray(eventData.ticketTypes)) {
        throw new Error("ticketTypes must be a Map (Object), not a List (Array).");
    }

    // 1. Lấy dữ liệu CŨ để so sánh
    const oldDoc = await eventRef.get();
    const oldData = oldDoc.exists ? oldDoc.data() : {};

    let geohash = undefined;
    if (eventData.location?.latitude && eventData.location?.longitude) {
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
            if (venue.addressDetails) updatePayload.city = venue.addressDetails.city || null;
            if (venue.location) {
                updatePayload.location = venue.location;
                updatePayload.geohash = geofire.geohashForLocation([venue.location.latitude, venue.location.longitude]);
            }
        }
    } else if (eventData.venueId === null) {
        updatePayload.venueName = null; updatePayload.city = null; updatePayload.location = null; updatePayload.geohash = null;
    }
    if (eventData.eventType === 'online') {
        updatePayload.location = null; updatePayload.geohash = null; updatePayload.venueId = null; updatePayload.venueName = "Online"; updatePayload.city = "Online";
    }
    if (eventData.ticketTypes) {
        updatePayload.minPrice = calculateMinPrice(eventData.ticketTypes);
    }

    delete updatePayload.id; delete updatePayload.organizerId; delete updatePayload.createdAt;

    // 2. Thực hiện Update
    await eventRef.update(updatePayload);
    const updatedDoc = await eventRef.get();
    const fullEventData = { id: updatedDoc.id, ...updatedDoc.data() };

    // 3. Kiểm tra thay đổi và gửi thông báo (Logic Mới)
    if (oldDoc.exists) {
        const shouldNotify = hasImportantChanges(oldData, fullEventData);
        if (shouldNotify) {
            // Chạy async không cần await để trả response nhanh cho Organizer
            notifyAttendeesAboutUpdate(eventId, fullEventData.name).catch(err =>
                console.error("Background notification failed:", err)
            );
        }
    }

    if (esClient) {
        try {
            if (fullEventData.status !== 'active' || fullEventData.visibility === 'private') {
                await esClient.delete({ index: ELASTIC_INDEX, id: eventId }).catch(() => { });
            } else {
                const elasticData = await buildElasticData(fullEventData);
                await esClient.index({ index: ELASTIC_INDEX, id: eventId, body: elasticData });
            }
        } catch (error) {
            console.error(`❌ [Elastic] Failed to update event: ${eventId}`, error);
        }
    }
    return fullEventData;
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

    // Gửi thông báo hủy
    const ticketsSnapshot = await db.collection('Tickets')
        .where('eventId', '==', eventId)
        .where('status', 'in', ['paid', 'checkedIn'])
        .get();

    if (!ticketsSnapshot.empty) {
        const userIds = [...new Set(ticketsSnapshot.docs.map(doc => doc.data().userId))];

        const chunks = [];
        for (let i = 0; i < userIds.length; i += 10) {
            chunks.push(userIds.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            const userDocs = await db.collection('Users')
                .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
                .get();

            const allTokens = [];
            for (const doc of userDocs.docs) {
                const userData = doc.data();
                notificationService.createNotification(
                    doc.id,
                    "⚠️ Sự kiện bị hủy",
                    `Rất tiếc, sự kiện "${eventName}" đã bị hủy.`,
                    "update",
                    eventId
                );
                if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) allTokens.push(...userData.fcmTokens);
                else if (userData.fcmToken) allTokens.push(userData.fcmToken);
            }

            if (allTokens.length > 0) {
                fcmService.sendMulticast(allTokens, "⚠️ Sự kiện bị hủy", `Sự kiện "${eventName}" đã bị hủy.`, { eventId: eventId, type: "event_cancelled" });
            }
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
            const q = db.collection('Events')
                .where('status', '==', 'active')
                .where('visibility', '==', 'public')
                .orderBy('geohash')
                .startAt(b[0]).endAt(b[1]);
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
        id: data.id, name: data.name, date: data.date, imageUrl: data.imageUrl, bannerUrl: data.bannerUrl,
        videoUrl: data.videoUrl, location: data.location, city: data.city || null, venueName: data.venueName || null,
        eventType: data.eventType || 'physical', minPrice: data.minPrice !== undefined ? data.minPrice : null,
        distanceKm: data.distanceKm
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

    if (queryParams.category) mustFilters.push({ term: { "category.keyword": queryParams.category.toLowerCase() } });
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

    if (queryParams.hasVideo === 'true') mustFilters.push({ exists: { field: "videoUrl" } });

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
                id: hit._id, name: data.name, date: data.date, imageUrl: data.imageUrl, bannerUrl: data.bannerUrl,
                videoUrl: data.videoUrl, location: data.location, city: data.city, venueName: data.venueName,
                eventType: data.eventType, minPrice: data.minPrice,
            };
        });
        return { events, pagination: { currentPage: page, limit: limit, totalPages: Math.ceil(totalItems / limit), totalItems: totalItems } };
    } catch (e) {
        console.error("Lỗi tìm kiếm:", e.meta ? e.meta.body.error : e);
        throw new Error("Lỗi máy chủ tìm kiếm.");
    }
};

const getRecommendations = async (userId, limit = 10) => {
    const userDoc = await db.collection('Users').doc(userId).get();
    if (!userDoc.exists) return [];
    const userData = userDoc.data();
    const interests = userData.matchingPreferences?.interests || [];
    const historyIds = userData.historyEventIds || [];

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
            mustNotConditions.push({ ids: { values: historyIds } });
        }
        const shouldConditions = interests.map(interest => ({
            multi_match: {
                query: interest,
                fields: ["category^3", "tags^3", "featuredProfileNames^2", "name", "description"],
                fuzziness: "AUTO"
            }
        }));

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
                sort: [{ _score: { order: "desc" } }, { date: { order: "asc" } }]
            }
        });

        const events = response.hits.hits.map(hit => {
            const data = hit._source;
            return {
                id: hit._id, name: data.name, date: data.date, imageUrl: data.imageUrl, bannerUrl: data.bannerUrl,
                videoUrl: data.videoUrl, location: data.location, city: data.city, venueName: data.venueName,
                eventType: data.eventType, minPrice: data.minPrice,
            };
        });
        return events;
    } catch (error) {
        console.error("Lỗi recommendations:", error);
        return getAllEvents(1, limit).then(res => res.events);
    }
};
const getEventWeather = async (eventId) => {
    // console.log(`[WeatherDebug] --- Start fetching for: ${eventId} ---`);

    if (!OPENWEATHER_API_KEY) {
        // console.error("[WeatherDebug] ❌ Missing OPENWEATHER_API_KEY in environment variables");
        return null;
    }

    const eventDoc = await db.collection('Events').doc(eventId).get();
    if (!eventDoc.exists) {
        // console.error("[WeatherDebug] ❌ Event doc not found in Firestore");
        throw new Error('Event not found');
    }

    const eventData = eventDoc.data();
    // console.log(`[WeatherDebug] Event Info: Name="${eventData.name}", Type=${eventData.eventType}, IsOutdoor=${eventData.isOutdoor}`);

    // Check 1: Event Type
    if (eventData.eventType === 'online') {
        // console.log("[WeatherDebug] ℹ️ Returns NULL because eventType is 'online'");
        return null;
    }

    // // Check 2: Is Outdoor
    // // Lưu ý: Nếu DB lưu là string "true"/"false" hay boolean true/false đều cần check kỹ
    // if (!eventData.isOutdoor) {
    //     // console.log(`[WeatherDebug] ℹ️ Returns NULL because isOutdoor is falsy (${eventData.isOutdoor})`);
    //     return null;
    // }

    // Check 3: Location
    if (!eventData.location || !eventData.location.latitude) {
        // console.error("[WeatherDebug] ❌ Returns Error because Location/Latitude is missing");
        throw new Error('Event location is missing');
    }

    const eventDate = moment(eventData.date);
    const now = moment();
    const daysDiff = eventDate.diff(now, 'days');
    // console.log(`[WeatherDebug] Date Check: EventDate=${eventDate.format()}, Now=${now.format()}, DaysDiff=${daysDiff}`);

    if (daysDiff < 0) {
        // console.log("[WeatherDebug] ℹ️ Returns Message: Event ended");
        return { description: "Sự kiện đã kết thúc" };
    }
    
    // OpenWeather Free chỉ dự báo 5 ngày / 3 giờ
    if (daysDiff > 5) {
        // console.log("[WeatherDebug] ℹ️ Returns Message: Too far (>5 days)");
        return { description: "Dự báo chỉ khả dụng trước sự kiện 5 ngày" };
    }

    try {
        const lat = eventData.location.latitude;
        const lon = eventData.location.longitude;
        // Ẩn bớt key khi log
        const maskedKey = OPENWEATHER_API_KEY.substring(0, 4) + "***"; 
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=vi`;
        
        // console.log(`[WeatherDebug] 📡 Calling OpenWeather API... (Lat: ${lat}, Lon: ${lon}, Key: ${maskedKey})`);

        const response = await axios.get(url);
        const forecasts = response.data.list;
        
        if (!forecasts || forecasts.length === 0) {
            //  console.error("[WeatherDebug] ❌ OpenWeather returned empty list");
             return null;
        }

        const targetTime = eventData.date / 1000;
        
        // Tìm mốc thời gian dự báo gần nhất với giờ sự kiện
        const bestForecast = forecasts.reduce((prev, curr) => {
            return (Math.abs(curr.dt - targetTime) < Math.abs(prev.dt - targetTime) ? curr : prev);
        });

        // console.log("[WeatherDebug] ✅ Success! Found forecast:", bestForecast.weather[0].description);

        return {
            temperature: Math.round(bestForecast.main.temp),
            condition: bestForecast.weather[0].main.toLowerCase(),
            description: bestForecast.weather[0].description,
            iconUrl: `http://openweathermap.org/img/wn/${bestForecast.weather[0].icon}@2x.png`,
            humidity: bestForecast.main.humidity,
            windSpeed: bestForecast.wind.speed
        };
    } catch (error) {
        console.error("[WeatherDebug] ❌ API Call Failed:", error.response?.data || error.message);
        // Kiểm tra xem có phải lỗi 401 (sai key) hay 429 (hết lượt) không
        if (error.response) {
            console.error("[WeatherDebug] HTTP Status:", error.response.status);
        }
        return null;
    }
};

module.exports = {
    getAllEvents, getEventById, createEvent, updateEvent, cancelEvent, findNearbyEvents, searchEvents, getRecommendations, getEventWeather
};