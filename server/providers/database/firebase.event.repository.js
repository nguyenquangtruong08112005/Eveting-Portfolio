const { db } = require('../../config/firebase.config');

const getEventById = async (eventId) => {
    const eventDoc = await db.collection('Events').doc(eventId).get();
    if (!eventDoc.exists) return null;
    return { id: eventDoc.id, ...eventDoc.data() };
};

const getEventDataById = async (eventId) => {
    const eventDoc = await db.collection('Events').doc(eventId).get();
    if (!eventDoc.exists) return null;
    return eventDoc.data();
};

const getActiveEventsInDateRange = async (startTime, endTime) => {
    const snapshot = await db.collection('Events')
        .where('date', '>=', startTime)
        .where('date', '<', endTime)
        .where('status', '==', 'active')
        .get();
    return snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id }));
};

const updateEvent = async (eventId, updates) => {
    await db.collection('Events').doc(eventId).update(updates);
};

module.exports = {
    getEventById,
    getEventDataById,
    getActiveEventsInDateRange,
    updateEvent,
};
