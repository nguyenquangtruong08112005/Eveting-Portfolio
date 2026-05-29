const { db } = require('../../config/firebase.config');

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
    for (const doc of snapshot.docs) {
        const reviewData = doc.data();
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

const createReview = async (reviewId, reviewData) => {
    await db.collection('Reviews').doc(reviewId).set(reviewData);
    return reviewData;
};

const checkUserTicketForEvent = async (userId, eventId) => {
    const ticketSnapshot = await db.collection('Tickets')
        .where('userId', '==', userId)
        .where('eventId', '==', eventId)
        .where('status', 'in', ['paid', 'checkedIn'])
        .limit(1)
        .get();

    return !ticketSnapshot.empty;
};

module.exports = {
    getReviewsByEventId,
    createReview,
    checkUserTicketForEvent
};
