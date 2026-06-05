const TICKET_SECRET = process.env.JWT_TICKET_SECRET;
const jwt = require('jsonwebtoken');
const ticketService = require('@/services/ticket.service');
const fcmService = require('@/services/fcm.service');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const notificationService = require('@/services/notification.service');
const notifHelper = require('@/services/notification-event.helper');
const ticketRepository = require('@/providers/database/ticket.repository');
const userRepository = require('@/providers/database/user.repository');
const eventRepository = require('@/providers/database/event.repository');
const analyticsRepository = require('@/providers/database/analytics.repository');
const organizerRepository = require('@/providers/database/organizer.repository');

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

const registerOrganizer = async (userId, organizerData) => {
    return await organizerRepository.addOrganizerRoleToUser(userId, organizerData);
};

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

const getMyEvents = async (organizerId, page = 1, limit = 20, status) => {
    return await eventRepository.getEventsByOrganizerId(organizerId, { page, limit, status });
};

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

    return await getOrganizerProfile(userId);
};

const importAttendees = async (eventId, fileBuffer, organizerId) => {
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

    for (const row of jsonData) {
        try {
            const email = row['Email'] || row['email'];
            const ticketType = row['TicketType'] || row['ticketType'] || 'Standard';

            if (!email) throw new Error("Missing email.");

            const userData = await userRepository.findUserByEmail(email);
            if (!userData) {
                throw new Error(`User with email ${email} not found in system.`);
            }
            const userId = userData._id;

            const newTicket = await ticketService.bookTicket(userId, eventId, ticketType);
            await ticketService.confirmTicketPayment(newTicket.id);

            successCount++;
        } catch (err) {
            failCount++;
            errors.push({
                row: row,
                error: err.message
            });
        }
    }

    return { successCount, failCount, errors };
};

const exportAttendees = async (eventId) => {
    const attendees = await getAttendeesByEventId(eventId);

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

const broadcastNotification = async (eventId, title, message, organizerId) => {
    const eventData = await eventRepository.getEventById(eventId);
    if (!eventData) throw new Error("Event not found.");
    if (eventData.organizerId !== organizerId) throw new Error("Forbidden.");

    const tickets = await ticketRepository.getAttendeeTicketsByEventId(eventId);

    if (tickets.length === 0) return { count: 0 };

    const userIds = [...new Set(tickets.map(t => t.userId))];

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
