const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.promotion || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for promotions. Only "postgres" is available.`);
}

module.exports = require('./postgres.promotion.repository');
