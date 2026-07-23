const config = require('@/shared/config/env.config');
const providerName = config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for idempotency. Only "postgres" is available.`);
}

module.exports = require('./postgres.idempotency.repository');
