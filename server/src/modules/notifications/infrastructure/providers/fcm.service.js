const notificationProvider = require('@/providers/notification');

const sendMulticast = async (tokens, title, body, data = {}) => {
    return notificationProvider.sendMulticast(tokens, title, body, data);
};

const sendToTopic = async (topic, title, body, data = {}) => {
    return notificationProvider.sendToTopic(topic, title, body, data);
};

const subscribeToTopic = async (tokens, topic) => {
    return notificationProvider.subscribeToTopic(tokens, topic);
};

const unsubscribeFromTopic = async (tokens, topic) => {
    return notificationProvider.unsubscribeFromTopic(tokens, topic);
};

module.exports = {
    sendMulticast,
    sendToTopic,
    subscribeToTopic,
    unsubscribeFromTopic,
};
