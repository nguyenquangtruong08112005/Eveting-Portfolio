const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.review || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for reviews. Only "postgres" is available.`);
}

module.exports = require('./postgres.review.repository');
