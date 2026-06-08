const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.user || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for users. Only "postgres" is available.`);
}

module.exports = require('./postgres.user.repository');
