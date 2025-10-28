// services/ticket.service.js
const { db, FieldValue } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Lấy tất cả vé của một người dùng cụ thể.
 * @param {string} userId - ID của người dùng.
 * @returns {Promise<Array<object>>} Mảng các document vé.
 */

const getTicketsByUserId = async (userId, page = 1, limit = 10) => {
    const ticketsRef = db.collection('Tickets').where('userId', '==', userId);
    const offset = (page - 1) * limit;

    // Lấy tổng số lượng vé của user
    const countSnapshot = await ticketsRef.count().get();
    const totalTickets = countSnapshot.data().count;

    // Truy vấn dữ liệu vé cho trang hiện tại
    const ticketsSnapshot = await ticketsRef
        .orderBy('purchaseDate', 'desc') // Sắp xếp vé mới nhất lên đầu
        .limit(limit)
        .offset(offset)
        .get();

    const tickets = [];
    ticketsSnapshot.forEach(doc => {
        tickets.push(doc.data());
    });

    return {
        tickets,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalTickets / limit),
            totalItems: totalTickets
        }
    };
};

/**
 * Xử lý logic đặt vé cho một sự kiện bằng Transaction, có hỗ trợ mã khuyến mãi.
 * @param {string} userId - ID người mua.
 * @param {string} eventId - ID sự kiện.
 * @param {string} ticketType - Loại vé (ví dụ: 'Standard', 'VIP').
 * @param {string} [promoCode] - (Optional) Mã khuyến mãi người dùng nhập.
 * @returns {Promise<object>} Document vé vừa được tạo.
 */
const bookTicket = async (userId, eventId, ticketType, promoCode = null) => {
    const eventRef = db.collection('Events').doc(eventId);
    const ticketId = `tkt_${uuidv4()}`;
    const ticketRef = db.collection('Tickets').doc(ticketId);
    let promotionRef = null; // Biến để lưu ref của promotion nếu có
    let promotionData = null; // Biến để lưu data của promotion nếu có

    // Chạy toàn bộ logic trong một transaction
    return db.runTransaction(async (transaction) => {
        // --- 1. Lấy thông tin sự kiện ---
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists) {
            throw new Error("Event not found!");
        }
        const eventData = eventDoc.data();
        const ticketTypeData = eventData.ticketTypes[ticketType];

        // --- 2. Kiểm tra loại vé ---
        if (!ticketTypeData) {
            throw new Error(`Ticket type '${ticketType}' does not exist for this event.`);
        }
        if (ticketTypeData.available <= 0) {
            throw new Error(`Ticket type '${ticketType}' is sold out.`);
        }
        let finalPrice = ticketTypeData.price; // Giá vé ban đầu

        // --- 3. Xử lý mã khuyến mãi (nếu có) ---
        if (promoCode) {
            const promoQuery = db.collection('Promotions').where('code', '==', promoCode).limit(1);
            const promoSnapshot = await transaction.get(promoQuery); // Phải get trong transaction

            if (promoSnapshot.empty) {
                throw new Error('Invalid promotion code.');
            }
            
            promotionRef = promoSnapshot.docs[0].ref; // Lấy ref để update sau
            promotionData = promoSnapshot.docs[0].data();
            const now = new Date().getTime();

            // Validate promotion (expiry, usage, event applicability)
            if (promotionData.validUntil <= now) throw new Error('Promotion has expired.');
            if (promotionData.usedCount >= promotionData.usageLimit) throw new Error('Promotion has reached its usage limit.');
            if (promotionData.eventId !== null && promotionData.eventId !== eventId) throw new Error('Promotion not valid for this event.');

            // Tính lại giá cuối cùng
            if (promotionData.discountPercent > 0) {
                finalPrice = finalPrice * (1 - promotionData.discountPercent);
            } else if (promotionData.discountAmount > 0) {
                finalPrice = Math.max(0, finalPrice - promotionData.discountAmount); // Đảm bảo giá không âm
            }
        }

        // --- 4. Chuẩn bị dữ liệu vé mới ---
        const newTicketData = {
            id: ticketId,
            eventId: eventId,
            userId: userId,
            organizerId: eventData.organizerId,
            type: ticketType,
            price: finalPrice, // <-- Dùng giá cuối cùng
            originalPrice: ticketTypeData.price, // Lưu lại giá gốc để tham khảo
            appliedPromoCode: promoCode, // Lưu lại mã đã áp dụng
            seat: null, // TODO: Sẽ xử lý logic chọn ghế sau
            qrCode: `EVENTING_${ticketId}`,
            status: 'pending', // Trạng thái ban đầu là chờ thanh toán
            purchaseDate: new Date().getTime(),
            groupId: null,
        };

        // --- 5. Thực hiện các thao tác ghi trong transaction ---
        transaction.set(ticketRef, newTicketData); // Tạo vé mới

        // Cập nhật số lượng vé còn lại trong Events
        const newAvailableCount = ticketTypeData.available - 1;
        transaction.update(eventRef, {
            [`ticketTypes.${ticketType}.available`]: newAvailableCount
        });

        // Cập nhật số lượt đã dùng của promotion (nếu có)
        if (promotionRef && promotionData) {
            transaction.update(promotionRef, {
                usedCount: FieldValue.increment(1) // Tăng usedCount lên 1
            });
        }

        return newTicketData; // Trả về vé vừa tạo nếu thành công
    });
};

