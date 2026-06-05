// providers/notification/index.js
const providerName = process.env.NOTIFICATION_PROVIDER || 'onesignal';

if (providerName !== 'onesignal') {
  throw new Error(`Notification provider "${providerName}" is not supported. Only "onesignal" is available.`);
}

module.exports = require('./onesignal.provider');
