const reviewService = require('../services/review.service');

const getEventReviews = async (req, res) => {
    try {
        const { eventId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await reviewService.getReviewsByEventId(eventId, page, limit);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error getting reviews:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const createReview = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { eventId } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).send({ error: 'Invalid rating (1-5).' });
        }

        const hasTicket = await reviewService.canReviewEvent(userId, eventId);
        if (!hasTicket) {
            return res.status(403).send({ error: 'Forbidden: You must attend the event to review.' });
        }

        const newReview = await reviewService.createReview(userId, eventId, rating, comment);
        res.status(201).json(newReview);

    } catch (error) {
        console.error("Error creating review:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getEventReviews,
    createReview
};