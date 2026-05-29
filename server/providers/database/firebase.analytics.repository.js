const { db } = require('../../config/firebase.config');

const getAnalyticsByEventId = async (eventId) => {
    const doc = await db.collection('Analytics').doc(eventId).get();
    if (!doc.exists) {
        return null;
    }
    return doc.data();
};

module.exports = {
    getAnalyticsByEventId
};
