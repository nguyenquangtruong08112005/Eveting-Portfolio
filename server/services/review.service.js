const { v4: uuidv4 } = require('uuid');
const reviewRepository = require('../providers/database/review.repository');

const getReviewsByEventId = async (eventId, page = 1, limit = 10) => {
    return reviewRepository.getReviewsByEventId(eventId, page, limit);
};

const createReview = async (userId, eventId, rating, comment) => {
    const reviewId = `rev_${uuidv4()}`;
    const now = new Date().getTime();
    
    const newReview = {
        id: reviewId,
        userId,
        eventId,
        rating: Number(rating),
        comment,
        createdAt: now
    };

    return reviewRepository.createReview(reviewId, newReview);
};

const canReviewEvent = async (userId, eventId) => {
    return reviewRepository.checkUserTicketForEvent(userId, eventId);
};

module.exports = {
    getReviewsByEventId,
    createReview,
    canReviewEvent
};