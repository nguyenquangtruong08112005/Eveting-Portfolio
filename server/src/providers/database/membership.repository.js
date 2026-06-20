const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.membership || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for memberships. Only "postgres" is available.`);
}

module.exports = require('./postgres.membership.repository');
