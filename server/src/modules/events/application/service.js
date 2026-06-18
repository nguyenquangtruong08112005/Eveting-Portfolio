const { v4: uuidv4 } = require('uuid');
const { calculateMinPrice } = require('@/utils/tickets/calculateMinPrice.tickets');
const esClient = require('@/shared/config/elasticsearch.config');
const { fcmService } = require('@/modules/notifications');
const { BadRequestError, NotFoundError, ForbiddenError, ServiceUnavailableError } = require('@/shared/errors');
const { transaction: dbTransaction } = require('@/providers/database/postgres.client');
const eventPublisher = require('@/shared/events/event-publisher');
const outboxProcessor = require('@/shared/events/outbox-processor');
const cacheProvider = require('@/shared/cache/cache-provider');

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
const { STATUS, VISIBILITY, LIFECYCLE, isPublicDetailVisible, isTransitionAllowed } = require('@/modules/events/domain/event-lifecycle');

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
    const cacheKey = `cache:event:${eventId}`;
    try {
        const cachedDataStr = await cacheProvider.get(cacheKey);
        if (cachedDataStr) {
            const cachedEvent = JSON.parse(cachedDataStr);
            let isOwnerOrAdmin = false;
            if (requestingUser) {
                const isAdmin = requestingUser.roles?.includes('organizer') || requestingUser.roles?.includes('admin');
                const isOwner = cachedEvent.organizerId === requestingUser.uid;
                isOwnerOrAdmin = isAdmin || isOwner;
            }
            if (!isOwnerOrAdmin) {
                if (isPublicDetailVisible(cachedEvent.status, cachedEvent.visibility)) return cachedEvent;
                if (cachedEvent.visibility === VISIBILITY.UNLISTED && requestingUser) return cachedEvent;
                return null;
            }
        }
    } catch (err) {
        console.error(`[Cache] Error reading event cache: ${err.message}`);
    }

    const { exists, id, data: eventData } = await eventRepository.getEventRawById(eventId);
    if (!exists || eventData.status === STATUS.CANCELLED) return null;

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
        const isAdmin = requestingUser.roles?.includes('organizer') || requestingUser.roles?.includes('admin');
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
        ticketTypes: mapPublicTicketTypes(eventData.ticketTypes), venue: mapPublicVenue(venueData),
        organizerId: eventData.organizerId
    };

    // Cache the public event view
    try {
        await cacheProvider.set(cacheKey, JSON.stringify(publicEventView), 3600);
    } catch (err) {
        console.error(`[Cache] Error setting event cache: ${err.message}`);
    }

    if (isPublicDetailVisible(eventData.status, eventData.visibility)) return publicEventView;
    if (eventData.visibility === VISIBILITY.UNLISTED && requestingUser) return publicEventView;
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
        status: STATUS.PENDING,
        visibility: VISIBILITY.PRIVATE,
        recurringRule: eventData.recurringRule || null,
        hotScore: 0,
        viewCount: 0,
        requiredAge: eventData.requiredAge || 0,
        sponsors: eventData.sponsors || [],
        createdAt: now,
        lastUpdatedAt: now,
    };

    const isDraft = eventData.saveAsDraft === true;
    const eventToPersist = { ...newEventData, lifecycleStatus: isDraft ? LIFECYCLE.DRAFT : LIFECYCLE.SUBMITTED };

    await dbTransaction(async (transaction) => {
        await eventRepository.createEvent(eventId, eventToPersist, transaction);

        await eventPublisher.publish('search_index', {
            action: 'index',
            eventId: eventId
        }, transaction);

        if (!isDraft) {
            const data = { eventId: eventId, type: "new_event" };
            if (newEventData.featuredProfileIds) {
                for (const artistId of newEventData.featuredProfileIds) {
                    await eventPublisher.publish('notification', {
                        channel: 'push',
                        topic: `artist_${artistId}`,
                        title: "Idol có show mới!",
                        body: `${newEventData.name}`,
                        data
                    }, transaction);
                }
            }
        }
    });

    outboxProcessor.triggerProcess();

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

    let fullEventData;
    await dbTransaction(async (transaction) => {
        await eventRepository.updateEvent(eventId, updatePayload, transaction);
        fullEventData = await eventRepository.getEventInTransaction(transaction, eventId);

        await eventPublisher.publish('search_index', {
            action: 'index',
            eventId: eventId
        }, transaction);

        if (exists) {
            const shouldNotify = hasImportantChanges(oldDataSafe, fullEventData);
            if (shouldNotify) {
                await eventPublisher.publish('notification', {
                    channel: 'event_update',
                    eventId: eventId,
                    eventName: fullEventData.name
                }, transaction);
            }
        }
    });

    outboxProcessor.triggerProcess();

    return fullEventData;
};

