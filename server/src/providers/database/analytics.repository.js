const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.analytics || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for analytics. Only "postgres" is available.`);
}

module.exports = require('./postgres.analytics.repository');
