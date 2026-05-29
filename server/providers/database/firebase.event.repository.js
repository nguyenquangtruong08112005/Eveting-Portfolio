const { db, FieldValue } = require('../../config/firebase.config');

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

const getEventInTransaction = async (transaction, eventId) => {
    const doc = await transaction.get(db.collection('Events').doc(eventId));
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
};

const updateEventInTransaction = (transaction, eventId, updates) => {
    transaction.update(db.collection('Events').doc(eventId), updates);
};

const incrementEventTicketTypeAvailableInTransaction = (transaction, eventId, ticketType, incrementBy) => {
    transaction.update(db.collection('Events').doc(eventId), {
        [`ticketTypes.${ticketType}.available`]: FieldValue.increment(incrementBy)
    });
};

module.exports = {
    getEventById,
    getEventDataById,
    getActiveEventsInDateRange,
    updateEvent,
    getEventInTransaction,
    updateEventInTransaction,
    incrementEventTicketTypeAvailableInTransaction,
};
