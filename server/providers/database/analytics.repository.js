const providerName = process.env.ANALYTICS_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
    activeRepository = require('./postgres.analytics.repository');
} else if (providerName === 'firebase') {
    activeRepository = require('./firebase.analytics.repository');
} else {
    throw new Error(`Database provider "${providerName}" is not supported for analytics.`);
}

module.exports = activeRepository;
