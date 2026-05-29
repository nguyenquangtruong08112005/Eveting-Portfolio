const firebaseNotificationRepository = require('./firebase.notification.repository');

const repositories = {
    firebase: firebaseNotificationRepository,
};

const providerName = process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for notifications.`);
}

module.exports = activeRepository;
