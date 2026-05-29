const firebaseMediaRepository = require('./firebase.media.repository');
const postgresMediaRepository = require('./postgres.media.repository');

const repositories = {
    firebase: firebaseMediaRepository,
    postgres: postgresMediaRepository,
};

const providerName = process.env.MEDIA_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for media.`);
}

module.exports = activeRepository;