/**
 * Hủy một vé (thường do thanh toán thất bại hoặc timeout).
 * @param {string} ticketId - ID của vé cần hủy.
 * @returns {Promise<object|null>} Document vé sau khi đã cập nhật, hoặc null nếu không tìm thấy.
 */
const cancelPendingTicket = async (ticketId) => {
    const ticketRef = db.collection('Tickets').doc(ticketId);
    
    // Dùng transaction để đảm bảo chỉ hủy vé đang ở trạng thái 'pending'
    return db.runTransaction(async (transaction) => {
        const ticketDoc = await transaction.get(ticketRef);
        if (!ticketDoc.exists) {
            console.warn(`Attempted to cancel non-existent ticket: ${ticketId}`);
            return null; // Hoặc throw error tùy logic
        }

        const ticketData = ticketDoc.data();
        if (ticketData.status !== 'pending') {
            console.log(`Ticket ${ticketId} is not in 'pending' state, cannot cancel.`);
            return ticketData; // Trả về trạng thái hiện tại
        }

        // Hủy vé
        transaction.update(ticketRef, { status: 'cancelled' });

        // TODO (Quan trọng): Hoàn trả lại số lượng vé 'available' cho sự kiện
        // const eventRef = db.collection('Events').doc(ticketData.eventId);
        // transaction.update(eventRef, {
        //     [`ticketTypes.${ticketData.type}.available`]: FieldValue.increment(1)
        // });

        return { ...ticketData, status: 'cancelled' };
    });
};

/**
 * Xác nhận thanh toán cho một vé.
 * @param {string} ticketId - ID của vé cần xác nhận.
 * @returns {Promise<object>} Document vé sau khi đã cập nhật.
 */
const confirmTicketPayment = async (ticketId) => {
    const ticketRef = db.collection('Tickets').doc(ticketId);
    const doc = await ticketRef.get();

    if (!doc.exists) {
        throw new Error('Ticket not found.');
    }

    const ticketData = doc.data(); // Lấy dữ liệu trước khi kiểm tra status

    // Nếu vé đã paid hoặc checkedIn rồi thì không cần làm gì nữa
    if (ticketData.status === 'paid' || ticketData.status === 'checkedIn') {
        console.log(`Ticket ${ticketId} is already confirmed (${ticketData.status}).`);
        return ticketData;
    }

    // Chỉ cập nhật nếu đang là 'pending'
    if (ticketData.status === 'pending') {
        await ticketRef.update({ status: 'paid' });
        console.log(`Ticket ${ticketId} status updated to 'paid'.`);

        // TODO: Sau khi xác nhận thanh toán, ta có thể:
        // 1. Gửi email/thông báo xác nhận cho người dùng.
        // 2. Cập nhật dữ liệu trong collection Analytics (tăng doanh thu, vé bán).

        return { ...ticketData, status: 'paid' }; // Trả về dữ liệu đã cập nhật
    } else {
        // Các trạng thái khác (ví dụ: 'cancelled') thì không cập nhật
        console.warn(`Attempted to confirm payment for ticket ${ticketId} with status '${ticketData.status}'. No update performed.`);
        return ticketData; // Trả về dữ liệu gốc
    }
};

module.exports = {
    getTicketsByUserId,
    bookTicket,
    cancelPendingTicket,
    confirmTicketPayment,
};