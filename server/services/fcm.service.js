// services/fcm.service.js
const { admin, db } = require('../config/firebase.config');

/**
 * Gửi thông báo đến 1 thiết bị hoặc 1 danh sách thiết bị
 */
const sendMulticast = async (tokens, title, body, data = {}) => {
    if (!tokens || tokens.length === 0) return;

    const message = {
        notification: { title, body },
        data: data, // Dữ liệu ẩn để App xử lý (ví dụ: mở màn hình nào)
        tokens: tokens,
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log(`Creates ${response.successCount} messages successfully.`);
    } catch (error) {
        console.error('Error sending multicast message:', error);
    }
};

/**
 * Gửi thông báo đến một Topic (Dành cho Follow Artist)
 */
const sendToTopic = async (topic, title, body, data = {}) => {
    const message = {
        notification: { title, body },
        data: data,
        topic: topic, // Ví dụ: 'artist_son_tung'
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message to topic:', response);
    } catch (error) {
        console.error('Error sending message to topic:', error);
    }
};

module.exports = {
    sendMulticast, 
    sendToTopic 
};