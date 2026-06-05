const providerName = process.env.TICKET_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for tickets. Only "postgres" is available.`);
}

module.exports = require('./postgres.ticket.repository');
