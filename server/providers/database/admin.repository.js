const providerName = process.env.ADMIN_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for admin. Only "postgres" is available.`);
}

module.exports = require('./postgres.admin.repository');
