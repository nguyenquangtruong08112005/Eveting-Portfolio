// providers/notification/index.js
const config = require('@/shared/config/env.config');
const providerName = config.notificationProvider;

if (providerName !== 'onesignal') {
  throw new Error(`Notification provider "${providerName}" is not supported. Only "onesignal" is available.`);
}

module.exports = require('./onesignal.provider');
