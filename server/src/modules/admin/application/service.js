const eventRepository = require('@/providers/database/event.repository');
const featuredProfileRepository = require('@/providers/database/featuredProfile.repository');
const adminRepository = require('@/providers/database/admin.repository');
const esClient = require('@/shared/config/elasticsearch.config');
const ELASTIC_INDEX = 'events';
const { fcmService, helper: notifHelper } = require('@/modules/notifications');
const { STATUS, VISIBILITY } = require('@/modules/events/domain/event-lifecycle');

const buildElasticData = async (eventData) => {
    let featuredProfileNames = [];
    if (eventData.featuredProfileIds && eventData.featuredProfileIds.length > 0) {
        try {
            const profiles = await featuredProfileRepository.getFeaturedProfilesByIds(eventData.featuredProfileIds);
            featuredProfileNames = profiles.map(p => p.name);
        } catch (error) {
            console.error("Lỗi lấy profile names cho Elastic (Admin):", error);
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

const getPendingEvents = async (page = 1, limit = 20) => {
    return adminRepository.getPendingEvents(page, limit);
};

const approveEvent = async (eventId) => {
    const eventData = await eventRepository.getEventDataById(eventId);

    if (!eventData) {
        throw new Error('Event not found');
    }

    const updates = {
        status: STATUS.ACTIVE,
        visibility: VISIBILITY.PUBLIC,
        approvedAt: new Date().getTime(),
        lastUpdatedAt: new Date().getTime()
    };

    await eventRepository.updateEvent(eventId, updates);
    const newEventData = { ...eventData, ...updates };

    const featuredProfileIds = newEventData.featuredProfileIds || [];
    const title = "Sự kiện mới!";
    const body = `${newEventData.name} vừa được công bố. Đặt vé ngay!`;
    const payloadData = notifHelper.buildPayloadData("new_event", eventId);

    featuredProfileIds.forEach(artistId => {
        fcmService.sendToTopic(notifHelper.buildTopicName('artist', artistId), title, body, payloadData);
    });

    if (esClient) {
        try {
            const fullEventData = { ...eventData, ...updates };

            const elasticData = await buildElasticData(fullEventData);

            await esClient.index({
                index: ELASTIC_INDEX,
                id: eventId,
                body: elasticData
            });
            console.log(`✅ [Admin] Approved & Indexed event: ${eventId}`);
        } catch (error) {
            console.error(`❌ [Admin] Failed to index approved event: ${eventId}`, error);
        }
    }

    return { success: true, message: "Event approved and published." };
};

const rejectEvent = async (eventId, reason) => {
    await eventRepository.updateEvent(eventId, {
        status: STATUS.REJECTED,
        rejectReason: reason,
        rejectedAt: new Date().getTime(),
        lastUpdatedAt: new Date().getTime()
    });

    if (esClient) {
        try {
            await esClient.delete({ index: ELASTIC_INDEX, id: eventId }).catch(() => { });
        } catch (e) { }
    }

    return { success: true, message: "Event rejected." };
};

module.exports = {
    getPendingEvents,
    approveEvent,
    rejectEvent
};
