// jobs/reminder.job.js
const cron = require('node-cron');
const { db } = require('../config/firebase.config');
const fcmService = require('../services/fcm.service');
const moment = require('moment');

const startReminderJob = () => {
    // Chạy mỗi 30 phút: "*/30 * * * *"
    console.log("⏰ Reminder Job started...");
    
    cron.schedule('*/30 * * * *', async () => {
        console.log("Running event reminder check...");
        
        const now = moment();
        const next24h = moment().add(24, 'hours');
        const next24h_plus30m = moment().add(24, 'hours').add(30, 'minutes');

        // 1. Tìm các sự kiện diễn ra trong khoảng 24h tới (trong khe 30 phút quét)
        const eventsSnapshot = await db.collection('Events')
            .where('date', '>=', next24h.valueOf())
            .where('date', '<', next24h_plus30m.valueOf())
            .where('status', '==', 'active')
            .get();

        if (eventsSnapshot.empty) return;

        // 2. Với mỗi sự kiện, tìm vé và gửi thông báo
        for (const eventDoc of eventsSnapshot.docs) {
            const event = eventDoc.data();
            
            // Tìm vé
            const ticketsSnapshot = await db.collection('Tickets')
                .where('eventId', '==', eventDoc.id)
                .where('status', '==', 'paid')
                .get();
                
            const userIds = [...new Set(ticketsSnapshot.docs.map(t => t.data().userId))];
            if (userIds.length === 0) continue;

            // Lấy tokens
            // Lưu ý: Firestore 'in' query giới hạn 10 items. Nếu userIds đông, phải chia mảng.
            // Ở đây giả sử project nhỏ < 10 user/lần quét.
            const userDocs = await db.collection('Users')
                .where(admin.firestore.FieldPath.documentId(), 'in', userIds)
                .get();

            const tokens = [];
            userDocs.forEach(u => {
                if (u.data().fcmToken) tokens.push(u.data().fcmToken);
            });

            if (tokens.length > 0) {
                await fcmService.sendMulticast(
                    tokens,
                    "Sự kiện sắp diễn ra! ⏰",
                    `${event.name} sẽ bắt đầu vào ngày mai lúc ${moment(event.date).format('HH:mm')}.`,
                    { eventId: event.id, type: "reminder" }
                );
                console.log(`Sent reminders for event ${event.name} to ${tokens.length} users.`);
            }
        }
    });
};

module.exports = { startReminderJob };