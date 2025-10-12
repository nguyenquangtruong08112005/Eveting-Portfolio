// controllers/review.controller.js
const reviewService = require('../services/review.service');
const { db } = require('../config/firebase.config');

const getEventReviews = async (req, res) => {
    try {
        const { eventId } = req.params;
        const reviews = await reviewService.getReviewsByEventId(eventId);
        res.status(200).json(reviews);
    } catch (error) {
        console.error("Error in Review Controller - getEventReviews: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const createEventReview = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.uid;

        // --- Logic kiểm tra quan trọng ---
        // Kiểm tra xem user có vé đã 'checkedIn' hoặc 'paid' cho sự kiện này không.
        const ticketsSnapshot = await db.collection('Tickets')
            .where('userId', '==', userId)
            .where('eventId', '==', eventId)
            .where('status', 'in', ['checkedIn', 'paid'])
            .limit(1)
            .get();

        if (ticketsSnapshot.empty) {
            return res.status(403).send({ error: 'Forbidden: User has not attended this event.' });
        }

        const newReview = await reviewService.createReview(userId, eventId, req.body);
        res.status(201).json(newReview);
    } catch (error) {
        console.error("Error in Review Controller - createEventReview: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getEventReviews,
    createEventReview,
};