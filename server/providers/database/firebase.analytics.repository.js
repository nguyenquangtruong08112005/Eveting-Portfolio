const { db, FieldValue, admin } = require('../../config/firebase.config');

const getAnalyticsByEventId = async (eventId) => {
    const doc = await db.collection('Analytics').doc(eventId).get();
    if (!doc.exists) {
        return null;
    }
    return doc.data();
};

const updateAnalyticsForConfirmPaymentInTransaction = (transaction, eventId, { price, ticketType, quantity, dailyTimestamp }) => {
    const analyticsRef = db.collection('Analytics').doc(eventId);
    transaction.set(analyticsRef, {
        eventId,
        totalRevenue: FieldValue.increment(price),
        ticketsSold: { [ticketType]: FieldValue.increment(quantity || 1) },
        dailySales: { [dailyTimestamp]: FieldValue.increment(quantity || 1) },
        lastUpdatedAt: Date.now()
    }, { merge: true });
};

const incrementCheckInInTransaction = (transaction, eventId) => {
    const analyticsRef = db.collection('Analytics').doc(eventId);
    transaction.set(analyticsRef, {
        checkIns: FieldValue.increment(1)
    }, { merge: true });
};

const getAnalyticsByEventIds = async (eventIds) => {
    if (!eventIds || eventIds.length === 0) return [];
    const results = [];
    const CHUNK_SIZE = 10;
    for (let i = 0; i < eventIds.length; i += CHUNK_SIZE) {
        const chunk = eventIds.slice(i, i + CHUNK_SIZE);
        const analyticsSnapshot = await db.collection('Analytics')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get();
        analyticsSnapshot.forEach(doc => {
            results.push(doc.data());
        });
    }
    return results;
};

module.exports = {
    getAnalyticsByEventId,
    updateAnalyticsForConfirmPaymentInTransaction,
    incrementCheckInInTransaction,
    getAnalyticsByEventIds,
};
