const firebasePromotionRepository = require('./firebase.promotion.repository');
const postgresPromotionRepository = require('./postgres.promotion.repository');

const repositories = {
    firebase: firebasePromotionRepository,
    postgres: postgresPromotionRepository,
};

const providerName = process.env.PROMOTION_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for promotions.`);
}

module.exports = activeRepository;
