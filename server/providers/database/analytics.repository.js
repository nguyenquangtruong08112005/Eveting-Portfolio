const firebaseAnalyticsRepository = require('./firebase.analytics.repository');
const postgresAnalyticsRepository = require('./postgres.analytics.repository');

const repositories = {
    firebase: firebaseAnalyticsRepository,
    postgres: postgresAnalyticsRepository,
};

const providerName = process.env.ANALYTICS_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for analytics.`);
}

module.exports = activeRepository;
