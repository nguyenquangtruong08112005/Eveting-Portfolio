const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.venue || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for venues. Only "postgres" is available.`);
}

const activeRepository = require('./postgres.venue.repository');

const { validateAdapter } = require('./venue.contract');
validateAdapter(activeRepository);

module.exports = activeRepository;
