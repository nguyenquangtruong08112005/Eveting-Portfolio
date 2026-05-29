// services/admin.service.js
const eventRepository = require('../providers/database/event.repository');
const featuredProfileRepository = require('../providers/database/featuredProfile.repository');
const adminRepository = require('../providers/database/admin.repository');
const esClient = require('../config/elasticsearch.config');
const ELASTIC_INDEX = 'events';
const fcmService = require('./fcm.service');
const notifHelper = require('./notification-event.helper');
/**
 * Helper: Chuẩn bị dữ liệu để đẩy lên Elastic (Giống bên event.service.js)
 */
const buildElasticData = async (eventData) => {
    // Lấy tên nghệ sĩ để phục vụ tìm kiếm
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
        // Các trường hiển thị (Summary)
        imageUrl: eventData.imageUrl || null,
        bannerUrl: eventData.bannerUrl || null,
        videoUrl: eventData.videoUrl || null,
        location: eventData.location || null,
        venueName: eventData.venueName || null,
        eventType: eventData.eventType || null,
    };

    // Đảm bảo không có undefined
    Object.keys(data).forEach(key => {
        if (data[key] === undefined) data[key] = null;
    });

    return data;
};

/**
 * Lấy danh sách sự kiện chờ duyệt
 */
const getPendingEvents = async (page = 1, limit = 20) => {
    return adminRepository.getPendingEvents(page, limit);
};

/**
 * Duyệt sự kiện: Pending -> Active & Public -> Index Elastic
 */
const approveEvent = async (eventId) => {
    const eventData = await eventRepository.getEventDataById(eventId);

    if (!eventData) {
        throw new Error('Event not found');
    }

    // 1. Cập nhật Firestore
    const updates = {
        status: 'active',
        visibility: 'public',
        approvedAt: new Date().getTime(),
        lastUpdatedAt: new Date().getTime()
    };

    await eventRepository.updateEvent(eventId, updates);
    const newEventData = { ...eventData, ...updates };

    // 2. Gửi thông báo FCM đến từng topic nghệ sĩ
    const featuredProfileIds = newEventData.featuredProfileIds || [];
    const title = "Sự kiện mới!";
    const body = `${newEventData.name} vừa được công bố. Đặt vé ngay!`;
    const payloadData = notifHelper.buildPayloadData("new_event", eventId);

    featuredProfileIds.forEach(artistId => {
        fcmService.sendToTopic(notifHelper.buildTopicName('artist', artistId), title, body, payloadData);
    });

    // 2. Đẩy vào Elasticsearch
    if (esClient) {
        try {
            // Lấy dữ liệu mới nhất đã update (merge data cũ và update mới)
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
            // Không throw lỗi để admin vẫn nhận được response thành công, 
            // nhưng nên có cơ chế retry hoặc log để xử lý sau.
        }
    }

    return { success: true, message: "Event approved and published." };
};

/**
 * Từ chối sự kiện
 */
const rejectEvent = async (eventId, reason) => {
    await eventRepository.updateEvent(eventId, {
        status: 'rejected',
        rejectReason: reason,
        rejectedAt: new Date().getTime(),
        lastUpdatedAt: new Date().getTime()
    });

    // Đảm bảo xóa khỏi Elastic nếu lỡ có (dù pending thường chưa có)
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