const firebaseFeaturedProfileRepository = require('./firebase.featuredProfile.repository');

const repositories = {
    firebase: firebaseFeaturedProfileRepository,
};

const providerName = process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for featured profiles.`);
}

module.exports = activeRepository;
