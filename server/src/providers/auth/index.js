// providers/auth/index.js
const config = require('@/shared/config/env.config');
const providerName = config.authProvider;

if (providerName !== 'backend') {
  throw new Error(`Auth provider "${providerName}" is not supported. Only "backend" is available.`);
}

module.exports = require('./backend.auth.provider');
