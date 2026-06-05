const providerName = process.env.USER_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for users. Only "postgres" is available.`);
}

module.exports = require('./postgres.user.repository');
