const providerName = process.env.REVIEW_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for reviews. Only "postgres" is available.`);
}

module.exports = require('./postgres.review.repository');