const cancelEvent = async (eventId) => {
    const { exists, data: eventData } = await eventRepository.getEventRawById(eventId);
    const eventName = exists ? eventData.name : 'Sự kiện';
    const now = new Date().getTime();

    let fullEventData;
    await dbTransaction(async (transaction) => {
        await eventRepository.updateEvent(eventId, { status: STATUS.CANCELLED, lifecycleStatus: LIFECYCLE.CANCELLED, cancelledAt: now, lastUpdatedAt: now }, transaction);
        fullEventData = await eventRepository.getEventInTransaction(transaction, eventId);

        await eventPublisher.publish('search_index', {
            action: 'delete',
            eventId: eventId
        }, transaction);

        await eventPublisher.publish('notification', {
            channel: 'event_cancellation',
            eventId: eventId,
            eventName: eventName
        }, transaction);
    });

    outboxProcessor.triggerProcess();

    return fullEventData;
};

const submitDraft = async (eventId, requestingUserId) => {
    const row = await eventRepository.getEventLifecycleOwnership(eventId);
    if (!row) {
        throw new NotFoundError('Event not found.');
    }
    if (row.organizer_id !== requestingUserId) {
        throw new ForbiddenError('You do not have permission to submit this draft.');
    }
    if (!isTransitionAllowed(row.lifecycle_status, LIFECYCLE.SUBMITTED)) {
        throw new BadRequestError(`Cannot submit draft: current lifecycle status "${row.lifecycle_status}" cannot transition to "${LIFECYCLE.SUBMITTED}".`);
    }

    const now = new Date().getTime();
    await eventRepository.updateEvent(eventId, {
        lifecycleStatus: LIFECYCLE.SUBMITTED,
        status: STATUS.PENDING,
        visibility: VISIBILITY.PRIVATE,
        lastUpdatedAt: now,
    });

    const fullEventData = await eventRepository.getEventById(eventId);
    return fullEventData;
};

const searchEvents = async (queryParams) => {
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const searchString = queryParams.q || '';

    // 1. Try Elasticsearch first
    if (esClient) {
        const { query: esQuery, sort: esSort, offset, limit: esLimit } = buildSearchQuery(queryParams);
        try {
            const response = await esClient.search({
                index: ELASTIC_INDEX,
                from: offset,
                size: esLimit,
                body: { query: esQuery, sort: esSort }
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
            return { events, pagination: { currentPage: page, limit: esLimit, totalPages: Math.ceil(totalItems / esLimit), totalItems: totalItems } };
        } catch (e) {
            console.warn("Elasticsearch search failed, falling back to database: ", e.message || e);
        }
    }

    // 2. Fallback to PostgreSQL relational query
    const { entries, totalItems } = await eventRepository.searchPublicEvents(searchString, page, limit);
    const events = entries.map(({ id, data }) => ({
        id, name: data.name, date: data.date, imageUrl: data.imageUrl, bannerUrl: data.bannerUrl,
        videoUrl: data.videoUrl, location: data.location, city: data.city || null, venueName: data.venueName || null,
        eventType: data.eventType || 'physical', minPrice: data.minPrice !== undefined ? data.minPrice : null,
    }));

    return { events, pagination: { currentPage: page, limit: limit, totalPages: Math.ceil(totalItems / limit), totalItems: totalItems } };
};

const getRecommendations = async (userId, limit = 10) => {
    const userData = await userRepository.getRawUserDataById(userId);
    if (!userData) return [];
    const interests = userData.matchingPreferences?.interests || [];
    const historyIds = userData.historyEventIds || [];

    if (interests.length === 0) {
        try {
            const result = await searchEvents({ date: 'upcoming', limit: limit });
            return result.events;
        } catch (error) {
            console.error("Lỗi recommendations (no interests fallback):", error.message || error);
            const fallback = await getAllEvents(1, limit);
            return fallback.events;
        }
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
    getAllEvents, getEventById, createEvent, updateEvent, cancelEvent, submitDraft, findNearbyEvents, searchEvents, getRecommendations, getEventWeather
};
