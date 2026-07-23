// jobs/reminder.job.js
const cron = require('node-cron');
const { fcmService, helper: notifHelper } = require('@/modules/notifications');
const eventRepository = require('../providers/database/event.repository');
const ticketRepository = require('../providers/database/ticket.repository');
const moment = require('moment');

const startReminderJob = () => {
    console.log("⏰ Reminder Job started...");
    
    cron.schedule('*/30 * * * *', async () => {
        console.log("Running event reminder check...");
        
        const now = moment();
        const next24h = moment().add(24, 'hours');
        const next24h_plus30m = moment().add(24, 'hours').add(30, 'minutes');

        // Pass Date (or ms) — repository converts millis → TIMESTAMPTZ via toDb
        const events = await eventRepository.getActiveEventsInDateRange(
            next24h.toDate(),
            next24h_plus30m.toDate()
        );

        if (!events || events.length === 0) return;

        for (const event of events) {
            const tickets = await ticketRepository.getPaidTicketsByEventId(event._id || event.id);
                
            const userIds = [...new Set(tickets.map(t => t.userId))];
            if (userIds.length === 0) continue;

            const tokens = await notifHelper.collectTokens(userIds);

            if (tokens.length > 0) {
                const payloadData = notifHelper.buildPayloadData("reminder", event.id);
                await fcmService.sendMulticast(
                    tokens,
                    "Sự kiện sắp diễn ra! ⏰",
                    `${event.name} sẽ bắt đầu vào ngày mai lúc ${moment(event.date).format('HH:mm')}.`,
                    payloadData
                );
                console.log(`Sent reminders for event ${event.name} to ${tokens.length} users.`);
            }
        }
    });
};

module.exports = { startReminderJob };
