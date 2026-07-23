const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.organizer || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for organizers. Only "postgres" is available.`);
}

module.exports = require('./postgres.organizer.repository');
