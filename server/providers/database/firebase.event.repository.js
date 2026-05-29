const { db } = require('../../config/firebase.config');

const getEventById = async (eventId) => {
    const eventDoc = await db.collection('Events').doc(eventId).get();
    if (!eventDoc.exists) return null;
    return { id: eventDoc.id, ...eventDoc.data() };
};

module.exports = {
    getEventById,
};
