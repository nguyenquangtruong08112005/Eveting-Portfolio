const providerName = process.env.ANALYTICS_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for analytics. Only "postgres" is available.`);
}

module.exports = require('./postgres.analytics.repository');
