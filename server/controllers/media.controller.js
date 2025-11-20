// controllers/media.controller.js
const mediaService = require('../services/media.service');
const { db } = require('../config/firebase.config');

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

        // --- KIỂM TRA QUYỀN THAM GIA ---
        const ticketSnapshot = await db.collection('Tickets')
            .where('userId', '==', userId)
            .where('eventId', '==', eventId)
            .where('status', 'in', ['paid', 'checkedIn'])
            .limit(1)
            .get();

        if (ticketSnapshot.empty) {
            // Nếu không phải người tham gia, kiểm tra xem có phải Organizer không
            const eventDoc = await db.collection('Events').doc(eventId).get();
            if (!eventDoc.exists || eventDoc.data().organizerId !== userId) {
                 return res.status(403).send({ error: 'Forbidden: Only attendees or organizer can upload media.' });
            }
        }
        // --- KẾT THÚC KIỂM TRA ---

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