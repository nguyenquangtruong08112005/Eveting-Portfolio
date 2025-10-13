// services/organizer.service.js
const { db } = require('../config/firebase.config');

/**
 * Lấy danh sách người tham dự (attendees) cho một sự kiện.
 * @param {string} eventId - ID của sự kiện.
 * @returns {Promise<Array<object>>} Mảng thông tin vé và người dùng.
 */
const getAttendeesByEventId = async (eventId) => {
    const attendees = [];
    // Lấy tất cả vé đã thanh toán hoặc đã check-in
    const ticketsSnapshot = await db.collection('Tickets')
        .where('eventId', '==', eventId)
        .where('status', 'in', ['paid', 'checkedIn'])
        .get();

    if (ticketsSnapshot.empty) {
        return [];
    }

    // TODO: Để tối ưu, thay vì gọi getUserById trong vòng lặp,
    // ta có thể lấy tất cả userId rồi dùng toán tử 'in' để query Users 1 lần.
    for (const ticketDoc of ticketsSnapshot.docs) {
        const ticketData = ticketDoc.data();
        const userDoc = await db.collection('Users').doc(ticketData.userId).get();
        if (userDoc.exists) {
            attendees.push({
                ticket: ticketData,
                user: userDoc.data()
            });
        }
    }
    return attendees;
};

/**
 * Check-in cho một vé.
 * @param {string} ticketId - ID của vé cần check-in.
 * @returns {Promise<object>} Document vé sau khi đã cập nhật.
 */

const checkInTicket = async (ticketId) => {
    const ticketRef = db.collection('Tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
        throw new Error('Ticket not found.');
    }

    const ticketData = ticketDoc.data();

    if (ticketData.status === 'checkedIn') {
        return ticketData; // Vé đã được check-in, trả về thông tin hiện tại
    }

    if (ticketData.status !== 'paid') {
        throw new Error(`Cannot check-in ticket with status '${ticketData.status}'.`);
    }

    await ticketRef.update({ status: 'checkedIn' });

    return { ...ticketData, status: 'checkedIn' };
};

module.exports = {
    getAttendeesByEventId,
    checkInTicket,
};