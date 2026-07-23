const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.rbac || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for RBAC. Only "postgres" is available.`);
}

module.exports = require('./postgres.rbac.repository');
