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
 * Xác thực một mã QR (JWT) và check-in vé.
 * @param {string} qrToken - Chuỗi JWT từ mã QR.
 * @param {string} requestingOrganizerId - ID của organizer đang quét mã.
 * @returns {Promise<object>} Document vé đã được check-in.
 */
const checkInByQr = async (qrToken, requestingOrganizerId) => {
    let payload;

    // 1. Giải mã và xác thực JWT
    try {
        payload = jwt.verify(qrToken, TICKET_SECRET);
    } catch (error) {
        console.error("Lỗi xác thực QR JWT:", error.message);
        throw new Error('Invalid or tampered QR Code.');
    }

    const { ticketId, eventId, userId } = payload;
    
    // 2. Lấy thông tin vé và sự kiện (trong 1 transaction để an toàn)
    const ticketRef = db.collection('Tickets').doc(ticketId);
    const eventRef = db.collection('Events').doc(eventId);

    return db.runTransaction(async (transaction) => {
        const ticketDoc = await transaction.get(ticketRef);
        const eventDoc = await transaction.get(eventRef);

        if (!ticketDoc.exists) throw new Error('Ticket not found.');
        if (!eventDoc.exists) throw new Error('Event not found.');

        // 3. Kiểm tra quyền sở hữu
        if (eventDoc.data().organizerId !== requestingOrganizerId) {
            throw new Error('Forbidden: You do not have permission for this event.');
        }

        // 4. Kiểm tra trạng thái vé
        const ticketData = ticketDoc.data();
        if (ticketData.status === 'checkedIn') {
            throw new Error('This ticket has already been checked in.');
        }
        if (ticketData.status !== 'paid') {
            throw new Error(`Cannot check-in ticket with status '${ticketData.status}'.`);
        }

        // 5. Check-in vé
        transaction.update(ticketRef, { status: 'checkedIn' });

        return { ...ticketData, status: 'checkedIn' };
    });
};

module.exports = {
    getAttendeesByEventId,
    checkInByQr,
};