const { db } = require('../../config/firebase.config');

const hasEligibleTicket = async (userId, eventId) => {
    const ticketSnapshot = await db.collection('Tickets')
        .where('userId', '==', userId)
        .where('eventId', '==', eventId)
        .where('status', 'in', ['paid', 'checkedIn'])
        .limit(1)
        .get();

    return !ticketSnapshot.empty;
};

const getEventOrganizerId = async (eventId) => {
    const eventDoc = await db.collection('Events').doc(eventId).get();

    if (!eventDoc.exists) {
        return null;
    }

    return eventDoc.data().organizerId || null;
};

const getEventMediaPage = async (eventId, page = 1, limit = 20) => {
    const mediaRef = db.collection('EventMedia').where('eventId', '==', eventId);
    const offset = (page - 1) * limit;

    const countSnapshot = await mediaRef.count().get();
    const totalItems = countSnapshot.data().count;

    const snapshot = await mediaRef
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

    const mediaList = [];
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const userDoc = await db.collection('Users').doc(data.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        mediaList.push({
            id: doc.id,
            ...data,
            user: {
                id: userData.id,
                name: userData.name,
                profilePicUrl: userData.profilePicUrl
            }
        });
    }

    return {
        media: mediaList,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalItems / limit),
            totalItems: totalItems
        }
    };
};

const createEventMediaBatch = async (mediaItems) => {
    const batch = db.batch();

    mediaItems.forEach(({ id, media }) => {
        const mediaRef = db.collection('EventMedia').doc(id);
        batch.set(mediaRef, media);
    });

    await batch.commit();
};

module.exports = {
    hasEligibleTicket,
    getEventOrganizerId,
    getEventMediaPage,
    createEventMediaBatch
};
