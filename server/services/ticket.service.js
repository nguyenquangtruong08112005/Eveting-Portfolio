// services/ticket.service.js
const { db, FieldValue } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const TICKET_SECRET = process.env.JWT_TICKET_SECRET;

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
    let promotionRef = null;
    let promotionData = null;

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
        let finalPrice = ticketTypeData.price;

        // --- 3. Xử lý mã khuyến mãi (nếu có) ---
        if (promoCode) {
            // ... (Logic xử lý promo code giữ nguyên)
            const promoQuery = db.collection('Promotions').where('code', '==', promoCode).limit(1);
            const promoSnapshot = await transaction.get(promoQuery);
            if (promoSnapshot.empty) { throw new Error('Invalid promotion code.'); }
            promotionRef = promoSnapshot.docs[0].ref;
            promotionData = promoSnapshot.docs[0].data();
            const now = new Date().getTime();
            if (promotionData.validUntil <= now) throw new Error('Promotion has expired.');
            if (promotionData.usedCount >= promotionData.usageLimit) throw new Error('Promotion has reached its usage limit.');
            if (promotionData.eventId !== null && promotionData.eventId !== eventId) throw new Error('Promotion not valid for this event.');
            if (promotionData.discountPercent > 0) {
                finalPrice = finalPrice * (1 - promotionData.discountPercent);
            } else if (promotionData.discountAmount > 0) {
                finalPrice = Math.max(0, finalPrice - promotionData.discountAmount);
            }
        }

        // --- 4. Chuẩn bị dữ liệu vé mới ---

        // --- BẮT ĐẦU SỬA ĐỔI (TẠO QR BẰNG JWT) ---
        const qrPayload = {
            ticketId: ticketId,
            userId: userId,
            eventId: eventId
        };
        // Ký (sign) token, không cần đặt hạn (no expiration)
        const qrCodeJwt = jwt.sign(qrPayload, TICKET_SECRET); 
        // --- KẾT THÚC SỬA ĐỔI ---

        const newTicketData = {
            id: ticketId,
            eventId: eventId,
            userId: userId,
            organizerId: eventData.organizerId,
            type: ticketType,
            price: finalPrice,
            originalPrice: ticketTypeData.price,
            appliedPromoCode: promoCode,
            seat: null, 
            qrCode: qrCodeJwt, // <-- Gán JWT đã ký vào đây
            status: 'pending', 
            purchaseDate: new Date().getTime(),
            groupId: null,
        };

        // --- 5. Thực hiện các thao tác ghi trong transaction ---
        transaction.set(ticketRef, newTicketData);
        const newAvailableCount = ticketTypeData.available - 1;
        transaction.update(eventRef, {
            [`ticketTypes.${ticketType}.available`]: newAvailableCount
        });
        if (promotionRef && promotionData) {
            transaction.update(promotionRef, {
                usedCount: FieldValue.increment(1)
            });
        }

        // Chỉ trả về thông tin tối thiểu
        return {
            id: newTicketData.id,
            status: newTicketData.status,
            price: newTicketData.price,
            originalPrice: newTicketData.originalPrice
        };
    });
};

/**
 * Hủy một vé (thường do thanh toán thất bại hoặc timeout).
 * @param {string} ticketId - ID của vé cần hủy.
 * @returns {Promise<object|null>} Document vé sau khi đã cập nhật, hoặc null nếu không tìm thấy.
 */
