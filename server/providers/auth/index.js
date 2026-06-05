// providers/auth/index.js
const providerName = process.env.AUTH_PROVIDER || 'backend';

if (providerName !== 'backend') {
  throw new Error(`Auth provider "${providerName}" is not supported. Only "backend" is available.`);
}

module.exports = require('./backend.auth.provider');
