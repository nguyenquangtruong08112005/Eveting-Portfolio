const { db } = require('../../config/firebase.config');

const getNotificationsByUserId = async (userId) => {
    const notifications = [];
    const snapshot = await db.collection('Notifications')
        .where('userId', 'in', [userId, 'all'])
        .orderBy('createdAt', 'desc')
        .get();

    snapshot.forEach(doc => {
        notifications.push(doc.data());
    });

    return notifications;
};

const markNotificationAsRead = async (notificationId) => {
    const notificationRef = db.collection('Notifications').doc(notificationId);
    const doc = await notificationRef.get();

    if (!doc.exists) {
        throw new Error('Notification not found.');
    }

    await notificationRef.update({ isRead: true });

    return { ...doc.data(), isRead: true };
};

const createNotification = async (notificationData) => {
    await db.collection('Notifications').doc(notificationData.id).set(notificationData);
    return notificationData;
};

module.exports = {
    getNotificationsByUserId,
    markNotificationAsRead,
    createNotification
};
