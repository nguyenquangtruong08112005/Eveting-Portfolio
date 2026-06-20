const TICKET_SECRET = process.env.JWT_TICKET_SECRET;
const jwt = require('jsonwebtoken');
const ticketRepository = require('@/providers/database/ticket.repository');
const userRepository = require('@/providers/database/user.repository');
const eventRepository = require('@/providers/database/event.repository');
const analyticsRepository = require('@/providers/database/analytics.repository');
const organizerRepository = require('@/providers/database/organizer.repository');
const orderRepository = require('@/providers/database/order.repository');
const ticketService = require('@/modules/tickets').service;

const { mapAttendees } = require('./attendee.helper');
const { mapOrganizerProfile, buildOrganizerUpdateData } = require('./profile.helper');
const { computeOrganizerStats } = require('./stats.helper');
const { parseImportWorkbook, buildExportWorkbook } = require('./import-export.helper');
const { sendBroadcastNotification } = require('./notification.helper');

const getAttendeesByEventId = async (eventId) => {
    const tickets = await ticketRepository.getAttendeeTicketsByEventId(eventId);
    if (tickets.length === 0) return [];
    const userIds = new Set();
    tickets.forEach(ticket => { if (ticket.userId) userIds.add(ticket.userId); });
    if (userIds.size === 0) return [];
    const usersMap = await userRepository.getUsersByIds(Array.from(userIds));
    return mapAttendees(tickets, usersMap);
};

const checkInByQr = async (qrToken, requestingOrganizerId) => {
    let payload;
    try {
        payload = jwt.verify(qrToken, TICKET_SECRET);
    } catch (error) {
        console.error("Loi xac thuc QR JWT:", error.message);
        throw new Error('Invalid or tampered QR Code.');
    }
    const { ticketId, eventId, userId } = payload;
    return ticketRepository.runTransaction(async (transaction) => {
        const ticketData = await ticketRepository.getTicketInTransaction(transaction, ticketId);
        if (!ticketData) throw new Error('Ticket not found.');
        const eventData = await eventRepository.getEventInTransaction(transaction, eventId);
        if (!eventData) throw new Error('Event not found.');
        if (eventData.organizerId !== requestingOrganizerId) throw new Error('Forbidden: You do not have permission for this event.');
        if (ticketData.status !== 'paid' && ticketData.status !== 'checkedIn') throw new Error(`Cannot check-in ticket with status '${ticketData.status}'.`);
        const quantity = ticketData.quantity || 1;
        const currentCheckInCount = ticketData.checkInCount || 0;
        if (currentCheckInCount >= quantity) throw new Error(`This ticket has been checked in (${currentCheckInCount}/${quantity} times).`);
        const newCheckInCount = currentCheckInCount + 1;
        const updates = { checkInCount: newCheckInCount, lastCheckInAt: Date.now() };
        if (ticketData.status === 'paid') { updates.status = 'checkedIn'; }
        ticketRepository.updateTicketInTransaction(transaction, ticketId, updates);
        if (currentCheckInCount === 0) { userRepository.addHistoryEventIdInTransaction(transaction, userId, eventId); }
        analyticsRepository.incrementCheckInInTransaction(transaction, eventId);
        return { ...ticketData, status: 'checkedIn', checkInCount: newCheckInCount, quantity: quantity, remaining: quantity - newCheckInCount };
    });
};

const registerOrganizer = async (userId, organizerData) => {
    return await organizerRepository.addOrganizerRoleToUser(userId, organizerData);
};

const getOrganizerProfile = async (userId) => {
    const rawData = await organizerRepository.getOrganizerProfile(userId);
    return mapOrganizerProfile(rawData);
};

const getMyEvents = async (organizerId, page = 1, limit = 20, status) => {
    const events = await eventRepository.getEventsByOrganizerId(organizerId, { page, limit, status });
    const enrichedEvents = [];
    for (const event of events) {
        const { data: rawEventData } = await eventRepository.getEventRawById(event.id);
        const tickets = await ticketRepository.getAttendeeTicketsByEventId(event.id);
        const soldCount = tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);

        let totalCapacity = 0;
        if (rawEventData && rawEventData.ticketTypes) {
            for (const typeKey in rawEventData.ticketTypes) {
                totalCapacity += rawEventData.ticketTypes[typeKey].capacity || 0;
            }
        }

        const price = rawEventData ? (rawEventData.minPrice || 0) : 0;

        enrichedEvents.push({
            id: event.id,
            name: event.name,
            status: event.status,
            sold: soldCount,
            capacity: totalCapacity || rawEventData?.capacity || 0,
            price: price
        });
    }
    return enrichedEvents;
};

const getLedger = async (organizerId) => {
    return await orderRepository.getLedgerEntriesByOrganizer(organizerId);
};

const getOrganizerStats = async (organizerId) => {
    const eventEntries = await eventRepository.getEventEntriesByOrganizer(organizerId);
    const eventIds = eventEntries.map(e => e.id);
    let analyticsList = [];
    if (eventIds.length > 0) {
        analyticsList = await analyticsRepository.getAnalyticsByEventIds(eventIds);
    }
    return computeOrganizerStats(eventEntries, analyticsList);
};

const updateOrganizerProfile = async (userId, updateData) => {
    const dataToUpdate = buildOrganizerUpdateData(updateData);
    if (Object.keys(dataToUpdate).length > 0) { await organizerRepository.updateOrganizerProfile(userId, dataToUpdate); }
    return await getOrganizerProfile(userId);
};

const importAttendees = async (eventId, fileBuffer, organizerId) => {
    const jsonData = parseImportWorkbook(fileBuffer);
    const eventData = await eventRepository.getEventDataById(eventId);
    if (!eventData) throw new Error("Event not found.");
    if (eventData.organizerId !== organizerId) throw new Error("Forbidden.");
    let successCount = 0, failCount = 0;
    const errors = [];
    for (const row of jsonData) {
        try {
            const email = row['Email'] || row['email'];
            const ticketType = row['TicketType'] || row['ticketType'] || 'Standard';
            if (!email) throw new Error("Missing email.");
            const userData = await userRepository.findUserByEmail(email);
            if (!userData) throw new Error(`User with email ${email} not found in system.`);
            const userId = userData._id;
            const newTicket = await ticketService.bookTicket(userId, eventId, ticketType);
            await ticketService.confirmTicketPayment(newTicket.id);
            successCount++;
        } catch (err) {
            failCount++;
            errors.push({ row, error: err.message });
        }
    }
    return { successCount, failCount, errors };
};

const exportAttendees = async (eventId) => {
    const attendees = await getAttendeesByEventId(eventId);
    const workbook = buildExportWorkbook(attendees);
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
    return await sendBroadcastNotification(userIds, title, message, eventId);
};

module.exports = {
    getAttendeesByEventId, checkInByQr, registerOrganizer, getOrganizerProfile,
    getMyEvents, getOrganizerStats, updateOrganizerProfile, importAttendees,
    exportAttendees, broadcastNotification, getLedger
};
