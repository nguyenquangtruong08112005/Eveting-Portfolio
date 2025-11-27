// services/event.service.js
const { db, FieldValue } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');
const geofire = require('geofire-common');
const { calculateMinPrice } = require('../utils/tickets/calculateMinPrice.tickets');
const esClient = require('../config/elasticsearch.config');
const moment = require('moment');
const axios = require('axios');
const fcmService = require('./fcm.service');
const notificationService = require('./notification.service');
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
    
    // console.log(requestingUser);
    
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
    // console.log(eventData);

    let geohash = null;
    let location = eventData.location || null;
    let venueName = null;
    let city = null;
    let onlineUrl = eventData.onlineUrl || null;
    const eventType = eventData.eventType || 'physical';

    // Biến để lưu Venue ID cuối cùng (dù là có sẵn hay mới tạo)
    let finalVenueId = eventData.venueId || null;

    if (eventType === 'physical') {
        // TRƯỜNG HỢP 1: Người dùng chọn Venue có sẵn
        if (finalVenueId) {
            const venueDoc = await db.collection('Venues').doc(finalVenueId).get();
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
                throw new Error(`Venue with ID ${finalVenueId} not found.`);
            }
        }
        // TRƯỜNG HỢP 2: Người dùng tự nhập địa điểm mới (Chưa có venueId)
        else if (location && eventData.venueName && eventData.addressDetails) {
            // Tự động tạo Venue mới
            const newVenueId = `venue_${uuidv4()}`;

            // Chuẩn hóa tọa độ (mobile có thể gửi lat/lng hoặc latitude/longitude)
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
                // Fallback cho trường hợp cũ (nếu mobile gửi string address)
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
                location: {
                    latitude: lat,
                    longitude: lng
                },
                seatMapTemplate: { totalSeats: 0, layout: [] } // Venue tự tạo thì chưa có seatmap
            };

            // Lưu Venue mới vào DB
            await db.collection('Venues').doc(newVenueId).set(newVenue);

            // Cập nhật thông tin cho Event
            finalVenueId = newVenueId;
            venueName = newVenue.name;
            city = newVenue.addressDetails.city;
            // location giữ nguyên từ input của user
        }
        // TRƯỜNG HỢP 3: Thiếu thông tin
        else {
            throw new Error('Physical event must have either a valid venueId OR full location details (name, address).');
        }

        // Tính geohash từ location
        if (location && (location.latitude || location.lat) && (location.longitude || location.lng)) {
            const lat = location.latitude || location.lat;
            const lng = location.longitude || location.lng;
            geohash = geofire.geohashForLocation([lat, lng]);

            // Chuẩn hóa lại object location trong event để lưu thống nhất
            location = { latitude: lat, longitude: lng };
        }
        onlineUrl = null; // Sự kiện offline không có onlineUrl

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

        // Các trường đã xử lý logic ở trên
        eventType: eventType,
        onlineUrl: onlineUrl,
        location: location,
        geohash: geohash,
        venueId: finalVenueId, // Dùng ID đã xử lý
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

    fcmService.sendToTopic(topic, title, body, data);

    if (newEventData.featuredProfileIds) {
        newEventData.featuredProfileIds.forEach(artistId => {
            fcmService.sendToTopic(`artist_${artistId}`, "Idol có show mới!", `${newEventData.name}`, data);
        });
    }

    // if (esClient) {
    //     try {
    //         const elasticData = await buildElasticData(newEventData);
    //         await esClient.index({ index: ELASTIC_INDEX, id: eventId, body: elasticData });
    //         console.log(`✅ [Elastic] Created event: ${eventId}`);
    //     } catch (error) {
    //         console.error(`❌ [Elastic] Failed to create event: ${eventId}`, error);
    //     }
    // }
    // console.log(newEventData);

    return newEventData;
};

const updateEvent = async (eventId, eventData) => {
    const eventRef = db.collection('Events').doc(eventId);
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

    await eventRef.update(updatePayload);
    const updatedDoc = await eventRef.get();

    const fullEventData = { id: updatedDoc.id, ...updatedDoc.data() };

    // console.log(`[DEBUG] Updated Firestore event: ${eventId}`);

    if (esClient) {
        try {
            if (fullEventData.status !== 'active' || fullEventData.visibility === 'private') {
                await esClient.delete({ index: ELASTIC_INDEX, id: eventId }).catch(() => { });
                // console.log(`✅ [Elastic] Removed non-public/inactive event: ${eventId}`);
            } else {
                const elasticData = await buildElasticData(fullEventData);
                await esClient.index({ index: ELASTIC_INDEX, id: eventId, body: elasticData });
                // console.log(`✅ [Elastic] Updated event: ${eventId}`);
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
            // console.log(`✅ [Elastic] Deleted/Cancelled event: ${eventId}`);
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

        // Xử lý chia batch nếu > 10 user
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
    if (!OPENWEATHER_API_KEY) return null;
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
    }
};

module.exports = {
    getAllEvents, getEventById, createEvent, updateEvent, cancelEvent, findNearbyEvents, searchEvents, getRecommendations, getEventWeather
};