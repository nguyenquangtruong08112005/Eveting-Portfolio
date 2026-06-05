const { v4: uuidv4 } = require('uuid');
const mediaRepository = require('@/providers/database/media.repository');
const activeStorageProvider = require('@/providers/storage');

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

const addEventMedia = async (userId, eventId, mediaItems) => {
    const createdItems = [];
    const now = new Date().getTime();

    mediaItems.forEach(item => {
        const mediaId = `media_${uuidv4()}`;
        const newMedia = {
            id: mediaId,
            userId,
            eventId,
            url: item.url,
            type: item.type || 'image',
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

const addEventMediaFiles = async (userId, eventId, filesData) => {
    const createdItems = [];
    const now = new Date().getTime();

    for (const file of filesData) {
        const fileExt = file.originalname ? file.originalname.split('.').pop() : '';
        const uniqueId = uuidv4();
        const key = `event-media/${eventId}/${uniqueId}${fileExt ? '.' + fileExt : ''}`;

        await activeStorageProvider.uploadBuffer(key, file.buffer, file.mimetype);

        const url = await activeStorageProvider.getPublicUrl(key);
        if (!url) {
            throw new Error(`Storage provider could not generate public URL for key: ${key}`);
        }

        const type = file.mimetype && file.mimetype.startsWith('video/') ? 'video' : 'image';

        const mediaId = `media_${uuidv4()}`;
        const newMedia = {
            id: mediaId,
            userId,
            eventId,
            url,
            type,
            caption: file.caption || '',
            createdAt: now
        };
        createdItems.push(newMedia);
    }

    await mediaRepository.createEventMediaBatch(
        createdItems.map(item => ({ id: item.id, media: item }))
    );

    return createdItems;
};

module.exports = {
    getEventMedia,
    canUploadEventMedia,
    addEventMedia,
    addEventMediaFiles
};
