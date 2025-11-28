// services/organizer.service.js
const { db, FieldValue } = require('../config/firebase.config');
const TICKET_SECRET = process.env.JWT_TICKET_SECRET;
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const ticketService = require('./ticket.service');
const fcmService = require('./fcm.service');
const xlsx = require('xlsx');           // Cho Import
const ExcelJS = require('exceljs');     // Cho Export (Tạo file Excel chuyên nghiệp hơn xlsx)
const notificationService = require('./notification.service'); // Cho Broadcast


/**
 * Lấy danh sách người tham dự (attendees) cho một sự kiện.
 * @param {string} eventId - ID của sự kiện.
 * @returns {Promise<Array<object>>} Mảng thông tin vé và người dùng.
 */
const getAttendeesByEventId = async (eventId) => {
    // 1. Lấy tất cả vé đã thanh toán hoặc check-in
    const ticketsSnapshot = await db.collection('Tickets')
        .where('eventId', '==', eventId)
        .where('status', 'in', ['paid', 'checkedIn'])
        .get();

    if (ticketsSnapshot.empty) {
        return [];
    }

    const tickets = [];
    const userIds = new Set(); // Dùng Set để loại bỏ ID trùng lặp

    ticketsSnapshot.forEach(doc => {
        const data = doc.data();
        tickets.push(data);
        if (data.userId) userIds.add(data.userId);
    });

    if (userIds.size === 0) return [];

    // 2. Lấy thông tin User (Tối ưu)
    // Firestore giới hạn truy vấn 'in' tối đa 10 phần tử.
    // Chúng ta cần chia mảng userIds thành các mảng con (chunks) nhỏ hơn 10.
    const userIdsArray = Array.from(userIds);
    const userDocsPromises = [];
    const CHUNK_SIZE = 10;

    for (let i = 0; i < userIdsArray.length; i += CHUNK_SIZE) {
        const chunk = userIdsArray.slice(i, i + CHUNK_SIZE);
        // Truy vấn Users có ID nằm trong chunk này
        const q = db.collection('Users').where(admin.firestore.FieldPath.documentId(), 'in', chunk);
        userDocsPromises.push(q.get());
    }

    const userSnapshots = await Promise.all(userDocsPromises);

    // Tạo Map để tra cứu nhanh: userId -> userData
    const usersMap = {};
    userSnapshots.forEach(snap => {
        snap.forEach(doc => {
            usersMap[doc.id] = doc.data();
        });
    });

    // 3. Ghép dữ liệu (Map Vé với User tương ứng)
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
    const userRef = db.collection('Users').doc(userId); // <-- Tham chiếu đến User

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
        transaction.update(ticketRef, { status: 'checkedIn', checkedInAt: new Date().getTime() });
        transaction.update(userRef, {
            historyEventIds: FieldValue.arrayUnion(eventId)
        });

        const analyticsRef = db.collection('Analytics').doc(eventId);
        transaction.set(analyticsRef, {
            checkIns: FieldValue.increment(1)
        }, { merge: true });
        return { ...ticketData, status: 'checkedIn' };
    });
};

/**
 * Nâng cấp user lên Organizer
 */
const registerOrganizer = async (userId, organizerData) => {
    const userRef = db.collection('Users').doc(userId);

    // Cập nhật role và thông tin doanh nghiệp
    await userRef.update({
        roles: FieldValue.arrayUnion('organizer'),
        organizerInfo: {
            companyName: organizerData.companyName,
            taxCode: organizerData.taxCode || '',
            description: organizerData.description || '',
            website: organizerData.website || '',
            createdAt: new Date().getTime()
        }
    });

    const updatedDoc = await userRef.get();
    return updatedDoc.data();
};

/**
 * Lấy thông tin Profile Organizer
 */
const getOrganizerProfile = async (userId) => {
    const userDoc = await db.collection('Users').doc(userId).get();
    if (!userDoc.exists) return null;

    const data = userDoc.data();
    return {
        id: data.id,
        name: data.organizerInfo?.companyName || data.name,
        avatarUrl: data.profilePicUrl,
        website: data.organizerInfo?.website || '',
        organizerInfo: data.organizerInfo,
        followersCount: 0,
        rating: 5.0 // TODO: Tính từ Reviews
    };
};

/**
 * Lấy danh sách sự kiện của Organizer
 */
const getMyEvents = async (organizerId, page = 1, limit = 20, status) => {
    let query = db.collection('Events').where('organizerId', '==', organizerId);

    if (status) {
        query = query.where('status', '==', status);
    }

    const offset = (page - 1) * limit;
    const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).offset(offset).get();

    const events = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        events.push({
            id: doc.id,
            name: d.name,
            date: d.date,
            bannerUrl: d.bannerUrl,
            status: d.status,
            // Các trường thống kê nhanh (nếu có job update)
            viewCount: d.viewCount || 0
        });
    });

    return events;
};

/**
 * Thống kê tổng quan (Stats)
 */
