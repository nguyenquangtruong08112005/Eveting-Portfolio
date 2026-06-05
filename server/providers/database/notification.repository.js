const providerName = process.env.NOTIFICATION_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for notifications. Only "postgres" is available.`);
}

module.exports = require('./postgres.notification.repository');
