// services/review.service.js
const { db } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Lấy tất cả review của một sự kiện.
 * @param {string} eventId - ID của sự kiện.
 * @returns {Promise<Array<object>>} Mảng các review.
 */
const getReviewsByEventId = async (eventId) => {
    const reviews = [];
    const snapshot = await db.collection('Reviews').where('eventId', '==', eventId).orderBy('createdAt', 'desc').get();

    snapshot.forEach(doc => {
        reviews.push(doc.data());
    });

    return reviews;
};

/**
 * Tạo một review mới.
 * @param {string} userId - ID của người viết review.
 * @param {string} eventId - ID của sự kiện được review.
 * @param {object} reviewData - Dữ liệu review (rating, comment).
 * @returns {Promise<object>} Document review vừa được tạo.
 */
const createReview = async (userId, eventId, reviewData) => {
    const reviewId = `rev_${uuidv4()}`;

    // Kiểm tra và đảm bảo rating là một con số hợp lệ.
    const rating = Number(reviewData.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
        // Ném ra một lỗi rõ ràng nếu rating không hợp lệ
        throw new Error('Invalid rating value. Rating must be a number between 1 and 5.');
    }

    const newReview = {
        id: reviewId,
        eventId,
        userId,
        rating: reviewData.rating,
        comment: reviewData.comment || '',
        createdAt: new Date().getTime(),
    };

    // TODO: Thêm validation cho rating (phải từ 1 đến 5).

    await db.collection('Reviews').doc(reviewId).set(newReview);
    return newReview;
};

module.exports = {
    getReviewsByEventId,
    createReview,
};