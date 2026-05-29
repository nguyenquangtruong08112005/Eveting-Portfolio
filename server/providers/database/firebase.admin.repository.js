const { db } = require('../../config/firebase.config');

const getPendingEvents = async (page = 1, limit = 20) => {
    const eventsRef = db.collection('Events')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc');
    const offset = (page - 1) * limit;
    const snapshot = await eventsRef.limit(limit).offset(offset).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

module.exports = { getPendingEvents };
