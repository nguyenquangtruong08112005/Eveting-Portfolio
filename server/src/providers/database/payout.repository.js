const config = require('@/shared/config/env.config');
const providerName = config.databaseProvider;

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for payouts. Only "postgres" is available.`);
}

module.exports = require('./postgres.payout.repository');
