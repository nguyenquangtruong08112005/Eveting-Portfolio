// modules/notifications/notification.controller.js
const notificationService = require('./notification.service');

const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.uid;
        const notifications = await notificationService.getNotificationsByUserId(userId);
        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error in Notification Controller - getUserNotifications: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        // TODO: Thêm logic kiểm tra xem user có phải là người nhận thông báo này không
        // trước khi cho phép họ đánh dấu là đã đọc.

        const updatedNotification = await notificationService.markNotificationAsRead(notificationId);
        res.status(200).json(updatedNotification);
    } catch (error) {
        console.error("Error in Notification Controller - markAsRead: ", error);
        res.status(400).send({ error: error.message });
    }
};

module.exports = {
    getUserNotifications,
    markAsRead,
};
