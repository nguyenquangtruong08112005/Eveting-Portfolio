const { db, FieldValue } = require('../../config/firebase.config');

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

module.exports = {
    getAnalyticsByEventId,
    updateAnalyticsForConfirmPaymentInTransaction,
};
