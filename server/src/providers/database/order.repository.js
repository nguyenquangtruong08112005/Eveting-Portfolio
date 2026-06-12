const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.order || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for orders. Only "postgres" is available.`);
}

module.exports = require('./postgres.order.repository');
