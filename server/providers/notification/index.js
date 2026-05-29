// providers/notification/index.js
const firebaseProvider = require('./firebase.provider');

// Supported providers mapping
const providers = {
    firebase: firebaseProvider,
};

const providerName = process.env.NOTIFICATION_PROVIDER || 'firebase';
const activeProvider = providers[providerName];

if (!activeProvider) {
    throw new Error(`Notification provider "${providerName}" is not supported.`);
}

module.exports = activeProvider;
