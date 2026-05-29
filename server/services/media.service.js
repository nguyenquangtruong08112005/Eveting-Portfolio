// services/media.service.js
const { v4: uuidv4 } = require('uuid');
const mediaRepository = require('../providers/database/media.repository');

/**
 * Lấy thư viện media của sự kiện
 */
const getEventMedia = async (eventId, page = 1, limit = 20) => {
    return mediaRepository.getEventMediaPage(eventId, page, limit);
};

const canUploadEventMedia = async (userId, eventId) => {
    const hasTicket = await mediaRepository.hasEligibleTicket(userId, eventId);
    if (hasTicket) {
        return true;
    }

    const organizerId = await mediaRepository.getEventOrganizerId(eventId);
    return organizerId === userId;
};

/**
 * Lưu link media người dùng đã upload
 */
const addEventMedia = async (userId, eventId, mediaItems) => {
    // mediaItems là mảng các object: [{ url: "...", type: "image", caption: "..." }]
    const createdItems = [];
    const now = new Date().getTime();

    mediaItems.forEach(item => {
        const mediaId = `media_${uuidv4()}`;
        const newMedia = {
            id: mediaId,
            userId,
            eventId,
            url: item.url,
            type: item.type || 'image', // 'image' hoặc 'video'
            caption: item.caption || '',
            createdAt: now
        };
        createdItems.push(newMedia);
    });

    await mediaRepository.createEventMediaBatch(
        createdItems.map(item => ({ id: item.id, media: item }))
    );

    return createdItems;
};

module.exports = {
    getEventMedia,
    canUploadEventMedia,
    addEventMedia
};
