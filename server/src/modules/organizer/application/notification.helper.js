const { fcmService, service: notificationService, helper: notifHelper } = require('@/modules/notifications');

const sendBroadcastNotification = async (userIds, title, message, eventId) => {
    const { recipientIds, tokens } = await notifHelper.collectMessagingTargets(userIds);
    for (const uid of recipientIds) {
        await notificationService.createNotification(uid, title, message, "system", eventId);
    }
    if (tokens.length > 0) {
        const payloadData = notifHelper.buildPayloadData("broadcast", eventId);
        await fcmService.sendMulticast(tokens, title, message, payloadData);
    }
    return { count: recipientIds.length };
};

module.exports = { sendBroadcastNotification };
