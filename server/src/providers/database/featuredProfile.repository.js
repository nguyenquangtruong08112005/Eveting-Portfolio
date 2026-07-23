const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.featuredProfile || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for featured profiles. Only "postgres" is available.`);
}

module.exports = require('./postgres.featuredProfile.repository');
