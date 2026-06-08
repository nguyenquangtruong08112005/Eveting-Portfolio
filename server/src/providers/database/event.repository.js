const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.event || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for events. Only "postgres" is available.`);
}

module.exports = require('./postgres.event.repository');
