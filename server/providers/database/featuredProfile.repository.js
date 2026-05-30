const providerName = process.env.FEATURED_PROFILE_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
    activeRepository = require('./postgres.featuredProfile.repository');
} else if (providerName === 'firebase') {
    activeRepository = require('./firebase.featuredProfile.repository');
} else {
    throw new Error(`Database provider "${providerName}" is not supported for featured profiles.`);
}

module.exports = activeRepository;