const cancelPendingTicket = async (ticketId) => {
    const ticketRef = db.collection('Tickets').doc(ticketId);
    
    // Dùng transaction để đảm bảo an toàn dữ liệu
    return db.runTransaction(async (transaction) => {
        const ticketDoc = await transaction.get(ticketRef);
        if (!ticketDoc.exists) {
            console.warn(`Attempted to cancel non-existent ticket: ${ticketId}`);
            return null; // Vé không tồn tại
        }

        const ticketData = ticketDoc.data();
        if (ticketData.status !== 'pending') {
            console.log(`Ticket ${ticketId} is not in 'pending' state (${ticketData.status}), cannot cancel.`);
            return ticketData; // Trả về trạng thái hiện tại (ví dụ: đã paid, đã checkedIn)
        }

        // --- HOÀN THIỆN TODO ---
        
        // 1. Hủy vé
        transaction.update(ticketRef, { status: 'cancelled' });

        // 2. Hoàn trả lại số lượng vé 'available' cho sự kiện
        const eventRef = db.collection('Events').doc(ticketData.eventId);
        
        // Dùng FieldValue.increment(1) để cộng lại 1 vé vào 'available'
        transaction.update(eventRef, {
            [`ticketTypes.${ticketData.type}.available`]: FieldValue.increment(1)
        });
        
        // --- KẾT THÚC TODO ---

        console.log(`Ticket ${ticketId} cancelled, 1 ticket of type ${ticketData.type} returned to event ${ticketData.eventId}.`);
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

        const eventRef = db.collection('Events').doc(ticketData.eventId);
        const analyticsRef = db.collection('Analytics').doc(ticketData.eventId);

        await db.runTransaction(async (transaction) => {
            // 1. Cập nhật trạng thái vé
            transaction.update(ticketRef, { status: 'paid' });

            // 2. Cập nhật Analytics (tăng doanh thu và vé bán)
            // Dùng FieldValue.increment() để cộng dồn an toàn
            transaction.set(analyticsRef, {
                totalRevenue: FieldValue.increment(ticketData.price),
                ticketsSold: {
                    [ticketData.type]: FieldValue.increment(1)
                }
            }, { merge: true }); // Dùng merge: true để tạo mới nếu chưa có, hoặc gộp nếu đã có
        });
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

/**
 * LẤY HÀM NÀY THÊM VÀO
 * Lấy thông tin chi tiết (đã gộp) của một vé.
 * @param {string} ticketId - ID của vé.
 * @param {string} requestingUserId - ID của người đang yêu cầu (đã xác thực).
 * @returns {Promise<object>} Dữ liệu gộp của Vé, Sự kiện, và Địa điểm.
 */
const getTicketDetailsById = async (ticketId, requestingUserId) => {
    // 1. Lấy thông tin vé
    const ticketRef = db.collection('Tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
        throw new Error('Ticket not found.');
    }
    const ticketData = ticketDoc.data();

    // 2. Lấy thông tin sự kiện
    const eventRef = db.collection('Events').doc(ticketData.eventId);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
        throw new Error('Associated event not found.');
    }
    const eventData = eventDoc.data();

    // 3. Kiểm tra quyền (Bảo mật quan trọng)
    const isTicketOwner = ticketData.userId === requestingUserId;
    const isEventOrganizer = eventData.organizerId === requestingUserId;
    
    if (!isTicketOwner && !isEventOrganizer) {
        // Nếu người gọi không phải chủ vé VÀ cũng không phải người tổ chức
        throw new Error('Forbidden: You do not have permission to view this ticket.');
    }

    // 4. Lấy thông tin địa điểm (Venue) (Nếu là sự kiện offline)
    let venueData = null;
    if (eventData.venueId) {
        const venueDoc = await db.collection('Venues').doc(eventData.venueId).get();
        if (venueDoc.exists) {
            venueData = venueDoc.data();
        }
    }

    // 5. Trả về đối tượng DTO đã gộp
    return {
        ticket: ticketData, // Toàn bộ thông tin vé (id, qrCode, seat, price...)
        event: { // Các thông tin public của sự kiện
            name: eventData.name,
            date: eventData.date,
            endDate: eventData.endDate,
            bannerUrl: eventData.bannerUrl,
            eventType: eventData.eventType,
            onlineUrl: eventData.onlineUrl,
            city: eventData.city,
            venueName: eventData.venueName,
        },
        venue: venueData ? { // Thông tin địa điểm (nếu có)
            name: venueData.name,
            addressDetails: venueData.addressDetails,
            location: venueData.location
        } : null
    };
};

module.exports = {
    getTicketsByUserId,
    bookTicket,
    cancelPendingTicket,
    confirmTicketPayment,
    getTicketDetailsById,
};