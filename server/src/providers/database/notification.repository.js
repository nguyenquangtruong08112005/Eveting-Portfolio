const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.notification || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for notifications. Only "postgres" is available.`);
}

module.exports = require('./postgres.notification.repository');
