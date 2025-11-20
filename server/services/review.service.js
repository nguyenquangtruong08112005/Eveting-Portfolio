// services/review.service.js
const { db } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Lấy danh sách đánh giá của một sự kiện
 */
const getReviewsByEventId = async (eventId, page = 1, limit = 10) => {
    const reviewsRef = db.collection('Reviews').where('eventId', '==', eventId);
    const offset = (page - 1) * limit;

    const countSnapshot = await reviewsRef.count().get();
    const totalReviews = countSnapshot.data().count;

    const snapshot = await reviewsRef
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

    const reviews = [];
    // Để tối ưu, ta có thể lấy thông tin user tóm tắt (tên, avatar) để hiển thị
    // Ở đây mình giả định client sẽ tự lấy hoặc ta populate sau
    for (const doc of snapshot.docs) {
        const reviewData = doc.data();
        // Lấy thông tin user cơ bản để hiển thị kèm review
        const userDoc = await db.collection('Users').doc(reviewData.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        reviews.push({
            id: doc.id,
            ...reviewData,
            user: {
                name: userData.name || 'Anonymous',
                profilePicUrl: userData.profilePicUrl || ''
            }
        });
    }

    return {
        reviews,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalReviews / limit),
            totalItems: totalReviews
        }
    };
};

/**
 * Tạo đánh giá mới
 */
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

    await db.collection('Reviews').doc(reviewId).set(newReview);
    return newReview;
};

module.exports = {
    getReviewsByEventId,
    createReview
};