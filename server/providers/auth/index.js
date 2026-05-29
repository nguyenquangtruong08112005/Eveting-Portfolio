const firebaseAuthProvider = require('./firebase.auth.provider');
const backendAuthProvider = require('./backend.auth.provider');

// Set AUTH_PROVIDER=backend in .env to switch to password-based JWT auth.
// The verifyToken() interface is identical -- existing middleware works unchanged.
const providers = {
  firebase: firebaseAuthProvider,
  backend: backendAuthProvider,
};

const providerName = process.env.AUTH_PROVIDER || 'firebase';
const activeProvider = providers[providerName];

if (!activeProvider) {
  throw new Error(`Auth provider "${providerName}" is not supported.`);
}

module.exports = activeProvider;
