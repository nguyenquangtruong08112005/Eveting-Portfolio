const firebaseNotificationRepository = require('./firebase.notification.repository');
const postgresNotificationRepository = require('./postgres.notification.repository');

const repositories = {
    firebase: firebaseNotificationRepository,
    postgres: postgresNotificationRepository,
};

const providerName = process.env.NOTIFICATION_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for notifications.`);
}

module.exports = activeRepository;
