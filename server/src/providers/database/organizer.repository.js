const providerName = process.env.ORGANIZER_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for organizers. Only "postgres" is available.`);
}

module.exports = require('./postgres.organizer.repository');
