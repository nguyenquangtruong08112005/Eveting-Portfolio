const { db } = require('../../config/firebase.config');

const getAllVenues = async () => {
    const snapshot = await db.collection('Venues').orderBy('name').get();
    const venues = [];
    snapshot.forEach(doc => {
        venues.push({ id: doc.id, ...doc.data() });
    });
    return venues;
};

const createVenue = async (venueId, venueData) => {
    await db.collection('Venues').doc(venueId).set(venueData);
};

const getVenueById = async (venueId) => {
    const doc = await db.collection('Venues').doc(venueId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
};

module.exports = {
    getAllVenues,
    createVenue,
    getVenueById,
};
