const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.ticket || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for tickets. Only "postgres" is available.`);
}

module.exports = require('./postgres.ticket.repository');
