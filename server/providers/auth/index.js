// Set AUTH_PROVIDER=backend in .env to switch to password-based JWT auth.
// The verifyToken() interface is identical -- existing middleware works unchanged.
const providerName = process.env.AUTH_PROVIDER || 'firebase';

let activeProvider;
if (providerName === 'backend') {
  activeProvider = require('./backend.auth.provider');
} else if (providerName === 'firebase') {
  activeProvider = require('./firebase.auth.provider');
} else {
  throw new Error(`Auth provider "${providerName}" is not supported.`);
}

module.exports = activeProvider;
