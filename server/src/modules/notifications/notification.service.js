const notificationRepository = require('../../providers/database/notification.repository');
const notifHelper = require('./notification-event.helper');

const getNotificationsByUserId = async (userId) => {
    return notificationRepository.getNotificationsByUserId(userId);
};

const markNotificationAsRead = async (notificationId) => {
    return notificationRepository.markNotificationAsRead(notificationId);
};

const createNotification = async (userId, title, message, type, eventId = null) => {
    const newNotification = notifHelper.buildNotificationDoc(userId, title, message, type, eventId);
    return notificationRepository.createNotification(newNotification);
};

module.exports = {
    getNotificationsByUserId,
    markNotificationAsRead,
    createNotification,
};
