// providers/notification/index.js
const providerName = process.env.NOTIFICATION_PROVIDER || 'firebase';

let activeProvider;
if (providerName === 'onesignal') {
    activeProvider = require('./onesignal.provider');
} else if (providerName === 'firebase') {
    activeProvider = require('./firebase.provider');
} else {
    throw new Error(`Notification provider "${providerName}" is not supported.`);
}

module.exports = activeProvider;
