// services/ticket.service.js
const { db } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Lấy tất cả vé của một người dùng cụ thể.
 * @param {string} userId - ID của người dùng.
 * @returns {Promise<Array<object>>} Mảng các document vé.
 */

const getTicketsByUserId = async (userId) => {
    const tickets = [];
    // Tạo một truy vấn để tìm tất cả vé có 'userId' khớp
    const ticketsSnapshot = await db.collection('Tickets').where('userId', '==', userId).get();

    if (ticketsSnapshot.empty) {
        return []; // Trả về mảng rỗng nếu không có vé nào
    }

    ticketsSnapshot.forEach(doc => {
        tickets.push(doc.data());
    });
 
    // TODO: Sắp xếp vé theo ngày mua gần nhất
    // tickets.sort((a, b) => b.purchaseDate - a.purchaseDate);

    return tickets;
};

/**
 * Xử lý logic đặt vé cho một sự kiện bằng Transaction.
 * @param {string} userId - ID người mua.
 * @param {string} eventId - ID sự kiện.
 * @param {string} ticketType - Loại vé (ví dụ: 'Standard', 'VIP').
 * @returns {Promise<object>} Document vé vừa được tạo.
 */

const bookTicket = async (userId, eventId, ticketType) => {
    const eventRef = db.collection('Events').doc(eventId);
    const ticketId = `tkt_${uuidv4()}`; // Tạo một ID vé duy nhất
    const ticketRef = db.collection('Tickets').doc(ticketId);

    // Chạy toàn bộ logic trong một transaction
    return db.runTransaction(async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists) {
            throw new Error("Event not found!");
        }

        const eventData = eventDoc.data();
        const ticketTypeData = eventData.ticketTypes[ticketType];

        // 1. Kiểm tra vé
        if (!ticketTypeData) {
            throw new Error(`Ticket type '${ticketType}' does not exist for this event.`);
        }
        if (ticketTypeData.available <= 0) {
            throw new Error(`Ticket type '${ticketType}' is sold out.`);
        }

        // 2. Chuẩn bị dữ liệu cho vé mới
        const newTicketData = {
            id: ticketId,
            eventId: eventId,
            userId: userId,
            organizerId: eventData.organizerId,
            type: ticketType,
            price: ticketTypeData.price,
            seat: null, // TODO: Sẽ xử lý logic chọn ghế sau
            qrCode: `EVENTING_${ticketId}`,
            status: 'pending', // Trạng thái ban đầu là chờ thanh toán
            purchaseDate: new Date().getTime(),
            groupId: null,
        };

        // 3. Thực hiện các thao tác ghi
        transaction.set(ticketRef, newTicketData); // Tạo vé mới
        
        // Cập nhật số lượng vé còn lại
        const newAvailableCount = ticketTypeData.available - 1;
        transaction.update(eventRef, {
            [`ticketTypes.${ticketType}.available`]: newAvailableCount
        });

        return newTicketData; // Trả về vé vừa tạo nếu thành công
    });
};

module.exports = {
    getTicketsByUserId,
    bookTicket,
};