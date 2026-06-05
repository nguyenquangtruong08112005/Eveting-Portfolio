const providerName = process.env.PROMOTION_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for promotions. Only "postgres" is available.`);
}

module.exports = require('./postgres.promotion.repository');
