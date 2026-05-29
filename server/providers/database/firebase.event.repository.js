const { db } = require('../../config/firebase.config');

const getEventById = async (eventId) => {
    const eventDoc = await db.collection('Events').doc(eventId).get();
    if (!eventDoc.exists) return null;
    return { id: eventDoc.id, ...eventDoc.data() };
};

const getActiveEventsInDateRange = async (startTime, endTime) => {
    const snapshot = await db.collection('Events')
        .where('date', '>=', startTime)
        .where('date', '<', endTime)
        .where('status', '==', 'active')
        .get();
    return snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id }));
};

module.exports = {
    getEventById,
    getActiveEventsInDateRange,
};
