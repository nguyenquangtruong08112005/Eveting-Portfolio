const { v4: uuidv4 } = require('uuid');
const { calculateMinPrice } = require('@/utils/tickets/calculateMinPrice.tickets');
const esClient = require('@/shared/config/elasticsearch.config');
const { fcmService } = require('@/modules/notifications');
const { BadRequestError, NotFoundError, ServiceUnavailableError } = require('@/shared/errors');

const eventRepository = require('@/providers/database/event.repository');
const venueRepository = require('@/providers/database/venue.repository');
const ticketRepository = require('@/providers/database/ticket.repository');
const userRepository = require('@/providers/database/user.repository');
const featuredProfileRepository = require('@/providers/database/featuredProfile.repository');

// Extracted helpers, policies, and query builders
const { mapPublicTicketTypes, mapPublicVenue, buildElasticData } = require('./helpers/event-mappers');
const { hasImportantChanges } = require('./policies/update-policy');
const { notifyAttendeesAboutUpdate, notifyAttendeesAboutCancellation } = require('./helpers/notification-sender');
const { buildSearchQuery } = require('./query-builders/search-query.builder');
const { buildRecommendationQuery } = require('./query-builders/recommendation-query.builder');
const { findNearbyEvents } = require('./helpers/nearby-events.helper');
const { resolveVenueAndLocationForCreate, resolveVenueAndLocationForUpdate } = require('./helpers/venue-handler');
const { getEventWeather } = require('./helpers/weather.helper');

const ELASTIC_INDEX = 'events';

const getAllEvents = async (page = 1, limit = 10) => {
    const { entries, totalItems } = await eventRepository.getPublicEventsPage(page, limit);

    const events = entries.map(({ id, data }) => ({
        id, name: data.name, date: data.date, category: data.category,
        imageUrl: data.imageUrl, bannerUrl: data.bannerUrl, videoUrl: data.videoUrl,
        location: data.location, city: data.city || null, venueName: data.venueName || null,
        eventType: data.eventType || 'physical', minPrice: data.minPrice !== undefined ? data.minPrice : null,
    }));

    return { events, pagination: { currentPage: page, limit: limit, totalPages: Math.ceil(totalItems / limit), totalItems: totalItems } };
};

const getEventById = async (eventId, requestingUser = null) => {
    const { exists, id, data: eventData } = await eventRepository.getEventRawById(eventId);
    if (!exists || eventData.status === 'cancelled') return null;

    let venueData = null;
    let featuredProfilesData = [];

    if (eventData.venueId) {
        const venueResult = await venueRepository.getVenueRawById(eventData.venueId);
        if (venueResult.exists) venueData = venueResult.data;
    }
    if (eventData.featuredProfileIds && eventData.featuredProfileIds.length > 0) {
        featuredProfilesData = await featuredProfileRepository.getFeaturedProfilesDataByIds(eventData.featuredProfileIds);
    }

    let isOwnerOrAdmin = false;
    if (requestingUser) {
        const isAdmin = requestingUser.roles?.includes('organizer');
        const isOwner = eventData.organizerId === requestingUser.uid;
        isOwnerOrAdmin = isAdmin || isOwner;
    }

    if (isOwnerOrAdmin) {
        return { id, ...eventData, venue: venueData, featuredProfiles: featuredProfilesData };
    }

    const publicEventView = {
        id, name: eventData.name, description: eventData.description,
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

    if (!eventData.date || typeof eventData.date !== 'number') {
        throw new BadRequestError('Invalid or missing event date (must be a timestamp).');
    }

    if (Array.isArray(eventData.ticketTypes)) {
        throw new BadRequestError("ticketTypes must be a Map (Object), not a List (Array).");
    }

    const {
        geohash,
        location,
        venueName,
        city,
        onlineUrl,
        venueId
    } = await resolveVenueAndLocationForCreate(eventData);

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
        eventType: eventData.eventType || 'physical',
        onlineUrl: onlineUrl,
        location: location,
        geohash: geohash,
        venueId: venueId,
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

    await eventRepository.createEvent(eventId, newEventData);

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
    if (Array.isArray(eventData.ticketTypes)) {
        throw new BadRequestError("ticketTypes must be a Map (Object), not a List (Array).");
    }

    const { exists, data: oldData } = await eventRepository.getEventRawById(eventId);
    const oldDataSafe = exists ? oldData : {};

    const updatePayload = {
        ...eventData,
        lastUpdatedAt: new Date().getTime(),
    };

    await resolveVenueAndLocationForUpdate(eventData, updatePayload);

    if (eventData.ticketTypes) {
        updatePayload.minPrice = calculateMinPrice(eventData.ticketTypes);
    }

    delete updatePayload.id; delete updatePayload.organizerId; delete updatePayload.createdAt;

    await eventRepository.updateEvent(eventId, updatePayload);
    const fullEventData = await eventRepository.getEventById(eventId);

    if (exists) {
        const shouldNotify = hasImportantChanges(oldDataSafe, fullEventData);
        if (shouldNotify) {
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
    const { exists, data: eventData } = await eventRepository.getEventRawById(eventId);
    const eventName = exists ? eventData.name : 'Sự kiện';
    const now = new Date().getTime();

    await eventRepository.updateEvent(eventId, { status: 'cancelled', cancelledAt: now, lastUpdatedAt: now });

    if (esClient) {
        try {
            await esClient.delete({ index: ELASTIC_INDEX, id: eventId });
        } catch (error) {
            if (error.meta && error.meta.statusCode !== 404) console.error(`❌ [Elastic] Failed to delete event: ${eventId}`, error);
        }
    }

    await notifyAttendeesAboutCancellation(eventId, eventName);

    const fullEventData = await eventRepository.getEventById(eventId);
    return fullEventData;
};

const searchEvents = async (queryParams) => {
    if (!esClient) {
        console.error("Elasticsearch unavailable.");
        throw new ServiceUnavailableError("Dịch vụ tìm kiếm gián đoạn.");
    }
    const page = parseInt(queryParams.page) || 1;
    const { query, sort, offset, limit } = buildSearchQuery(queryParams);

    try {
        const response = await esClient.search({
            index: ELASTIC_INDEX,
            from: offset,
            size: limit,
            body: { query, sort }
        });
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
        console.error("Lỗi tìm kiếm:", e.meta?.body?.error || e.message || e);
        throw new Error("Lỗi máy chủ tìm kiếm.");
    }
};

const getRecommendations = async (userId, limit = 10) => {
    const userData = await userRepository.getRawUserDataById(userId);
    if (!userData) return [];
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
        const { query, sort } = buildRecommendationQuery(interests, historyIds);

        const response = await esClient.search({
            index: ELASTIC_INDEX,
            size: limit,
            body: { query, sort }
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

module.exports = {
    getAllEvents, getEventById, createEvent, updateEvent, cancelEvent, findNearbyEvents, searchEvents, getRecommendations, getEventWeather
};
