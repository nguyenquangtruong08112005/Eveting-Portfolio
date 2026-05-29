const { db, FieldValue } = require('../../config/firebase.config');

const getActivePromotions = async () => {
    const promotions = [];
    const now = new Date().getTime();
    const snapshot = await db.collection('Promotions')
        .where('validUntil', '>', now)
        .where('isPublic', '==', true)
        .get();

    snapshot.forEach(doc => {
        const promo = doc.data();
        if (promo.usedCount < promo.usageLimit) {
            promotions.push(promo);
        }
    });
    return promotions;
};

const getPromotionsByOrganizer = async (organizerId) => {
    const snapshot = await db.collection('Promotions')
        .where('organizerId', '==', organizerId)
        .orderBy('createdAt', 'desc')
        .get();

    const promotions = [];
    snapshot.forEach(doc => {
        promotions.push(doc.data());
    });
    return promotions;
};

const findByCode = async (code) => {
    const snapshot = await db.collection('Promotions')
        .where('code', '==', code)
        .limit(1)
        .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
};

const getEventById = async (eventId) => {
    const eventDoc = await db.collection('Events').doc(eventId).get();
    if (!eventDoc.exists) return null;
    return { id: eventDoc.id, ...eventDoc.data() };
};

const getPromotionById = async (promoId) => {
    const doc = await db.collection('Promotions').doc(promoId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
};

const createPromotion = async (promoId, promoData) => {
    await db.collection('Promotions').doc(promoId).set(promoData);
};

const updatePromotion = async (promoId, updates) => {
    await db.collection('Promotions').doc(promoId).update(updates);
};

const deletePromotion = async (promoId) => {
    await db.collection('Promotions').doc(promoId).delete();
};

const findPromoByCodeInTransaction = async (transaction, promoCode) => {
    const snapshot = await transaction.get(
        db.collection('Promotions').where('code', '==', promoCode).limit(1)
    );
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { ...doc.data(), _id: doc.id };
};

const incrementPromotionUsedCountInTransaction = (transaction, promoId) => {
    transaction.update(db.collection('Promotions').doc(promoId), {
        usedCount: FieldValue.increment(1)
    });
};

module.exports = {
    getActivePromotions,
    getPromotionsByOrganizer,
    findByCode,
    getEventById,
    getPromotionById,
    createPromotion,
    updatePromotion,
    deletePromotion,
    findPromoByCodeInTransaction,
    incrementPromotionUsedCountInTransaction,
};
