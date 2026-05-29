const firebaseAuthProvider = require('./firebase.auth.provider');

const providers = {
  firebase: firebaseAuthProvider,
};

const providerName = process.env.AUTH_PROVIDER || 'firebase';
const activeProvider = providers[providerName];

if (!activeProvider) {
  throw new Error(`Auth provider "${providerName}" is not supported.`);
}

module.exports = activeProvider;
