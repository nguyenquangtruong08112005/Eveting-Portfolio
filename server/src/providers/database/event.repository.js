const providerName = process.env.EVENT_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for events. Only "postgres" is available.`);
}

module.exports = require('./postgres.event.repository');
