const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.media || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for media. Only "postgres" is available.`);
}

module.exports = require('./postgres.media.repository');
