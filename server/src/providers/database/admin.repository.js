const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.admin || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for admin. Only "postgres" is available.`);
}

module.exports = require('./postgres.admin.repository');
