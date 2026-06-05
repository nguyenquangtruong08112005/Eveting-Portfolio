const providerName = process.env.FEATURED_PROFILE_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for featured profiles. Only "postgres" is available.`);
}

module.exports = require('./postgres.featuredProfile.repository');
