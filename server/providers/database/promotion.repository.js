const providerName = process.env.PROMOTION_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
    activeRepository = require('./postgres.promotion.repository');
} else if (providerName === 'firebase') {
    activeRepository = require('./firebase.promotion.repository');
} else {
    throw new Error(`Database provider "${providerName}" is not supported for promotions.`);
}

module.exports = activeRepository;
