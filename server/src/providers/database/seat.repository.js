const config = require('@/shared/config/env.config');
const providerName = config.databaseProviders.seat || config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for seats. Only "postgres" is available.`);
}

const activeRepository = require('./postgres.seat.repository');

const { validateAdapter } = require('./seat.contract');
validateAdapter(activeRepository);

module.exports = activeRepository;
