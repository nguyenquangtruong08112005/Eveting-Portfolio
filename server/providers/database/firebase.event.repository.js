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

const getEventsByOrganizerId = async (organizerId, { page = 1, limit = 20, status } = {}) => {
    let query = db.collection('Events').where('organizerId', '==', organizerId);
    if (status) {
        query = query.where('status', '==', status);
    }
    const offset = (page - 1) * limit;
    const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
    const events = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        events.push({
            id: doc.id,
            name: d.name,
            date: d.date,
            bannerUrl: d.bannerUrl,
            status: d.status,
            viewCount: d.viewCount || 0
        });
    });
    return events;
};

const getEventEntriesByOrganizer = async (organizerId) => {
    const snapshot = await db.collection('Events').where('organizerId', '==', organizerId).get();
    const entries = [];
    snapshot.forEach(doc => {
        entries.push({ id: doc.id, date: doc.data().date });
    });
    return entries;
};

const createEvent = async (eventId, eventData) => {
    await db.collection('Events').doc(eventId).set(eventData);
};

const getEventRawById = async (eventId) => {
    const doc = await db.collection('Events').doc(eventId).get();
    if (!doc.exists) return { exists: false, id: null, data: null };
    return { exists: true, id: doc.id, data: doc.data() };
};

const getPublicEventsPage = async (page, limit) => {
    const eventsRef = db.collection('Events')
        .where('visibility', '==', 'public')
        .where('status', '==', 'active');
    const offset = (page - 1) * limit;

    const countSnapshot = await eventsRef.count().get();
    const totalItems = countSnapshot.data().count;

    const snapshot = await eventsRef
        .orderBy('date', 'asc')
        .limit(limit)
        .offset(offset)
        .select("id", "name", "date", "imageUrl", "bannerUrl", "videoUrl", "location", "city", "venueName", "eventType", "minPrice")
        .get();

    const entries = [];
    snapshot.forEach((doc) => {
        entries.push({ id: doc.id, data: doc.data() });
    });

    return { entries, totalItems };
};

const queryActivePublicEventsByGeoBounds = async (bounds) => {
    const promises = [];
    for (const b of bounds) {
        const q = db.collection('Events')
            .where('status', '==', 'active')
            .where('visibility', '==', 'public')
            .orderBy('geohash')
            .startAt(b[0]).endAt(b[1]);
        promises.push(q.get());
    }
    const snapshots = await Promise.all(promises);
    const docs = [];
    for (const snap of snapshots) {
        snap.forEach(doc => {
            docs.push({ id: doc.id, data: doc.data() });
        });
    }
    return docs;
};

module.exports = {
    getEventById,
    getEventDataById,
    getActiveEventsInDateRange,
    updateEvent,
    getEventInTransaction,
    updateEventInTransaction,
    incrementEventTicketTypeAvailableInTransaction,
    getEventsByOrganizerId,
    getEventEntriesByOrganizer,
    createEvent,
    getEventRawById,
    getPublicEventsPage,
    queryActivePublicEventsByGeoBounds,
};
