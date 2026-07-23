const { fcmService, service: notificationService, helper: notifHelper } = require('@/modules/notifications');
const ticketRepository = require('@/providers/database/ticket.repository');

const notifyAttendeesAboutUpdate = async (eventId, eventName) => {
    try {
        const tickets = await ticketRepository.getAttendeeTicketsByEventId(eventId);

        if (tickets.length === 0) return;

        const userIds = [...new Set(tickets.map(t => t.userId))];
        console.log(`[EventUpdate] Found ${userIds.length} users to notify.`);

        const title = "⚠️ Cập nhật sự kiện";
        const body = `Sự kiện "${eventName}" vừa có thay đổi thông tin. Vui lòng kiểm tra lại vé và chi tiết sự kiện.`;
        const payloadData = notifHelper.buildPayloadData("event_update", eventId);

        const { recipientIds, tokens } = await notifHelper.collectMessagingTargets(userIds);

        for (const uid of recipientIds) {
            await notificationService.createNotification(uid, title, body, "update", eventId);
        }

        if (tokens.length > 0) {
            await fcmService.sendMulticast(tokens, title, body, payloadData);
        }
    } catch (error) {
        console.error("[EventUpdate] Failed to notify attendees:", error);
    }
};

const notifyAttendeesAboutCancellation = async (eventId, eventName) => {
    try {
        const tickets = await ticketRepository.getAttendeeTicketsByEventId(eventId);

        if (tickets.length === 0) return;

        const userIds = [...new Set(tickets.map(t => t.userId))];
        const { recipientIds, tokens } = await notifHelper.collectMessagingTargets(userIds);

        for (const uid of recipientIds) {
            await notificationService.createNotification(
                uid,
                "⚠️ Sự kiện bị hủy",
                `Rất tiếc, sự kiện "${eventName}" đã bị hủy.`,
                "update",
                eventId
            );
        }

        if (tokens.length > 0) {
            const payloadData = notifHelper.buildPayloadData("event_cancelled", eventId);
            await fcmService.sendMulticast(tokens, "⚠️ Sự kiện bị hủy", `Sự kiện "${eventName}" đã bị hủy.`, payloadData);
        }
    } catch (error) {
        console.error("[EventCancel] Failed to notify attendees:", error);
    }
};

module.exports = {
    notifyAttendeesAboutUpdate,
    notifyAttendeesAboutCancellation
};
