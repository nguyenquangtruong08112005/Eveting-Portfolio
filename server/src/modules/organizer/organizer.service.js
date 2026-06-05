// src/modules/organizer/organizer.service.js
const TICKET_SECRET = process.env.JWT_TICKET_SECRET;
const jwt = require('jsonwebtoken');
const ticketService = require('../../services/ticket.service');
const fcmService = require('../../services/fcm.service');
const xlsx = require('xlsx');           // Cho Import
const ExcelJS = require('exceljs');     // Cho Export (Tạo file Excel chuyên nghiệp hơn xlsx)
const notificationService = require('../../services/notification.service');
const notifHelper = require('../../services/notification-event.helper');
const ticketRepository = require('../../providers/database/ticket.repository');
const userRepository = require('../../providers/database/user.repository');
const eventRepository = require('../../providers/database/event.repository');
const analyticsRepository = require('../../providers/database/analytics.repository');
const organizerRepository = require('../../providers/database/organizer.repository');


/**
 * Lấy danh sách người tham dự (attendees) cho một sự kiện.
 * @param {string} eventId - ID của sự kiện.
 * @returns {Promise<Array<object>>} Mảng thông tin vé và người dùng.
 */
const getAttendeesByEventId = async (eventId) => {
    const tickets = await ticketRepository.getAttendeeTicketsByEventId(eventId);

    if (tickets.length === 0) {
        return [];
    }

    const userIds = new Set();
    tickets.forEach(ticket => {
        if (ticket.userId) userIds.add(ticket.userId);
    });

    if (userIds.size === 0) return [];

    const usersMap = await userRepository.getUsersByIds(Array.from(userIds));

    const attendees = tickets.map(ticket => {
        const user = usersMap[ticket.userId] || { name: 'Unknown User', email: 'N/A' };
        return {
            ticket: {
                id: ticket.id,
                type: ticket.type,
                seat: ticket.seat,
                status: ticket.status,
                purchaseDate: ticket.purchaseDate
            },
            user: {
                id: ticket.userId,
                name: user.name,
                email: user.email,
                profilePicUrl: user.profilePicUrl
            }
        };
    });

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

    try {
        payload = jwt.verify(qrToken, TICKET_SECRET);
    } catch (error) {
        console.error("Lỗi xác thực QR JWT:", error.message);
        throw new Error('Invalid or tampered QR Code.');
    }

    const { ticketId, eventId, userId } = payload;

    return ticketRepository.runTransaction(async (transaction) => {
        const ticketData = await ticketRepository.getTicketInTransaction(transaction, ticketId);
        if (!ticketData) throw new Error('Ticket not found.');

        const eventData = await eventRepository.getEventInTransaction(transaction, eventId);
        if (!eventData) throw new Error('Event not found.');

        if (eventData.organizerId !== requestingOrganizerId) {
            throw new Error('Forbidden: You do not have permission for this event.');
        }

        if (ticketData.status !== 'paid' && ticketData.status !== 'checkedIn') {
            throw new Error(`Cannot check-in ticket with status '${ticketData.status}'.`);
        }

        const quantity = ticketData.quantity || 1;
        const currentCheckInCount = ticketData.checkInCount || 0;

        if (currentCheckInCount >= quantity) {
            throw new Error(`This ticket has been checked in (${currentCheckInCount}/${quantity} times).`);
        }

        const newCheckInCount = currentCheckInCount + 1;

        const updates = {
            checkInCount: newCheckInCount,
            lastCheckInAt: Date.now()
        };

        if (ticketData.status === 'paid') {
            updates.status = 'checkedIn';
        }

        ticketRepository.updateTicketInTransaction(transaction, ticketId, updates);

        if (currentCheckInCount === 0) {
            userRepository.addHistoryEventIdInTransaction(transaction, userId, eventId);
        }

        analyticsRepository.incrementCheckInInTransaction(transaction, eventId);

        return {
            ...ticketData,
            status: 'checkedIn',
            checkInCount: newCheckInCount,
            quantity: quantity,
            remaining: quantity - newCheckInCount
        };
    });
};

/**
 * Nâng cấp user lên Organizer
 */
const registerOrganizer = async (userId, organizerData) => {
    return await organizerRepository.addOrganizerRoleToUser(userId, organizerData);
};

/**
 * Lấy thông tin Profile Organizer
 */
const getOrganizerProfile = async (userId) => {
    const rawData = await organizerRepository.getOrganizerProfile(userId);
    if (!rawData) return null;

    return {
        id: rawData.id,
        name: rawData.organizerInfo?.companyName || rawData.name,
        avatarUrl: rawData.profilePicUrl,
        website: rawData.organizerInfo?.website || '',
        organizerInfo: rawData.organizerInfo,
        followersCount: 0,
        rating: 5.0
    };
};

/**
 * Lấy danh sách sự kiện của Organizer
 */
const getMyEvents = async (organizerId, page = 1, limit = 20, status) => {
    return await eventRepository.getEventsByOrganizerId(organizerId, { page, limit, status });
};

/**
 * Thống kê tổng quan (Stats)
 */
