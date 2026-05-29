// providers/notification/firebase.provider.js
const { admin } = require('../../config/firebase.config');

const FCM_BATCH_LIMIT = 500;

/**
 * Send multicast notification to a list of tokens
 */
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
 * Send notification to a specific topic
 */
const sendToTopic = async (topic, title, body, data = {}) => {
    const message = {
        notification: { title, body },
        data: data,
        topic: topic,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message to topic:', response);
    } catch (error) {
        console.error('Error sending message to topic:', error);
    }
};

/**
 * Subscribe a list of tokens to a topic
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
 * Unsubscribe a list of tokens from a topic
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
    sendToTopic,
    subscribeToTopic,
    unsubscribeFromTopic,
};
