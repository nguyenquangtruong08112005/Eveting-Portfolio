const firebaseMediaRepository = require('./firebase.media.repository');

const repositories = {
    firebase: firebaseMediaRepository,
};

const providerName = process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for media.`);
}

module.exports = activeRepository;
