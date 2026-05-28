// services/fcm.service.js
const { admin, db } = require('../config/firebase.config');

/**
 * Gửi thông báo đến 1 thiết bị hoặc 1 danh sách thiết bị
 */
const FCM_BATCH_LIMIT = 500;

const sendMulticast = async (tokens, title, body, data = {}) => {
    if (!tokens || tokens.length === 0) return;

    let totalSuccess = 0;
    for (let i = 0; i < tokens.length; i += FCM_BATCH_LIMIT) {
        const batch = tokens.slice(i, i + FCM_BATCH_LIMIT);
        const message = {
            notification: { title, body },
            data: data,
            tokens: batch,
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            totalSuccess += response.successCount;
        } catch (error) {
            console.error('Error sending multicast message:', error);
        }
    }

    console.log(`Creates ${totalSuccess} messages successfully.`);
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

/**
 * Đăng ký một hoặc nhiều token vào một topic.
 * @param {Array<string>|string} tokens - Danh sách token hoặc 1 token.
 * @param {string} topic - Tên topic (ví dụ: 'artist_123').
 */
const subscribeToTopic = async (tokens, topic) => {
    if (!tokens) return;
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    if (tokenList.length === 0) return;
    
    try {
        const response = await admin.messaging().subscribeToTopic(tokenList, topic);
        console.log(`Successfully subscribed to topic "${topic}":`, response.successCount, 'successes');
    } catch (error) {
        console.error(`Error subscribing to topic "${topic}":`, error);
    }
};

/**
 * Hủy đăng ký topic.
 */
const unsubscribeFromTopic = async (tokens, topic) => {
    if (!tokens) return;
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    if (tokenList.length === 0) return;

    try {
        const response = await admin.messaging().unsubscribeFromTopic(tokenList, topic);
        console.log(`Successfully unsubscribed from topic "${topic}":`, response.successCount, 'successes');
    } catch (error) {
        console.error(`Error unsubscribing from topic "${topic}":`, error);
    }
};

module.exports = {
    sendMulticast, 
    sendToTopic ,
    subscribeToTopic,
    unsubscribeFromTopic,
};