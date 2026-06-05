// modules/notifications/fcm.service.js
const notificationProvider = require('../../providers/notification');

/**
 * Gửi thông báo đến 1 thiết bị hoặc 1 danh sách thiết bị
 */
const sendMulticast = async (tokens, title, body, data = {}) => {
    return notificationProvider.sendMulticast(tokens, title, body, data);
};

/**
 * Gửi thông báo đến một Topic (Dành cho Follow Artist)
 */
const sendToTopic = async (topic, title, body, data = {}) => {
    return notificationProvider.sendToTopic(topic, title, body, data);
};

/**
 * Đăng ký một hoặc nhiều token vào một topic.
 * @param {Array<string>|string} tokens - Danh sách token hoặc 1 token.
 * @param {string} topic - Tên topic (ví dụ: 'artist_123').
 */
const subscribeToTopic = async (tokens, topic) => {
    return notificationProvider.subscribeToTopic(tokens, topic);
};

/**
 * Hủy đăng ký topic.
 */
const unsubscribeFromTopic = async (tokens, topic) => {
    return notificationProvider.unsubscribeFromTopic(tokens, topic);
};

module.exports = {
    sendMulticast,
    sendToTopic,
    subscribeToTopic,
    unsubscribeFromTopic,
};
