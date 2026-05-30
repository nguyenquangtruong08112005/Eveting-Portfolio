const providerName = process.env.NOTIFICATION_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
    activeRepository = require('./postgres.notification.repository');
} else if (providerName === 'firebase') {
    activeRepository = require('./firebase.notification.repository');
} else {
    throw new Error(`Database provider "${providerName}" is not supported for notifications.`);
}

module.exports = activeRepository;
