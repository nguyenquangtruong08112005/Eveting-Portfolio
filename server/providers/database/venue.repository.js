const providerName = process.env.VENUE_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for venues. Only "postgres" is available.`);
}

const activeRepository = require('./postgres.venue.repository');

const { validateAdapter } = require('./venue.contract');
validateAdapter(activeRepository);

module.exports = activeRepository;
