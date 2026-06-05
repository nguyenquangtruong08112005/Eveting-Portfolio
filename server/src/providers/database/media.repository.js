const providerName = process.env.MEDIA_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'postgres';

if (providerName !== 'postgres') {
  throw new Error(`Database provider "${providerName}" is not supported for media. Only "postgres" is available.`);
}

module.exports = require('./postgres.media.repository');
