// controllers/media.controller.js
const mediaService = require('../services/media.service');

const getGallery = async (req, res) => {
    try {
        const { eventId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await mediaService.getEventMedia(eventId, page, limit);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error getting gallery:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const uploadMedia = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { eventId } = req.params;
        const { mediaItems } = req.body; // Expect mảng: [{url, type, caption}]

        if (!mediaItems || !Array.isArray(mediaItems) || mediaItems.length === 0) {
            return res.status(400).send({ error: 'No media items provided.' });
        }

        const canUpload = await mediaService.canUploadEventMedia(userId, eventId);
        if (!canUpload) {
            return res.status(403).send({ error: 'Forbidden: Only attendees or organizer can upload media.' });
        }

        const result = await mediaService.addEventMedia(userId, eventId, mediaItems);
        res.status(201).json(result);

    } catch (error) {
        console.error("Error adding media:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getGallery,
    uploadMedia
};