const getOrganizerStats = async (organizerId) => {
    const eventEntries = await eventRepository.getEventEntriesByOrganizer(organizerId);

    let totalEvents = 0;
    let upcomingEvents = 0;
    let totalRevenue = 0;
    let totalTicketsSold = 0;
    const now = new Date().getTime();
    const salesMap = {};
    const eventIds = [];

    eventEntries.forEach(entry => {
        totalEvents++;
        if (entry.date > now) upcomingEvents++;
        eventIds.push(entry.id);
    });

    if (eventIds.length > 0) {
        const analyticsList = await analyticsRepository.getAnalyticsByEventIds(eventIds);
        analyticsList.forEach(ana => {
            totalRevenue += ana.totalRevenue || 0;
            if (ana.ticketsSold) {
                Object.values(ana.ticketsSold).forEach(count => totalTicketsSold += count);
            }
            if (ana.dailySales) {
                for (const [timestampStr, count] of Object.entries(ana.dailySales)) {
                    const ts = parseInt(timestampStr);
                    const currentCount = salesMap[ts] || 0;
                    salesMap[ts] = currentCount + count;
                }
            }
        });
    }

    const salesOverTime = Object.entries(salesMap).map(([timestamp, value]) => ({
        timestamp: parseInt(timestamp),
        value: value
    })).sort((a, b) => a.timestamp - b.timestamp);

    return {
        totalRevenue,
        totalTicketsSold,
        totalEvents,
        upcomingEvents,
    };
};

/**
 * Cập nhật thông tin Profile Organizer
 * @param {string} userId - ID của organizer.
 * @param {object} updateData - Dữ liệu cần cập nhật (companyName, description, website...).
 */
const updateOrganizerProfile = async (userId, updateData) => {
    const dataToUpdate = {};

    if (updateData.companyName) dataToUpdate['organizerInfo.companyName'] = updateData.companyName;
    if (updateData.taxCode) dataToUpdate['organizerInfo.taxCode'] = updateData.taxCode;
    if (updateData.description) dataToUpdate['organizerInfo.description'] = updateData.description;
    if (updateData.website) dataToUpdate['organizerInfo.website'] = updateData.website;

    if (updateData.avatarUrl) dataToUpdate['profilePicUrl'] = updateData.avatarUrl;
    if (updateData.name) dataToUpdate['name'] = updateData.name;

    if (Object.keys(dataToUpdate).length > 0) {
        await organizerRepository.updateOrganizerProfile(userId, dataToUpdate);
    }

    return await module.exports.getOrganizerProfile(userId);
};
///////////////////////
/**
 * Import danh sách người tham tự từ file Excel/CSV.
 * @param {string} eventId - ID sự kiện.
 * @param {Buffer} fileBuffer - Buffer của file upload.
 * @param {string} organizerId - ID người thực hiện.
 */
const importAttendees = async (eventId, fileBuffer, organizerId) => {
    // 1. Đọc file Excel
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
        throw new Error("File is empty or invalid format.");
    }

    const eventData = await eventRepository.getEventDataById(eventId);
    if (!eventData) throw new Error("Event not found.");
    if (eventData.organizerId !== organizerId) throw new Error("Forbidden.");

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // 3. Loop và tạo vé
    for (const row of jsonData) {
        try {
            // Chấp nhận cả key viết hoa và thường
            const email = row['Email'] || row['email'];
            const ticketType = row['TicketType'] || row['ticketType'] || 'Standard';

            if (!email) throw new Error("Missing email.");

            const userData = await userRepository.findUserByEmail(email);
            if (!userData) {
                throw new Error(`User with email ${email} not found in system.`);
            }
            const userId = userData._id;

            // Tạo vé (Book -> Confirm Payment luôn vì đây là vé mời/nhập tay)
            // Lưu ý: Cần đảm bảo ticketService.bookTicket hỗ trợ promoCode null
            const newTicket = await ticketService.bookTicket(userId, eventId, ticketType);
            await ticketService.confirmTicketPayment(newTicket.id);

            // TODO: Gửi email vé (QR Code) cho user
            // await sendEmailTicket(email, newTicket);

            successCount++;
        } catch (err) {
            failCount++;
            // Ghi lại dòng lỗi và lý do để trả về cho client
            errors.push({
                row: row,
                error: err.message
            });
        }
    }

    return { successCount, failCount, errors };
};

/**
 * Export danh sách người tham dự ra file Excel.
 * @returns {Promise<Buffer>} Buffer của file Excel.
 */
const exportAttendees = async (eventId) => {
    // Tái sử dụng hàm lấy danh sách (đã tối ưu ở bước trước)
    // Lưu ý: Cần gọi hàm nội bộ hoặc require lại chính file này nếu cần
    const attendees = await module.exports.getAttendeesByEventId(eventId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendees');

    sheet.columns = [
        { header: 'Ticket ID', key: 'ticketId', width: 25 },
        { header: 'User Name', key: 'userName', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Ticket Type', key: 'type', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Check-in Time', key: 'checkInAt', width: 25 }
    ];

    attendees.forEach(item => {
        sheet.addRow({
            ticketId: item.ticket.id,
            userName: item.user.name,
            email: item.user.email,
            type: item.ticket.type,
            status: item.ticket.status,
            checkInAt: item.ticket.checkedInAt ? new Date(item.ticket.checkedInAt).toLocaleString() : 'Not yet'
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

/**
 * Gửi thông báo Broadcast cho tất cả người tham gia.
 */
const broadcastNotification = async (eventId, title, message, organizerId) => {
    const eventData = await eventRepository.getEventById(eventId);
    if (!eventData) throw new Error("Event not found.");
    if (eventData.organizerId !== organizerId) throw new Error("Forbidden.");

    const tickets = await ticketRepository.getAttendeeTicketsByEventId(eventId);

    if (tickets.length === 0) return { count: 0 };

    const userIds = [...new Set(tickets.map(t => t.userId))];

    // 3. Lấy tokens và gửi thông báo
    // Tạo Notification doc cho từng user
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

module.exports = {
    getAttendeesByEventId,
    checkInByQr,
    registerOrganizer,
    getOrganizerProfile,
    getMyEvents,
    getOrganizerStats,
    updateOrganizerProfile,
    importAttendees,
    exportAttendees,
    broadcastNotification
};
