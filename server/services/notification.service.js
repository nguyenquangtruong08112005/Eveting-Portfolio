// services/notification.service.js
const { db } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid'); // Cần import uuid
/**
 * Lấy tất cả thông báo cho một người dùng.
 * @param {string} userId - ID của người dùng.
 * @returns {Promise<Array<object>>} Mảng các thông báo.
 */
const getNotificationsByUserId = async (userId) => {
    const notifications = [];
    // Lấy các thông báo dành riêng cho user này, hoặc các thông báo "all"
    const snapshot = await db.collection('Notifications')
        .where('userId', 'in', [userId, 'all'])
        .orderBy('createdAt', 'desc')
        .get();

    snapshot.forEach(doc => {
        notifications.push(doc.data());
    });

    return notifications;
};

/**
 * Đánh dấu một thông báo là đã đọc.
 * @param {string} notificationId - ID của thông báo.
 * @returns {Promise<object>} Document thông báo sau khi đã cập nhật.
 */
const markNotificationAsRead = async (notificationId) => {
    const notificationRef = db.collection('Notifications').doc(notificationId);
    const doc = await notificationRef.get();

    if (!doc.exists) {
        throw new Error('Notification not found.');
    }

    await notificationRef.update({ isRead: true });

    return { ...doc.data(), isRead: true };
};

/**
 * Tạo và lưu một thông báo mới vào Firestore.
 * @param {string} userId - ID người nhận (hoặc 'all').
 * @param {string} title - Tiêu đề.
 * @param {string} message - Nội dung.
 * @param {string} type - Loại ('reminder', 'update', 'promotion', 'system').
 * @param {string} eventId - (Optional) ID sự kiện liên quan.
 */
const createNotification = async (userId, title, message, type, eventId = null) => {
    const notificationId = `notif_${uuidv4()}`;
    const now = new Date().getTime();

    const newNotification = {
        id: notificationId,
        userId,
        title,
        message,
        type,
        eventId,
        isRead: false,
        createdAt: now
    };

    await db.collection('Notifications').doc(notificationId).set(newNotification);
    return newNotification;
};

module.exports = {
    getNotificationsByUserId,
    markNotificationAsRead,
    createNotification, // <-- Export hàm mới
};