const getOrganizerStats = async (organizerId) => {
    // 1. Lấy danh sách Event của Organizer
    const eventsSnapshot = await db.collection('Events').where('organizerId', '==', organizerId).get();

    let totalEvents = 0;
    let upcomingEvents = 0;
    let totalRevenue = 0;
    let totalTicketsSold = 0;
    const now = new Date().getTime();

    // Map để cộng dồn số vé bán theo ngày từ TẤT CẢ các sự kiện
    // Key: Timestamp (đầu ngày) hoặc String Date ("YYYY-MM-DD"), Value: Số lượng vé
    const salesMap = {}; 

    const eventIds = [];

    eventsSnapshot.forEach(doc => {
        const ev = doc.data();
        totalEvents++;
        if (ev.date > now) upcomingEvents++;
        eventIds.push(doc.id);
    });

    // 2. Lấy dữ liệu từ Analytics của từng event
    if (eventIds.length > 0) {
        // CHÚ Ý: Firestore 'in' query giới hạn 10 item. 
        // Nếu organizer có > 10 sự kiện, cần chia nhỏ mảng eventIds thành các chunk.
        const chunkSize = 10;
        for (let i = 0; i < eventIds.length; i += chunkSize) {
            const chunk = eventIds.slice(i, i + chunkSize);
            
            const analyticsSnapshot = await db.collection('Analytics')
                .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
                .get();

            analyticsSnapshot.forEach(doc => {
                const ana = doc.data();
                
                // a. Cộng dồn doanh thu
                totalRevenue += ana.totalRevenue || 0;

                // b. Cộng dồn tổng vé bán
                if (ana.ticketsSold) {
                    Object.values(ana.ticketsSold).forEach(count => totalTicketsSold += count);
                }

                // c. [MỚI] Cộng dồn lịch sử bán vé (Sales Over Time)
                // Giả định: DB có trường `dailySales`: { "1700438400000": 5, "1700524800000": 3 } (Key là timestamp đầu ngày)
                if (ana.dailySales) {
                    for (const [timestampStr, count] of Object.entries(ana.dailySales)) {
                        const ts = parseInt(timestampStr); // Chuyển key thành số
                        const currentCount = salesMap[ts] || 0;
                        salesMap[ts] = currentCount + count;
                    }
                }
            });
        }
    }

    // 3. Chuyển đổi salesMap thành mảng TimeSeriesData và sắp xếp
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
    const userRef = db.collection('Users').doc(userId);

    // Chúng ta chỉ cập nhật các trường trong object organizerInfo
    // Để không ghi đè các trường khác, ta dùng dot notation
    const dataToUpdate = {};

    if (updateData.companyName) dataToUpdate['organizerInfo.companyName'] = updateData.companyName;
    if (updateData.taxCode) dataToUpdate['organizerInfo.taxCode'] = updateData.taxCode;
    if (updateData.description) dataToUpdate['organizerInfo.description'] = updateData.description;
    if (updateData.website) dataToUpdate['organizerInfo.website'] = updateData.website;

    // Nếu muốn cho phép cập nhật cả avatar/tên hiển thị chung của user từ đây:
    if (updateData.avatarUrl) dataToUpdate['profilePicUrl'] = updateData.avatarUrl;
    if (updateData.name) dataToUpdate['name'] = updateData.name; // Tên hiển thị chung

    if (Object.keys(dataToUpdate).length > 0) {
        await userRef.update(dataToUpdate);
    }

    // Trả về profile mới nhất
    return await require('./organizer.service').getOrganizerProfile(userId);
};
///////////////////////
/**
 * Import danh sách người tham dự từ file Excel/CSV.
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

    // 2. Validate Event & Quyền
    const eventDoc = await db.collection('Events').doc(eventId).get();
    if (!eventDoc.exists) throw new Error("Event not found.");
    if (eventDoc.data().organizerId !== organizerId) throw new Error("Forbidden.");

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

            // Tìm User theo email
            const userSnapshot = await db.collection('Users').where('email', '==', email).limit(1).get();
            let userId = null;

            if (!userSnapshot.empty) {
                userId = userSnapshot.docs[0].id;
            } else {
                // TODO: Nếu user chưa có tài khoản, ta có thể tạo một 'Guest User' hoặc bỏ qua.
                // Ở đây ta chọn bỏ qua và báo lỗi để đơn giản hóa.
                throw new Error(`User with email ${email} not found in system.`);
            }

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
    // 1. Validate quyền
    const eventDoc = await db.collection('Events').doc(eventId).get();
    if (!eventDoc.exists) throw new Error("Event not found.");
    if (eventDoc.data().organizerId !== organizerId) throw new Error("Forbidden.");

    // 2. Lấy danh sách vé hợp lệ
    const ticketsSnapshot = await db.collection('Tickets')
        .where('eventId', '==', eventId)
        .where('status', 'in', ['paid', 'checkedIn'])
        .get();

    // console.log(ticketsSnapshot.docs);


    if (ticketsSnapshot.empty) return { count: 0 };

    const userIds = [...new Set(ticketsSnapshot.docs.map(doc => doc.data().userId))];

    // 3. Lấy tokens và gửi thông báo
    // Chia batch 10 user/lần để query Firestore 'in'
    let successCount = 0;
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 10) {
        chunks.push(userIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
        const userDocs = await db.collection('Users')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get();

        const tokens = [];
        for (const doc of userDocs.docs) {
            const userData = doc.data();

            // Lưu Notification vào DB
            notificationService.createNotification(
                doc.id, title, message, "system", eventId
            );

            // Gom token để gửi Push
            if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                tokens.push(...userData.fcmTokens);
            } else if (userData.fcmToken) {
                tokens.push(userData.fcmToken);
            }
        }

        if (tokens.length > 0) {
            await fcmService.sendMulticast(tokens, title, message, { eventId, type: "broadcast" });
        }
        successCount += userDocs.size;
    }

    return { count: successCount };
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