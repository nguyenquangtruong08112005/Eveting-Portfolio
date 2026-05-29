const firebaseFeaturedProfileRepository = require('./firebase.featuredProfile.repository');
const postgresFeaturedProfileRepository = require('./postgres.featuredProfile.repository');

const repositories = {
    firebase: firebaseFeaturedProfileRepository,
    postgres: postgresFeaturedProfileRepository,
};

const providerName = process.env.FEATURED_PROFILE_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for featured profiles.`);
}

module.exports = activeRepository;
