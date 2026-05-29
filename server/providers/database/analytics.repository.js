const firebaseAnalyticsRepository = require('./firebase.analytics.repository');

const repositories = {
    firebase: firebaseAnalyticsRepository,
};

const providerName = process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for analytics.`);
}

module.exports = activeRepository;
