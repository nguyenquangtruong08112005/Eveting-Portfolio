const firebaseEventRepository = require('./firebase.event.repository');
const postgresEventRepository = require('./postgres.event.repository');

const repositories = {
    firebase: firebaseEventRepository,
    postgres: postgresEventRepository,
};

const providerName = process.env.EVENT_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for events.`);
}

module.exports = activeRepository;
