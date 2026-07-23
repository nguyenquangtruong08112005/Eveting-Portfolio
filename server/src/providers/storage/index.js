// providers/storage/index.js
// Storage provider selector. Set STORAGE_PROVIDER=s3 to use S3-compatible storage.
// Default is local in-memory (no env vars required, safe for boot without config).

const config = require('@/shared/config/env.config');
const localProvider = require('./local');
const s3Provider = require('./s3');

const providers = {
  local: localProvider,
  s3: s3Provider,
};

const providerName = config.storageProvider;
const activeProvider = providers[providerName];

if (!activeProvider) {
  throw new Error(`Storage provider "${providerName}" is not supported.`);
}

module.exports = activeProvider;
