const firebasePromotionRepository = require('./firebase.promotion.repository');

const repositories = {
    firebase: firebasePromotionRepository,
};

const providerName = process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for promotions.`);
}

module.exports = activeRepository;
